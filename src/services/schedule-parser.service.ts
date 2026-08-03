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
  startDate: string | null; // ISO-8601 datetime if specific date is known, else null
  endDate: string | null;   // ISO-8601 datetime if specific date is known, else null
  dayOfWeek?: number | null; // 0=Sun…6=Sat — set when only day-of-week is known (no specific date)
  startTime?: string | null; // HH:MM 24-hour — set when only time is known, no specific date
  endTime?: string | null;   // HH:MM 24-hour
}

export interface ParsedScheduleResult {
  classSchedules: ParsedClassSchedule[];
  calendarEvents: ParsedCalendarEvent[];
  examWeeks: ParsedExamWeek[];
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

STEP 1 — IDENTIFY THE DOCUMENT TYPE:
Before extracting, carefully determine the primary category of the document:

CATEGORY A — EXAM SCHEDULE / EXAM PERMIT / TEST TIMETABLE:
  Signs: Document title or text contains words like "EXAM", "EXAMINATION", "MIDTERM", "FINAL", "PRELIM", "QUIZ", "TEST", "PERMIT", "ASSESSMENT", "SEAT PLAN", or lists rows of subjects with a day (Mon/Tue/etc.) and time but no specific calendar date.
  → CRITICAL INSTRUCTION FOR EXAM DOCUMENTS:
    - ALL subject exam entries MUST be extracted into the "examWeeks" array!
    - DO NOT place subject exam entries into "classSchedules"! Even if an exam schedule table has columns labeled "Day" (e.g. "Mon") and "Time" (e.g. "8:00 AM - 10:00 AM"), it is still an EXAM, NOT a recurring weekly class.
    - SPECIFIC DATE KNOWN (e.g. "August 15, 2026"): Set startDate/endDate as ISO-8601, leave dayOfWeek/startTime/endTime null.
    - ONLY DAY + TIME KNOWN (e.g. "Monday 8:00 AM - 10:00 AM", no specific date): Set startDate=null, endDate=null, and populate:
        * "dayOfWeek": integer 0–6 (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
        * "startTime": "HH:MM" 24-hour format
        * "endTime": "HH:MM" 24-hour format
      The app will automatically resolve the actual calendar date from the admin-set exam week block.
    - Each subject exam entry in "examWeeks" MUST have:
      * "title": Subject code/name and exam type (e.g. "IT101 Midterm Exam" or "Math 101 Final Exam")

CATEGORY B — REGULAR CLASS SCHEDULE (SEMESTRAL TIMETABLE):
  Signs: Recurring weekly class schedule for the entire semester (e.g. "MWF 10:00-11:30 AM", "Every Monday Room 201").
  → Extract into: "classSchedules"
  → "classSchedules" is ONLY for recurring weekly classes that repeat every week across the semester. NEVER put exams or specific one-off dates here.

CATEGORY C — ACADEMIC CALENDAR / HOLIDAY NOTICES / ONE-OFF EVENTS:
  Signs: Single-day or multi-day non-class events, holidays, school activities, orientation, sports fest, workshops, institutional announcements.
  → Extract into: "calendarEvents"

STEP 2 — EXTRACT using this EXACT JSON shape:
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
      "title": "<subject exam title e.g. 'IT101 Midterm Exam'>",
      "startDate": "<ISO-8601 datetime if specific date known, else null>",
      "endDate": "<ISO-8601 datetime if specific date known, else null>",
      "dayOfWeek": "<0-6 integer if only day-of-week known and no specific date, else null>",
      "startTime": "<HH:MM 24h if only time known and no specific date, else null>",
      "endTime": "<HH:MM 24h if only time known and no specific date, else null>"
    }
  ]
}

CRITICAL RULES:
- If a row or document represents an exam, test, quiz, or exam permit, place it in "examWeeks", NEVER "classSchedules".
- "classSchedules" ONLY contains recurring weekly classes.
- "calendarEvents" contains non-class one-off events and holidays.
- dayOfWeek: Use integers 0–6 (0=Sunday, 1=Monday, ..., 6=Saturday).
- All dates must be strictly formatted as ISO-8601 (e.g. "2026-08-15T08:00:00.000Z").
- If a field is unknown, use null.
- Merge split time entries (e.g. "MWF 7:30-9:00") into separate classSchedule items per day.
- If no items exist for a category, return [].
- Do NOT include any markdown, explanation, or text outside the JSON object.${setInstruction}`;
};

const MERGE_PROMPT_SUFFIX = (current: string) => `

IMPORTANT — MERGE INSTRUCTION:
The user already has the following parsed schedule from a previous document:
${current}

Using the new document above, produce the FINAL merged schedule:
- If the new document adds detail to an existing class (e.g. updates setType from null to "A", changes room, adds dates), UPDATE that existing entry.
- If the new document contains a class NOT already in the list, ADD it.
- If the new document contains exam weeks or events NOT already in the list, ADD them.
- Do NOT create duplicate entries for the same subject, day, and time slot.
- Return the complete final merged JSON for ALL arrays (classSchedules, calendarEvents, examWeeks).`;

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
  mimeType: SupportedMimeType,
  currentSchedule?: string,
  studentSet?: "A" | "B",
  isStudentScan?: boolean
): Promise<ParsedScheduleResult> {
  const SYSTEM_PROMPT = buildSystemPrompt(studentSet);
  // ── 1. Extract content depending on file type ─────────────────────────────
  let parts: GeminiPart[];

  if (mimeType === "application/pdf") {
    const text = await extractFromPdf(buffer);
    const mergeNote = currentSchedule ? MERGE_PROMPT_SUFFIX(currentSchedule) : "";
    parts = [{ text: `${SYSTEM_PROMPT}${mergeNote}\n\nDocument Content:\n${text}` }];
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const text = await extractFromDocx(buffer);
    const mergeNote = currentSchedule ? MERGE_PROMPT_SUFFIX(currentSchedule) : "";
    parts = [{ text: `${SYSTEM_PROMPT}${mergeNote}\n\nDocument Content:\n${text}` }];
  } else {
    // Image — pass directly to Gemini Vision as base64
    const base64 = buffer.toString("base64");
    const mergeNote = currentSchedule ? MERGE_PROMPT_SUFFIX(currentSchedule) : "";
    parts = [
      { text: mergeNote ? `${SYSTEM_PROMPT}${mergeNote}` : SYSTEM_PROMPT },
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
    startDate: ew.startDate ? ensureIsoDate(ew.startDate) : null,
    endDate: ew.endDate ? ensureIsoDate(ew.endDate, ew.startDate ?? undefined) : null,
  }));

  // ── 6. Auto-relocate misclassified exam entries in classSchedules ─────────
  const isExamKeyword = (text: string) =>
    /exam|midterm|final|prelim|quiz|test|permit|assessment|seatwork|departmental/i.test(text);

  const cleanClassSchedules: ParsedClassSchedule[] = [];
  for (const cs of parsed.classSchedules) {
    if (isExamKeyword(cs.subjectName || "")) {
      const start = cs.startDate ? ensureIsoDate(cs.startDate) : new Date().toISOString();
      const end = cs.endDate ? ensureIsoDate(cs.endDate, start) : start;
      parsed.examWeeks.push({
        title: cs.subjectName,
        startDate: start,
        endDate: end,
      });
    } else {
      cleanClassSchedules.push(cs);
    }
  }
  parsed.classSchedules = cleanClassSchedules;

  // ── 7. Student Scanner Exam Schedule Filtering ─────────────────────────────
  // For student scans: reject school-wide multi-day blocks (those with specific startDate spanning multiple days).
  // Entries with dayOfWeek set (no specific date) are always kept — they will be resolved client-side.
  if (isStudentScan) {
    parsed.examWeeks = (parsed.examWeeks ?? []).filter((ew) => {
      // Keep entries with no specific date (day-of-week only) — these are student exam slots
      if (!ew.startDate) return true;
      // Reject multi-day school-wide blocks (same as before)
      const startDay = ew.startDate.split("T")[0];
      const endDay = ew.endDate ? ew.endDate.split("T")[0] : startDay;
      return startDay === endDay;
    });
  }

  return parsed;
}

// ── Admin Feature-Scoped Scanner Types & Prompts ──────────────────────────────

export type AdminFeatureType =
  | "set-ab"
  | "program-mapping"
  | "exam-week"
  | "special-holidays"
  | "suspension";

export interface ParsedAdminRule {
  startDate: string;
  endDate?: string | null;
  dayOfWeek: number;
  setType: "A" | "B";
  label?: string | null;
}

export interface ParsedAdminProgramMapping {
  programName: string;
  studentSet: "A" | "B";
}

export interface ParsedAdminExamWeek {
  title: string;
  startDate: string;
  endDate: string;
}

export interface ParsedAdminHoliday {
  date: string;
  name: string;
  type: "REGULAR" | "SPECIAL" | "SUSPENSION";
}

export interface ParsedAdminFeatureResult {
  rules?: ParsedAdminRule[];
  mappings?: ParsedAdminProgramMapping[];
  examWeeks?: ParsedAdminExamWeek[];
  holidays?: ParsedAdminHoliday[];
}

const buildAdminFeaturePrompt = (feature: AdminFeatureType): string => {
  switch (feature) {
    case "set-ab":
      return `You are an AI assistant for a university admin.
Extract ONLY Set A/Set B Saturday or day-of-week semester schedule rules from this document.
DO NOT extract individual student class schedules, program mappings, holidays, or exam weeks.
Return ONLY JSON in this exact shape:
{
  "rules": [
    {
      "startDate": "<YYYY-MM-DD>",
      "endDate": "<YYYY-MM-DD or null>",
      "dayOfWeek": <0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat>,
      "setType": "<A or B>",
      "label": "<label string or null>"
    }
  ]
}`;

    case "program-mapping":
      return `You are an AI assistant for a university admin.
Extract ONLY degree program to student Set A or Set B mappings (e.g. BSIT -> Set A, BSHM -> Set B) from this document.
DO NOT extract individual class schedules, calendar events, holidays, or exam weeks.
Return ONLY JSON in this exact shape:
{
  "mappings": [
    {
      "programName": "<e.g. BSIT>",
      "studentSet": "<A or B>"
    }
  ]
}`;

    case "exam-week":
      return `You are an AI assistant for a university admin.
Extract ONLY multi-day or global school-wide Exam Weeks / Exam Periods (e.g. Midterm Examination Week: Aug 1 to Aug 5) from this document.
DO NOT extract individual student daily class schedules or single-day events.
Return ONLY JSON in this exact shape:
{
  "examWeeks": [
    {
      "title": "<e.g. Midterm Examination Week>",
      "startDate": "<ISO-8601 datetime>",
      "endDate": "<ISO-8601 datetime>"
    }
  ]
}`;

    case "special-holidays":
      return `You are an AI assistant for a university admin.
Extract ONLY official or special non-working holidays from this document.
DO NOT extract class schedules, degree program mappings, or exam weeks.
Return ONLY JSON in this exact shape:
{
  "holidays": [
    {
      "date": "<YYYY-MM-DD>",
      "name": "<Holiday name>",
      "type": "<SPECIAL or REGULAR>"
    }
  ]
}`;

    case "suspension":
      return `You are an AI assistant for a university admin.
Extract ONLY class suspension notices or weather/emergency suspension announcements from this document.
DO NOT extract recurring class schedules or exam weeks.
Return ONLY JSON in this exact shape:
{
  "holidays": [
    {
      "date": "<YYYY-MM-DD>",
      "name": "<Suspension reason or title>",
      "type": "SUSPENSION"
    }
  ]
}`;
  }
};

export async function parseAdminFeatureFromFile(
  buffer: Buffer,
  mimeType: SupportedMimeType,
  feature: AdminFeatureType
): Promise<ParsedAdminFeatureResult> {
  const SYSTEM_PROMPT = buildAdminFeaturePrompt(feature);
  let parts: GeminiPart[];

  if (mimeType === "application/pdf") {
    const text = await extractFromPdf(buffer);
    parts = [{ text: `${SYSTEM_PROMPT}\n\nDocument Content:\n${text}` }];
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const text = await extractFromDocx(buffer);
    parts = [{ text: `${SYSTEM_PROMPT}\n\nDocument Content:\n${text}` }];
  } else {
    const base64 = buffer.toString("base64");
    parts = [
      { text: SYSTEM_PROMPT },
      { inlineData: { mimeType, data: base64 } },
    ];
  }

  const rawText = await generateWithFallback(parts);
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: ParsedAdminFeatureResult;
  try {
    parsed = JSON.parse(jsonText) as ParsedAdminFeatureResult;
  } catch {
    throw new Error(`[ScheduleParser] Admin AI returned non-JSON output: ${rawText.slice(0, 200)}`);
  }

  return parsed;
}

// ── ISO-8601 Enforcement Helper ────────────────────────────────────────────────

function ensureIsoDate(value?: string | null, fallback?: string): string {
  if (!value || value.trim() === "") {
    if (fallback && fallback.trim() !== "") return ensureIsoDate(fallback);
    return new Date().toISOString();
  }
  if (value.includes("T")) return value;
  const asDate = new Date(`${value}T00:00:00.000Z`);
  if (isNaN(asDate.getTime())) {
    if (fallback && fallback.trim() !== "") return ensureIsoDate(fallback);
    return new Date().toISOString();
  }
  return asDate.toISOString();
}
