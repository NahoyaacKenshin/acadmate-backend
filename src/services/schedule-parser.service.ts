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

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { generateWithFallback, GeminiPart } from "@/utils/gemini";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedSemesterInfo {
  label?: string | null;     // e.g. "1st Semester A.Y. 2026-2027"
  startDate?: string | null; // "YYYY-MM-DD" or full ISO datetime
  endDate?: string | null;   // "YYYY-MM-DD" or full ISO datetime
}

export interface ParsedClassSchedule {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  startTime: string; // "HH:MM" 24-hour (strictly 2-digit e.g. "08:00")
  endTime: string;   // "HH:MM" 24-hour (strictly 2-digit e.g. "17:30")
  subjectName: string;
  room?: string | null;
  modality?: "F2F" | "ONLINE" | "HYBRID";
  setType?: "A" | "B" | "BOTH" | null;
  startDate?: string; // ISO-8601 strictly padded "YYYY-MM-DDTHH:mm:ss.sssZ"
  endDate?: string | null; // ISO-8601 strictly padded
}

export interface ParsedCalendarEvent {
  title: string;
  startDate: string; // ISO-8601 strictly padded
  endDate?: string | null; // ISO-8601 strictly padded
  allDay?: boolean;
  location?: string | null;
}

export interface ParsedExamWeekBlocker {
  title: string;     // e.g. "Midterm Examination Week", "Finals Week"
  startDate: string; // ISO-8601 datetime
  endDate: string;   // ISO-8601 datetime
}

export interface ParsedExamEvent {
  subjectName?: string | null;
  title: string;     // e.g. "IT101 Midterm Exam"
  startDate: string | null; // ISO-8601 datetime if specific date known, else null
  endDate?: string | null;   // ISO-8601 datetime
  dayOfWeek?: number | null; // 0=Sun…6=Sat if only day-of-week known
  startTime?: string | null; // "HH:MM" 24h
  endTime?: string | null;   // "HH:MM" 24h
  room?: string | null;
}

export interface ParsedExamWeek {
  title: string;
  startDate: string | null; // ISO-8601 datetime if specific date is known, else null
  endDate: string | null;   // ISO-8601 datetime if specific date is known, else null
  dayOfWeek?: number | null; // 0=Sun…6=Sat — set when only day-of-week is known (no specific date)
  startTime?: string | null; // HH:MM 24-hour — set when only time is known, no specific date
  endTime?: string | null;   // HH:MM 24-hour
}

export interface ParsedScheduleResult {
  semesterInfo?: ParsedSemesterInfo | null;
  classSchedules: ParsedClassSchedule[];
  calendarEvents: ParsedCalendarEvent[];
  examWeekBlockers?: ParsedExamWeekBlocker[];
  examEvents?: ParsedExamEvent[];
  examWeeks: ParsedExamWeek[]; // kept for backwards compatibility
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const buildSystemPrompt = (studentSet?: "A" | "B"): string => {
  const setInstruction = studentSet
    ? `\n- STUDENT SET: This student belongs to Set ${studentSet}. When a class schedule lists separate rooms for ` +
      `Set A and Set B (e.g. columns labeled "SET A ROOM" and "SET B ROOM"), extract ONLY the room assigned ` +
      `to Set ${studentSet}. If that room says "ONLINE", set modality to "ONLINE" and room to null. ` +
      `Always set setType to "${studentSet}" for alternating Saturday classes unless the class runs every week (use "BOTH").`
    : "";

  return `You are an intelligent academic schedule extractor for a Philippine university student planner app.

STEP 1 — SEMESTER & TERM DURATION DETECTION:
Inspect the document to detect the overall semester, term, or school year duration:
1. Header / Title / Metadata: Look for terms like "1st Semester", "2nd Semester", "Summer / Midyear", "A.Y. 2026-2027", "Period Covered", "Effectivity: 08/11/2026 - 12/20/2026".
2. Tabular Columns: Look for columns or rows like "Date From", "Date To", "Start Date", "End Date", "Effectivity".
3. Date Bounds Inference: If no header explicitly defines the semester duration, look at the dates across the rows. Find the earliest start date and latest end date that spans a normal semester (typically 3–5 months, e.g. Aug–Dec or Jan–May) or school year (9–10 months).
4. Populate "semesterInfo" with { "label": "<detected term name or null>", "startDate": "<YYYY-MM-DD>", "endDate": "<YYYY-MM-DD>" }.

STEP 2 — CLASSIFY AND EXTRACT SECTIONS:

A. "classSchedules" (Recurring Weekly Classes):
   - ONLY for weekly recurring lectures/labs repeating across the semester.
   - dayOfWeek: integer 0–6 (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat).
   - startTime / endTime: strictly 2-digit 24h format "HH:MM" (e.g. "08:00", "13:30", "17:00").
   - startDate / endDate: if detected per class or from semester info, format strictly as ISO-8601 (e.g. "2026-08-11T00:00:00.000Z").

B. "examWeekBlockers" (Whole-Week Blackout Windows):
   - Multi-day exam blackout periods where regular classes are suspended (e.g. "Midterm Exam Week: Oct 12–17, 2026", "Final Examination Period: Dec 7–12, 2026").
   - Format: { "title": "Midterm Examination Week", "startDate": "<ISO-8601>", "endDate": "<ISO-8601>" }.

C. "examEvents" (Individual Subject Exam Sessions):
   - Specific exams with subject code, date, exact time, and room (e.g. "IT101 Midterm Exam on Wednesday Oct 14, 09:00 - 11:00 Room 302").
   - If specific date is known: set "startDate" and "endDate" as ISO-8601.
   - If only day-of-week is known (e.g. "Mon 08:00 - 10:00"): set startDate=null, dayOfWeek=1, startTime="08:00", endTime="10:00".

D. "calendarEvents" (Non-Class Events & Holidays):
   - School activities, orientation, deadlines, holidays, sports festivals, workshops.

STEP 3 — OUTPUT FORMAT:
Return ONLY a valid JSON object matching this exact shape:
{
  "semesterInfo": {
    "label": "<e.g. '1st Semester A.Y. 2026-2027' or null>",
    "startDate": "<YYYY-MM-DD or null>",
    "endDate": "<YYYY-MM-DD or null>"
  },
  "classSchedules": [
    {
      "dayOfWeek": <0-6>,
      "startTime": "<HH:MM>",
      "endTime": "<HH:MM>",
      "subjectName": "<Course Name>",
      "room": "<room or null>",
      "modality": "<F2F | ONLINE | HYBRID>",
      "setType": "<A | B | BOTH | null>",
      "startDate": "<ISO-8601 datetime or null>",
      "endDate": "<ISO-8601 datetime or null>"
    }
  ],
  "examWeekBlockers": [
    {
      "title": "<e.g. 'Midterm Exam Week'>",
      "startDate": "<ISO-8601 datetime>",
      "endDate": "<ISO-8601 datetime>"
    }
  ],
  "examEvents": [
    {
      "subjectName": "<Subject Name or null>",
      "title": "<e.g. 'IT101 Midterm Exam'>",
      "startDate": "<ISO-8601 datetime if specific date known, else null>",
      "endDate": "<ISO-8601 datetime if specific date known, else null>",
      "dayOfWeek": <0-6 if no specific date, else null>,
      "startTime": "<HH:MM if no specific date, else null>",
      "endTime": "<HH:MM if no specific date, else null>",
      "room": "<room or null>"
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
  ]
}

CRITICAL RULES:
- All dates MUST have strictly 2-digit months and days (e.g. "2026-08-11" NOT "2026-8-11").
- All times MUST have strictly 2-digit hours and minutes (e.g. "08:00" NOT "8:00").
- If no items exist for an array, return [].
- Output pure JSON only without markdown or explanations.${setInstruction}`;
};

const MERGE_PROMPT_SUFFIX = (current: string) => `

IMPORTANT — MERGE INSTRUCTION:
The user already has the following parsed schedule from a previous document:
${current}

Using the new document above, produce the FINAL merged schedule:
- Update semesterInfo if new document provides more accurate start/end dates.
- If the new document adds detail to an existing class, UPDATE that entry.
- If the new document contains a class NOT already in the list, ADD it.
- If the new document contains exam blockers or events NOT already in the list, ADD them.
- Do NOT create duplicate entries for the same subject, day, and time slot.
- Return the complete final merged JSON for ALL fields.`;

// ── Text Extraction Helpers ────────────────────────────────────────────────────

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  const text = parsed?.text?.trim() ?? "";
  const cleanText = text.replace(/-- \d+ of \d+ --/g, "").trim();
  if (cleanText.length > 20) {
    return text;
  }
  return "";
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export type SupportedMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "text/plain";

export async function parseScheduleFromFile(
  buffer: Buffer,
  mimeType: string,
  currentSchedule?: string,
  studentSet?: "A" | "B",
  fileName = "document"
): Promise<ParsedScheduleResult> {
  return parseScheduleBuffer(buffer, mimeType, fileName, studentSet, currentSchedule);
}

// ── Core Parsing Pipeline ─────────────────────────────────────────────────────

export async function parseScheduleBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  studentSet?: "A" | "B",
  currentScheduleJson?: string
): Promise<ParsedScheduleResult> {
  const systemPrompt = buildSystemPrompt(studentSet);
  const mergeSuffix = currentScheduleJson
    ? MERGE_PROMPT_SUFFIX(currentScheduleJson)
    : "";

  let promptParts: GeminiPart[] = [];

  if (mimeType === "application/pdf") {
    let pdfText = "";
    try {
      pdfText = await extractFromPdf(buffer);
    } catch {
      console.warn("[ScheduleParser] PDF text extraction failed, falling back to vision.");
    }

    if (pdfText.length > 20) {
      promptParts = [
        { text: `${systemPrompt}\n\nDOCUMENT TEXT:\n${pdfText}${mergeSuffix}` },
      ];
    } else {
      promptParts = [
        { text: `${systemPrompt}${mergeSuffix}` },
        { inlineData: { mimeType: "application/pdf", data: buffer.toString("base64") } },
      ];
    }
  } else if (
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("docx") ||
    fileName.endsWith(".docx")
  ) {
    const docxText = await extractFromDocx(buffer);
    promptParts = [
      { text: `${systemPrompt}\n\nDOCUMENT TEXT:\n${docxText}${mergeSuffix}` },
    ];
  } else if (mimeType.startsWith("image/")) {
    promptParts = [
      { text: `${systemPrompt}${mergeSuffix}` },
      { inlineData: { mimeType, data: buffer.toString("base64") } },
    ];
  } else if (mimeType === "text/plain") {
    promptParts = [
      { text: `${systemPrompt}\n\nDOCUMENT TEXT:\n${buffer.toString("utf-8")}${mergeSuffix}` },
    ];
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const rawResponse = await generateWithFallback(promptParts);
  return normalizeResult(rawResponse);
}

// ── Normalize and Clean Output ─────────────────────────────────────────────────

function normalizeResult(rawText: string): ParsedScheduleResult {
  let jsonText = rawText.trim();
  const match = jsonText.match(/```(?:json)?([\s\S]*?)```/);
  if (match) jsonText = match[1].trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`[ScheduleParser] Gemini returned non-JSON output: ${rawText.slice(0, 200)}`);
  }

  // 1. Normalize Semester Info
  let semesterInfo: ParsedSemesterInfo | null = null;
  if (parsed.semesterInfo && typeof parsed.semesterInfo === "object") {
    semesterInfo = {
      label: parsed.semesterInfo.label ?? null,
      startDate: parsed.semesterInfo.startDate ? ensureDateOnly(parsed.semesterInfo.startDate) : null,
      endDate: parsed.semesterInfo.endDate ? ensureDateOnly(parsed.semesterInfo.endDate) : null,
    };
  }

  // 2. Normalize Class Schedules
  const classSchedules: ParsedClassSchedule[] = (parsed.classSchedules ?? []).map((cs: any) => ({
    dayOfWeek: typeof cs.dayOfWeek === "number" ? cs.dayOfWeek : 1,
    startTime: ensureTime24h(cs.startTime, "08:00"),
    endTime: ensureTime24h(cs.endTime, "09:30"),
    subjectName: String(cs.subjectName || "Subject").trim(),
    room: cs.room ? String(cs.room).trim() : null,
    modality: ["F2F", "ONLINE", "HYBRID"].includes(cs.modality) ? cs.modality : "F2F",
    setType: ["A", "B", "BOTH"].includes(cs.setType) ? cs.setType : null,
    startDate: cs.startDate ? ensureIsoDate(cs.startDate) : (semesterInfo?.startDate ? ensureIsoDate(semesterInfo.startDate) : undefined),
    endDate: cs.endDate ? ensureIsoDate(cs.endDate) : (semesterInfo?.endDate ? ensureIsoDate(semesterInfo.endDate) : null),
  }));

  // 3. Normalize Calendar Events
  const calendarEvents: ParsedCalendarEvent[] = (parsed.calendarEvents ?? []).map((ev: any) => ({
    title: String(ev.title || "Event").trim(),
    startDate: ensureIsoDate(ev.startDate),
    endDate: ev.endDate ? ensureIsoDate(ev.endDate) : null,
    allDay: Boolean(ev.allDay),
    location: ev.location ? String(ev.location).trim() : null,
  }));

  // 4. Normalize Exam Week Blockers
  const examWeekBlockers: ParsedExamWeekBlocker[] = (parsed.examWeekBlockers ?? []).map((ew: any) => ({
    title: String(ew.title || "Exam Week").trim(),
    startDate: ensureIsoDate(ew.startDate),
    endDate: ensureIsoDate(ew.endDate, ew.startDate),
  }));

  // 5. Normalize Exam Events
  const examEvents: ParsedExamEvent[] = (parsed.examEvents ?? []).map((ex: any) => ({
    subjectName: ex.subjectName ? String(ex.subjectName).trim() : null,
    title: String(ex.title || `${ex.subjectName ?? "Subject"} Exam`).trim(),
    startDate: ex.startDate ? ensureIsoDate(ex.startDate) : null,
    endDate: ex.endDate ? ensureIsoDate(ex.endDate, ex.startDate) : null,
    dayOfWeek: typeof ex.dayOfWeek === "number" ? ex.dayOfWeek : null,
    startTime: ex.startTime ? ensureTime24h(ex.startTime) : null,
    endTime: ex.endTime ? ensureTime24h(ex.endTime) : null,
    room: ex.room ? String(ex.room).trim() : null,
  }));

  // 6. Support legacy examWeeks array format for backwards compatibility
  const legacyExamWeeks: ParsedExamWeek[] = [
    ...examWeekBlockers.map((b) => ({ title: b.title, startDate: b.startDate, endDate: b.endDate })),
    ...examEvents.map((e) => ({
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate ?? e.startDate,
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
    })),
    ...(parsed.examWeeks ?? []).map((ew: any) => ({
      title: String(ew.title || "Exam").trim(),
      startDate: ew.startDate ? ensureIsoDate(ew.startDate) : null,
      endDate: ew.endDate ? ensureIsoDate(ew.endDate, ew.startDate) : null,
      dayOfWeek: typeof ew.dayOfWeek === "number" ? ew.dayOfWeek : null,
      startTime: ew.startTime ? ensureTime24h(ew.startTime) : null,
      endTime: ew.endTime ? ensureTime24h(ew.endTime) : null,
    })),
  ];

  return {
    semesterInfo,
    classSchedules,
    calendarEvents,
    examWeekBlockers,
    examEvents,
    examWeeks: legacyExamWeeks,
  };
}

// ── Strict ISO-8601 & Time Helpers ─────────────────────────────────────────────

function ensureIsoDate(value?: string | null, fallback?: string): string {
  if (!value || value.trim() === "") {
    if (fallback && fallback.trim() !== "") return ensureIsoDate(fallback);
    return new Date().toISOString();
  }

  const trimmed = value.trim();
  const ymdMatch = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d+))?)?(?:Z|([+-]\d{2}:?\d{2}))?)?/
  );
  if (ymdMatch) {
    const [, y, m, d, hh = "00", mm = "00", ss = "00", ms = "000"] = ymdMatch;
    const padMonth = m.padStart(2, "0");
    const padDay = d.padStart(2, "0");
    const padHour = hh.padStart(2, "0");
    const padMin = mm.padStart(2, "0");
    const padSec = ss.padStart(2, "0");
    const padMs = ms.slice(0, 3).padEnd(3, "0");
    return `${y}-${padMonth}-${padDay}T${padHour}:${padMin}:${padSec}.${padMs}Z`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  if (fallback && fallback.trim() !== "") return ensureIsoDate(fallback);
  return new Date().toISOString();
}

function ensureDateOnly(value?: string | null): string | null {
  if (!value || value.trim() === "") return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

function ensureTime24h(value?: string | null, fallback = "08:00"): string {
  if (!value || value.trim() === "") return fallback;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{1,2})/);
  if (match) {
    const [, h, m] = match;
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  }
  return fallback;
}

