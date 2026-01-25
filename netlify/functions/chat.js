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

    const { message, context: orderContext } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Smart validation prompt
    const validationPrompt = `Sen ORCA Ahşap'ın sipariş asistanısın. Görevin müşterilere sipariş formunu doldurmada yardım etmek.

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
- Dostça ve profesyonel ol
- Müşteriye yardımcı olduğunu hissettir
- Rakam bekliyorsan rakam iste, şehir bekliyorsan şehir iste
- Eğer müşteri "bilmiyorum" veya belirsiz bir cevap verdiyse, seçenekler sun

Örnek iyi yanıtlar:
- "Teşekkürler! Miktar kaydedildi. Şimdi teslimat bilgilerine geçelim."
- "Lütfen sadece rakam yazın. Örneğin: 100 (kaç adet istiyorsunuz?)"
- "Şehir adını yazmanız gerekiyor. Örneğin: Bursa, İstanbul, Ankara"

Yanıtını ver:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: validationPrompt }]
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
