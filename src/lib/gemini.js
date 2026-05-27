import { generateId, round2 } from './utils.js';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `
You are a receipt parser. Extract all line items, tax, tip, subtotal,
and restaurant name from the receipt text provided. Return ONLY a JSON
object with this exact shape, no markdown, no explanation:
{
  "restaurantName": "",
  "items": [{ "name": "", "price": 0.00 }],
  "subtotal": 0.00,
  "tax": 0.00,
  "tip": 0.00
}
Rules:
- item prices are the final line price (e.g. 2x Burger $18 -> price: 18.00)
- exclude subtotal, tax, tip, and total rows from items[]
- if a value is not present, use 0 or empty string
- do not include comped ($0.00) items
`;

export async function parseReceiptWithGemini(text, apiKey) {
  const cleanedText = (text || '').trim();
  const cleanedApiKey = (apiKey || '').trim();

  if (!cleanedText) {
    throw Object.assign(new Error('Receipt text is required.'), { code: 'EMPTY_TEXT' });
  }

  if (!cleanedApiKey) {
    throw Object.assign(new Error('Gemini API key is required.'), { code: 'MISSING_API_KEY' });
  }

  let res;
  try {
    res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(cleanedApiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nReceipt:\n${cleanedText}` }] }]
      })
    });
  } catch (err) {
    throw Object.assign(new Error("Couldn't reach Gemini. Check your connection."), {
      code: 'NETWORK_ERROR',
      cause: err,
    });
  }

  if (!res.ok) {
    throw Object.assign(new Error(`Gemini API error: ${res.status}`), { code: 'API_ERROR' });
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  try {
    return normalizeGeminiReceipt(JSON.parse(stripJsonFence(raw)));
  } catch (err) {
    throw Object.assign(new Error('Could not parse Gemini response as JSON'), {
      code: 'BAD_JSON',
      cause: err,
    });
  }
}

function stripJsonFence(raw) {
  const stripped = raw.replace(/```json|```/gi, '').trim();
  const jsonStart = stripped.indexOf('{');
  const jsonEnd = stripped.lastIndexOf('}');
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    return stripped.slice(jsonStart, jsonEnd + 1);
  }
  return stripped;
}

function normalizeGeminiReceipt(receipt) {
  const rawItems = Array.isArray(receipt?.items) ? receipt.items : [];
  const items = rawItems
    .map((item) => ({
      id: generateId('i_gemini_'),
      name: String(item?.name || '').trim(),
      price: round2(parseAmount(item?.price)),
      assignedTo: [],
    }))
    .filter((item) => item.name && item.price > 0);

  const subtotal = round2(parseAmount(receipt?.subtotal) || items.reduce((sum, item) => sum + item.price, 0));
  const tax = round2(parseAmount(receipt?.tax));
  const tip = round2(parseAmount(receipt?.tip));
  const total = round2(parseAmount(receipt?.total) || subtotal + tax + tip);
  const restaurant = String(receipt?.restaurantName || receipt?.restaurant || '').trim();

  return {
    restaurant,
    restaurantName: restaurant,
    items,
    subtotal,
    tax,
    tip,
    total,
  };
}

function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const normalized = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return normalized ? Number(normalized[0]) : 0;
}
