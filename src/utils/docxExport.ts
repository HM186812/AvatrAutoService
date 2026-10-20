import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ShadingType,
  VerticalAlign,
  Footer,
  PageNumber,
} from 'docx';

export interface ExportDocxOptions {
  filename?: string;
  title?: string;
  subtitle?: string;
}

const LAO_PRIMARY_FONT = 'Noto Sans Lao';
const LAO_FALLBACK_FONT = 'Phetsarath OT';
const LATIN_FONT = 'Calibri';

const BORDER_LIGHT = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' };
const BORDER_NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

const ALL_LIGHT_BORDERS = {
  top: BORDER_LIGHT,
  bottom: BORDER_LIGHT,
  left: BORDER_LIGHT,
  right: BORDER_LIGHT,
};

const NO_BORDERS = {
  top: BORDER_NONE,
  bottom: BORDER_NONE,
  left: BORDER_NONE,
  right: BORDER_NONE,
};

/**
 * Extracts clean, normalized text from an HTML node or element.
 */
function getCleanText(el: Node): string {
  return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * Checks if an element has styling indicating bold text.
 */
function isBoldElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === 'b' || tag === 'strong' || tag === 'th') return true;
  const className = el.className || '';
  if (typeof className === 'string') {
    if (
      className.includes('font-bold') ||
      className.includes('font-semibold') ||
      className.includes('font-black') ||
      className.includes('font-extrabold')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if an element has alignment styling.
 */
function getElementAlignment(el: Element): (typeof AlignmentType)[keyof typeof AlignmentType] {
  const className = el.className || '';
  if (typeof className === 'string') {
    if (className.includes('text-right')) return AlignmentType.RIGHT;
    if (className.includes('text-center')) return AlignmentType.CENTER;
  }
  return AlignmentType.LEFT;
}

/**
 * Parses inline text and bold tags into TextRun arrays.
 */
function parseInlineRuns(el: Element, parentBold = false): TextRun[] {
  const runs: TextRun[] = [];

  const walk = (node: Node, bold: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text) {
        runs.push(
          new TextRun({
            text,
            bold,
            font: {
              name: LAO_PRIMARY_FONT,
              hint: 'eastAsia',
            },
            size: 21, // 10.5 pt
            color: '111827',
          })
        );
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elem = node as Element;
      // Skip hidden or control elements
      if (
        elem.classList.contains('no-print') ||
        elem.classList.contains('hide-on-pdf') ||
        elem.tagName === 'BUTTON'
      ) {
        return;
      }
      const isBold = bold || isBoldElement(elem);
      elem.childNodes.forEach((child) => walk(child, isBold));
    }
  };

  walk(el, parentBold || isBoldElement(el));

  if (runs.length === 0) {
    const fallbackText = getCleanText(el);
    if (fallbackText) {
      runs.push(
        new TextRun({
          text: fallbackText,
          bold: parentBold || isBoldElement(el),
          font: { name: LAO_PRIMARY_FONT },
          size: 21,
          color: '111827',
        })
      );
    }
  }

  return runs;
}

/**
 * Converts an HTML Table into a native docx Table.
 */
function convertHtmlTableToDocxTable(tableEl: HTMLTableElement): Table {
  const docxRows: TableRow[] = [];
  const trElements = Array.from(tableEl.querySelectorAll('tr'));

  trElements.forEach((tr, rowIndex) => {
    const isHeadRow =
      rowIndex === 0 ||
      tr.parentElement?.tagName.toLowerCase() === 'thead' ||
      tr.querySelector('th') !== null;

    const cellElements = Array.from(tr.children).filter(
      (child) => child.tagName.toLowerCase() === 'th' || child.tagName.toLowerCase() === 'td'
    ) as HTMLElement[];

    if (cellElements.length === 0) return;

    const docxCells = cellElements.map((cellEl) => {
      const isHeader = isHeadRow || cellEl.tagName.toLowerCase() === 'th';
      const align = getElementAlignment(cellEl);
      const cellText = getCleanText(cellEl);

      const cellRuns = parseInlineRuns(cellEl, isHeader);

      const p = new Paragraph({
        alignment: align,
        children: cellRuns.length > 0 ? cellRuns : [
          new TextRun({
            text: cellText,
            bold: isHeader,
            font: { name: isHeader ? LAO_PRIMARY_FONT : LATIN_FONT },
            size: isHeader ? 20 : 19,
            color: '111827',
          }),
        ],
        spacing: { before: 40, after: 40 },
      });

      return new TableCell({
        borders: ALL_LIGHT_BORDERS,
        shading: isHeader ? { fill: 'F3F4F6', type: ShadingType.CLEAR } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [p],
      });
    });

    docxRows.push(
      new TableRow({
        tableHeader: isHeadRow,
        children: docxCells,
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: docxRows.length > 0 ? docxRows : [
      new TableRow({
        children: [
          new TableCell({
            borders: ALL_LIGHT_BORDERS,
            children: [new Paragraph({ children: [new TextRun({ text: '-', font: { name: LAO_PRIMARY_FONT } })] })],
          }),
        ],
      }),
    ],
  });
}

/**
 * Converts a 2-column flex/grid box into a 2-column Word table to preserve layout.
 */
function convertTwoColumnGridToDocxTable(col1El: HTMLElement, col2El: HTMLElement): Table {
  const p1Children = Array.from(col1El.children).map((child) => {
    return new Paragraph({
      alignment: getElementAlignment(child as HTMLElement),
      children: parseInlineRuns(child as HTMLElement),
      spacing: { before: 20, after: 20 },
    });
  });

  const p2Children = Array.from(col2El.children).map((child) => {
    return new Paragraph({
      alignment: getElementAlignment(child as HTMLElement),
      children: parseInlineRuns(child as HTMLElement),
      spacing: { before: 20, after: 20 },
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: p1Children.length > 0 ? p1Children : [new Paragraph({ children: parseInlineRuns(col1El) })],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: p2Children.length > 0 ? p2Children : [new Paragraph({ children: parseInlineRuns(col2El) })],
          }),
        ],
      }),
    ],
  });
}

/**
 * Creates an official AVATR Document Header in Word.
 */
function createDocxHeader(title: string, subtitle?: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // AVATR Company Name
  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'AVATR AUTO SERVICE SOLE CO., LTD',
          bold: true,
          size: 26, // 13pt
          font: { name: LATIN_FONT },
          color: '111827',
        }),
      ],
      spacing: { before: 0, after: 40 },
    })
  );

  // Subtitle / Brand Tagline
  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Changan × Huawei × CATL Luxury Intelligent Electric Vehicles (Laos)',
          size: 18, // 9pt
          font: { name: LATIN_FONT },
          color: '4B5563',
        }),
      ],
      spacing: { before: 0, after: 40 },
    })
  );

  elements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'ໂຊຣູມໃຫຍ່: ຫຼັກ 3 ຖະໜົນທ່າເດື່ອ, ນະຄອນຫຼວງວຽງຈັນ | Hotline: +856 20 55575537',
          size: 17, // 8.5pt
          font: { name: LAO_PRIMARY_FONT },
          color: '6B7280',
        }),
      ],
      spacing: { before: 0, after: 120 },
    })
  );

  // Document Title Bar
  if (title) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 24, // 12pt
            font: { name: LAO_PRIMARY_FONT },
            color: '000000',
          }),
        ],
        spacing: { before: 80, after: 120 },
      })
    );
  }

  return elements;
}

/**
 * Creates an official Dual-Signature block (Sales Representative & Customer).
 */
function createDocxSignatureBlock(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '____________________________________',
                    bold: true,
                    font: { name: LATIN_FONT },
                    color: '374151',
                  }),
                ],
                spacing: { before: 300, after: 60 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'ຜູ້ມອບ / ທີ່ປຶກສາການຂາຍ (Sales Consultant)',
                    bold: true,
                    size: 19,
                    font: { name: LAO_PRIMARY_FONT },
                    color: '111827',
                  }),
                ],
                spacing: { before: 0, after: 20 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'ວັນທີ / Date: ....../....../2026',
                    size: 18,
                    font: { name: LAO_PRIMARY_FONT },
                    color: '6B7280',
                  }),
                ],
                spacing: { before: 0, after: 0 },
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '____________________________________',
                    bold: true,
                    font: { name: LATIN_FONT },
                    color: '374151',
                  }),
                ],
                spacing: { before: 300, after: 60 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'ຜູ້ຮັບ / ລູກຄ້າ (Customer Signature)',
                    bold: true,
                    size: 19,
                    font: { name: LAO_PRIMARY_FONT },
                    color: '111827',
                  }),
                ],
                spacing: { before: 0, after: 20 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'ວັນທີ / Date: ....../....../2026',
                    size: 18,
                    font: { name: LAO_PRIMARY_FONT },
                    color: '6B7280',
                  }),
                ],
                spacing: { before: 0, after: 0 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Traverses a DOM tree and converts recognized structures into DOCX paragraphs and tables.
 */
function parseDomToDocxContent(rootEl: HTMLElement): (Paragraph | Table)[] {
  const contentItems: (Paragraph | Table)[] = [];

  const visitNode = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;

    // Ignore non-printable items
    if (
      el.classList.contains('no-print') ||
      el.classList.contains('hide-on-pdf') ||
      el.classList.contains('hide-on-print') ||
      el.tagName === 'BUTTON' ||
      el.tagName === 'INPUT' ||
      el.tagName === 'SELECT'
    ) {
      return;
    }

    const tagName = el.tagName.toLowerCase();

    // Table Handling
    if (tagName === 'table') {
      contentItems.push(convertHtmlTableToDocxTable(el as HTMLTableElement));
      return;
    }

    // Two-column side-by-side grid handling (e.g. Client Info and Vehicle Info)
    const isGrid2 =
      (el.classList.contains('grid-cols-2') ||
        el.classList.contains('sm:grid-cols-2') ||
        el.classList.contains('justify-between')) &&
      el.children.length === 2 &&
      el.querySelectorAll('table').length === 0;

    if (isGrid2) {
      const child1 = el.children[0] as HTMLElement;
      const child2 = el.children[1] as HTMLElement;
      contentItems.push(convertTwoColumnGridToDocxTable(child1, child2));
      return;
    }

    // Headings
    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
      const text = getCleanText(el);
      if (text) {
        let size = 24;
        let headingLevel: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2;
        if (tagName === 'h1') {
          size = 28;
          headingLevel = HeadingLevel.HEADING_1;
        } else if (tagName === 'h3') {
          size = 22;
          headingLevel = HeadingLevel.HEADING_3;
        } else if (tagName === 'h4') {
          size = 20;
          headingLevel = HeadingLevel.HEADING_4;
        }

        contentItems.push(
          new Paragraph({
            heading: headingLevel,
            alignment: getElementAlignment(el),
            children: parseInlineRuns(el, true),
            spacing: { before: 100, after: 60 },
          })
        );
      }
      return;
    }

    // Signature box detection
    if (
      (el.classList.contains('signature') ||
        el.textContent?.includes('ລາຍເຊັນ') ||
        el.textContent?.includes('Sales Consultant')) &&
      el.querySelectorAll('button').length === 0 &&
      el.children.length >= 2
    ) {
      contentItems.push(createDocxSignatureBlock());
      return;
    }

    // Leaf paragraph or container with text
    const isParagraphLike =
      tagName === 'p' ||
      tagName === 'li' ||
      (tagName === 'div' &&
        el.children.length === 0 &&
        (el.textContent || '').trim().length > 0);

    if (isParagraphLike) {
      const text = getCleanText(el);
      if (text) {
        contentItems.push(
          new Paragraph({
            alignment: getElementAlignment(el),
            children: parseInlineRuns(el),
            spacing: { before: 30, after: 30 },
          })
        );
      }
      return;
    }

    // Recurse into children
    Array.from(el.children).forEach((child) => visitNode(child));
  };

  visitNode(rootEl);
  return contentItems;
}

/**
 * Exports a DOM element or HTML to a real, valid Microsoft Word (.docx) OpenXML document.
 * Creates genuine tables, headings, and paragraph blocks with full Lao Unicode support.
 * Fully compatible with Microsoft Word, WPS Office, LibreOffice, and Google Docs.
 */
export async function exportElementToDocx(
  elementOrId: HTMLElement | string,
  options: ExportDocxOptions = {}
): Promise<void> {
  const element =
    typeof elementOrId === 'string'
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!element) {
    console.error('exportElementToDocx: Element not found:', elementOrId);
    throw new Error('Element not found for DOCX export');
  }

  const {
    filename = 'avatr-document.docx',
    title = 'AVATR Auto Service Official Document',
    subtitle,
  } = options;

  // Clone element to prevent mutations
  const clone = element.cloneNode(true) as HTMLElement;

  // Strip non-printable / controls
  clone
    .querySelectorAll(
      '.no-print, .hide-on-pdf, .hide-on-print, button, input[type="button"], input[type="submit"]'
    )
    .forEach((el) => el.remove());

  // Parse structured elements from DOM
  const parsedContent = parseDomToDocxContent(clone);

  // If no content could be parsed, provide a clean fallback
  const docChildren: (Paragraph | Table)[] = [];

  // Add standard official Header
  docChildren.push(...createDocxHeader(title, subtitle));

  if (parsedContent.length > 0) {
    docChildren.push(...parsedContent);
  } else {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: getCleanText(clone) || 'No content found.',
            font: { name: LAO_PRIMARY_FONT },
            size: 21,
          }),
        ],
      })
    );
  }

  // Check if signatures were already created; if not and it's an official quote/invoice, append signatures
  const hasSignatures = parsedContent.some(
    (item) => item instanceof Table && (item as any).root?.length === 2
  );
  if (!hasSignatures) {
    docChildren.push(
      new Paragraph({
        text: '',
        spacing: { before: 180, after: 60 },
      })
    );
    docChildren.push(createDocxSignatureBlock());
  }

  // Build the complete Word Document
  const doc = new Document({
    title,
    description: 'AVATR Auto Service Laos Official Vehicle Purchase & Service Document',
    creator: 'AVATR Auto Service Laos',
    styles: {
      default: {
        document: {
          run: {
            font: LAO_PRIMARY_FONT,
            size: 21, // 10.5pt
            color: '111827',
          },
          paragraph: {
            spacing: { line: 276, before: 30, after: 30 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width: 210mm (in twips)
              height: 16838, // A4 height: 297mm (in twips)
            },
            margin: {
              top: 720, // 0.5 in / 12.7 mm
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'AVATR Auto Service (Laos) • ໜ້າທີ ',
                    font: { name: LAO_PRIMARY_FONT },
                    size: 16,
                    color: '9CA3AF',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: { name: LATIN_FONT },
                    size: 16,
                    color: '9CA3AF',
                  }),
                ],
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  // Generate genuine binary .docx OpenXML blob
  const blob = await Packer.toBlob(doc);

  const cleanFilename = filename.toLowerCase().endsWith('.docx')
    ? filename
    : `${filename}.docx`;

  const blobUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = cleanFilename;
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();

  setTimeout(() => {
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(blobUrl);
  }, 1500);
}
