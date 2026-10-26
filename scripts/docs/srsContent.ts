import { Paragraph, Table } from 'docx';
import {
  createHeading1,
  createHeading2,
  createHeading3,
  createParagraph,
  createBullet,
  createTable,
  createCalloutBox,
  createFigure,
} from './docHelper';

export function getSRSContent(): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(createHeading1('SECTION 2: SOFTWARE REQUIREMENTS SPECIFICATION (SRS)'));
  elements.push(
    createParagraph(
      'The Software Requirements Specification (SRS) establishes the formal functional and non-functional requirements governing the implementation and validation of AcadMate: An Offline-First Intelligent Academic Planner & Study Assistant. This document details system behaviors, user interactions, external interfaces, data structures, and operational constraints based on verified codebase artifacts.'
    )
  );

  // 2.1 Introduction & Definitions
  elements.push(createHeading2('2.1 Introduction and Document Conventions'));
  elements.push(
    createParagraph(
      'AcadMate provides collegiate students with an autonomous, offline-capable academic operating environment. Requirements are uniquely cataloged using standardized identifier prefixes: Functional Requirements (FR-xxx) and Non-Functional Requirements (NFR-xxx).'
    )
  );

  elements.push(
    createTable(
      ['Term / Abbreviation', 'Definition and Domain Context'],
      [
        ['Offline-First', 'An architectural pattern where data read and write operations execute primarily against an embedded on-device database (SQLite), synchronizing asynchronously with cloud storage when network connectivity is available.'],
        ['PowerSync', 'A local-first data synchronization engine establishing bidirectional replication streams between client-side SQLite and server-side PostgreSQL.'],
        ['Set A / Set B', 'An alternating institutional cohort framework wherein students alternate weekly between campus-based Face-to-Face (F2F) and remote Online learning.'],
        ['RAG', 'Retrieval-Augmented Generation: An AI pipeline combining semantic similarity search across user documents with a large language model to generate factual, grounded responses.'],
        ['PHT', 'Philippine Standard Time: Fixed at UTC+08:00 (Asia/Manila) year-round without Daylight Saving Time adjustments.'],
        ['pgvector', 'An open-source vector similarity search extension for PostgreSQL storing high-dimensional embeddings for cosine distance search.'],
      ],
      [25, 75]
    )
  );

  // 2.2 User Roles
  elements.push(createHeading2('2.2 User Classes and System Roles'));
  elements.push(
    createParagraph(
      'Inspection of the codebase confirms that AcadMate is strictly a student-centered personal productivity and study application. The system defines one primary user persona:'
    )
  );
  elements.push(createBullet('Primary Student User: An enrolled college or university student holding authenticated credentials. The student manages personal course enrollments, class schedules, tasks, academic calendars, study notebooks, flashcards, and quizzes. Data access is strictly compartmentalized; students cannot access another user’s records.', 'Student User:'));

  elements.push(
    ...createFigure(
      'use_case_diagram.png',
      'Figure 2.1: AcadMate Functional Use Case Model and System Boundary',
      520,
      320
    )
  );

  // 2.3 Functional Requirements
  elements.push(createHeading2('2.3 Functional Requirements Catalog'));

  elements.push(createHeading3('2.3.1 Module 1: Authentication and Profile Management'));
  elements.push(
    createTable(
      ['Req ID', 'Requirement Title', 'Functional Description & Behavior', 'Priority'],
      [
        ['FR-001', 'Email/Password Registration', 'The system shall allow users to register using an email address and password, enforcing minimum length rules and dispatching a verification token via SMTP.', 'High'],
        ['FR-002', 'Email Verification Workflow', 'The system shall verify user email ownership upon presentation of a valid verification token and record the verification timestamp.', 'High'],
        ['FR-003', 'Google OAuth 2.0 Sign-In', 'The system shall verify Google ID tokens via the Google Auth Library, creating or linking the user record seamlessly.', 'High'],
        ['FR-004', 'Proactive Session Continuity', 'The client shall inspect access token expiration with a 30-second buffer and execute silent token refresh with an in-flight mutex lock.', 'High'],
        ['FR-005', 'Cohort Set Configuration', 'The system shall allow students during onboarding or profile editing to set their academic cohort to Set A, Set B, or Standard.', 'High'],
      ],
      [12, 22, 54, 12]
    )
  );

  elements.push(createHeading3('2.3.2 Module 2: Academic Timetable Management'));
  elements.push(
    createTable(
      ['Req ID', 'Requirement Title', 'Functional Description & Behavior', 'Priority'],
      [
        ['FR-006', 'Subject Management', 'The system shall allow students to create, update, and delete academic subjects with custom course titles and hex color codes.', 'High'],
        ['FR-007', 'Multi-Day Schedule Creation', 'The system shall allow students to define class schedule entries with multi-day recurrence patterns (daysOfWeek JSON array) and 24-hour time ranges.', 'High'],
        ['FR-008', 'Modality Assignment', 'The system shall restrict schedule modalities strictly to Face-to-Face (F2F) and Online, recording room details for F2F sessions.', 'High'],
        ['FR-009', 'Cohort Set Tagging', 'The system shall allow a class schedule to be tagged as Set A, Set B, or Both/Every Week.', 'High'],
        ['FR-010', 'Schedule Duration Bounds', 'The system shall enforce semester start and end date boundaries for each recurring schedule entry.', 'Medium'],
      ],
      [12, 22, 54, 12]
    )
  );

  elements.push(createHeading3('2.3.3 Module 3: Dynamic Schedule Resolver & Calendar Views'));
  elements.push(
    createTable(
      ['Req ID', 'Requirement Title', 'Functional Description & Behavior', 'Priority'],
      [
        ['FR-011', 'Set A/B Modality Calculation', 'The schedule resolver shall dynamically determine whether an active class is F2F or Online on a given target date based on anchor rotation cycles.', 'High'],
        ['FR-012', 'Holiday Class Suspension', 'The schedule resolver shall evaluate the date against pre-seeded Philippine Regular and Special holidays, marking suspended classes with holiday badges.', 'High'],
        ['FR-013', 'Exam Week Overrides', 'The schedule resolver shall detect whether a target date falls within an institutional ExamWeek period, freezing regular classes and prioritizing examination events.', 'High'],
        ['FR-014', 'Historical Immutability', 'The system shall lock past schedule entries (date < today) into a read-only state, preventing accidental modification of historical academic records.', 'High'],
        ['FR-015', 'Unified Daily Feed', 'The system shall aggregate resolved classes, exams, urgent tasks, and study sessions into a chronologically sorted daily agenda.', 'High'],
      ],
      [12, 22, 54, 12]
    )
  );

  elements.push(createHeading3('2.3.4 Module 4: Multimodal AI Schedule & Task Ingestion'));
  elements.push(
    createTable(
      ['Req ID', 'Requirement Title', 'Functional Description & Behavior', 'Priority'],
      [
        ['FR-016', 'Syllabus/Schedule File Ingestion', 'The backend shall accept uploaded timetable documents in PDF, DOCX, and image formats up to 20MB in size.', 'High'],
        ['FR-017', 'AI Schedule Extraction', 'The backend shall use Gemini multimodal AI to extract course titles, class times, days, modalities, rooms, and exam periods into structured JSON.', 'High'],
        ['FR-018', 'Schedule Confirmation UI', 'The client shall present extracted schedules in an interactive confirmation sheet enabling students to review, edit, or reject parsed items before saving.', 'High'],
        ['FR-019', 'AI Task Extraction', 'The system shall parse assignment text prompts or announcements, extracting task titles, descriptions, course associations, and due dates.', 'Medium'],
        ['FR-020', 'Milestone Subtask Breakdown', 'The AI task parser shall optionally break complex academic tasks down into chronological milestone subtasks with completion checkboxes.', 'Medium'],
      ],
      [12, 22, 54, 12]
    )
  );

  elements.push(createHeading3('2.3.5 Module 5: Task and Deadline Management'));
  elements.push(
    createTable(
      ['Req ID', 'Requirement Title', 'Functional Description & Behavior', 'Priority'],
      [
        ['FR-021', 'Task Lifecycle Management', 'The system shall allow students to create, edit, prioritize, and toggle completion status for academic tasks and assignments.', 'High'],
        ['FR-022', 'Checklist Subtask Support', 'The system shall support interactive subtask checklists stored as serialized JSON arrays with individual completion states.', 'Medium'],
        ['FR-023', 'Deadline Urgency Evaluation', 'The system shall evaluate task due dates against Philippine Time, categorizing tasks as Overdue, Due Today, or Upcoming.', 'High'],
        ['FR-024', 'Subject Tagging', 'The system shall associate tasks with enrolled subjects, inheriting course color codes for visual distinction.', 'High'],
      ],
      [12, 22, 54, 12]
    )
  );

  elements.push(createHeading3('2.3.6 Module 6: Local-First Storage & Native Calendar Export'));
  elements.push(
    createTable(
      ['Req ID', 'Requirement Title', 'Functional Description & Behavior', 'Priority'],
      [
        ['FR-025', 'Local SQLite Persistence', 'The mobile application shall store all timetable, task, event, and holiday data in local SQLite for zero-latency offline access.', 'High'],
        ['FR-026', 'PowerSync Bi-directional Sync', 'The system shall stream cloud database updates to local storage and upload local offline writes in background batches when connected.', 'High'],
        ['FR-027', 'Dedicated Native Calendar Creation', 'The system shall interface with expo-calendar to create or locate an isolated "Acadmate Schedule" calendar on the device.', 'High'],
        ['FR-028', 'Idempotent Calendar Export', 'The native calendar export shall project recurring classes and exams with pre-configured reminders while preventing duplicate event creation.', 'High'],
      ],
      [12, 22, 54, 12]
    )
  );

  elements.push(createHeading3('2.3.7 Module 7: AI Study Hub & RAG Pipeline'));
  elements.push(
    createTable(
      ['Req ID', 'Requirement Title', 'Functional Description & Behavior', 'Priority'],
      [
        ['FR-029', 'Notebook Management', 'The system shall allow students to create study notebooks organized by course or academic subject.', 'High'],
        ['FR-030', 'Document Ingestion & Text Extraction', 'The backend shall extract text from uploaded PDF (pdf-parse), DOCX (mammoth), and image files (Gemini Vision OCR), uploading originals to Supabase Storage.', 'High'],
        ['FR-031', 'Text Chunking & 768-Dim Embeddings', 'The backend shall split document text into ~500-word overlapping chunks (50-word overlap) and generate 768-dimensional embeddings using Gemini.', 'High'],
        ['FR-032', 'Grounded Semantic Q&A', 'The backend shall execute pgvector cosine-distance similarity search to retrieve top-K relevant chunks and supply them as context for Gemini chat.', 'High'],
        ['FR-033', 'Clickable Source Citations', 'The client chat interface shall render clickable source citations under AI responses, opening a modal preview with excerpt text and similarity scores.', 'High'],
      ],
      [12, 22, 54, 12]
    )
  );

  elements.push(createHeading3('2.3.8 Module 8: AI Study Tools (Flashcards and Quizzes)'));
  elements.push(
    createTable(
      ['Req ID', 'Requirement Title', 'Functional Description & Behavior', 'Priority'],
      [
        ['FR-034', 'Automated Flashcard Generation', 'The system shall generate study flashcards from notebook source materials, specifying front questions and back answers.', 'High'],
        ['FR-035', 'Flashcard Mastery Tracking', 'The client shall support card flip animations and allow students to toggle mastery status (isMastered).', 'Medium'],
        ['FR-036', '4-Option Multiple Choice Quiz Generation', 'The system shall generate multiple-choice quizzes with 4 options per question, correct answer index (0..3), and explanations.', 'High'],
        ['FR-037', 'Interactive Quiz Taking & Immediate Grading', 'The client shall provide an interactive quiz runner that computes final scores and presents immediate answer explanations upon completion.', 'High'],
        ['FR-038', 'Quiz Attempt History', 'The system shall record student quiz attempts, scores, and timestamps in PostgreSQL for historical review.', 'Medium'],
      ],
      [12, 22, 54, 12]
    )
  );

  // 2.4 Non-Functional Requirements
  elements.push(createHeading2('2.4 Non-Functional Requirements Catalog'));
  elements.push(
    createTable(
      ['NFR ID', 'Category', 'Specification & Verification Standard'],
      [
        ['NFR-001', 'Offline Availability', 'The mobile app must provide full read and write access to all existing timetable schedules, tasks, and calendar events without an active internet connection.'],
        ['NFR-002', 'Data Consistency', 'Local writes made while offline must reconcile idempotently with the cloud PostgreSQL database upon reconnection using PowerSync batch transactions.'],
        ['NFR-003', 'Authentication Security', 'Passwords must be hashed using bcrypt; JWT tokens must be signed with cryptographic secrets and validated on every protected API endpoint.'],
        ['NFR-004', 'Session Reliability', 'The client must proactively refresh expiring JWT access tokens using a dedicated mutex lock, preventing simultaneous invalidations.'],
        ['NFR-005', 'Timezone Precision', 'All date parsing and scheduling comparisons must execute against Philippine Standard Time (UTC+08:00), preventing midnight boundary day-shifting.'],
        ['NFR-006', 'AI Resilience', 'The backend must implement a multi-tier model cascade to gracefully handle upstream AI API rate limits (HTTP 429) and temporary outages.'],
        ['NFR-007', 'Data Privacy', 'Uploaded study materials and notebook chunks must be strictly scoped to the authenticated student owner with foreign key cascade deletions.'],
        ['NFR-008', 'UI Responsiveness', 'Client-side navigation and schedule queries against local SQLite must execute within standard 60fps mobile animation frames.'],
        ['NFR-009', 'Upload Constraints', 'File uploads for syllabus and study documents must enforce a maximum size limit of 20MB with memory storage streaming.'],
        ['NFR-010', 'Type Safety', 'The entire codebase must strictly adhere to TypeScript compiler standards, achieving zero compile-time errors during production builds.'],
      ],
      [15, 25, 60]
    )
  );

  // 2.5 Use Cases
  elements.push(createHeading2('2.5 Core System Use Cases'));

  elements.push(createHeading3('Use Case UC-01: AI Syllabus & Schedule Ingestion'));
  elements.push(
    createTable(
      ['Use Case Attribute', 'Specification Details'],
      [
        ['Use Case ID', 'UC-01'],
        ['Use Case Name', 'Ingest and Confirm Academic Timetable via AI Parser'],
        ['Primary Actor', 'Enrolled Student'],
        ['Preconditions', 'Student is authenticated; timetable document (PDF/DOCX/image) is accessible on device.'],
        ['Main Flow', '1. Student navigates to Schedule Upload.\n2. Student selects document file.\n3. Backend receives file, extracts text/image, and prompts Gemini AI.\n4. Gemini returns structured JSON with class schedules and exam periods.\n5. Frontend displays Schedule Confirmation sheet.\n6. Student reviews, edits room/times if necessary, and taps Confirm.\n7. Schedules are saved to local SQLite and synced to PostgreSQL.'],
        ['Alternative Flow', '3a. Network fails or Gemini returns error: Backend cascades to fallback model; if all fail, user is alerted to enter schedule manually.'],
        ['Postconditions', 'Class schedules and exam weeks are persisted locally and reflected immediately in the calendar feed.'],
      ],
      [25, 75]
    )
  );

  elements.push(createHeading3('Use Case UC-02: Grounded Notebook Study Chat with Citations'));
  elements.push(
    createTable(
      ['Use Case Attribute', 'Specification Details'],
      [
        ['Use Case ID', 'UC-02'],
        ['Use Case Name', 'Query Study Notebook using RAG Chat with Verifiable Citations'],
        ['Primary Actor', 'Enrolled Student'],
        ['Preconditions', 'Student has created a Notebook and successfully uploaded at least one course document (status: READY).'],
        ['Main Flow', '1. Student opens Notebook and navigates to Chat tab.\n2. Student types a conceptual study question.\n3. Backend generates 768-dim embedding of question.\n4. Backend searches pgvector for top-5 most similar text chunks.\n5. Backend builds grounded system prompt with retrieved context.\n6. Gemini generates factual response.\n7. Response is displayed with clickable citation badges.\n8. Student taps citation to view exact source snippet.'],
        ['Alternative Flow', '4a. No relevant chunks found above similarity threshold: System informs student that question cannot be answered from uploaded notes.'],
        ['Postconditions', 'Chat session and message history are persisted in PostgreSQL for subsequent review.'],
      ],
      [25, 75]
    )
  );

  return elements;
}
