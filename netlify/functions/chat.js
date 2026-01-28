const fetch = require('node-fetch');

// Configuration
const MAX_MESSAGE_LENGTH = 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 20; // Chat is more chatty than orders

// In-memory rate limiting (per instance)
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, startTime: now };

  // Reset if window passed
  if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record.count = 0;
    record.startTime = now;
  }

  record.count++;
  rateLimitMap.set(ip, record);

  return record.count <= MAX_REQUESTS_PER_WINDOW;
}

exports.handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    // Only allow POST
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Rate Limiting
  const clientIp = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  if (clientIp !== 'unknown' && !checkRateLimit(clientIp)) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return {
      statusCode: 429,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: 'Too many requests. Please try again later.'
      })
    };
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      console.error('Gemini API key not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }

    const { message, context: orderContext, type = 'validate' } = body;

    // --- Validation ---
    if (!message || typeof message !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message too long' })
      };
    }

    let prompt = '';

    if (type === 'categorize') {
      const categories = {
        palet: 'Ahşap veya plastik taşıma paletleri',
        kasa: 'Ahşap, kontrplak veya OSB sandık/kasa',
        kereste: 'İnşaatlık veya doğramalık kereste',
        kontrplak: 'Kontrplak levhalar',
        lata: 'Ahşap veya kontrplak çıta/lata',
        ikinciel: 'Kullanılmış veya ikinci el paletler'
      };

      prompt = `Sen bir lojistik uzmanısın. Müşterinin isteğini analiz edip en uygun ürün kategorisini belirle.

        KATEGORİLER:
        ${JSON.stringify(categories, null, 2)}

        Müşteri isteği: "${message.substring(0, 500)}"

        Sadece şu JSON formatında yanıt ver, başka bir şey yazma:
        { "category": "kategori_kodu", "confidence": 0-1 arası sayı, "reason": "kısa açıklama" }

        Eğer emin değilsen category: null döndür.`;
    } else {
      // Validation Prompt (Default)
      prompt = `Sen ORCA Ahşap'ın sipariş asistanısın. Görevin müşterilere sipariş formunu doldurmada yardım etmek.

        Müşteri şu soruyu yanıtlıyor:
        "${orderContext?.question || 'Genel soru'}"

        Müşterinin cevabı: "${message}"

        Beklenen format: ${orderContext?.expectedFormat || 'serbest'}

        Şimdiye kadar toplanan bilgiler: ${JSON.stringify(orderContext?.currentData || {})}

        GÖREVİN:
        1. Müşterinin cevabının soruya uygun olup olmadığını kontrol et
        2. Eksik veya hatalı ise, nazik bir şekilde düzelt ve somut örnek ver
        3. Doğruysa, kısa ve olumlu bir onay ver

        KURALLAR:
        - Sadece Türkçe yanıt ver
        - Maksimum 2-3 cümle (kısa ve öz)
        - Dostça ve profesyonel ol`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
            topP: 0.8,
            topK: 40
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'AI service error',
          details: data.error?.message || 'Unknown error'
        })
      };
    }

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Üzgünüm, yanıt oluşturamadım. Lütfen tekrar deneyin.';

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        response: aiResponse,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Function error:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
