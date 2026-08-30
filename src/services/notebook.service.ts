/**
 * Notebook Service
 *
 * Handles:
 *   1. Uploading raw source files to Supabase Storage.
 *   2. Creating Source records in Postgres (status: PENDING).
 *   3. Running the async background processing pipeline:
 *      - Text extraction (PDF → pdf-parse, DOCX → mammoth, Image → Gemini Vision OCR, TXT → raw)
 *      - Text normalization (strip noise, collapse whitespace)
 *      - Chunking (~500 words, 50-word overlap)
 *      - Embedding generation (Gemini text-embedding-004, 768 dims)
 *      - Storing SourceChunk rows via pgvector raw SQL
 *      - Updating Source status (READY | FAILED)
 */

import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { generateEmbedding, genAI } from '@/utils/gemini';
import { ENV } from '@/config/env';
import { SourceFileType, SourceStatus } from '@/generated/prisma';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHUNK_WORD_SIZE = 500;
const CHUNK_OVERLAP   = 50;
const BUCKET          = ENV.SUPABASE_STORAGE_BUCKET;

// ── Text Extraction ────────────────────────────────────────────────────────────

async function extractText(
  buffer: Buffer,
  fileType: SourceFileType,
  mimeType: string
): Promise<string> {
  if (fileType === 'PDF') {
    try {
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      const text = parsed?.text?.trim() ?? '';
      const cleanText = text.replace(/-- \d+ of \d+ --/g, '').trim();
      if (cleanText.length > 20) {
        return text;
      }
    } catch (pdfErr) {
      console.warn('[NotebookService] PDFParse failed, falling back to Gemini Vision OCR:', pdfErr);
    }

    // Fallback: Scanned/Image PDF OCR via Gemini Vision
    const base64 = buffer.toString('base64');
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent([
      {
        text: 'Extract ALL text from this PDF document image/pages exactly as it appears. Output raw text only, no markdown or formatting.',
      },
      { inlineData: { mimeType: 'application/pdf', data: base64 } },
    ] as unknown as Parameters<typeof model.generateContent>[0]);
    return result.response.text();
  }

  if (fileType === 'TEXT') {
    // DOCX
    if (mimeType.includes('wordprocessingml') || mimeType.includes('docx')) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    // Plain text
    return buffer.toString('utf-8');
  }

  if (fileType === 'IMAGE') {
    // Gemini Vision OCR — pass as inline base64
    const base64 = buffer.toString('base64');
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent([
      {
        text: 'Extract ALL text from this document image exactly as it appears. Output raw text only, no markdown or formatting.',
      },
      { inlineData: { mimeType, data: base64 } },
    ] as unknown as Parameters<typeof model.generateContent>[0]);
    return result.response.text();
  }

  throw new Error(`[NotebookService] Unsupported fileType: ${fileType}`);
}

// ── Text Normalization ─────────────────────────────────────────────────────────

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')           // normalize line endings
    .replace(/[ \t]+/g, ' ')          // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')       // collapse excessive blank lines
    .replace(/[^\x20-\x7E\n]/g, ' ') // strip non-printable chars
    .trim();
}

// ── Chunking ──────────────────────────────────────────────────────────────────

/**
 * Splits normalized text into overlapping word-based chunks.
 * Each chunk is ~CHUNK_WORD_SIZE words, overlapping by CHUNK_OVERLAP words.
 */
function chunkText(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + CHUNK_WORD_SIZE, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += CHUNK_WORD_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

// ── Mime → FileType Resolver ───────────────────────────────────────────────────

export function resolveFileType(mimeType: string): SourceFileType {
  if (mimeType === 'application/pdf') return 'PDF';
  if (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/png'  ||
    mimeType === 'image/webp' ||
    mimeType === 'image/gif'
  ) return 'IMAGE';
  // DOCX, plain text, etc.
  return 'TEXT';
}

// ── Background Processing Pipeline ────────────────────────────────────────────

/**
 * Runs asynchronously after the upload endpoint returns.
 * Updates Source status and stores SourceChunk rows with pgvector embeddings.
 */
async function processSource(sourceId: string, buffer: Buffer, mimeType: string): Promise<void> {
  try {
    // 1. Mark as PROCESSING
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: SourceStatus.PROCESSING },
    });

    // 2. Get source record for fileType & notebookId
    const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });

    // 3. Extract text
    const rawText = await extractText(buffer, source.fileType, mimeType);

    // 4. Normalize
    const normalized = normalizeText(rawText);

    // 5. Chunk
    const chunks = chunkText(normalized);

    // 6. Embed each chunk and store via pgvector raw SQL
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      const vectorLiteral = `[${embedding.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO "SourceChunk" (id, "sourceId", "notebookId", "chunkIndex", content, embedding, "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${sourceId},
          ${source.notebookId},
          ${i},
          ${chunks[i]},
          ${vectorLiteral}::vector,
          NOW()
        )
      `;
    }

    // 7. Mark as READY, store rawText
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: SourceStatus.READY,
        rawText: normalized.slice(0, 100_000), // cap stored text at 100k chars
        updatedAt: new Date(),
      },
    });

    console.log(`[NotebookService] processSource ${sourceId}: READY (${chunks.length} chunks)`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[NotebookService] processSource ${sourceId} FAILED:`, message);

    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: SourceStatus.FAILED,
        errorMsg: message.slice(0, 500),
        updatedAt: new Date(),
      },
    }).catch(() => { /* swallow — avoid double-error */ });
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Uploads a file to Supabase Storage, creates a Source record (status: PENDING),
 * fires off background processing (no await), and returns the Source immediately.
 */
export async function uploadSourceFile(
  notebookId: string,
  userId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
) {
  const fileType = resolveFileType(mimeType);
  const ext = fileName.split('.').pop() ?? 'bin';
  const storagePath = `${userId}/${notebookId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET!)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) {
    throw new Error(`[NotebookService] Supabase upload failed: ${uploadError.message}`);
  }

  // 2. Create Source record
  const source = await prisma.source.create({
    data: {
      fileName,
      fileType,
      storagePath,
      status: SourceStatus.PENDING,
      notebookId,
      userId,
    },
  });

  // 3. Fire off background processing — intentionally not awaited
  processSource(source.id, buffer, mimeType).catch((err) => {
    console.error('[NotebookService] Background processSource uncaught error:', err);
  });

  return source;
}

/**
 * Re-processes a failed Source using the existing file in Supabase Storage.
 */
export async function retrySourceProcessing(sourceId: string, userId: string) {
  const source = await prisma.source.findFirst({
    where: { id: sourceId, userId },
  });
  if (!source) return null;

  // 1. Download buffer from Supabase Storage
  const { data, error } = await supabase.storage.from(BUCKET!).download(source.storagePath);
  if (error || !data) {
    throw new Error(`Failed to download file from storage: ${error?.message || 'File not found'}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 2. Set status to PROCESSING & clear error
  await prisma.source.update({
    where: { id: sourceId },
    data: {
      status: SourceStatus.PROCESSING,
      errorMsg: null,
      updatedAt: new Date(),
    },
  });

  // 3. Clear any existing partial chunks
  await prisma.sourceChunk.deleteMany({
    where: { sourceId },
  });

  // 4. Trigger async background processing
  const ext = source.fileName.split('.').pop()?.toLowerCase() ?? '';
  let mimeType = 'application/octet-stream';
  if (source.fileType === 'PDF') mimeType = 'application/pdf';
  else if (source.fileType === 'IMAGE') mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (ext === 'txt') mimeType = 'text/plain';

  processSource(source.id, buffer, mimeType).catch((err) => {
    console.error('[NotebookService] Background retry processSource uncaught error:', err);
  });

  return source;
}

/**
 * Deletes a Source record and removes the file from Supabase Storage.
 */
export async function deleteSource(sourceId: string, userId: string) {
  const source = await prisma.source.findFirst({
    where: { id: sourceId, userId },
  });
  if (!source) return null;

  // Remove from storage
  await supabase.storage.from(BUCKET!).remove([source.storagePath]);

  // Delete record (cascades to SourceChunks)
  await prisma.source.delete({ where: { id: sourceId } });
  return true;
}

