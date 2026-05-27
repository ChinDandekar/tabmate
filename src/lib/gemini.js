import { generateId, round2 } from './utils.js';

const GEMINI_MODEL = 'gemini-3-flash-preview';

const SYSTEM_PROMPT = `
You are a receipt parser. Extract all line items, tax, tip, subtotal,
and restaurant name from the receipt text provided.
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

  let response;
  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: cleanedApiKey });
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `${SYSTEM_PROMPT}\n\nReceipt:\n${cleanedText}`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: createReceiptSchema(Type),
      },
    });
  } catch (err) {
    throw Object.assign(new Error(getGeminiErrorMessage(err)), {
      code: err?.status ? 'API_ERROR' : 'NETWORK_ERROR',
      status: err?.status,
      cause: err,
    });
  }

  const raw = response.text ?? '';

  try {
    return normalizeGeminiReceipt(JSON.parse(stripJsonFence(raw)));
  } catch (err) {
    throw Object.assign(new Error('Could not parse Gemini response as JSON'), {
      code: 'BAD_JSON',
      cause: err,
    });
  }
}

function createReceiptSchema(Type) {
  return {
    type: Type.OBJECT,
    properties: {
      restaurantName: {
        type: Type.STRING,
        description: 'Restaurant name, or an empty string if not present.',
      },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'Line item name.',
            },
            price: {
              type: Type.NUMBER,
              description: 'Final line price for the item.',
            },
          },
          propertyOrdering: ['name', 'price'],
        },
      },
      subtotal: {
        type: Type.NUMBER,
        description: 'Receipt subtotal, or 0 if not present.',
      },
      tax: {
        type: Type.NUMBER,
        description: 'Receipt tax, or 0 if not present.',
      },
      tip: {
        type: Type.NUMBER,
        description: 'Receipt tip or gratuity, or 0 if not present.',
      },
    },
    propertyOrdering: ['restaurantName', 'items', 'subtotal', 'tax', 'tip'],
  };
}

function getGeminiErrorMessage(err) {
  if (err?.status) return `Gemini API error: ${err.status}`;
  return "Couldn't reach Gemini. Check your connection.";
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
