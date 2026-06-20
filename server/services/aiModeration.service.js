const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const CATEGORIES = [
  'graphic_violence',
  'hate_symbols',
  'self_harm',
  'extremist_propaganda',
  'weapons_contraband',
  'harassment_humiliation'
];

const PROMPT = `You are a content moderation classifier. Analyze the attached image against the following six categories: ${CATEGORIES.join(', ')}.

For EACH category, return a result even if not detected. Respond ONLY with valid JSON, no markdown formatting, no preamble, in exactly this shape:

{
  "results": [
    {
      "category": "graphic_violence",
      "detected": true,
      "confidence": 0,
      "reasoning": "short explanation"
    }
  ]
}

confidence must be an integer from 0 to 100 representing how confident you are that this category applies to the image. reasoning must be one short sentence. Include all six categories in the array, in the order listed above.`;

function validateAndNormalize(parsed) {
  if (!parsed || !Array.isArray(parsed.results)) {
    throw new Error('Malformed AI response: missing results array');
  }

  const byCategory = {};
  for (const r of parsed.results) {
    if (CATEGORIES.includes(r.category)) {
      byCategory[r.category] = {
        category: r.category,
        detected: Boolean(r.detected),
        confidence: Math.min(100, Math.max(0, Number(r.confidence) || 0)),
        reasoning: typeof r.reasoning === 'string' ? r.reasoning : 'No reasoning provided'
      };
    }
  }

  return CATEGORIES.map(cat => byCategory[cat] || {
    category: cat,
    detected: false,
    confidence: 0,
    reasoning: 'Category missing from AI response — treated as inconclusive'
  });
}

async function screenImage(buffer, mimeType) {
  const base64 = buffer.toString('base64');

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0,
      response_mime_type: 'application/json'
    }
  };

  try {
    const res = await axios.post(GEMINI_URL, body, { timeout: 15000 });

    // Case 1: Gemini blocked the request before generating anything
    if (res.data.promptFeedback?.blockReason) {
      console.warn('Gemini blocked this image:', res.data.promptFeedback.blockReason);
      return {
        blocked: true,
        blockReason: res.data.promptFeedback.blockReason,
        results: CATEGORIES.map(cat => ({
          category: cat,
          detected: true,
          confidence: 100,
          reasoning: `Content blocked by AI safety filter (${res.data.promptFeedback.blockReason}) before classification could run.`
        }))
      };
    }

    // Case 2: candidates exist but have no content (finishReason block mid-generation)
    const candidate = res.data.candidates?.[0];
    if (!candidate?.content?.parts?.[0]?.text) {
      console.warn('Gemini returned no usable content. Finish reason:', candidate?.finishReason);
      return {
        blocked: true,
        blockReason: candidate?.finishReason || 'UNKNOWN',
        results: CATEGORIES.map(cat => ({
          category: cat,
          detected: true,
          confidence: 100,
          reasoning: 'AI safety filter prevented classification — treated as high-risk.'
        }))
      };
    }

    const rawText = candidate.content.parts[0].text;
    const parsed = JSON.parse(rawText);
    return { blocked: false, results: validateAndNormalize(parsed) };

  } catch (err) {
    if (err.response) {
      console.error('Gemini API error:', err.response.status, err.response.data);
    } else {
      console.error('Gemini request failed:', err.message);
    }
    return {
      blocked: false,
      error: true,
      results: CATEGORIES.map(cat => ({
        category: cat,
        detected: false,
        confidence: 0,
        reasoning: 'AI screening unavailable — submission requires manual review'
      }))
    };
  }

  try {
    const res = await axios.post(GEMINI_URL, body, { timeout: 15000 });
    console.log('=== RAW GEMINI RESPONSE ===');
    console.log(JSON.stringify(res.data, null, 2));
    console.log('===========================');
    const rawText = res.data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(rawText);
    return validateAndNormalize(parsed);
  } catch (err) {
    if (err.response) {
      console.error('Gemini API error:', err.response.status, err.response.data);
    } else {
      console.error('Gemini request failed:', err.message);
    }
    return CATEGORIES.map(cat => ({
      category: cat,
      detected: false,
      confidence: 0,
      reasoning: 'AI screening unavailable — submission requires manual review'
    }));
  }
}

module.exports = { screenImage, CATEGORIES };