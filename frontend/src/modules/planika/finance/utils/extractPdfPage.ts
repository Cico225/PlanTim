import { PDFDocument } from 'pdf-lib';

/** Naziv fajla: broj kredita + .pdf (npr. 26-2015-13-00717.pdf) */
export function zabranaScanFileName(creditNumber: string): string {
  const safe = creditNumber.trim().replace(/[\\/:*?"<>|]/g, '_');
  return `${safe}.pdf`;
}

/**
 * Izvlači jednu stranicu iz PDF-a bez re-enkodiranja (zadržava originalnu kompresiju skena).
 * Re-render u JPEG povećava fajl; copyPages tipično daje ~200–250 KB po stranici.
 */
export async function extractPdfPage(
  file: File,
  pageIndex: number,
  creditNumber: string,
): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();

  if (pageIndex < 1 || pageIndex > pageCount) {
    throw new Error(`Stranica ${pageIndex} ne postoji u PDF-u (${pageCount} stranica)`);
  }

  const newDoc = await PDFDocument.create();
  const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex - 1]);
  newDoc.addPage(copiedPage);

  const pdfBytes = await newDoc.save({ useObjectStreams: true });
  const fileName = zabranaScanFileName(creditNumber);

  return new File([pdfBytes], fileName, { type: 'application/pdf' });
}
