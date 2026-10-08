/**
 * Task Parser Service
 *
 * Handles extracting academic tasks from documents (PDF, DOCX, Images)
 * and generating milestone subtask breakdowns using Gemini AI.
 */

import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { generateWithFallback, GeminiPart } from "@/utils/gemini";

export type SupportedMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "text/plain";

export interface SubjectContext {
  id: string;
  name: string;
}

export interface ParsedTask {
  title: string;
  description: string | null;
  dueDate: string | null;      // ISO-8601 string
  subjectId: string | null;    // Matched subject ID if matched with student's subjects
  subjectName: string | null;  // Detected subject/course name or code from document
}

export interface SubtaskMilestone {
  id: string;
  title: string;
  completed: boolean;
}

// ── Document Extractors ────────────────────────────────────────────────────────

async function extractFromPdf(buffer: Buffer): Promise<{ text: string; isScanned: boolean }> {
  try {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const text = parsed?.text ? parsed.text.trim() : "";
    if (text.length > 50) {
      return { text, isScanned: false };
    }
    return { text: "", isScanned: true };
  } catch {
    return { text: "", isScanned: true };
  }
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

// ── Ensure Strict ISO-8601 Format in PHT (+08:00) ──────────────────────────────

function ensurePhtIsoDate(value?: string | null): string | null {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  const trimmed = value.trim();

  // Match YYYY-MM-DD with optional time
  const match = trimmed.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  );

  if (match) {
    const [, y, m, d, hh = "23", mm = "59", ss = "00"] = match;
    const padMonth = m.padStart(2, "0");
    const padDay = d.padStart(2, "0");
    const padHour = hh.padStart(2, "0");
    const padMin = mm.padStart(2, "0");
    const padSec = ss.padStart(2, "0");
    return `${y}-${padMonth}-${padDay}T${padHour}:${padMin}:${padSec}.000+08:00`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
}

// ── Main Task Extraction ───────────────────────────────────────────────────────

export async function parseTasksFromFile(
  buffer: Buffer,
  mimeType: SupportedMimeType,
  subjects: SubjectContext[] = [],
  currentDate?: string
): Promise<{ tasks: ParsedTask[] }> {
  const todayRef = currentDate || new Date().toISOString().slice(0, 10);

  const subjectsPromptList = subjects.length > 0
    ? subjects.map((s) => `- ID: "${s.id}", Name: "${s.name}"`).join("\n")
    : "No subjects provided.";

  const systemPrompt = `You are an expert AI academic task extractor for college students.
Your job is to analyze the provided document (syllabus, assignment sheet, rubric, portal/LMS screenshot, whiteboard photo, or to-do list) and detect all actionable student tasks, homework, deliverables, lab reports, essays, quizzes, and projects.

TODAY'S REFERENCE DATE: ${todayRef} (Philippine Standard Time, UTC+8).
STUDENT'S EXISTING SUBJECTS LIST:
${subjectsPromptList}

INSTRUCTIONS:
1. Identify all deliverables, assignments, problem sets, project milestones, readings with deadlines, lab reports, and exam preparation items.
2. For each task:
   - "title": Clear and concise task name (e.g. "Problem Set 4: Dynamic Programming", "Literature Review Draft", "Case Study 2").
   - "description": Relevant details, required pages, deliverables, guidelines, or topics covered. If none, null.
   - "dueDate": Target deadline in ISO-8601 format with Philippine timezone "+08:00" (e.g. "2026-10-20T23:59:00.000+08:00").
     - If only a date is given without time, default to 23:59:00 (end of day).
     - If a relative date is given (e.g. "Next Friday", "In 2 weeks"), calculate the date relative to TODAY (${todayRef}).
     - If no deadline can be found or inferred, set "dueDate" to null.
   - "subjectId": If the task clearly relates to one of the student's subjects in the list above, provide its exact "ID". If uncertain or no match, set null.
   - "subjectName": The course code or subject title mentioned in the document (e.g. "CS 101", "Linear Algebra", "ENG 2"). If none, null.

3. Output format: Return ONLY a valid JSON object matching this exact shape, with no markdown or additional commentary:
{
  "tasks": [
    {
      "title": "<Task Title>",
      "description": "<Optional details or null>",
      "dueDate": "<YYYY-MM-DDTHH:mm:ss.sss+08:00 or null>",
      "subjectId": "<Matching Subject ID or null>",
      "subjectName": "<Course code or name from document, or null>"
    }
  ]
}

If no tasks are detected in the document, return { "tasks": [] }.`;

  let promptParts: GeminiPart[];

  if (mimeType === "application/pdf") {
    const { text, isScanned } = await extractFromPdf(buffer);
    if (!isScanned && text.length > 50) {
      promptParts = [
        { text: `${systemPrompt}\n\nDOCUMENT TEXT:\n${text}` },
      ];
    } else {
      // Scanned PDF — pass directly to Gemini Vision as base64
      promptParts = [
        { text: systemPrompt },
        { inlineData: { mimeType: "application/pdf", data: buffer.toString("base64") } },
      ];
    }
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const docxText = await extractFromDocx(buffer);
    promptParts = [
      { text: `${systemPrompt}\n\nDOCUMENT TEXT:\n${docxText}` },
    ];
  } else if (mimeType.startsWith("image/")) {
    promptParts = [
      { text: systemPrompt },
      { inlineData: { mimeType, data: buffer.toString("base64") } },
    ];
  } else if (mimeType === "text/plain") {
    promptParts = [
      { text: `${systemPrompt}\n\nDOCUMENT TEXT:\n${buffer.toString("utf-8")}` },
    ];
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const rawResponse = await generateWithFallback(promptParts);
  return normalizeTaskScanResult(rawResponse);
}

function normalizeTaskScanResult(rawText: string): { tasks: ParsedTask[] } {
  let jsonText = rawText.trim();
  const match = jsonText.match(/```(?:json)?([\s\S]*?)```/);
  if (match) jsonText = match[1].trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`[TaskParser] Gemini returned non-JSON output: ${rawText.slice(0, 200)}`);
  }

  const rawTasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];

  const tasks: ParsedTask[] = rawTasks
    .filter((t: any) => t && typeof t.title === "string" && t.title.trim().length > 0)
    .map((t: any) => ({
      title: String(t.title).trim(),
      description: t.description ? String(t.description).trim() : null,
      dueDate: ensurePhtIsoDate(t.dueDate),
      subjectId: t.subjectId ? String(t.subjectId).trim() : null,
      subjectName: t.subjectName ? String(t.subjectName).trim() : null,
    }));

  return { tasks };
}

// ── AI Subtask Breakdown Generator ─────────────────────────────────────────────

export async function breakdownTask(
  title: string,
  description?: string | null,
  dueDate?: string | null
): Promise<{ subtasks: SubtaskMilestone[] }> {
  const prompt = `You are an expert universal productivity and task execution coach.
The user has the following task (which can be academic, personal life, work/freelance, administrative, health/fitness, household, creative, coding/tech, or daily errands):
Title: "${title}"
${description ? `Description: "${description}"` : ""}
${dueDate ? `Due Date: "${dueDate}"` : ""}

Break this task down into 3 to 5 clear, concrete, sequential milestone subtasks that make it effortless to begin and finish without feeling overwhelmed.
Adapt the tone and action verbs naturally to the domain of the task:
- For daily life / errands / home: "Gather", "Buy", "Organize", "Schedule", "Clean"
- For creative / professional / work: "Outline", "Draft", "Review", "Deliver", "Present"
- For academic: "Research", "Synthesize", "Draft", "Solve", "Review"
- For technical / software: "Set up", "Implement", "Test", "Deploy", "Debug"
- For health / fitness / administrative: "Register", "Prepare", "Complete", "Submit"

Keep each subtask concise, highly actionable, and under 10 words.

Output format: Return ONLY a valid JSON object matching this exact shape:
{
  "subtasks": [
    { "id": "1", "title": "<Subtask 1 action>", "completed": false },
    { "id": "2", "title": "<Subtask 2 action>", "completed": false },
    { "id": "3", "title": "<Subtask 3 action>", "completed": false }
  ]
}`;

  const rawResponse = await generateWithFallback([{ text: prompt }]);

  let jsonText = rawResponse.trim();
  const match = jsonText.match(/```(?:json)?([\s\S]*?)```/);
  if (match) jsonText = match[1].trim();

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`[TaskBreakdown] Gemini returned non-JSON output: ${rawResponse.slice(0, 200)}`);
  }

  const rawSubtasks = Array.isArray(parsed?.subtasks) ? parsed.subtasks : [];
  const subtasks: SubtaskMilestone[] = rawSubtasks
    .filter((s: any) => s && typeof s.title === "string" && s.title.trim().length > 0)
    .map((s: any, idx: number) => ({
      id: String(s.id || idx + 1),
      title: String(s.title).trim(),
      completed: Boolean(s.completed),
    }));

  return { subtasks };
}
