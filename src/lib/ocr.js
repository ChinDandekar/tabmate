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

  const ocrInput = await prepareReceiptImage(imageSrc);

  // Create Worker
  const worker = await window.Tesseract.createWorker('eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        onProgress(m.progress || 0);
      }
    }
  });

  try {
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$.,:-/()&%#@* ',
      preserve_interword_spaces: '1'
    });
    const { data: { text } } = await worker.recognize(ocrInput);
    await worker.terminate();
    return parseReceiptText(text);
  } catch (err) {
    await worker.terminate();
    throw err;
  }
}

async function prepareReceiptImage(imageSrc) {
  if (typeof document === 'undefined') return imageSrc;

  try {
    const img = await loadImage(imageSrc);
    const canvas = document.createElement('canvas');
    const scale = Math.min(Math.max(1200 / Math.min(img.width, img.height), 1), 3);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const contrasted = gray > 170 ? 255 : gray < 95 ? 0 : gray * 1.45 - 75;
      data[i] = contrasted;
      data[i + 1] = contrasted;
      data[i + 2] = contrasted;
    }
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Receipt image preprocessing failed; falling back to original image.', err);
    return imageSrc;
  }
}

function loadImage(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl = '';

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load receipt image for preprocessing.'));
    };

    if (imageSrc instanceof Blob) {
      objectUrl = URL.createObjectURL(imageSrc);
      img.src = objectUrl;
    } else {
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
    }
  });
}

/**
 * Heuristic regex-based receipt text parser.
 */
export function parseReceiptText(rawText) {
  const lines = rawText
    .split('\n')
    .map(cleanOcrLine)
    .filter(Boolean);
  const items = [];
  let tax = null;
  let tip = null;
  let subtotal = null;
  let total = null;
  let restaurant = '';
  let pendingName = '';
  let pendingSummaryLabel = '';

  const taxKeywords = /\b(tax|sales\s*tax|hst|gst|vat)\b/i;
  const tipKeywords = /\b(tip|gratuity|service\s*charge|auto\s*grat)\b/i;
  const subtotalKeywords = /\b(subtotal|sub\s*total|sub-total)\b/i;
  const totalKeywords = /\b(total|amount\s*due|balance\s*due|grand\s*total|payment\s*due)\b/i;

  for (const line of lines) {
    if (!restaurant && looksLikeRestaurantName(line)) {
      restaurant = normalizeItemName(line);
    }

    const extracted = extractPrice(line);
    if (!extracted) {
      const descriptor = cleanDescriptor(line);
      if (looksLikeSummaryLabel(descriptor, {
        taxKeywords,
        tipKeywords,
        subtotalKeywords,
        totalKeywords
      })) {
        pendingSummaryLabel = descriptor;
        pendingName = '';
      } else if (looksLikePossibleItemName(line)) {
        pendingName = normalizeItemName(line);
        pendingSummaryLabel = '';
      }
      continue;
    }

    const price = extracted.price;
    let name = normalizeItemName(extracted.name);
    let lineWithoutPrice = cleanDescriptor(extracted.lineWithoutPrice);
    const priceOnlyLine = isPriceOnlyLine(line);

    if (!lineWithoutPrice && pendingSummaryLabel && priceOnlyLine) {
      lineWithoutPrice = pendingSummaryLabel;
    }

    if (!name && pendingName && priceOnlyLine) {
      name = pendingName;
    }

    pendingName = '';
    pendingSummaryLabel = '';

    if (price <= 0) continue;

    if (taxKeywords.test(lineWithoutPrice)) {
      tax = price;
    } else if (tipKeywords.test(lineWithoutPrice)) {
      tip = price;
    } else if (subtotalKeywords.test(lineWithoutPrice)) {
      subtotal = price;
    } else if (totalKeywords.test(lineWithoutPrice)) {
      total = price;
    } else if (name && looksLikeReceiptItem(name, price)) {
      items.push({
        id: createItemId(items.length),
        name,
        price,
        assignedTo: []
      });
    }
  }

  if (!subtotal && items.length) {
    subtotal = roundCurrency(items.reduce((sum, item) => sum + item.price, 0));
  }

  return { restaurant, items: mergeDuplicateItems(items), tax, tip, subtotal, total };
}

function cleanOcrLine(line) {
  return line
    .replace(/[|;]/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPrice(line) {
  const matches = [...line.matchAll(/(?:^|[^\w])(?:\$|USD)?\s*(?:(?<major>[0-9OSIB]{1,4})[.,:;](?<minor>[0-9OSIB]{2})|(?<spacedMajor>[0-9]{1,4})\s+(?<spacedMinor>[0-9OSIB]{2}))(?!\w)/gi)];
  if (matches.length === 0) return null;

  const match = matches[matches.length - 1];
  const major = match.groups.major || match.groups.spacedMajor;
  const minor = match.groups.minor || match.groups.spacedMinor;
  const rawAmount = `${major}.${minor}`;
  const price = parseFloat(normalizeAmount(rawAmount));
  if (!Number.isFinite(price)) return null;

  const amountStart = line.indexOf(major, match.index);
  const before = line.slice(0, amountStart).trim();
  const after = line.slice(match.index + match[0].length).trim();
  const name = before || after;

  return {
    price: roundCurrency(price),
    name,
    lineWithoutPrice: `${before} ${after}`.trim()
  };
}

function normalizeAmount(value) {
  return value
    .replace(/[Oo]/g, '0')
    .replace(/[Ss]/g, '5')
    .replace(/[Il|]/g, '1')
    .replace(/[Bb]/g, '8')
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '');
}

function normalizeItemName(name) {
  return name
    .replace(/^\d+\s*(x|X|@)?\s+/, '')
    .replace(/\$/g, '')
    .replace(/\b(qty|quantity|item|price|amount)\b/gi, '')
    .replace(/[#*]+/g, '')
    .replace(/[:.\-_]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanDescriptor(line) {
  return line
    .replace(/\$/g, '')
    .replace(/[#*]+/g, '')
    .replace(/[:.\-_]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function looksLikeSummaryLabel(line, {
  taxKeywords,
  tipKeywords,
  subtotalKeywords,
  totalKeywords
}) {
  return taxKeywords.test(line) ||
    tipKeywords.test(line) ||
    subtotalKeywords.test(line) ||
    totalKeywords.test(line);
}

function looksLikePossibleItemName(line) {
  const normalized = normalizeItemName(line);
  if (normalized.length < 3) return false;
  if (/\d{1,2}[/-]\d{1,2}|^\d+$|^\W+$/.test(normalized)) return false;
  return !looksLikeNonItemLine(normalized);
}

function looksLikeReceiptItem(name, price) {
  if (name.length < 2 || price > 500) return false;
  if (/^\d+$/.test(name)) return false;
  return !looksLikeNonItemLine(name);
}

function looksLikeNonItemLine(line) {
  return /\b(thank|card|visa|mastercard|amex|discover|debit|credit|change|cash|date|time|order|table|server|guest|check|receipt|auth|approval|merchant|terminal|subtotal|sub\s*total|total|tax|tip|balance|amount\s*due|paid|payment|phone|tel|www|http|copy|customer|signature)\b/i.test(line);
}

function looksLikeRestaurantName(line) {
  const normalized = normalizeItemName(line);
  return normalized.length >= 3 &&
    normalized.length <= 40 &&
    /[a-z]/i.test(normalized) &&
    !extractPrice(normalized) &&
    !looksLikeNonItemLine(normalized) &&
    !/\d{1,2}[/-]\d{1,2}|\d{3,}/.test(normalized);
}

function isPriceOnlyLine(line) {
  const extracted = extractPrice(line);
  return extracted && normalizeItemName(extracted.lineWithoutPrice).length === 0;
}

function mergeDuplicateItems(items) {
  return items.reduce((merged, item) => {
    const previous = merged[merged.length - 1];
    if (previous && previous.name.toLowerCase() === item.name.toLowerCase()) {
      previous.price = roundCurrency(previous.price + item.price);
    } else {
      merged.push(item);
    }
    return merged;
  }, []);
}

function roundCurrency(n) {
  return Math.round(n * 100) / 100;
}

function createItemId(index) {
  return `i_ocr_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
}
