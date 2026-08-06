/**
 * RAG Service (Retrieval-Augmented Generation)
 *
 * Provides the core query pipeline for the AI Notebook Chat feature:
 *
 *   1. `searchSimilarChunks`  — Executes a pgvector cosine-distance SQL query against
 *      `SourceChunk` rows belonging to the notebook, returning the top-K most relevant
 *      text segments along with their source metadata.
 *
 *   2. `executeNotebookChat`  — Full RAG pipeline:
 *        a. Validates notebook ownership.
 *        b. Embeds the user question via `generateEmbedding` (gemini-embedding-001, 768 dims).
 *        c. Retrieves top-K similar chunks from pgvector.
 *        d. Builds a grounded system prompt that strictly restricts Gemini to the retrieved context.
 *        e. Calls `generateWithFallback` for the AI answer.
 *        f. Returns the reply and structured citation metadata.
 */

import { prisma } from '@/lib/prisma';
import { generateEmbedding, generateWithFallback } from '@/utils/gemini';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChunkSearchResult {
  chunkId: string;
  sourceId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  similarity: number; // cosine similarity in [0, 1] — higher is more relevant
}

export interface ChatCitation {
  sourceId: string;
  fileName: string;
  chunkIndex: number;
  snippet: string;      // first 200 chars of the chunk
  similarity: number;
}

export interface ChatResult {
  reply: string;
  citations: ChatCitation[];
  notebookId: string;
  retrievedChunks: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TOP_K = 5; // Number of chunks to retrieve per query

// ── Vector Search ──────────────────────────────────────────────────────────────

/**
 * Executes a pgvector cosine-distance similarity search against SourceChunk rows
 * within a specific notebook. Only chunks whose parent Source has status = 'READY'
 * are considered.
 *
 * @param notebookId - The notebook to search within.
 * @param queryVector - The 768-dimensional embedding of the user query.
 * @param topK       - Number of results to return (default: 5).
 */
export async function searchSimilarChunks(
  notebookId: string,
  queryVector: number[],
  topK = TOP_K
): Promise<ChunkSearchResult[]> {
  const vectorLiteral = `[${queryVector.join(',')}]`;

  // Raw SQL required because pgvector's <=> operator is not in Prisma's type system.
  const rows = await prisma.$queryRaw<
    Array<{
      chunk_id: string;
      source_id: string;
      file_name: string;
      chunk_index: number;
      content: string;
      distance: number;
    }>
  >`
    SELECT
      sc.id                AS chunk_id,
      sc."sourceId"        AS source_id,
      s."fileName"         AS file_name,
      sc."chunkIndex"      AS chunk_index,
      sc.content,
      sc.embedding <=> ${vectorLiteral}::vector AS distance
    FROM "SourceChunk" sc
    JOIN "Source" s ON s.id = sc."sourceId"
    WHERE sc."notebookId" = ${notebookId}
      AND s.status = 'READY'
      AND sc.embedding IS NOT NULL
    ORDER BY distance ASC
    LIMIT ${topK}
  `;

  return rows.map((r) => ({
    chunkId: r.chunk_id,
    sourceId: r.source_id,
    fileName: r.file_name,
    chunkIndex: r.chunk_index,
    content: r.content,
    // Convert cosine distance → cosine similarity: similarity = 1 - distance
    similarity: Math.max(0, Math.min(1, 1 - Number(r.distance))),
  }));
}

// ── System Prompt Builder ──────────────────────────────────────────────────────

function buildSystemPrompt(question: string, chunks: ChunkSearchResult[]): string {
  const contextBlock = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}: "${c.fileName}", chunk ${c.chunkIndex + 1}]\n${c.content}`
    )
    .join('\n\n---\n\n');

  return `You are an AI Study Assistant for AcadMate. A student has uploaded study materials to their personal notebook and is asking a question about them.

Your task:
- Answer the student's question STRICTLY based on the document excerpts provided below.
- If the answer is not found in the documents, say: "I could not find information about that in your uploaded materials."
- Be concise, accurate, and helpful.
- When referencing information, cite the source file name naturally (e.g., "According to your PDF 'lecture1.pdf'...").
- Do NOT make up information or draw on external knowledge outside the provided context.

--- DOCUMENT CONTEXT ---
${contextBlock}
--- END OF CONTEXT ---

Student's Question: ${question}

Answer:`;
}

// ── Main RAG Pipeline ──────────────────────────────────────────────────────────

/**
 * Full RAG execution pipeline:
 *   1. Validates the notebook belongs to the user.
 *   2. Embeds the user question.
 *   3. Searches top-K relevant chunks via pgvector.
 *   4. Builds grounded system prompt.
 *   5. Generates AI reply via Gemini with model-cascade fallback.
 *   6. Returns structured reply + citations.
 *
 * @param notebookId - Target notebook ID.
 * @param userId     - Authenticated user ID (ownership check).
 * @param question   - The user's natural-language question.
 */
export async function executeNotebookChat(
  notebookId: string,
  userId: string,
  question: string
): Promise<ChatResult> {
  // 1. Verify notebook ownership
  const notebook = await prisma.notebook.findFirst({
    where: { id: notebookId, userId },
  });
  if (!notebook) {
    throw new Error('Notebook not found or access denied.');
  }

  // 2. Check for indexed sources
  const readySourceCount = await prisma.source.count({
    where: { notebookId, userId, status: 'READY' },
  });

  if (readySourceCount === 0) {
    return {
      reply:
        "This notebook has no indexed materials yet. Please upload a document and wait for it to finish processing before asking questions.",
      citations: [],
      notebookId,
      retrievedChunks: 0,
    };
  }

  // 3. Embed the question
  const queryVector = await generateEmbedding(question);

  // 4. Retrieve top-K similar chunks via pgvector cosine search
  const chunks = await searchSimilarChunks(notebookId, queryVector, TOP_K);

  if (chunks.length === 0) {
    return {
      reply:
        "I could not find any relevant information in your uploaded materials for that question.",
      citations: [],
      notebookId,
      retrievedChunks: 0,
    };
  }

  // 5. Build grounded prompt and call Gemini
  const systemPrompt = buildSystemPrompt(question, chunks);
  const reply = await generateWithFallback([{ text: systemPrompt }]);

  // 6. Build citation metadata
  const citations: ChatCitation[] = chunks.map((c) => ({
    sourceId: c.sourceId,
    fileName: c.fileName,
    chunkIndex: c.chunkIndex,
    snippet: c.content.slice(0, 200).trim(),
    similarity: Math.round(c.similarity * 1000) / 1000,
  }));

  console.log(
    `[RAGService] Chat answered for notebook ${notebookId}: ${chunks.length} chunks retrieved, ` +
    `top similarity: ${citations[0]?.similarity ?? 'N/A'}`
  );

  return {
    reply: reply.trim(),
    citations,
    notebookId,
    retrievedChunks: chunks.length,
  };
}
