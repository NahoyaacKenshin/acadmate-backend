import * as fs from 'fs';
import * as path from 'path';
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  ShadingType,
  ISectionOptions,
  ImageRun,
} from 'docx';

export const PRIMARY_COLOR = '1E3A8A';   // Dark Navy
export const SECONDARY_COLOR = '2563EB'; // Royal Blue
export const ACCENT_COLOR = '6C8EFF';    // Acadmate Accent
export const TEXT_DARK = '1E293B';       // Slate 800
export const TEXT_MUTED = '64748B';      // Slate 500
export const BG_LIGHT = 'F8FAFC';        // Slate 50
export const BORDER_COLOR = 'CBD5E1';     // Slate 300

export const FONT_FAMILY = 'Calibri';

export function createTitle(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 36, // 18pt
        bold: true,
        color: PRIMARY_COLOR,
      }),
    ],
  });
}

export function createSubtitle(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 240 },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 24, // 12pt
        italics: true,
        color: TEXT_MUTED,
      }),
    ],
  });
}

export function createHeading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 30, // 15pt
        bold: true,
        color: PRIMARY_COLOR,
      }),
    ],
  });
}

export function createHeading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 26, // 13pt
        bold: true,
        color: SECONDARY_COLOR,
      }),
    ],
  });
}

export function createHeading3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 60 },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 22, // 11pt
        bold: true,
        color: TEXT_DARK,
      }),
    ],
  });
}

export function createParagraph(text: string, options: { bold?: boolean; italics?: boolean; indent?: number } = {}): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFY,
    spacing: { before: 60, after: 100, line: 276 }, // 1.15 line spacing
    indent: options.indent ? { left: options.indent } : undefined,
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: 22, // 11pt
        bold: options.bold,
        italics: options.italics,
        color: TEXT_DARK,
      }),
    ],
  });
}

export function createBullet(text: string, boldPrefix?: string): Paragraph {
  const children: TextRun[] = [];
  if (boldPrefix) {
    children.push(
      new TextRun({
        text: boldPrefix + ' ',
        font: FONT_FAMILY,
        size: 22,
        bold: true,
        color: PRIMARY_COLOR,
      })
    );
  }
  children.push(
    new TextRun({
      text,
      font: FONT_FAMILY,
      size: 22,
      color: TEXT_DARK,
    })
  );

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
    children,
  });
}

export function createCalloutBox(title: string, content: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.SINGLE, size: 24, color: PRIMARY_COLOR },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: BG_LIGHT },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: title,
                    font: FONT_FAMILY,
                    size: 22,
                    bold: true,
                    color: PRIMARY_COLOR,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: content,
                    font: FONT_FAMILY,
                    size: 20,
                    italics: true,
                    color: TEXT_DARK,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function createFigure(
  imageFilename: string,
  caption: string,
  width = 520,
  height = 300
): (Paragraph | Table)[] {
  const figuresDir = path.resolve(process.cwd(), '../documentation/figures');
  const baseName = imageFilename.replace(/\.[^/.]+$/, '');
  const altBaseName = baseName.includes('_') ? baseName.replace(/_/g, '-') : baseName.replace(/-/g, '_');
  const possiblePaths = [
    path.join(figuresDir, imageFilename),
    path.join(figuresDir, baseName + '.png'),
    path.join(figuresDir, baseName + '.jpg'),
    path.join(figuresDir, baseName + '.jpeg'),
    path.join(figuresDir, altBaseName + '.png'),
    path.join(figuresDir, altBaseName + '.jpg'),
    path.join(figuresDir, altBaseName + '.jpeg'),
  ];

  let foundPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  const elements: (Paragraph | Table)[] = [];

  if (foundPath) {
    try {
      const imageBuffer = fs.readFileSync(foundPath);
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 60 },
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width,
                height,
              },
            }),
          ],
        })
      );
    } catch (err) {
      console.warn(`Could not load image ${foundPath}:`, err);
    }
  } else {
    elements.push(
      createCalloutBox(
        `[FIGURE PLACEHOLDER: ${caption}]`,
        `Image file not yet found. Place your image file named '${imageFilename}' inside 'documentation/figures/' to automatically embed it here upon compilation.`
      )
    );
  }

  // Caption below figure
  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 180 },
      children: [
        new TextRun({
          text: caption,
          font: FONT_FAMILY,
          size: 20, // 10pt
          bold: true,
          italics: true,
          color: TEXT_MUTED,
        }),
      ],
    })
  );

  return elements;
}

export function createTable(headers: string[], rows: string[][], colWidthsPercentage?: number[]): Table {
  const tableRows: TableRow[] = [];

  // Header Row
  const headerCells = headers.map((headerText, index) => {
    return new TableCell({
      width: colWidthsPercentage
        ? { size: colWidthsPercentage[index], type: WidthType.PERCENTAGE }
        : undefined,
      shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: headerText,
              font: FONT_FAMILY,
              size: 20, // 10pt
              bold: true,
              color: 'FFFFFF',
            }),
          ],
        }),
      ],
    });
  });

  tableRows.push(new TableRow({ children: headerCells }));

  // Data Rows
  rows.forEach((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    const cells = row.map((cellText, colIndex) => {
      return new TableCell({
        width: colWidthsPercentage
          ? { size: colWidthsPercentage[colIndex], type: WidthType.PERCENTAGE }
          : undefined,
        shading: isEven ? { type: ShadingType.CLEAR, fill: 'FFFFFF' } : { type: ShadingType.CLEAR, fill: BG_LIGHT },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
          left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
          right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
        },
        children: [
          new Paragraph({
            alignment: colIndex === 0 && cellText.length < 15 ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: cellText,
                font: FONT_FAMILY,
                size: 19, // 9.5pt
                color: TEXT_DARK,
              }),
            ],
          }),
        ],
      });
    });
    tableRows.push(new TableRow({ children: cells }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: PRIMARY_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: PRIMARY_COLOR },
      left: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
      right: { style: BorderStyle.SINGLE, size: 8, color: BORDER_COLOR },
    },
    rows: tableRows,
  });
}

export function createHeader(sectionTitle: string): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: `AcadMate Capstone Documentation  |  ${sectionTitle}`,
            font: FONT_FAMILY,
            size: 16, // 8pt
            color: TEXT_MUTED,
            italics: true,
          }),
        ],
      }),
    ],
  });
}

export function createFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'Cordova Public College — BSIT  |  Page ',
            font: FONT_FAMILY,
            size: 18,
            color: TEXT_MUTED,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: FONT_FAMILY,
            size: 18,
            color: TEXT_MUTED,
            bold: true,
          }),
        ],
      }),
    ],
  });
}
