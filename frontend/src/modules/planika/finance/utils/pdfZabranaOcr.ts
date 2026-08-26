import { createWorker, type Worker } from 'tesseract.js';
import { extractAllCreditNumbers } from './creditNumber';

export type PdfPageOcrResult = {
  fileName: string;
  pageIndex: number;
  pageCount: number;
  creditNumbers: string[];
  rawTextPreview: string;
};

export type PdfOcrProgress = {
  fileName: string;
  fileIndex: number;
  fileCount: number;
  pageIndex: number;
  pageCount: number;
  phase: 'loading' | 'ocr' | 'done';
};

/** Tesseract PSM.SINGLE_BLOCK */
const PSM_SINGLE_BLOCK = '6';

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  return pdfjs;
}

/** Povećaj kontrast / crno-bijelo radi boljeg OCR na skeniranim PDF-ovima. */
function preprocessForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source;

  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = gray < 160 ? 0 : 255;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

async function renderPageToCanvas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  scale = 3
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas nije dostupan');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

/** Središnji pojas stranice gdje je tipično tabela s Br. kredita. */
function cropTableBand(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const y0 = Math.floor(source.height * 0.28);
  const y1 = Math.floor(source.height * 0.78);
  const h = Math.max(40, y1 - y0);
  canvas.width = source.width;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;
  ctx.drawImage(source, 0, y0, source.width, h, 0, 0, source.width, h);
  return canvas;
}

async function ocrCanvas(worker: Worker, canvas: HTMLCanvasElement): Promise<string> {
  const { data } = await worker.recognize(canvas);
  return data.text ?? '';
}

function mergeNumbers(...lists: string[][]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const n of list) set.add(n);
  }
  return Array.from(set);
}

/**
 * OCR skeniranih PDF zabrana.
 * Jedna stranica može imati više kredita (tabela „Br. kredita”).
 */
export async function ocrZabranaPdfs(
  files: File[],
  onProgress?: (p: PdfOcrProgress) => void
): Promise<PdfPageOcrResult[]> {
  if (!files.length) return [];

  const pdfjs = await loadPdfjs();
  const worker = await createWorker('eng');
  const results: PdfPageOcrResult[] = [];

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM_SINGLE_BLOCK as never,
    });

    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const file = files[fileIndex];
      onProgress?.({
        fileName: file.name,
        fileIndex,
        fileCount: files.length,
        pageIndex: 0,
        pageCount: 0,
        phase: 'loading',
      });

      const data = new Uint8Array(await file.arrayBuffer());
      const doc = await pdfjs.getDocument({ data }).promise;
      const pageCount = doc.numPages;

      for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
        onProgress?.({
          fileName: file.name,
          fileIndex,
          fileCount: files.length,
          pageIndex,
          pageCount,
          phase: 'ocr',
        });

        const page = await doc.getPage(pageIndex);
        const rawCanvas = await renderPageToCanvas(page, 3);
        const full = preprocessForOcr(rawCanvas);
        const tableBand = preprocessForOcr(cropTableBand(rawCanvas));

        await worker.setParameters({ tessedit_char_whitelist: '' });
        const textFull = await ocrCanvas(worker, full);
        let numbers = extractAllCreditNumbers(textFull);

        const textTable = await ocrCanvas(worker, tableBand);
        numbers = mergeNumbers(numbers, extractAllCreditNumbers(textTable));

        let textDigits = '';
        if (numbers.length === 0) {
          await worker.setParameters({
            tessedit_char_whitelist: '0123456789-–—./ ',
          });
          textDigits = await ocrCanvas(worker, tableBand);
          numbers = mergeNumbers(numbers, extractAllCreditNumbers(textDigits));
          const textDigitsFull = await ocrCanvas(worker, full);
          numbers = mergeNumbers(numbers, extractAllCreditNumbers(textDigitsFull));
          await worker.setParameters({ tessedit_char_whitelist: '' });
        }

        const previewSource = [textTable, textFull, textDigits].find((t) => t.trim()) ?? '';
        results.push({
          fileName: file.name,
          pageIndex,
          pageCount,
          creditNumbers: numbers,
          rawTextPreview: previewSource.replace(/\s+/g, ' ').trim().slice(0, 320),
        });
      }
    }
  } finally {
    await worker.terminate();
  }

  onProgress?.({
    fileName: files[files.length - 1]?.name ?? '',
    fileIndex: Math.max(0, files.length - 1),
    fileCount: files.length,
    pageIndex: 0,
    pageCount: 0,
    phase: 'done',
  });

  return results;
}
