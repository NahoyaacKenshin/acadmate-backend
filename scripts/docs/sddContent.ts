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

export function getSDDContent(): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(createHeading1('SECTION 3: SOFTWARE DESIGN DOCUMENT (SDD)'));
  elements.push(
    createParagraph(
      'The Software Design Document (SDD) articulates the software architecture, technical modules, relational database schemas, data flow mechanics, interface contracts, and core algorithmic procedures comprising AcadMate. The design strictly mirrors the verified implementation present in the production codebase.'
    )
  );

  // 3.1 Architectural Overview
  elements.push(createHeading2('3.1 System Architecture Overview'));
  elements.push(
    createParagraph(
      'AcadMate is constructed around a hybrid local-first mobile client and cloud backend topology. The architecture decouples daily student planning operations from network availability, using embedded on-device SQLite databases for immediate UI execution, while leveraging scalable cloud services for heavy computational workloads (AI document ingestion, vector semantic retrieval, and cloud backups).'
    )
  );

  elements.push(
    ...createFigure(
      'system_architecture.png',
      'Figure 3.1: AcadMate 4-Tier Hybrid Local-First System Architecture Topology',
      520,
      280
    )
  );

  elements.push(
    createTable(
      ['Architectural Tier', 'Technology Stack', 'Core Responsibilities and Data Flow'],
      [
        ['Client Mobile App', 'React Native 0.85, Expo SDK 56, Expo Router, Tailwind CSS v4, Zustand', 'Provides interactive UI, renders calendar feeds, handles offline user writes, captures schedule photos, and interacts with native device hardware.'],
        ['Embedded Storage Tier', 'Quick-SQLite, PowerSync React Native SDK', 'Stores local replicas of subjects, schedules, tasks, holidays, and exam weeks on the mobile device, executing queries with zero network latency.'],
        ['Synchronization Gateway', 'PowerSync Service, powersync-rules.yaml', 'Maintains persistent WebSocket replication streams, tracks client transaction changes, and coordinates bi-directional synchronization with PostgreSQL.'],
        ['Application Server Tier', 'Node.js 22, Express 5, TypeScript, Prisma ORM 7', 'Provides authenticated REST endpoints, executes data sanitization, validates schemas via Zod, manages JWT sessions, and coordinates AI pipelines.'],
        ['Relational & Vector Cloud DB', 'PostgreSQL with pgvector extension', 'Serves as persistent source of truth, storing relational user entities and 768-dimensional text embeddings for semantic similarity search.'],
        ['Cloud File Storage', 'Supabase Storage Bucket (notebook-sources)', 'Stores raw uploaded course documents (PDF, DOCX, images) securely with unique object storage keys.'],
        ['Generative AI Tier', 'Google Generative AI SDK, Gemini Model Cascade', 'Drives multimodal syllabus text extraction, milestone breakdown, 768-dim text embeddings, grounded chat answers, and quiz/flashcard generation.'],
        ['Native OS Services', 'expo-calendar, expo-notifications', 'Bridges academic schedules directly into native device calendars (Google/Apple Calendar) and schedules local heads-up alarms.'],
      ],
      [20, 30, 50]
    )
  );

  // 3.2 Detailed Module Architecture
  elements.push(createHeading2('3.2 Module Deconstruction & Responsibilities'));
  elements.push(
    createParagraph(
      'AcadMate decomposes system logic into modular, decoupled service layers coordinating data flow across local offline execution, cloud synchronization, and multimodal AI services.'
    )
  );

  elements.push(
    ...createFigure(
      'workflow_diagrams.png',
      'Figure 3.3: AcadMate Core Sequential Data Workflows (Offline Resolution, AI Ingestion, RAG Chat)',
      520,
      280
    )
  );

  elements.push(createHeading3('3.2.1 Authentication & Profile Engine'));
  elements.push(createBullet('Token Architecture: Issues dual-token credentials comprising short-lived JWT access tokens and long-lived refresh tokens stored in secure device storage (expo-secure-store).', 'Token Security:'));
  elements.push(createBullet('Proactive Expiration Verification: The client examines token expiration timestamps before API dispatch. If remaining lifetime is under 30 seconds, it silently triggers a refresh cycle.', 'Session Buffer:'));
  elements.push(createBullet('In-Flight Mutex Lock: Concurrent API requests share a single in-flight token refresh promise, preventing race conditions that invalidate refresh tokens.', 'Concurrency Control:'));

  elements.push(createHeading3('3.2.2 Dynamic Schedule Resolver'));
  elements.push(createBullet('Set A / Set B Resolution: Computes alternating weeks based on an anchor Monday date and starting cohort set, resolving whether classes on a target date are Face-to-Face or Online.', 'Cohort Alternation:'));
  elements.push(createBullet('Holiday Override: Compares target dates against the PhilippineHoliday database, replacing regular class badges with official holiday suspension badges.', 'Holiday Enforcement:'));
  elements.push(createBullet('Exam Week Locking: Detects active ExamWeek records, automatically suppressing normal recurring classes and elevating exam schedules.', 'Exam Override:'));
  elements.push(createBullet('Immutability Protection: Disables editing and deletion actions on dates prior to the current local date, guaranteeing historical academic accuracy.', 'History Locking:'));

  elements.push(createHeading3('3.2.3 AI Ingestion and Parser Pipelines'));
  elements.push(createBullet('Schedule Parser Service: Receives multi-format files, extracts raw text via pdf-parse or mammoth, or passes base64 image data to Gemini Multimodal Vision, parsing structured timetable JSON.', 'Schedule Parser:'));
  elements.push(createBullet('Defensive Model Cascade: Implements an automated failover sequence (gemini-3.5-flash → gemini-3.6-flash → gemini-3.5-flash-lite) mitigating HTTP 429 quota and 503 capacity limits.', 'AI Cascade:'));
  elements.push(createBullet('Schedule Confirmation Sheet: Implements an interactive review modal where students review, adjust room or time fields, and selectively save extracted schedules.', 'Confirmation Gate:'));

  elements.push(createHeading3('3.2.4 AI Study Hub & RAG Architecture'));
  elements.push(createBullet('Document Ingestion: Uploads original documents to Supabase Storage, extracts plain text, and chunks text into ~500-word segments with 50-word overlaps.', 'Text Processing:'));
  elements.push(createBullet('Vector Embeddings: Generates 768-dimensional dense vectors using gemini-embedding-001, persisting them in PostgreSQL using pgvector.', 'Embedding Model:'));
  elements.push(createBullet('Semantic Retrieval: Executes raw SQL cosine-distance queries (`<=>` operator) against SourceChunk records scoped strictly to the student’s notebook.', 'Cosine Retrieval:'));
  elements.push(createBullet('Grounded Prompting & Citations: Injects retrieved chunks into a restricted system prompt; returns the AI response accompanied by structured citation metadata.', 'Verifiable Citations:'));

  elements.push(createHeading3('3.2.5 Native Device Calendar Synchronization'));
  elements.push(createBullet('Dedicated Calendar Isolation: Creates or targets an isolated native calendar entitled "Acadmate Schedule" with brand color #6C8EFF.', 'Calendar Isolation:'));
  elements.push(createBullet('Idempotent Re-creation: Clears previous Acadmate schedule events before re-projecting new semester cycles, guaranteeing zero event duplicates.', 'Duplicate Prevention:'));
  elements.push(createBullet('OS Sync Engine: On Android, associates the calendar with the device Google account, enabling native background synchronization to Google Calendar cloud.', 'Cloud Bridge:'));

  // 3.3 Database Design (ERD & Schema)
  elements.push(createHeading2('3.3 Database Design and Entity-Relationship Architecture'));
  elements.push(
    createParagraph(
      'The persistent cloud database is managed via Prisma ORM 7 connecting to PostgreSQL with the pgvector extension. The active schema contains 18 models organized across functional domains:'
    )
  );

  elements.push(
    ...createFigure(
      'erd_diagram.png',
      'Figure 3.2: AcadMate 18-Entity Relational Database Schema (ERD)',
      520,
      320
    )
  );

  elements.push(
    createTable(
      ['Model Name', 'Domain', 'Primary Key', 'Foreign Key Relations & Constraints'],
      [
        ['User', 'Authentication & Profile', 'id (UUID)', 'Parent to Token, Subject, Task, ClassSchedule, CalendarEvent, ExamWeek, Notebook, Source, ChatSession, FlashcardDeck, Quiz, QuizAttempt.'],
        ['Token', 'Security & Verification', 'id (UUID)', 'userId → User (onDelete: Cascade). Indexes on [userId, type], unique token string.'],
        ['Subject', 'Academic Courses', 'id (UUID)', 'userId → User (onDelete: Cascade). Parent to Task, ClassSchedule, CalendarEvent.'],
        ['Task', 'Task Management', 'id (UUID)', 'userId → User (onDelete: Cascade), subjectId → Subject (onDelete: SetNull).'],
        ['ClassSchedule', 'Timetable Management', 'id (UUID)', 'userId → User (onDelete: Cascade), subjectId → Subject (onDelete: SetNull). Multi-day daysOfWeek JSON.'],
        ['CalendarEvent', 'Calendar & Events', 'id (UUID)', 'userId → User (onDelete: Cascade), subjectId → Subject (onDelete: SetNull). Indexes on [userId, startDate].'],
        ['PhilippineHoliday', 'Public Reference Data', 'id (UUID)', 'Global public table. Unique compound constraint on [date, name].'],
        ['ExamWeek', 'Academic Periods', 'id (UUID)', 'userId → User (onDelete: Cascade). Indexes on [userId, startDate].'],
        ['Notebook', 'AI Study Hub', 'id (UUID)', 'userId → User (onDelete: Cascade). Parent to Source, ChatSession, FlashcardDeck, Quiz.'],
        ['Source', 'Study Documents', 'id (UUID)', 'notebookId → Notebook (Cascade), userId → User (Cascade). Stores rawText and status.'],
        ['SourceChunk', 'RAG Vector Store', 'id (UUID)', 'sourceId → Source (Cascade). Stores chunk text and Unsupported("vector(768)") embedding.'],
        ['ChatSession', 'AI Chat History', 'id (UUID)', 'notebookId → Notebook (Cascade), userId → User (Cascade). Parent to ChatMessageHistory.'],
        ['ChatMessageHistory', 'Chat Messages', 'id (UUID)', 'sessionId → ChatSession (Cascade). Stores role (USER/ASSISTANT) and citations JSON.'],
        ['FlashcardDeck', 'AI Study Tools', 'id (UUID)', 'notebookId → Notebook (Cascade), userId → User (Cascade). Parent to Flashcard.'],
        ['Flashcard', 'Study Cards', 'id (UUID)', 'deckId → FlashcardDeck (Cascade). Stores front, back, and isMastered boolean.'],
        ['Quiz', 'AI Study Tools', 'id (UUID)', 'notebookId → Notebook (Cascade), userId → User (Cascade). Parent to QuizQuestion, QuizAttempt.'],
        ['QuizQuestion', 'Quiz Items', 'id (UUID)', 'quizId → Quiz (Cascade). Stores question, options JSON, correctAnswer index (0..3), and explanation.'],
        ['QuizAttempt', 'Quiz Scoring', 'id (UUID)', 'quizId → Quiz (Cascade), userId → User (Cascade). Stores score, total, and answers JSON.'],
      ],
      [15, 18, 15, 52]
    )
  );

  // 3.4 Key Algorithms & Pseudocode
  elements.push(createHeading2('3.4 Core Algorithms and Business Rules'));

  elements.push(createHeading3('3.4.1 Set A / Set B Alternating Schedule Resolver Algorithm'));
  elements.push(
    createParagraph(
      'The resolution algorithm reconciles personal student cohorts with class schedule constraints. The operational logic is formalized below:'
    )
  );

  elements.push(
    createCalloutBox(
      'Algorithm 1: Dynamic Schedule Resolution (resolveScheduleForDate)',
      'Input: schedule (ClassScheduleRow), targetDate (Date), studentSet (A | B | Standard | null), holidays (HolidayRow[]), examWeeks (ExamWeekRow[])\n' +
      'Output: resolution (ScheduleResolution: isActive, isHoliday, isExamWeek, modality, effectiveRoom, badgeText, badgeColor)\n\n' +
      '1. Normalize targetDate to midnight (00:00:00.000) in Philippine Standard Time (PHT).\n' +
      '2. Check Day of Week: Extract active days from schedule.daysOfWeek (or schedule.dayOfWeek).\n' +
      '   If targetDate.getDay() is NOT in active days, return { isActive: false, reason: "Day does not match" }.\n' +
      '3. Evaluate Cohort Set Filter:\n' +
      '   If studentSet == "Standard" and schedule.setType in ("A", "B"), return { isActive: false, reason: "Set class hidden" }.\n' +
      '   If studentSet == "A" and schedule.setType == "B", return { isActive: false, reason: "Set B class hidden" }.\n' +
      '   If studentSet == "B" and schedule.setType == "A", return { isActive: false, reason: "Set A class hidden" }.\n' +
      '4. Date Boundary Check: If targetDate < schedule.startDate or (schedule.endDate and targetDate > schedule.endDate), return { isActive: false }.\n' +
      '5. Evaluate Philippine Holiday Suspension:\n' +
      '   Search holidays for matching date. If match found, return { isActive: true, isHoliday: true, modality: "HOLIDAY", badgeColor: "#EF4444" }.\n' +
      '6. Evaluate Institutional Exam Week Overrides:\n' +
      '   Search examWeeks where startDate <= targetDate <= endDate.\n' +
      '   If match found, return { isActive: true, isExamWeek: true, modality: "EXAM_WEEK", badgeColor: "#F59E0B" }.\n' +
      '7. Dynamic Modality Assignment:\n' +
      '   Assign modality = schedule.modality ("F2F" | "ONLINE").\n' +
      '   Assign effectiveRoom = (modality == "ONLINE") ? "Online Class" : schedule.room.\n' +
      '   Assign badgeColor = (modality == "F2F") ? "#10B981" : "#3B82F6".\n' +
      '8. Return finalized ScheduleResolution structure.'
    )
  );

  elements.push(createHeading3('3.4.2 Semantic Cosine Vector Distance Retrieval (pgvector)'));
  elements.push(
    createParagraph(
      'To retrieve contextually relevant study passages from a notebook without fetching entire books into memory, the backend queries PostgreSQL pgvector using the cosine distance operator (<=>):'
    )
  );

  elements.push(
    createCalloutBox(
      'Algorithm 2: Vector Cosine Similarity Search Query',
      'SELECT \n' +
      '  sc.id AS "chunkId", \n' +
      '  sc."sourceId", \n' +
      '  s."fileName", \n' +
      '  sc."chunkIndex", \n' +
      '  sc.content, \n' +
      '  1 - (sc.embedding <=> $1::vector) AS similarity \n' +
      'FROM "SourceChunk" sc \n' +
      'JOIN "Source" s ON sc."sourceId" = s.id \n' +
      'WHERE sc."notebookId" = $2 \n' +
      '  AND s.status = \'READY\' \n' +
      'ORDER BY sc.embedding <=> $1::vector ASC \n' +
      'LIMIT 5;'
    )
  );

  // 3.5 Security & Error Handling
  elements.push(createHeading2('3.5 Security Architecture and Defensive Programming'));
  elements.push(createBullet('Stateless JWT Security: Access tokens expire after short durations; refresh tokens are stored hashed in PostgreSQL and consumed idempotently.', 'Token Hardening:'));
  elements.push(createBullet('Zod Runtime Guards: Every incoming REST payload is parsed and sanitized against strict Zod definitions, preventing prototype pollution and type coercion attacks.', 'Input Sanitization:'));
  elements.push(createBullet('Rate Limiting: AI-intensive routes (schedule parsing, RAG chat, flashcard/quiz generation) are protected by Express rate limiters preventing API abuse.', 'Quota Throttling:'));
  elements.push(createBullet('Timezone Standardization: Datepicker inputs and calendar ranges are converted to strict PHT ISO strings (+08:00), eliminating cross-timezone midnight shifts.', 'Timezone Guard:'));

  return elements;
}
