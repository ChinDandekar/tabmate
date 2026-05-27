/**
 * TabMate — OCR Receipt Scanner Logic using Tesseract.js
 */

let tesseractLoaded = false;

/**
 * Lazy-load Tesseract.js script from unpkg CDN.
 */
function loadTesseractScript() {
  return new Promise((resolve, reject) => {
    if (tesseractLoaded) return resolve();
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/tesseract.js@5.1.0/dist/tesseract.min.js';
    script.onload = () => {
      tesseractLoaded = true;
      resolve();
    };
    script.onerror = (err) => {
      reject(new Error('Failed to load Tesseract.js CDN script: ' + err.message));
    };
    document.head.appendChild(script);
  });
}

/**
 * Runs OCR on a receipt image file or URL, returning parsed receipt data.
 * Calls onProgress(progressDecimal) during processing.
 */
export async function scanReceipt(imageSrc, onProgress = () => {}) {
  await loadTesseractScript();

  if (typeof window.Tesseract === 'undefined') {
    throw new Error('Tesseract script loaded, but Tesseract global is not defined.');
  }

  // Create Worker
  const worker = await window.Tesseract.createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        onProgress(m.progress || 0);
      }
    }
  });

  try {
    const { data: { text } } = await worker.recognize(imageSrc);
    await worker.terminate();
    return parseReceiptText(text);
  } catch (err) {
    await worker.terminate();
    throw err;
  }
}

/**
 * Heuristic regex-based receipt text parser.
 * Mirrors the exactly tested parser in tests/test-logic.mjs.
 */
export function parseReceiptText(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const items = [];
  let tax = null;
  let tip = null;
  let subtotal = null;
  let total = null;

  const priceRegex = /\$?\s*(\d+\.\d{2})\s*$/;
  const taxKeywords = /^(tax|sales\s*tax|hst|gst|vat)\b/i;
  const tipKeywords = /^(tip|gratuity|service\s*charge)\b/i;
  const subtotalKeywords = /^(subtotal|sub\s*total|sub-total)\b/i;
  const totalKeywords = /^(total|amount\s*due|balance\s*due|grand\s*total)\b/i;
  const skipKeywords = /^(thank|card|visa|master|amex|debit|credit|change|cash|date|time|order|table|server|guest|check|receipt)/i;

  for (const line of lines) {
    const priceMatch = line.match(priceRegex);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1]);
    const name = line.replace(priceRegex, '').replace(/[.\-_]+$/, '').trim();

    if (!name || price === 0) continue;

    if (taxKeywords.test(name)) {
      tax = price;
    } else if (tipKeywords.test(name)) {
      tip = price;
    } else if (subtotalKeywords.test(name)) {
      subtotal = price;
    } else if (totalKeywords.test(name)) {
      total = price;
    } else if (!skipKeywords.test(name)) {
      items.push({ name, price });
    }
  }

  return { items, tax, tip, subtotal, total };
}
