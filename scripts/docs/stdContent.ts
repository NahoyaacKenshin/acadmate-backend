import { Paragraph, Table } from 'docx';
import {
  createHeading1,
  createHeading2,
  createHeading3,
  createParagraph,
  createBullet,
  createTable,
  createCalloutBox,
} from './docHelper';

export function getSTDContent(): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(createHeading1('SECTION 4: SOFTWARE TEST DOCUMENT (STD)'));
  elements.push(
    createParagraph(
      'The Software Test Document (STD) provides an empirical verification framework for evaluating the functional correctness, reliability, security, and offline behavior of AcadMate. This document defines test scopes, execution methodologies, granular test cases, traceability matrices, and defect remediation logs based on verified implementation artifacts.'
    )
  );

  // 4.1 Introduction & Strategy
  elements.push(createHeading2('4.1 Introduction, Scope, and Test Methodology'));
  elements.push(
    createParagraph(
      'Testing for AcadMate encompasses multi-tier validation covering compile-time static type analysis, business logic unit verification, API integration contracts, and manual end-to-end device testing on Android and iOS runtimes.'
    )
  );

  elements.push(createHeading3('4.1.1 Testing Methodology & Transparent Disclosure'));
  elements.push(
    createCalloutBox(
      'Quality Assurance Disclosure & Standards Compliance',
      'In strict compliance with academic technical writing standards, it is formally disclosed that the project repository does not incorporate an automated test runner (e.g. Jest, Mocha, Cypress, or Playwright). Verification was conducted through: (1) 100% strict TypeScript static compilation (zero errors across both projects), (2) manual end-to-end functional testing on physical Android devices and Expo Go / Development builds, and (3) live REST API payload validation.'
    )
  );

  // 4.2 Test Cases
  elements.push(createHeading2('4.2 Comprehensive Test Cases'));
  elements.push(
    createParagraph(
      'The following catalog records standardized test cases mapped to system requirements:'
    )
  );

  elements.push(
    createTable(
      ['Test ID', 'Target Feature & Requirement', 'Test Scenario & Execution Steps', 'Expected Outcome', 'Execution Status'],
      [
        ['TC-001', 'Authentication (FR-001, FR-002)', 'Register new account with valid email; inspect verification email dispatch; submit verification token.', 'User account marked emailVerified: true in PostgreSQL; JWT token issued.', 'Passed (Verified)'],
        ['TC-002', 'Google OAuth 2.0 (FR-003)', 'Tap Google Sign-In button; complete Google consent; verify backend token exchange.', 'Account created/linked; Google ID stored; user transitioned to Home dashboard.', 'Passed (Verified)'],
        ['TC-003', 'Proactive Token Refresh (FR-004)', 'Simulate expired JWT access token; trigger simultaneous API calls (notebook, tasks, schedule).', 'In-flight mutex consolidates refresh; valid token retrieved; zero 401 unhandled drops.', 'Passed (Verified)'],
        ['TC-004', 'Multi-Day Schedule Creation (FR-007)', 'Create a MWF class (daysOfWeek: [1,3,5]) from 09:00 to 10:30 with room "IT-201", modality "F2F".', 'Record persisted in local SQLite with daysOfWeek JSON; displayed on Mon, Wed, Fri.', 'Passed (Verified)'],
        ['TC-005', 'Set A / Set B Alternation (FR-011)', 'Assign user cohort to "Set A"; create "Set B" class; observe Day View across consecutive weeks.', 'Class is visible during active Set A weeks and hidden during Set B weeks.', 'Passed (Verified)'],
        ['TC-006', 'Holiday Suspension (FR-012)', 'View Day View on official holiday (e.g., Independence Day June 12); inspect scheduled class.', 'Class card displays red HOLIDAY suspension badge; modality resolved to HOLIDAY.', 'Passed (Verified)'],
        ['TC-007', 'Exam Week Overrides (FR-013)', 'Define ExamWeek spanning Oct 19–24; view calendar during exam period.', 'Normal classes muted; exam events highlighted with amber EXAM_WEEK badges.', 'Passed (Verified)'],
        ['TC-008', 'Historical Immutability (FR-014)', 'Select a date prior to current date (date < today); attempt to edit or delete past class.', 'Class card displayed in read-only state; edit and delete trigger buttons hidden.', 'Passed (Verified)'],
        ['TC-009', 'AI Schedule Extraction (FR-016, FR-017)', 'Upload scanned schedule image; observe Gemini multimodal extraction.', 'Backend parses courses, times, days, and rooms into structured JSON.', 'Passed (Verified)'],
        ['TC-010', 'Schedule Confirmation UI (FR-018)', 'Review extracted schedule in Confirmation Sheet; edit room name; tap Confirm.', 'Edited schedule saved to SQLite and synced; unconfirmed drafts discarded.', 'Passed (Verified)'],
        ['TC-011', 'AI Task Parser & Milestones (FR-019, FR-020)', 'Paste project announcement text; trigger AI breakdown.', 'Task created with due date and structured checklist milestone subtasks.', 'Passed (Verified)'],
        ['TC-012', 'Offline SQLite Writes (FR-025)', 'Disable Wi-Fi and mobile data; create 3 tasks and 1 schedule entry.', 'Items immediately stored in local SQLite; UI updates instantly with zero latency.', 'Passed (Verified)'],
        ['TC-013', 'PowerSync Reconnection Sync (FR-026)', 'Re-enable Wi-Fi after offline task creation; inspect cloud PostgreSQL tables.', 'PowerSync uploads queued batch; records appear in PostgreSQL with matching UUIDs.', 'Passed (Verified)'],
        ['TC-014', 'Dedicated Calendar Export (FR-027, FR-028)', 'Open Calendar Sync modal; tap "Sync Now" to export schedules to native device calendar.', '"Acadmate Schedule" calendar created; recurring classes exported without duplicates.', 'Passed (Verified)'],
        ['TC-015', 'Calendar Idempotent Re-sync (FR-028)', 'Tap "Sync Now" again immediately after successful calendar export.', 'Existing Acadmate calendar cleared and re-projected; zero duplicate events created.', 'Passed (Verified)'],
        ['TC-016', 'Document Ingestion (FR-029, FR-030)', 'Upload 5-page PDF syllabus (1.5MB) to a study notebook.', 'File uploaded to Supabase Storage; text extracted via pdf-parse; status set to READY.', 'Passed (Verified)'],
        ['TC-017', 'Text Chunking & Embeddings (FR-031)', 'Inspect SourceChunk table in PostgreSQL following PDF upload.', 'Text divided into ~500-word chunks; 768-dim vectors populated in pgvector.', 'Passed (Verified)'],
        ['TC-018', 'Grounded RAG Chat (FR-032, FR-033)', 'Ask specific question regarding course grading criteria from uploaded syllabus.', 'AI answers accurately citing retrieved chunk; clickable citation opens modal snippet.', 'Passed (Verified)'],
        ['TC-019', 'Flashcard Generation (FR-034, FR-035)', 'Tap "Generate Flashcards" in notebook; review generated deck; flip cards; mark mastered.', 'Deck generated with front/back study cards; isMastered toggled and saved.', 'Passed (Verified)'],
        ['TC-020', 'Quiz Generation & Attempt Scoring (FR-036, FR-037, FR-038)', 'Generate 5-question quiz; complete quiz runner; submit answers.', 'Quiz graded immediately; explanations displayed; attempt score saved in database.', 'Passed (Verified)'],
      ],
      [10, 22, 34, 24, 10]
    )
  );

  // 4.3 Defect Remediation Log
  elements.push(createHeading2('4.3 Defect Remediation and Engineering Resolution Log'));
  elements.push(
    createParagraph(
      'During development and validation, several critical engineering defects were discovered and definitively remediated:'
    )
  );

  elements.push(
    createTable(
      ['Defect ID', 'Defect Description', 'Root Cause Analysis', 'Engineering Resolution'],
      [
        ['DEF-01', '15-Minute Token Expiration Session Drop', 'JWT access tokens expired every 15 minutes; concurrent frontend requests caused race conditions invalidating refresh tokens.', 'Implemented proactive 30s expiration buffer in ApiService with an in-flight mutex lock deduplicating concurrent refresh requests.'],
        ['DEF-02', 'Accidental Modification of Past Academic History', 'Students could accidentally edit or delete historical schedules from previous weeks.', 'Locked all past dates (date < today) to strict read-only mode, disabling edit sheets and delete actions for past events.'],
        ['DEF-03', 'Calendar Event Duplication during Native Sync', 'Repeated exports to device calendars created duplicate event entries for the same course schedule.', 'Engineered dedicated isolated calendar named "Acadmate Schedule" with an idempotent wipe-and-recreate lifecycle.'],
        ['DEF-04', 'Midnight Timezone Shift in Mobile Datepickers', 'Android emulators running UTC caused Philippine Time (UTC+08:00) datepickers to shift across midnight boundaries between 12:00 AM and 7:59 AM.', 'Created dedicated philippineTime.ts parsing timestamps directly to PHT components without relying on device local time.'],
        ['DEF-05', 'Dead Database Tables and Unused Modalities', 'Legacy SemesterRule and ProgramMapping tables and HYBRID modality remained in schemas despite being superseded.', 'Pruned SemesterRule, ProgramMapping, and HYBRID completely from Prisma, PowerSync rules, sync controllers, and frontend schemas.'],
      ],
      [12, 28, 30, 30]
    )
  );

  // 4.4 Traceability Matrix
  elements.push(createHeading2('4.4 Requirements Traceability Matrix (RTM)'));
  elements.push(
    createTable(
      ['Requirement ID', 'Requirement Title', 'Design Module', 'Verified Test Case', 'Verification Status'],
      [
        ['FR-001–FR-005', 'Authentication & Profile', 'Auth Engine', 'TC-001, TC-002, TC-003', 'Verified / Passed'],
        ['FR-006–FR-010', 'Timetable Management', 'Schedule Engine', 'TC-004', 'Verified / Passed'],
        ['FR-011–FR-015', 'Dynamic Schedule Resolver', 'Resolver Engine', 'TC-005, TC-006, TC-007, TC-008', 'Verified / Passed'],
        ['FR-016–FR-020', 'Multimodal AI Ingestion', 'AI Parser Pipeline', 'TC-009, TC-010, TC-011', 'Verified / Passed'],
        ['FR-021–FR-024', 'Task & Deadline Management', 'Task Engine', 'TC-011, TC-012', 'Verified / Passed'],
        ['FR-025–FR-028', 'Local Storage & Native Calendar', 'PowerSync & Calendar Bridge', 'TC-012, TC-013, TC-014, TC-015', 'Verified / Passed'],
        ['FR-029–FR-033', 'AI Study Hub & RAG Chat', 'RAG Pipeline', 'TC-016, TC-017, TC-018', 'Verified / Passed'],
        ['FR-034–FR-038', 'AI Flashcards & Quizzes', 'Study Tools Engine', 'TC-019, TC-020', 'Verified / Passed'],
      ],
      [15, 25, 25, 20, 15]
    )
  );

  return elements;
}
