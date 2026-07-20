const OpenAI = require('openai');

const MODEL = 'gpt-5.6';
const MAX_WORDS = 29;
const PRESCRIPTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['medicines'],
  properties: {
    medicines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'dosage', 'frequency', 'timing', 'duration'],
        properties: {
          name: { type: 'string' },
          dosage: { type: 'string' },
          frequency: { type: 'string' },
          timing: { type: 'string' },
          duration: { type: 'string' }
        }
      }
    }
  }
};

let client;

function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return client;
}

function limitWords(message) {
  return message.trim().split(/\s+/).slice(0, MAX_WORDS).join(' ');
}

async function generateLeaveByNudge({ eventTitle, leaveByTime, travelMinutes, weather }) {
  const response = await getClient().responses.create({
    model: MODEL,
    max_output_tokens: 80,
    instructions: [
      'Write one warm, practical leave-by reminder.',
      'Use fewer than 30 words.',
      'Tell the user when to leave and briefly explain why.',
      'Return only the reminder text.'
    ].join(' '),
    input: JSON.stringify({ eventTitle, leaveByTime, travelMinutes, weather })
  });

  return limitWords(response.output_text || 'It’s time to plan your departure.');
}

function toImageDataUrl(base64Image) {
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('base64Image must be a non-empty base64-encoded image string.');
  }

  return base64Image.startsWith('data:image/')
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;
}

async function extractPrescriptionFromImage(base64Image) {
  const response = await getClient().responses.create({
    model: MODEL,
    instructions: [
      'You extract medicines from Indian prescriptions.',
      'Return only data matching the supplied JSON schema.',
      'Extract every medicine name, dosage, frequency, timing, and duration.',
      'For any unreadable, ambiguous, or omitted field, use the exact string "unclear"; never guess.',
      'Interpret Indian shorthand: OD means once daily, BD means twice daily, TDS means three times daily,',
      'HS means bedtime, and 1-0-1 means morning-afternoon-night dosing.'
    ].join(' '),
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Extract the prescription from this image.' },
          { type: 'input_image', image_url: toImageDataUrl(base64Image), detail: 'high' }
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'prescription_extraction',
        strict: true,
        schema: PRESCRIPTION_SCHEMA
      }
    }
  });

  try {
    return JSON.parse(response.output_text);
  } catch (error) {
    throw new Error('Unable to parse the prescription extraction response as JSON.');
  }
}

module.exports = {
  extractPrescriptionFromImage,
  generateLeaveByNudge
};
