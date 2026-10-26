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

export function getManualContent(): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  elements.push(createHeading1('SECTION 5: USER MANUAL'));
  elements.push(
    createParagraph(
      'The AcadMate User Manual provides undergraduate collegiate students with clear, step-by-step operational instructions for navigating the mobile application, managing academic schedules, utilizing AI study tools, and synchronizing data across offline and online campus environments.'
    )
  );

  // 5.1 Introduction & Setup
  elements.push(createHeading2('5.1 Introduction and System Requirements'));
  elements.push(
    createParagraph(
      'AcadMate is an offline-first academic planner and study companion designed specifically for higher education students. It helps you manage complex class schedules, track alternating Set A / Set B campus attendance, organize assignments with milestone checklists, and study efficiently using AI-powered study notebooks, flashcards, and quizzes.'
    )
  );

  elements.push(
    createTable(
      ['Requirement Category', 'Supported Specification & Recommendation'],
      [
        ['Operating System', 'Android 8.0 (Oreo / API Level 26) or higher; iOS 15.0 or higher.'],
        ['Hardware Memory', 'Minimum 2 GB RAM (3 GB or higher recommended for smooth animations).'],
        ['Device Storage', 'At least 150 MB of available internal storage for local SQLite database and cached study documents.'],
        ['Network Connectivity', 'Intermittent Wi-Fi or cellular mobile data. Core scheduling functions work completely offline; AI ingestion and study chat require an active connection.'],
      ],
      [25, 75]
    )
  );

  // 5.2 Account Setup & Onboarding
  elements.push(createHeading2('5.2 Getting Started: Account Setup & Onboarding'));
  elements.push(createHeading3('5.2.1 Registration and Email Verification'));
  elements.push(createBullet('Launch the AcadMate mobile app on your smartphone.', 'Step 1:'));
  elements.push(createBullet('On the Welcome screen, tap "Create Account".', 'Step 2:'));
  elements.push(createBullet('Enter your official university email address, your full name, and a secure password (minimum 8 characters). Tap "Sign Up".', 'Step 3:'));
  elements.push(createBullet('Check your email inbox for an AcadMate verification link. Tap the link to verify your email address.', 'Step 4:'));
  elements.push(createBullet('Return to the app and sign in with your verified credentials. Alternatively, you may tap "Continue with Google" for instant one-tap registration.', 'Step 5:'));

  elements.push(
    ...createFigure(
      'screen_login.png',
      'Figure 5.1: Student Authentication and Account Sign-In Interface',
      280,
      450
    )
  );

  elements.push(createHeading3('5.2.2 Selecting Your Student Cohort (Set A, Set B, or Standard)'));
  elements.push(
    createParagraph(
      'During your first login, AcadMate will present an onboarding screen asking for your Student Cohort. This setting controls how the app calculates your campus attendance:'
    )
  );
  elements.push(createBullet('Choose "Set A" if your university program schedules you for Face-to-Face classes on Set A rotation weeks and Online classes on Set B weeks.', 'Set A:'));
  elements.push(createBullet('Choose "Set B" if your program attends campus during Set B rotation weeks and attends remotely during Set A weeks.', 'Set B:'));
  elements.push(createBullet('Choose "Standard" if your academic schedule does not participate in alternating cohort rotations (all regular classes follow standard schedules every week).', 'Standard:'));
  elements.push(
    createParagraph(
      'Note: You can update your cohort selection at any time by navigating to Settings > Academic Profile.'
    )
  );

  elements.push(
    ...createFigure(
      'screen_onboarding.png',
      'Figure 5.2: Student Cohort Onboarding Interface (Set A, Set B, Standard)',
      280,
      450
    )
  );

  // 5.3 Managing Schedules
  elements.push(createHeading2('5.3 Academic Timetable Management'));
  elements.push(createHeading3('5.3.1 Creating a Class Schedule Manually'));
  elements.push(createBullet('From the bottom navigation bar, tap the "Calendar" tab, then tap the "+" (Add) button in the upper right.', 'Step 1:'));
  elements.push(createBullet('Select "Add Class Schedule".', 'Step 2:'));
  elements.push(createBullet('Choose or create a Subject (e.g., "IT 301 - Systems Analysis"). Assign a course color code for visual distinction.', 'Step 3:'));
  elements.push(createBullet('Select the active Days of the Week (e.g., tap "M", "W", "F" for Monday-Wednesday-Friday recurrence).', 'Step 4:'));
  elements.push(createBullet('Set the Start Time and End Time using the time picker.', 'Step 5:'));
  elements.push(createBullet('Select the Modality: Tap "Face-to-Face" (and enter the room number, e.g., "Lab 3") or tap "Online".', 'Step 6:'));
  elements.push(createBullet('Select the Cohort Tag: Choose "Set A", "Set B", or leave as "Both / Every Week".', 'Step 7:'));
  elements.push(createBullet('Tap "Save Schedule". The class will instantly appear on your calendar.', 'Step 8:'));

  elements.push(
    ...createFigure(
      'screen_today_agenda.png',
      'Figure 5.3: Home Dashboard and Daily Agenda Feed with Modality Badges',
      280,
      450
    )
  );

  elements.push(createHeading3('5.3.2 Importing Timetables via AI Schedule Parser'));
  elements.push(createBullet('Tap the "Upload Schedule" button on the Calendar or Home screen.', 'Step 1:'));
  elements.push(createBullet('Select your enrollment form, class schedule PDF, Word document, or take a clear photo of your printed schedule flyer.', 'Step 2:'));
  elements.push(createBullet('Wait 3–8 seconds while AcadMate’s Gemini AI analyzes the document and extracts subjects, times, rooms, and modalities.', 'Step 3:'));
  elements.push(createBullet('The Schedule Confirmation sheet will appear. Carefully review each extracted class. Tap any class to edit the room name, time, or modality if the document had poor lighting or unreadable fonts.', 'Step 4:'));
  elements.push(createBullet('Tap "Confirm & Save". All approved classes and semester exam periods will be imported into your local calendar immediately.', 'Step 5:'));

  elements.push(
    ...createFigure(
      'screen_schedule_upload.png',
      'Figure 5.4: Multimodal Schedule Document Upload Interface',
      280,
      450
    )
  );

  elements.push(
    ...createFigure(
      'screen_schedule_confirm.png',
      'Figure 5.5: AI Multimodal Schedule Ingestion Confirmation Sheet',
      280,
      450
    )
  );

  // 5.4 Tasks & Assignments
  elements.push(createHeading2('5.4 Task and Assignment Management'));
  elements.push(createHeading3('5.4.1 Creating and Tracking Tasks'));
  elements.push(createBullet('Navigate to the "Tasks" tab from the bottom navigation bar.', 'Step 1:'));
  elements.push(createBullet('Tap "+ Add Task". Enter the assignment title (e.g., "Capstone Chapter 2 Draft").', 'Step 2:'));
  elements.push(createBullet('Link the task to an enrolled Subject (optional) and select a Due Date and Time.', 'Step 3:'));
  elements.push(createBullet('Add Subtasks if you want to break the assignment into smaller milestones (e.g., "Review Literature", "Draft Methodology").', 'Step 4:'));
  elements.push(createBullet('Tap "Create Task". You can tap the round checkbox at any time to mark the task or individual subtasks complete.', 'Step 5:'));

  elements.push(createHeading3('5.4.2 AI Task Extraction from Announcements'));
  elements.push(createBullet('When your professor posts a long assignment prompt or project announcement on your learning portal, copy the text to your clipboard.', 'Step 1:'));
  elements.push(createBullet('In AcadMate, tap "Tasks" > "AI Parse". Paste the announcement text into the prompt box and tap "Analyze".', 'Step 2:'));
  elements.push(createBullet('AcadMate will automatically extract the task title, detect the deadline, link it to the matching course, and generate milestone subtask steps for you to review and save.', 'Step 3:'));

  elements.push(
    ...createFigure(
      'screen_tasks.png',
      'Figure 5.6: Task Management and Milestone Progress Checklist',
      280,
      450
    )
  );

  // 5.5 Calendar & Native Sync
  elements.push(createHeading2('5.5 Interactive Calendar and Google/Apple Calendar Export'));
  elements.push(createHeading3('5.5.1 Navigating the Academic Calendar'));
  elements.push(createBullet('Month View: Displays a complete monthly grid with colored dots indicating classes, exams, holidays, and deadlines.', 'Month View:'));
  elements.push(createBullet('Week Strip: Allows rapid horizontal scrolling across semester weeks, showing active attendance badges for each day.', 'Week Strip:'));
  elements.push(createBullet('Day Feed: Displays your complete daily schedule in chronological order, showing resolved class modalities, room numbers, and examination alerts.', 'Day Feed:'));
  elements.push(createBullet('Holiday & Exam Indicators: Official Philippine holidays automatically show red "HOLIDAY" suspension badges; exam weeks show amber "EXAM WEEK" badges.', 'Badges:'));

  elements.push(createHeading3('5.5.2 Exporting to Native Device Calendars (Google Calendar / Apple Calendar)'));
  elements.push(createBullet('Navigate to Calendar and tap the "Sync to Device Calendar" icon (or open Settings > Calendar Sync).', 'Step 1:'));
  elements.push(createBullet('When prompted by your phone, tap "Allow" to grant calendar permissions.', 'Step 2:'));
  elements.push(createBullet('Select your export preferences: check "Class Schedules", "Exam Weeks", and optionally "Task Deadlines".', 'Step 3:'));
  elements.push(createBullet('Tap "Sync Now". AcadMate will create a dedicated calendar named "Acadmate Schedule" in your phone’s calendar app.', 'Step 4:'));
  elements.push(createBullet('Open your phone’s native Google Calendar or Apple Calendar app. All your recurring classes, exam periods, and reminders are now accessible and will sound alarms before class.', 'Step 5:'));

  elements.push(
    ...createFigure(
      'screen_calendar_month.png',
      'Figure 5.7: Monthly Academic Calendar with Alternating Cohort and Holiday Indicators',
      280,
      450
    )
  );

  elements.push(
    ...createFigure(
      'screen_calendar_sync.png',
      'Figure 5.8: Native Device Calendar Synchronization Modal',
      280,
      450
    )
  );

  // 5.6 AI Study Hub
  elements.push(createHeading2('5.6 AI Study Hub: Notebooks, Grounded Chat & Citations'));
  elements.push(createHeading3('5.6.1 Creating a Study Notebook and Uploading Course Materials'));
  elements.push(createBullet('Tap the "Notebook" tab from the bottom navigation bar.', 'Step 1:'));
  elements.push(createBullet('Tap "+ New Notebook". Enter a title (e.g., "Database Systems - Midterms") and select a course tag.', 'Step 2:'));
  elements.push(createBullet('Open the notebook and tap "Add Source". Choose a PDF lecture, Word document (DOCX), text file, or photo of your textbook.', 'Step 3:'));
  elements.push(createBullet('AcadMate will upload the file and extract its text in the background. Once the status shows "Ready", you can begin studying.', 'Step 4:'));

  elements.push(
    ...createFigure(
      'screen_notebook_sources.png',
      'Figure 5.9: AI Study Notebook and Document Source Manager',
      280,
      450
    )
  );

  elements.push(createHeading3('5.6.2 Grounded AI Study Chat with Verifiable Citations'));
  elements.push(createBullet('Inside your Notebook, tap the "Chat" tab.', 'Step 1:'));
  elements.push(createBullet('Type any question regarding your lecture notes (e.g., "Explain Boyce-Codd Normal Form with an example from my notes").', 'Step 2:'));
  elements.push(createBullet('AcadMate searches your uploaded documents using vector similarity and generates an answer strictly based on your materials.', 'Step 3:'));
  elements.push(createBullet('Notice the clickable citation chips beneath the answer (e.g., "[Source 1, Chunk 4]"). Tap any citation to open a modal showing the exact passage from your textbook.', 'Step 4:'));

  elements.push(
    ...createFigure(
      'screen_rag_chat.png',
      'Figure 5.10: Grounded AI Notebook Chat with Verifiable Document Citations',
      280,
      450
    )
  );

  // 5.7 Flashcards & Quizzes
  elements.push(createHeading2('5.7 AI Study Tools: Flashcards and Interactive Quizzes'));
  elements.push(createHeading3('5.7.1 Generating and Studying Flashcard Decks'));
  elements.push(createBullet('Inside your Notebook, tap the "Tools" tab and select "Flashcards".', 'Step 1:'));
  elements.push(createBullet('Tap "Generate with AI". Select how many cards you want (e.g., 10 cards) and tap "Generate".', 'Step 2:'));
  elements.push(createBullet('Open the deck and tap any card to flip between the Question and Answer.', 'Step 3:'));
  elements.push(createBullet('Tap "Mark Mastered" when you have memorized a concept. The progress bar will track your mastery percentage.', 'Step 4:'));

  elements.push(
    ...createFigure(
      'screen_flashcards.png',
      'Figure 5.11: AI Flashcards Study Deck and Flip Card Interface',
      280,
      450
    )
  );

  elements.push(createHeading3('5.7.2 Generating and Taking Practice Quizzes'));
  elements.push(createBullet('Inside your Notebook, tap "Tools" > "Quizzes".', 'Step 1:'));
  elements.push(createBullet('Tap "Generate Quiz with AI". Choose the number of questions (e.g., 5 multiple-choice questions).', 'Step 2:'));
  elements.push(createBullet('Tap "Start Quiz" to launch the interactive Quiz Runner.', 'Step 3:'));

  elements.push(
    ...createFigure(
      'screen_quizzes.png',
      'Figure 5.12: Interactive 4-Option Quiz Runner and Evaluation Screen',
      280,
      450
    )
  );
  elements.push(createBullet('Select your answer for each question. Tap "Next Question".', 'Step 4:'));
  elements.push(createBullet('Upon completing the quiz, tap "Submit". AcadMate instantly displays your score (e.g., 4/5 - 80%) along with detailed explanations for every correct and incorrect answer.', 'Step 5:'));

  // 5.8 Offline Usage
  elements.push(createHeading2('5.8 Understanding Offline Capability vs. Online Features'));
  elements.push(
    createParagraph(
      'AcadMate is built with local-first technology. It is important to know which features work without internet access and which features require a connection:'
    )
  );

  elements.push(
    createTable(
      ['Feature / Action', 'Offline Availability', 'Operational Behavior'],
      [
        ['View Class Timetable & Calendar', '100% Offline', 'Stored locally in device SQLite; loads instantly with zero data required.'],
        ['View, Create, & Complete Tasks', '100% Offline', 'Saves immediately to local database; queues for cloud sync when connected.'],
        ['Dynamic Set A/B Modality Calculation', '100% Offline', 'Calculated by local JavaScript engine on your device; no server needed.'],
        ['Holiday Suspensions & Exam Overrides', '100% Offline', 'Pre-seeded holiday tables and saved exam weeks are evaluated locally.'],
        ['Native Calendar Export', '100% Offline', 'Communicates directly with your phone’s calendar engine; no internet needed.'],
        ['Review Saved Flashcards & Quizzes', '100% Offline', 'Previously loaded decks can be reviewed and flipped without connectivity.'],
        ['Upload Documents & Syllabus Parsing', 'Online Only', 'Requires internet to upload files and access Google Gemini AI services.'],
        ['AI Notebook Study Chat (RAG)', 'Online Only', 'Requires internet to query cloud vector embeddings and generate AI responses.'],
        ['Generate New Flashcards or Quizzes', 'Online Only', 'Requires cloud AI connection to analyze notes and compose questions.'],
      ],
      [28, 18, 54]
    )
  );

  elements.push(createHeading3('5.8.2 Configuring Personal Gemini AI Credentials (BYOK)'));
  elements.push(
    createParagraph(
      'To prevent hitting shared server quotas during peak exam periods, students can supply their own free Google Gemini API key directly from Settings:'
    )
  );
  elements.push(createBullet('Navigate to the Settings tab and scroll to "AI Model & Credentials (BYOK)".', 'Step 1:'));
  elements.push(createBullet('Tap the in-app link "How do I get a free Gemini API key? (Tutorial)" to open the interactive step-by-step setup guide.', 'Step 2:'));
  elements.push(createBullet('Tap "Go to Google AI Studio" to open your browser, sign in with any standard Google account, and click "Create API Key" (100% free, no credit card required).', 'Step 3:'));
  elements.push(createBullet('Copy your generated key (starting with "AIzaSy...") and paste it into the AcadMate input field.', 'Step 4:'));
  elements.push(createBullet('Tap "Verify & Save". AcadMate sends a live verification test to the Google Gemini API. Upon validation, the key is securely saved to your device hardware keychain (SecureStore), and a green "Custom Key Active" badge appears.', 'Step 5:'));
  elements.push(createBullet('Fail-Safe Reliability: If your personal key ever exhausts its free tier quota, AcadMate automatically falls back to system-provided credentials, ensuring zero disruption to your studying.', 'Automatic Fallback:'));

  elements.push(
    ...createFigure(
      'screen_settings.png',
      'Figure 5.13: Academic Settings, BYOK AI Configuration, and Native Calendar Sync',
      280,
      450
    )
  );

  // 5.9 Troubleshooting
  elements.push(createHeading2('5.9 Common Troubleshooting Guidelines'));
  elements.push(createBullet('Check your internet connection and verify that your email address was verified. Tap "Resend Verification Email" if needed.', 'Login Error:'));
  elements.push(createBullet('Ensure the document photo is well-lit, laid flat, and in sharp focus. If fonts are highly stylized or handwritten, review and correct the text in the Schedule Confirmation sheet.', 'AI Schedule Parsing Inaccurate:'));
  elements.push(createBullet('Go to Settings > Calendar Sync and verify that AcadMate has calendar read/write permissions. Tap "Sync Now" to refresh all events.', 'Calendar Events Missing in Google Calendar:'));
  elements.push(createBullet('Ensure the file size is under 20MB and is a standard PDF, DOCX, or clear image. Wait for the status indicator to turn green ("Ready") before starting a chat.', 'Document Upload Failed:'));

  return elements;
}
