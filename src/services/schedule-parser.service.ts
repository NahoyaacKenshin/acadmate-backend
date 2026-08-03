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

const buildSystemPrompt = (studentSet?: "A" | "B"): string => {
  const setInstruction = studentSet
    ? `\n- STUDENT SET: This student belongs to Set ${studentSet}. When a class schedule lists separate rooms for ` +
      `Set A and Set B (e.g. columns labeled "SET A ROOM" and "SET B ROOM"), extract ONLY the room assigned ` +
      `to Set ${studentSet}. If that room says "ONLINE", set modality to "ONLINE" and room to null. ` +
      `Always set setType to "${studentSet}" for alternating Saturday classes unless the class runs every week (use "BOTH").`
    : "";

  return `You are an intelligent academic schedule extractor for a Philippine university student planner app.

STEP 1 — IDENTIFY THE DOCUMENT TYPE:
Before extracting, identify which type of schedule this is:

TYPE A — REGULAR CLASS SCHEDULE (semestral timetable):
  Signs: Recurring weekly classes, has a day of the week (Mon/Tue/Wed/etc.), shows a semester-long time slot per subject.
  Example: "IT101 | Monday & Wednesday | 10:00-11:30 | Room 201"
  → Extract into: classSchedules

TYPE B — EXAM SCHEDULE / EXAM PERMIT (one-time per subject):
  Signs: Shows specific DATES (not days of week) for each subject's exam, words like "Exam", "Final", "Midterm", "Prelim" next to subjects.
  Example: "IT101 — July 30, 2026, 10:00 AM | Room 302"
  Example: "Subject: Math 101 | Date: August 5, 2026 | Time: 1:00 PM"
  → Extract each subject exam slot into: examWeeks (with startDate = exam datetime, endDate = exam end time or same as startDate)

TYPE C — ACADEMIC CALENDAR / HOLIDAY NOTICES:
  Signs: Announced dates for breaks, holidays, institutional events.
  → Extract into: calendarEvents

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
      "title": "<subject exam title, e.g. 'IT101 Final Exam' or 'Midterm Examinations'>",
      "startDate": "<ISO-8601 datetime of exam start>",
      "endDate": "<ISO-8601 datetime of exam end, or same as startDate if unknown>"
    }
  ]
}

CRITICAL RULES:
- NEVER put exam permit entries (specific exam dates per subject) into classSchedules. They are one-time events, not recurring classes.
- classSchedules ONLY contains recurring weekly classes (e.g. every Monday, every MWF).
- examWeeks contains BOTH: (a) individual per-subject exam slots from an exam permit, AND (b) school-wide exam period blocks (e.g. "Midterm Week: Aug 1-5").
- dayOfWeek: Use integers 0–6 (0=Sunday, 1=Monday, ..., 6=Saturday). For Philippine schedules M=1, T=2, W=3, Th=4, F=5, S=6.
- All dates must be strictly formatted as ISO-8601 (e.g. "2026-08-01T00:00:00.000Z"). If only a date is given, append "T00:00:00.000Z".
- If a field is truly unknown, use null.
- setType: Use "BOTH" if the class meets every week. Use "A" or "B" for alternating schedules. Use null if unclear.
- Merge split time entries (e.g. "MWF 7:30-9:00") into separate classSchedule items per day.
- If the document refers to Philippine official holidays (e.g. Rizal Day, Independence Day), add them as calendarEvents with allDay: true.
- If no items exist for a category, return an empty array [].
- Do NOT include any explanation, markdown, or text outside the JSON object.${setInstruction}`;
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
    startDate: ensureIsoDate(ew.startDate),
    endDate: ensureIsoDate(ew.endDate),
  }));

  // ── 6. Student Scanner Exam Schedule Filtering ─────────────────────────────
  // If this is a student scan, reject multi-day exam weeks. Only accept single/one-off day exam schedules.
  if (isStudentScan) {
    parsed.examWeeks = (parsed.examWeeks ?? []).filter((ew) => {
      const startDay = ew.startDate.split("T")[0];
      const endDay = ew.endDate.split("T")[0];
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
