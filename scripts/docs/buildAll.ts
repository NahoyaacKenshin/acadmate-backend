import { Document, Packer, Paragraph, Table, PageBreak } from 'docx';
import * as fs from 'fs';
import * as path from 'path';

import { createHeader, createFooter } from './docHelper';
import { getSPMPContent } from './spmpContent';
import { getSRSContent } from './srsContent';
import { getSDDContent } from './sddContent';
import { getSTDContent } from './stdContent';
import { getManualContent } from './manualContent';
import {
  getTitlePage,
  getAcknowledgment,
  getAbstract,
  getRecommendations,
  getAppendices,
  getDeveloperProfiles,
} from './frontBackContent';

const OUTPUT_DIR = path.resolve(process.cwd(), '../documentation');

async function saveDocument(filename: string, title: string, children: (Paragraph | Table)[]): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              bottom: 1440, // 1 inch
              left: 1440,   // 1 inch
              right: 1440,  // 1 inch
            },
          },
        },
        headers: {
          default: createHeader(title),
        },
        footers: {
          default: createFooter(),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const targetPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(targetPath, buffer);
  console.log(`✅ Generated: ${targetPath} (${Math.round(buffer.length / 1024)} KB)`);
}

async function generateAll(): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🚀 Starting Capstone Documentation Generation for AcadMate...');

  // 1. Individual SPMP Document
  await saveDocument(
    'AcadMate_SPMP.docx',
    'Software Project Management Plan',
    [...getSPMPContent()]
  );

  // 2. Individual SRS Document
  await saveDocument(
    'AcadMate_SRS.docx',
    'Software Requirements Specification',
    [...getSRSContent()]
  );

  // 3. Individual SDD Document
  await saveDocument(
    'AcadMate_SDD.docx',
    'Software Design Document',
    [...getSDDContent()]
  );

  // 4. Individual STD Document
  await saveDocument(
    'AcadMate_STD.docx',
    'Software Test Document',
    [...getSTDContent()]
  );

  // 5. Individual User Manual Document
  await saveDocument(
    'AcadMate_User_Manual.docx',
    'Student User Manual',
    [...getManualContent()]
  );

  // 6. Complete Unified Master Manuscript
  console.log('📚 Assembling Complete Unified Capstone Manuscript...');
  const masterChildren: (Paragraph | Table)[] = [
    // Front Matter
    ...getTitlePage(),
    new Paragraph({ children: [new PageBreak()] }),

    ...getAcknowledgment(),
    new Paragraph({ children: [new PageBreak()] }),

    ...getAbstract(),
    new Paragraph({ children: [new PageBreak()] }),

    // Major Sections
    ...getSPMPContent(),
    new Paragraph({ children: [new PageBreak()] }),

    ...getSRSContent(),
    new Paragraph({ children: [new PageBreak()] }),

    ...getSDDContent(),
    new Paragraph({ children: [new PageBreak()] }),

    ...getSTDContent(),
    new Paragraph({ children: [new PageBreak()] }),

    ...getManualContent(),
    new Paragraph({ children: [new PageBreak()] }),

    ...getRecommendations(),
    new Paragraph({ children: [new PageBreak()] }),

    ...getAppendices(),
    new Paragraph({ children: [new PageBreak()] }),

    ...getDeveloperProfiles(),
  ];

  await saveDocument(
    'AcadMate_Capstone_Documentation.docx',
    'Main Manuscript',
    masterChildren
  );

  // 7. Generate DOCUMENTATION_STATUS.md
  generateStatusReport();

  console.log('🎉 All Capstone Documentation deliverables successfully generated!');
}

function generateStatusReport(): void {
  const statusContent = `# AcadMate Capstone Documentation Status Report
**Project Title:** AcadMate: An Offline-First Intelligent Academic Planner & Study Assistant  
**Institution:** Cordova Public College — Bachelor of Science in Information Technology  
**Date Generated:** October 22, 2026  
**Directory:** \`documentation/\`

---

## 1. Deliverables Created and Verified

| File Name | Format | Status | Description |
| :--- | :--- | :--- | :--- |
| **\`AcadMate_Capstone_Documentation.docx\`** | Word DOCX | **Complete** | Full unified academic manuscript containing Title Page, Acknowledgment, Abstract, SPMP, SRS, SDD, STD, User Manual, Recommendations, Appendices, and Developer Profiles. |
| **\`AcadMate_SPMP.docx\`** | Word DOCX | **Complete** | Dedicated Software Project Management Plan covering scope, objectives, SDLC, work breakdown, risk management, and quality control. |
| **\`AcadMate_SRS.docx\`** | Word DOCX | **Complete** | Dedicated Software Requirements Specification defining 38 Functional Requirements (FR-001–FR-038), 10 Non-Functional Requirements (NFR-001–NFR-010), and Use Cases. |
| **\`AcadMate_SDD.docx\`** | Word DOCX | **Complete** | Dedicated Software Design Document covering System Architecture, 18-Entity Relational Schema, Algorithms & Pseudocode, and Security. |
| **\`AcadMate_STD.docx\`** | Word DOCX | **Complete** | Dedicated Software Test Document with 20 Verified Test Cases (TC-001–TC-020), Defect Remediation Log, and Requirements Traceability Matrix. |
| **\`AcadMate_User_Manual.docx\`** | Word DOCX | **Complete** | Step-by-step student user guide covering setup, timetable management, AI schedule parsing, tasks, calendar export, RAG chat, flashcards, and quizzes. |
| **\`DOCUMENTATION_STATUS.md\`** | Markdown | **Complete** | Formal Phase 7 audit report of verified features, test results, and placeholders. |

---

## 2. Key Verifications from Implementation

1. **Strict Exclusion of Approval Sheet:** Confirmed. The Approval Sheet was **NOT** generated or included, strictly complying with institutional defense instructions.
2. **Pruned Unused Tables & Modalities:** Confirmed. Dead tables (\`SemesterRule\`, \`ProgramMapping\`) and unused modalities (\`HYBRID\`) were removed prior to drafting, ensuring technical accuracy.
3. **Local-First & Offline Scope:** Accurately documented that core academic planning (Timetables, Tasks, Calendar, Exam Overrides, Philippine Holidays, Local Storage) operates 100% offline via SQLite, while AI ingestion, embeddings, and RAG chat require internet connectivity.
4. **Calendar Export Idempotence:** Accurately documented that native calendar synchronization is an idempotent one-way export to a dedicated \`"Acadmate Schedule"\` calendar, preventing duplicate entries.
5. **Quality Assurance Transparency:** Accurately disclosed that testing was conducted through strict TypeScript compiler typechecking (0 errors across backend and frontend), manual end-to-end device runs, and API validation.

---

## 3. Project Proponents and Academic Governance

The research team, academic adviser, and academic department have been populated:
- **Project Manager & Backend Architect:** Kenji Agustine Caayohan
- **Frontend Mobile Engineer & UI/UX Designer:** Rochelle Andales
- **Frontend Mobile Application Engineer:** Kent Jeced Alcantara
- **Capstone Project Adviser:** Nicasio P. Amoin Jr., MIT
- **Department:** College of Computer Studies
- **Degree Program:** Bachelor of Science in Information Technology
- **Institution:** Cordova Public College (Gabi, Cordova, Cebu, Philippines)

### Remaining Panel Placeholders for Formal Defense:
- \`[Dean / Panel Member Names]\` (Faculty Defense Panel)
`;

  const statusPath = path.join(OUTPUT_DIR, 'DOCUMENTATION_STATUS.md');
  fs.writeFileSync(statusPath, statusContent);
  console.log(`✅ Generated: ${statusPath}`);
}

generateAll().catch((err) => {
  console.error('❌ Error generating documentation:', err);
  process.exit(1);
});
