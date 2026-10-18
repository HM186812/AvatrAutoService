export interface ExportPdfOptions {
  filename?: string;
  margin?: number | [number, number, number, number];
  orientation?: 'portrait' | 'landscape';
  scale?: number;
  singlePage?: boolean;
}

/**
 * Exports a DOM element to an official PDF document.
 * All exported documents use standard A4 paper (210 x 297 mm).
 * Guarantees single-page fit and reliable browser download across all devices.
 * Uses html2canvas-pro to support modern Tailwind v4 oklch colors and dynamic lazy loading.
 */
export async function exportElementToPdf(
  elementOrId: HTMLElement | string,
  options: ExportPdfOptions = {}
): Promise<void> {
  const element = typeof elementOrId === 'string'
    ? document.getElementById(elementOrId)
    : elementOrId;

  if (!element) {
    console.error('exportElementToPdf: Element not found:', elementOrId);
    throw new Error('Element not found for PDF export');
  }

  const {
    filename = 'avatr-document.pdf',
    margin = [4, 4, 4, 4],
    orientation = 'portrait',
    scale = 2,
    singlePage = true,
  } = options;

  // Temporarily apply clean export class
  const exportClass = 'exporting-pdf-single-page';
  element.classList.add(exportClass);

  // Force layout reflow for clean rendering
  await new Promise((resolve) => setTimeout(resolve, 80));

  try {
    // Dynamically load html2canvas-pro (oklch support) and jsPDF on demand
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas-pro'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (el) => el.classList.contains('hide-on-pdf') || el.classList.contains('no-print'),
    });

    const isPortrait = orientation === 'portrait';
    
    const pageWidth = isPortrait ? 210 : 297;
    const pageHeight = isPortrait ? 297 : 210;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const [marginTop, marginRight, marginBottom, marginLeft] = Array.isArray(margin)
      ? margin
      : [margin, margin, margin, margin];

    const availableWidth = pageWidth - (marginLeft + marginRight);
    const availableHeight = pageHeight - (marginTop + marginBottom);

    const canvasAspect = canvas.height / canvas.width;

    if (singlePage) {
      // Scale dimensions to fit perfectly within 1 page
      let targetWidth = availableWidth;
      let targetHeight = availableWidth * canvasAspect;
      let posX = marginLeft;
      let posY = marginTop + Math.max(0, (availableHeight - targetHeight) / 2);

      if (targetHeight > availableHeight) {
        targetHeight = availableHeight;
        targetWidth = availableHeight / canvasAspect;
        posX = marginLeft + (availableWidth - targetWidth) / 2;
        posY = marginTop;
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', posX, posY, targetWidth, targetHeight, undefined, 'FAST');
    } else {
      // Multi-page slicing
      let leftHeight = canvas.height;
      let position = marginTop;
      const pageCanvasHeight = (availableHeight * canvas.width) / availableWidth;
      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      pdf.addImage(imgData, 'JPEG', marginLeft, position, availableWidth, (canvas.height * availableWidth) / canvas.width, undefined, 'FAST');
      leftHeight -= pageCanvasHeight;

      while (leftHeight > 0) {
        position = position - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', marginLeft, position, availableWidth, (canvas.height * availableWidth) / canvas.width, undefined, 'FAST');
        leftHeight -= pageCanvasHeight;
      }
    }

    // Ensure valid filename extension
    const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

    // Universal reliable Blob download trigger (prevents popup blockers and Chromium download failures)
    try {
      const blob = pdf.output('blob');
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
    } catch (saveError) {
      console.warn('Blob download fallback to pdf.save():', saveError);
      pdf.save(cleanFilename);
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  } finally {
    element.classList.remove(exportClass);
  }
}
