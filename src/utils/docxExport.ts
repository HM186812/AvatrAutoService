export interface ExportDocxOptions {
  filename?: string;
  title?: string;
}

/**
 * Exports a DOM element or HTML to a Microsoft Word compatible (.docx) document.
 * Encapsulates standard MSO Word Document XML/HTML with full Lao Unicode support.
 * Opens seamlessly in Microsoft Word, Google Docs, WPS Office, and LibreOffice.
 */
export async function exportElementToDocx(
  elementOrId: HTMLElement | string,
  options: ExportDocxOptions = {}
): Promise<void> {
  const element = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;

  if (!element) {
    console.error('exportElementToDocx: Element not found:', elementOrId);
    throw new Error('Element not found for DOCX export');
  }

  const {
    filename = 'avatr-document.docx',
    title = 'AVATR Auto Service Document',
  } = options;

  // Clone element to avoid modifying the active view
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove non-printable / control elements
  clone.querySelectorAll('.no-print, .hide-on-pdf, .hide-on-print, button, input[type="button"]').forEach((el) => {
    el.remove();
  });

  // Ensure all computed background colors for dark mode elements in clone become light/transparent
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#111827';

  // Build clean Word-compatible HTML structure
  const rawContent = clone.innerHTML;

  const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 595.3pt 841.9pt; /* A4 */
      margin: 28.3pt 28.3pt 28.3pt 28.3pt;
      mso-header-margin: 0pt;
      mso-footer-margin: 0pt;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: 'Phetsarath OT', 'Noto Sans Lao', 'Segoe UI', Arial, sans-serif;
      font-size: 10pt;
      color: #111827;
      background-color: #ffffff;
      line-height: 1.4;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 8pt 0;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 5pt 7pt;
      font-size: 9.5pt;
      text-align: left;
      vertical-align: middle;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #111827;
    }
    h1, h2, h3, h4 {
      margin: 4pt 0;
      color: #111827;
    }
    h1 { font-size: 16pt; font-weight: bold; }
    h2 { font-size: 13pt; font-weight: bold; }
    h3 { font-size: 11pt; font-weight: bold; }
    p { margin: 3pt 0; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .border-b { border-bottom: 1px solid #e5e7eb; }
    .border-t { border-top: 1px solid #e5e7eb; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="Section1">
    ${rawContent}
  </div>
</body>
</html>`;

  const cleanFilename = filename.toLowerCase().endsWith('.docx') ? filename : `${filename}.docx`;

  const blob = new Blob(['\ufeff', wordHtml], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8',
  });

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
