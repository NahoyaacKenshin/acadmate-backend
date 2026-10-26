import { Paragraph, Table, PageBreak } from 'docx';
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

export function getSPMPContent(): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(createHeading1('SECTION 1: SOFTWARE PROJECT MANAGEMENT PLAN (SPMP)'));
  elements.push(
    createParagraph(
      'The Software Project Management Plan (SPMP) defines the operational, organizational, and technical governance framework guiding the development, quality assurance, risk management, and deployment of AcadMate: An Offline-First Intelligent Academic Planner & Study Assistant. This document details project scope, schedules, resource allocations, and risk mitigation strategies tailored to undergraduate academic engineering standards at Cordova Public College.'
    )
  );

  // 1. Introduction
  elements.push(createHeading2('1.1 Introduction'));
  elements.push(
    createParagraph(
      'AcadMate is an offline-first academic productivity platform engineered specifically for higher education students. This plan establishes the roadmap, development standards, team responsibilities, and procedural checkpoints necessary to deliver a production-ready mobile application and companion cloud backend.'
    )
  );
  elements.push(createBullet('Plan Scope: Covers full lifecycle development including requirements engineering, system architecture design, local-first database implementation, cloud API services, AI pipeline integration, cross-device testing, and academic defense documentation.', 'Scope:'));
  elements.push(createBullet('Intended Audience: Capstone project evaluation committees, faculty advisers, academic panelists, technical peer reviewers, and future software maintainers.', 'Audience:'));

  // 1.2 Project Overview
  elements.push(createHeading2('1.2 Project Overview and Strategic Objectives'));
  elements.push(
    createParagraph(
      'University students in modern collegiate settings frequently navigate convoluted academic schedules featuring blended instructional modalities (Face-to-Face and Online classes), alternating weekly attendance cohorts (Set A and Set B), sudden weather- or legal-induced class suspensions, and overlapping course deadlines. Traditional digital calendar tools either require persistent, high-speed mobile data—which is prohibitively expensive or unreliable in campus classroom settings—or lack the contextual academic awareness needed to accurately interpret university schedules and course materials.'
    )
  );

  elements.push(createHeading3('1.2.1 Problem Statements'));
  elements.push(createBullet('Connectivity Dependency: Standard cloud-based calendar and task management applications fail or become unresponsive in low-connectivity campus environments, preventing students from accessing their class timetables and pending deadlines.', 'Problem 1:'));
  elements.push(createBullet('Modality & Cohort Confusion: Collegiate scheduling frameworks with alternating Set A and Set B cohorts lead to frequent attendance errors, where students arrive on campus during designated online weeks or miss face-to-face sessions.', 'Problem 2:'));
  elements.push(createBullet('Manual Scheduling Overhead: Transcribing course details, room assignments, examination periods, and assignment deadlines from unstructured syllabus documents or image flyers into generic planners is error-prone and time-consuming.', 'Problem 3:'));
  elements.push(createBullet('Fragmented Study Utilities: Students rely on disconnected third-party tools for schedule tracking, task checklists, flashcards, document reading, and quiz generation, resulting in cognitive overload and fragmented academic organization.', 'Problem 4:'));

  elements.push(createHeading3('1.2.2 Project Objectives'));
  elements.push(createBullet('Develop an offline-first mobile application utilizing local SQLite storage and PowerSync background synchronization, ensuring immediate UI responsiveness and full schedule accessibility without active internet access.', 'Primary Objective:'));
  elements.push(createBullet('Implement a dynamic scheduling resolver that automatically reconciles weekly class patterns, alternating Set A/B rotations, Philippine legal holidays, and institutional exam week suspensions into a coherent daily agenda.', 'Specific Objective 1:'));
  elements.push(createBullet('Integrate multimodal generative AI capabilities using Google Gemini to extract structured class schedules, examination dates, and task milestones from uploaded document formats (PDF, DOCX, and images).', 'Specific Objective 2:'));
  elements.push(createBullet('Establish an AI-assisted Study Hub incorporating Retrieval-Augmented Generation (RAG) over user-uploaded course materials with verifiable citations, paired with automated flashcard and quiz generation.', 'Specific Objective 3:'));
  elements.push(createBullet('Provide seamless one-way export integration to native device calendars (Google Calendar and Apple Calendar) into an isolated "Acadmate Schedule" calendar without entry duplication.', 'Specific Objective 4:'));

  // 1.3 Project Assumptions and Constraints
  elements.push(createHeading2('1.3 Project Assumptions and Constraints'));
  elements.push(
    createTable(
      ['Category', 'Parameter', 'Operational Description & Impact'],
      [
        ['Assumption', 'Target Operating System', 'Students utilize Android (API 26+) or iOS (15+) mobile devices capable of running the Expo React Native runtime environment.'],
        ['Assumption', 'Network Availability', 'Internet connectivity is periodic rather than continuous; students have intermittent access to Wi-Fi or cellular data for sync and AI requests.'],
        ['Constraint', 'Hardware Resources', 'Local device SQLite operations must execute within limited mobile memory footprints without triggering background memory termination.'],
        ['Constraint', 'AI Service Latency', 'Generative AI features (RAG chat, schedule parsing) are subject to external API rate limits (Google Gemini) and cloud response latencies.'],
        ['Constraint', 'Document Size Limits', 'File uploads to the AI Study Hub are bounded at 20MB per document to prevent memory exhaustion on serverless cloud nodes.'],
        ['Constraint', 'Timezone Uniformity', 'Academic scheduling rules, dates, and deadlines adhere strictly to Philippine Standard Time (UTC+08:00, Asia/Manila) year-round.'],
      ],
      [20, 25, 55]
    )
  );

  // 1.4 Project Organization
  elements.push(createHeading2('1.4 Project Organization and Governance'));
  elements.push(
    createParagraph(
      'The project was executed by a collaborative student research and engineering team under the supervision of the Cordova Public College College of Computer Studies faculty. Standardized roles and communication protocols ensured rigorous execution:'
    )
  );
  elements.push(createBullet('Responsible for overall project lifecycle management, requirements engineering, Express RESTful API backend architecture, PostgreSQL database schema, PowerSync sync rules, and AI multimodal integration.', 'Kenji Agustine Caayohan (Project Manager & Backend Architect):'));
  elements.push(createBullet('Responsible for mobile application UI/UX interface architecture, screen prototyping, aesthetic design system tokens, and student usability optimization.', 'Rochelle Andales (Frontend Mobile Engineer & UI/UX Designer):'));
  elements.push(createBullet('Responsible for React Native / Expo client-side engineering, Zustand state store architecture, embedded SQLite local storage integration, and native calendar synchronization.', 'Kent Jeced Alcantara (Frontend Mobile Application Engineer):'));
  elements.push(createBullet('Provides academic direction, architectural consultation, methodology approval, and defense preparation oversight.', 'Nicasio P. Amoin Jr., MIT (Capstone Project Adviser):'));

  // 1.5 Development Approach & Life Cycle
  elements.push(createHeading2('1.5 Software Development Life Cycle: Agile Iterative Methodology'));
  elements.push(
    createParagraph(
      'AcadMate was engineered following the Agile Software Development Methodology, specifically adopting an iterative Scrum framework structured into milestone-driven sprint cycles. Given the technical complexity of integrating offline-first SQLite synchronization, dynamic alternating cohorts (Set A / Set B), and generative AI vision/RAG pipelines, an Agile approach ensured continuous incremental testing, rapid stakeholder feedback integration, and risk mitigation across every project phase.'
    )
  );

  elements.push(
    ...createFigure(
      'agile_lifecycle.png',
      'Figure 1.1: AcadMate Agile Iterative Software Development Lifecycle',
      500,
      280
    )
  );

  elements.push(
    createParagraph(
      'Each iterative cycle across the eight development phases encompassed five continuous engineering disciplines:'
    )
  );
  elements.push(createBullet('The development team and Capstone Project Adviser prioritized feature epics and architectural deliverables based on academic requirements and defense panel feedback.', '1. Sprint Planning & Backlog Prioritization:'));
  elements.push(createBullet('Modular, test-driven coding across frontend (Expo/React Native) and backend (Express/Prisma/PostgreSQL), maintaining local-first SQLite offline parity alongside cloud synchronization rules.', '2. Iterative Prototyping & Incremental Coding:'));
  elements.push(createBullet('Daily alignment among the Project Manager, Frontend Engineer, and UI/UX Designer to review API contracts, unblock cross-tier dependencies, and resolve state synchronization challenges.', '3. Daily Standup & Cross-Functional Collaboration:'));
  elements.push(createBullet('Every sprint increment underwent rigorous 0-error TypeScript static analysis, database migration integrity tests, and real-time physical Android device execution.', '4. Continuous Quality Verification & Testing:'));
  elements.push(createBullet('Completed modules were reviewed with advisers and peer students, enabling prompt pivots—such as the rapid implementation of historical schedule immutability and unused schema pruning.', '5. Sprint Review & Stakeholder Adaptation:'));

  // 1.6 Project Schedule & Milestones
  elements.push(createHeading2('1.6 Project Schedule and Work Breakdown'));
  elements.push(
    createParagraph(
      'The project lifecycle officially commenced with the Capstone 1 Proposal Defense on April 18, 2026, wherein the problem domain, offline-first architectural concept, and methodology received formal evaluation committee approval. Development then proceeded through eight structured engineering sprints, culminating in the Final Capstone Oral Defense on October 17, 2026, followed by panelist revision sign-offs:'
    )
  );

  elements.push(
    ...createFigure(
      'wbs_timeline.png',
      'Figure 1.2: AcadMate Work Breakdown Structure & SDLC Engineering Timeline',
      520,
      270
    )
  );

  elements.push(
    createTable(
      ['Phase / Event', 'Milestone Name', 'Iteration Window', 'Core Deliverables & Verified Outcomes', 'Status'],
      [
        ['Milestone', 'Capstone 1 Proposal Defense', 'Apr 18, 2026', 'Formal concept presentation, problem statement approval, and methodology validation by the panel.', 'Approved'],
        ['Phase 1', 'Requirements & Domain Modeling', 'May 04 – May 30', 'Collegiate academic workflow analysis, stakeholder interviews, 18-entity ERD design, and tech stack selection.', 'Completed'],
        ['Phase 2', 'Core Architecture & Authentication', 'Jun 01 – Jun 30', 'PostgreSQL schema deployment, Prisma ORM, JWT authentication, Google OAuth 2.0, and email verification.', 'Completed'],
        ['Phase 3', 'Local-First Storage & PowerSync', 'Jul 01 – Jul 31', 'Embedded Quick-SQLite engine, PowerSync client SDK, bi-directional sync rules, and offline write batching.', 'Completed'],
        ['Phase 4', 'Timetable & Calendar Resolver', 'Aug 03 – Sep 04', 'Dynamic Set A/B schedule resolution, Philippine holiday seeding, exam week locking, and native calendar sync.', 'Completed'],
        ['Phase 5', 'Multimodal AI Ingestion', 'Sep 01 – Sep 18', 'Gemini multimodal syllabus and timetable extraction, task parser service, and schedule confirmation review UI.', 'Completed'],
        ['Phase 6', 'AI Study Hub & RAG Pipeline', 'Sep 14 – Sep 30', 'Supabase storage bucket integration, document text extraction, pgvector 768-dim embeddings, and grounded chat.', 'Completed'],
        ['Phase 7', 'AI Study Tools & Polish', 'Sep 28 – Oct 09', 'Automated flashcard decks, interactive 4-option quiz generation, attempt scoring, and UI aesthetic polish.', 'Completed'],
        ['Phase 8', 'Verification & Defense Prep', 'Oct 05 – Oct 16', 'Cross-platform typecheck verification (0 errors), physical device testing, pre-defense manuscript compilation, and dry runs.', 'Completed'],
        ['Milestone', 'Final Capstone Oral Defense', 'Oct 17, 2026', 'Comprehensive project presentation and live system demonstration before the Cordova Public College defense panel.', 'Defended'],
        ['Post-Defense', 'Panel Feedback Revisions', 'Oct 18 – Oct 24', 'Historical schedule immutability enforcement, dead-code/schema pruning (SemesterRule/Hybrid), and final documentation archival.', 'Completed'],
      ],
      [12, 22, 14, 40, 12]
    )
  );

  // 1.7 Risk Management
  elements.push(createHeading2('1.7 Risk Management and Contingency Planning'));
  elements.push(
    createTable(
      ['Risk Identifier', 'Identified Technical Risk', 'Severity & Likelihood', 'Mitigation Strategy Implemented in AcadMate'],
      [
        ['RSK-01', 'Offline Network Transitions & Sync Interruption', 'High / High', 'Engineered local-first SQLite persistence via PowerSync; all user writes commit locally with optimistic UI updates and queue for background batch sync.'],
        ['RSK-02', 'External AI Service Rate Limits (429/503)', 'High / Medium', 'Implemented a defensive multi-tier model cascade in the backend (gemini-3.5-flash → 3.6-flash → 3.5-flash-lite) that gracefully falls back on error.'],
        ['RSK-03', 'AI Extraction Hallucination in Schedules', 'Medium / Medium', 'Enforced an interactive Schedule Confirmation UI requiring students to review, edit, or reject parsed class entries before persisting to database.'],
        ['RSK-04', 'Premature JWT Session Expiration', 'Medium / High', 'Engineered proactive JWT expiration verification with a 30-second buffer and an in-flight refresh mutex preventing duplicate refresh token invalidation.'],
        ['RSK-05', 'Calendar Duplication on Native Device Export', 'Medium / Medium', 'Configured an isolated, dedicated "Acadmate Schedule" calendar with full wipe-and-recreate idempotency during re-sync operations.'],
        ['RSK-06', 'Timezone Offsets Boundary Shifting', 'Medium / High', 'Built a dedicated Philippine Timezone utility (UTC+08:00) parsing timestamps directly to PHT components without relying on device local timezones.'],
      ],
      [15, 25, 20, 40]
    )
  );

  // 1.8 Quality and Configuration Management
  elements.push(createHeading2('1.8 Quality Assurance and Configuration Management'));
  elements.push(
    createParagraph(
      'Quality assurance in AcadMate is enforced through rigorous architectural constraints and continuous static analysis:'
    )
  );
  elements.push(createBullet('Static Type Enforcement: Strict TypeScript configuration across both frontend and backend repositories; builds require zero compiler errors before milestone sign-off.', 'Type Safety:'));
  elements.push(createBullet('Schema Validation: All incoming REST API payloads are strictly validated against runtime Zod schemas, stripping unrecognized or malicious parameters before processing.', 'Payload Validation:'));
  elements.push(createBullet('Database Integrity: Prisma ORM foreign key constraints with cascade deletes ensure orphaned data elimination across user accounts, notebooks, and study tools.', 'Relational Integrity:'));
  elements.push(createBullet('Version Control: Distributed Git repository structure tracking granular commit histories, feature branches, and reproducible database migration logs.', 'Change Control:'));

  return elements;
}
