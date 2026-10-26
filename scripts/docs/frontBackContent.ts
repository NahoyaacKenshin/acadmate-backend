import { Paragraph, Table, AlignmentType, HeadingLevel, TextRun } from 'docx';
import {
  createHeading1,
  createHeading2,
  createHeading3,
  createParagraph,
  createBullet,
  createTable,
  createCalloutBox,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  TEXT_MUTED,
  FONT_FAMILY,
} from './docHelper';

export function getTitlePage(): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 720, after: 120 },
      children: [
        new TextRun({
          text: 'ACADMATE: AN OFFLINE-FIRST INTELLIGENT ACADEMIC PLANNER & STUDY ASSISTANT',
          font: FONT_FAMILY,
          size: 32, // 16pt
          bold: true,
          color: PRIMARY_COLOR,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 240 },
      children: [
        new TextRun({
          text: 'by',
          font: FONT_FAMILY,
          size: 22,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({
          text: 'KENJI AGUSTINE CAAYOHAN\nROCHELLE ANDALES\nKENT JECED ALCANTARA',
          font: FONT_FAMILY,
          size: 24, // 12pt
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 480 },
      children: [
        new TextRun({
          text: 'NICASIO P. AMOIN JR., MIT (Adviser)',
          font: FONT_FAMILY,
          size: 22,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 120 },
      children: [
        new TextRun({
          text: 'A Project Design Submitted to the Faculty of the\nCollege of Computer Studies\nCORDOVA PUBLIC COLLEGE\nGabi, Cordova, Cebu, Philippines',
          font: FONT_FAMILY,
          size: 22,
          color: TEXT_MUTED,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: 'In Partial Fulfillment of the Requirements for the Degree\nBACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY',
          font: FONT_FAMILY,
          size: 24,
          bold: true,
          color: PRIMARY_COLOR,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 240 },
      children: [
        new TextRun({
          text: 'OCTOBER 2026',
          font: FONT_FAMILY,
          size: 22,
          bold: true,
        }),
      ],
    }),
  ];
}

export function getAcknowledgment(): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  elements.push(createHeading1('ACKNOWLEDGMENT'));
  elements.push(
    createParagraph(
      'The completion of this capstone project would not have been possible without the invaluable guidance, constructive critique, and unwavering encouragement provided by many individuals throughout our academic journey at Cordova Public College.'
    )
  );
  elements.push(
    createParagraph(
      'First and foremost, we express our profound gratitude to our Capstone Project Adviser, Nicasio P. Amoin Jr., MIT, whose technical expertise, rigorous standards, and steadfast patience challenged us to elevate our software engineering practices and deliver a system that is both technically defensible and practically impactful.'
    )
  );
  elements.push(
    createParagraph(
      'We extend our sincere thanks to the Dean of the College of Computer Studies, our distinguished capstone evaluation panelists, and the entire faculty of the Bachelor of Science in Information Technology program. Their incisive feedback during progress defenses, architectural consultations, and technical evaluations provided the structural direction necessary to refine AcadMate’s offline-first sync and dynamic scheduling resolver.'
    )
  );
  elements.push(
    createParagraph(
      'We are deeply indebted to our fellow college students who generously dedicated their time to evaluate early software iterations, test schedule ingestion workflows, and provide candid feedback on user interface usability under real-world campus network conditions.'
    )
  );
  elements.push(
    createParagraph(
      'Finally, we express our heartfelt appreciation to our parents, families, and friends for their boundless patience, financial sacrifice, and continuous moral support during demanding engineering sprints. Above all, we thank Almighty God for granting us wisdom, health, and perseverance throughout the conception, development, and completion of this endeavor.'
    )
  );
  return elements;
}

export function getAbstract(): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  elements.push(createHeading1('ABSTRACT'));
  elements.push(
    createParagraph(
      'Collegiate students frequently struggle to maintain academic productivity due to convoluted class timetables, alternating cohort rotations (Set A and Set B attendance), sudden holiday or weather-induced class suspensions, and fragmented study utilities. Furthermore, conventional digital calendar and productivity applications depend continuously on high-speed internet connections, rendering them inaccessible in bandwidth-constrained classroom environments. This capstone project presents AcadMate: An Offline-First Intelligent Academic Planner & Study Assistant, an integrated mobile and cloud platform engineered specifically to resolve these collegiate operational challenges.'
    )
  );
  elements.push(
    createParagraph(
      'AcadMate is constructed using React Native (Expo) and TypeScript on the client tier, backed by an embedded SQLite database and the PowerSync real-time replication engine. This architecture guarantees 100% offline access to personal course timetables, task milestones, and academic calendars with zero network latency. A dynamic scheduling resolver automates alternating Set A/B cohort calculations, integrates pre-seeded Philippine legal holidays, enforces exam-week class muting, and locks historical academic dates to preserve integrity. On the cloud backend (Node.js, Express, Prisma ORM, and PostgreSQL), AcadMate integrates Google Gemini multimodal artificial intelligence to ingest syllabi and schedules from PDF, DOCX, and image formats. Additionally, an AI Study Hub implements Retrieval-Augmented Generation (RAG) using 768-dimensional vector embeddings stored in PostgreSQL pgvector, providing grounded academic question-answering with verifiable citations, paired with automated flashcard and multiple-choice quiz generators.'
    )
  );
  elements.push(
    createParagraph(
      'Verification across both software projects confirmed zero TypeScript compiler errors, validated seamless bi-directional synchronization, and demonstrated idempotent one-way calendar export to native Google and Apple calendars without duplicate entries. AcadMate provides higher education students with an autonomous, resilient, and intelligent academic operating system suitable for real-world campus deployment.'
    )
  );
  elements.push(
    createParagraph(
      'Keywords: Offline-First Architecture, Academic Planner, PowerSync, SQLite, Google Gemini, Retrieval-Augmented Generation (RAG), pgvector, Set A/B Scheduling, Cordova Public College.',
      { bold: true }
    )
  );
  return elements;
}

export function getRecommendations(): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  elements.push(createHeading1('SECTION 6: RECOMMENDATIONS'));
  elements.push(
    createParagraph(
      'Based on the empirical findings, architectural trade-offs, and technical evaluations conducted during the implementation of AcadMate, the research team submits the following actionable recommendations for future academic development and institutional scaling:'
    )
  );

  elements.push(createHeading2('6.1 Immediate Architectural Improvements'));
  elements.push(createBullet('Implement Automated Testing Suites: Formalize unit and end-to-end regression suites using Jest for backend business logic and React Native Testing Library for mobile UI flows to augment existing TypeScript compile-time safety.', 'Automated Testing:'));
  elements.push(createBullet('Offline Visual Sync Indicator: Introduce an explicit, persistent connection status banner (Connected / Synchronizing / Offline Mode) in the top app header to provide students with transparent visibility into cloud sync states.', 'Sync Visibility:'));
  elements.push(createBullet('Document Extraction Progress Feedback: Provide real-time step progress (Uploading → OCR Scanning → Chunking → Generating Embeddings) when uploading large study documents.', 'Ingestion Feedback:'));
  elements.push(createBullet('User-Configurable AI Credentials (BYOK Architecture): Direct response to panelist recommendations during the Capstone 2 final defense. AcadMate incorporates a Bring-Your-Own-Key (BYOK) system where students can input their personal, free-tier Google Gemini API key. Stored encrypted on-device via SecureStore, the key executes OCR parsing, syllabus analysis, and RAG study generation on the user’s dedicated quota, seamlessly falling back to system-provided credentials if empty or exhausted.', 'BYOK AI Credentials:'));

  elements.push(createHeading2('6.2 Future Enhancements'));
  elements.push(createBullet('Direct LMS Synchronization: Develop API bridge connectors to popular Learning Management Systems (e.g., Canvas, Moodle, Google Classroom) to automatically ingest course syllabi and grade weights.', 'LMS Integration:'));
  elements.push(createBullet('Peer Study Group Sync: Enable decentralized or encrypted multi-user sync allowing students within the same section to collaboratively share verified flashcard decks and quiz banks.', 'Collaborative Study:'));
  elements.push(createBullet('On-Device Small Language Model (SLM) Inference: Investigate lightweight quantized local models (such as ExecuTorch or Gemini Nano) for simple text summarization completely offline on high-end mobile devices.', 'On-Device AI:'));

  elements.push(createHeading2('6.3 Testing and Long-Term Maintenance Recommendations'));
  elements.push(createBullet('Formal ISO/IEC 25010 Usability Survey: Conduct an empirical survey among a statistically significant cohort of BSIT students evaluating functional suitability, performance efficiency, and usability.', 'Empirical Survey:'));
  elements.push(createBullet('Annual Holiday Seed Automation: Implement an automated cron script or presidential proclamation scraper to seed Philippine holidays dynamically for upcoming academic years.', 'Holiday Maintenance:'));

  return elements;
}

export function getAppendices(): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  elements.push(createHeading1('SECTION 7: APPENDICES'));

  elements.push(createHeading2('Appendix A: Cloud PostgreSQL Database Schema Summary'));
  elements.push(
    createParagraph(
      'The following table summarizes the 18 active relational models managed in PostgreSQL via Prisma ORM 7:'
    )
  );
  elements.push(
    createTable(
      ['Domain', 'Prisma Model', 'Key Fields & Types', 'Relational Constraints'],
      [
        ['Auth', 'User', 'id (UUID), email, password, googleId, studentSet, emailVerified', 'Parent to all user-scoped data'],
        ['Auth', 'Token', 'id, type (REFRESH/VERIFY), token, expiresAt, userId', 'Cascade delete with User'],
        ['Planner', 'Subject', 'id, name, color, userId', 'Cascade delete with User'],
        ['Planner', 'Task', 'id, title, description, dueDate, completed, subtasks, subjectId', 'SetNull on Subject delete'],
        ['Planner', 'ClassSchedule', 'id, daysOfWeek (JSON), startTime, endTime, room, modality, setType', 'Multi-day recurrence; F2F/ONLINE'],
        ['Planner', 'CalendarEvent', 'id, title, description, startDate, endDate, allDay, location', 'Indexed on [userId, startDate]'],
        ['Reference', 'PhilippineHoliday', 'id, date, name, type (REGULAR/SPECIAL)', 'Unique compound [date, name]'],
        ['Planner', 'ExamWeek', 'id, title, startDate, endDate, userId', 'Overriding exam block period'],
        ['Study Hub', 'Notebook', 'id, title, description, userId', 'Cascade delete with User'],
        ['Study Hub', 'Source', 'id, fileName, fileType, storagePath, status, rawText', 'Cascade delete with Notebook'],
        ['Study Hub', 'SourceChunk', 'id, chunkIndex, content, embedding vector(768)', 'pgvector dense embedding'],
        ['Study Hub', 'ChatSession', 'id, title, notebookId, userId', 'Cascade delete with Notebook'],
        ['Study Hub', 'ChatMessageHistory', 'id, role (USER/ASSISTANT), content, citations (JSON)', 'Cascade delete with ChatSession'],
        ['Study Tools', 'FlashcardDeck', 'id, title, description, notebookId, userId', 'Cascade delete with Notebook'],
        ['Study Tools', 'Flashcard', 'id, front, back, isMastered, deckId', 'Cascade delete with FlashcardDeck'],
        ['Study Tools', 'Quiz', 'id, title, description, notebookId, userId', 'Cascade delete with Notebook'],
        ['Study Tools', 'QuizQuestion', 'id, question, options (JSON), correctAnswer, explanation', 'Cascade delete with Quiz'],
        ['Study Tools', 'QuizAttempt', 'id, score, total, answers (JSON), quizId, userId', 'Cascade delete with Quiz'],
      ],
      [15, 20, 35, 30]
    )
  );

  elements.push(createHeading2('Appendix B: Installation and Deployment Reference'));
  elements.push(createBullet('Clone Repository: git clone <repository-url>', 'Step 1:'));
  elements.push(createBullet('Backend Setup: cd acadmate-backend && npm install && npm run db:generate && npm run db:migrate && npm run db:seed', 'Step 2:'));
  elements.push(createBullet('Start Backend: npm run dev (Express server runs on port 8000)', 'Step 3:'));
  elements.push(createBullet('Frontend Setup: cd ../acadmate-frontend && npm install', 'Step 4:'));
  elements.push(createBullet('Launch Mobile App: npm run start (Connect Android physical device or emulator via Expo Go / development client)', 'Step 5:'));

  return elements;
}

export function getDeveloperProfiles(): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  elements.push(createHeading1('SECTION 8: DEVELOPER TEAM PROFILES'));
  elements.push(
    createParagraph(
      'The developer team comprises undergraduate students in the Bachelor of Science in Information Technology program at Cordova Public College:'
    )
  );

  const teamMembers = [
    {
      name: 'Kenji Agustine Caayohan',
      role: 'Project Manager & Backend System Architect',
      responsibilities: 'Overseeing project lifecycle, requirements documentation, Express REST API architecture, PostgreSQL database design, Prisma ORM schema management, PowerSync sync rules, and AI multimodal integration.',
    },
    {
      name: 'Rochelle Andales',
      role: 'Frontend Mobile Engineer & UI/UX Designer',
      responsibilities: 'Mobile user experience (UI/UX) interface architecture, React Native screen prototyping and layout styling, design system tokens, and student usability optimization.',
    },
    {
      name: 'Kent Jeced Alcantara',
      role: 'Frontend Mobile Application Engineer',
      responsibilities: 'React Native / Expo mobile application development, Zustand client state management, offline SQLite local storage integration, and native calendar synchronization.',
    },
  ];

  teamMembers.forEach((member) => {
    elements.push(createHeading2(member.name));
    elements.push(createBullet(member.role, 'Role:'));
    elements.push(createBullet('Bachelor of Science in Information Technology, Cordova Public College', 'Academic Program:'));
    elements.push(createBullet(member.responsibilities, 'Primary Responsibilities:'));
  });

  return elements;
}
