const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const { message, context: orderContext, type = 'validate' } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' })
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

        Müşteri isteği: "${message}"

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
