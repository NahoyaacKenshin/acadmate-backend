/**
 * Schedule Parser Service
 *
 * Handles text extraction from different file types and drives the
 * Gemini AI parsing pipeline to extract structured schedule data.
 *
 * Supported input types:
 *   - PDF  → text via `pdf-parse`
 *   - DOCX → text via `mammoth`
 *   - Image (jpeg/png/webp/gif) → base64 passed to Gemini Vision
 *
 * Output:
 *   Structured JSON matching Week 3 Prisma models:
 *   { classSchedules, calendarEvents, examWeeks }
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
import mammoth from "mammoth";
import { generateWithFallback, GeminiPart } from "@/utils/gemini";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedClassSchedule {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  startTime: string; // "HH:MM" 24-hour
  endTime: string; // "HH:MM" 24-hour
  subjectName: string;
  room?: string | null;
  modality?: "F2F" | "ONLINE" | "HYBRID";
  setType?: "A" | "B" | "BOTH" | null;
  startDate?: string; // ISO-8601
  endDate?: string | null; // ISO-8601
}

export interface ParsedCalendarEvent {
  title: string;
  startDate: string; // ISO-8601
  endDate?: string | null; // ISO-8601
  allDay?: boolean;
  location?: string | null;
}

export interface ParsedExamWeek {
  title: string;
  startDate: string; // ISO-8601
  endDate: string; // ISO-8601
}

export interface ParsedScheduleResult {
  classSchedules: ParsedClassSchedule[];
  calendarEvents: ParsedCalendarEvent[];
  examWeeks: ParsedExamWeek[];
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an intelligent academic schedule extractor for a Philippine university student planner app.

Analyze the provided content and extract ALL schedule-related information into the following JSON structure.
Do NOT include any explanation, markdown, or text outside the JSON object.

Return ONLY valid JSON in this exact shape:
{
  "classSchedules": [
    {
      "dayOfWeek": <0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat>,
      "startTime": "<HH:MM 24-hour format>",
      "endTime": "<HH:MM 24-hour format>",
      "subjectName": "<Full subject or course name>",
      "room": "<room or null>",
      "modality": "<F2F | ONLINE | HYBRID>",
      "setType": "<A | B | BOTH | null>",
      "startDate": "<ISO-8601 date or null>",
      "endDate": "<ISO-8601 date or null>"
    }
  ],
  "calendarEvents": [
    {
      "title": "<event title>",
      "startDate": "<ISO-8601 datetime>",
      "endDate": "<ISO-8601 datetime or null>",
      "allDay": <true | false>,
      "location": "<location or null>"
    }
  ],
  "examWeeks": [
    {
      "title": "<exam period name, e.g. Prelims, Midterms, Finals>",
      "startDate": "<ISO-8601 date>",
      "endDate": "<ISO-8601 date>"
    }
  ]
}

Rules:
- dayOfWeek: Use integers 0–6 (0=Sunday, 1=Monday, ..., 6=Saturday). For Philippine schedules M=1, T=2, W=3, Th=4, F=5, S=6.
- All dates must be strictly formatted as ISO-8601 (e.g. "2026-08-01T00:00:00.000Z"). If only a date is given, append "T00:00:00.000Z".
- If a field is truly unknown, use null.
- setType: Use "BOTH" if the class meets every week. Use "A" or "B" for alternating schedules. Use null if unclear.
- If the document contains exam/holiday periods (e.g. Prelims Week, Christmas Break), add them to examWeeks.
- Merge split time entries (e.g. "MWF 7:30-9:00") into separate classSchedule items per day.
- If the document refers to Philippine official holidays (e.g. Rizal Day, Independence Day), add them as calendarEvents with allDay: true.
- If no items exist for a category, return an empty array [].`;

// ── Text Extraction Helpers ────────────────────────────────────────────────────

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// ── Main Service Function ──────────────────────────────────────────────────────

export type SupportedMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

export async function parseScheduleFromFile(
  buffer: Buffer,
  mimeType: SupportedMimeType
): Promise<ParsedScheduleResult> {
  // ── 1. Extract content depending on file type ─────────────────────────────
  let parts: GeminiPart[];

  if (mimeType === "application/pdf") {
    const text = await extractFromPdf(buffer);
    parts = [{ text: `${SYSTEM_PROMPT}\n\nDocument Content:\n${text}` }];
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const text = await extractFromDocx(buffer);
    parts = [{ text: `${SYSTEM_PROMPT}\n\nDocument Content:\n${text}` }];
  } else {
    // Image — pass directly to Gemini Vision as base64
    const base64 = buffer.toString("base64");
    parts = [
      { text: SYSTEM_PROMPT },
      { inlineData: { mimeType, data: base64 } },
    ];
  }

  // ── 2. Call Gemini with cascade fallback ──────────────────────────────────
  const rawText = await generateWithFallback(parts);

  // ── 3. Strip markdown code fences if Gemini wraps output ─────────────────
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // ── 4. Parse and validate the JSON ───────────────────────────────────────
  let parsed: ParsedScheduleResult;
  try {
    parsed = JSON.parse(jsonText) as ParsedScheduleResult;
  } catch {
    throw new Error(
      `[ScheduleParser] Gemini returned non-JSON output: ${rawText.slice(0, 200)}`
    );
  }

  // ── 5. Ensure all date strings are strict ISO-8601 ───────────────────────
  parsed.classSchedules = (parsed.classSchedules ?? []).map((cs) => ({
    ...cs,
    startDate: cs.startDate ? ensureIsoDate(cs.startDate) : undefined,
    endDate: cs.endDate ? ensureIsoDate(cs.endDate) : null,
  }));

  parsed.calendarEvents = (parsed.calendarEvents ?? []).map((ev) => ({
    ...ev,
    startDate: ensureIsoDate(ev.startDate),
    endDate: ev.endDate ? ensureIsoDate(ev.endDate) : null,
  }));

  parsed.examWeeks = (parsed.examWeeks ?? []).map((ew) => ({
    ...ew,
    startDate: ensureIsoDate(ew.startDate),
    endDate: ensureIsoDate(ew.endDate),
  }));

  return parsed;
}

// ── ISO-8601 Enforcement Helper ────────────────────────────────────────────────

function ensureIsoDate(value: string): string {
  if (!value) return new Date().toISOString();
  // Already full ISO-8601 (contains 'T')
  if (value.includes("T")) return value;
  // Plain date like "2026-08-01" → append midnight UTC
  const asDate = new Date(`${value}T00:00:00.000Z`);
  if (isNaN(asDate.getTime())) {
    throw new Error(`[ScheduleParser] Invalid date value from AI: "${value}"`);
  }
  return asDate.toISOString();
}
