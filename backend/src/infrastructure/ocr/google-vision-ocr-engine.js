import { AppError } from '../../shared/errors.js';

export class GoogleVisionOcrEngine {
  async extractText({ buffer, apiKey }) {
    const content = buffer.toString('base64');
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
    const body = {
      requests: [
        {
          features: [{ type: 'TEXT_DETECTION' }],
          image: { content },
        },
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new AppError(`Error de Google Vision (${res.status})`, 502, 'OCR_ENGINE_ERROR');
    }

    const json = await res.json();
    const text = json?.responses?.[0]?.fullTextAnnotation?.text
      || json?.responses?.[0]?.textAnnotations?.[0]?.description
      || '';
    return text.trim();
  }
}
