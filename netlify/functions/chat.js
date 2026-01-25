// netlify/functions/chat.js
// BACKEND - Handles Gemini API calls securely

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Security: Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Security: Check origin (optional but recommended)
  const allowedOrigins = [
    'https://your-site.netlify.app',
    'https://orcaahsap.com',
    'http://localhost:8888' // for local testing
  ];
  
  const origin = event.headers.origin;
  if (!allowedOrigins.includes(origin)) {
    // Still allow but log suspicious activity
    console.log('Request from unknown origin:', origin);
  }

  try {
    // Get API key from environment variable (secure)
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    // Parse request body
    const { message, conversationHistory } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ 
              text: `Sen ORCA Ahşap sipariş asistanısın. Sadece Türkçe yanıt ver. Kısa ve net cevaplar ver (maksimum 280 karakter).

Kullanıcı mesajı: ${message}

Lütfen Türkçe yanıt ver.` 
            }]
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

    // Check for API errors
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

    // Extract response text
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Üzgünüm, yanıt oluşturamadım.';

    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
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
