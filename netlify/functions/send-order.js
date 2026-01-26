const sendgrid = require('@sendgrid/mail');

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

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Get API key from environment
    const API_KEY = process.env.SENDGRID_API_KEY;
    if (!API_KEY) {
      console.log('SendGrid API key not configured');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'SendGrid API key not configured'
        })
      };
    }

    sendgrid.setApiKey(API_KEY);

    // Parse request body
    const {
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      companyName,
      orderDetails,
      attachments = []
    } = JSON.parse(event.body);

    // Prepare email attachments (photos + audio)
    const emailAttachments = attachments.map(att => {
      // Determine MIME type
      let mimeType = 'application/octet-stream';
      if (att.type === 'image') {
        mimeType = 'image/jpeg';
      } else if (att.type === 'audio') {
        mimeType = 'audio/webm';
      }

      return {
        content: att.content, // base64 string (without data prefix)
        filename: att.filename || (att.type === 'audio' ? 'sesli-not.webm' : 'photo.jpg'),
        type: mimeType,
        disposition: 'attachment'
      };
    });

    // Single email to sales team only
    const salesEmail = {
      to: 'orcaahsap@orcaahsap.com',
      from: 'siparis@orcaahsap.com.tr',
      replyTo: customerEmail,
      subject: `🔔 Yeni Sipariş Talebi: ${orderNumber} - ${companyName}`,
      text: orderDetails,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a2e1a 0%, #2d4a2d 100%); padding: 20px; text-align: center;">
            <h1 style="color: #D4A373; margin: 0;">ORCA Orman Ürünleri</h1>
            <p style="color: white; margin: 5px 0;">Yeni Sipariş Talebi</p>
          </div>
          <div style="background: #f5f5f5; padding: 20px;">
            <pre style="background: white; padding: 20px; border-left: 4px solid #D4A373; font-family: monospace; white-space: pre-wrap; line-height: 1.6;">${orderDetails}</pre>
          </div>
          ${attachments.length > 0 ? `
          <div style="background: #e8f5e9; padding: 15px; text-align: center;">
            <p style="color: #2e7d32; margin: 0;">📎 ${attachments.length} dosya eklendi (aşağıda)</p>
            <p style="color: #666; font-size: 12px; margin: 5px 0;">
              ${attachments.filter(a => a.type === 'image').length > 0 ? `📷 ${attachments.filter(a => a.type === 'image').length} fotoğraf` : ''}
              ${attachments.filter(a => a.type === 'audio').length > 0 ? `🎤 ${attachments.filter(a => a.type === 'audio').length} sesli not` : ''}
            </p>
          </div>
          ` : ''}
          <div style="background: #1a2e1a; padding: 15px; text-align: center; color: white; font-size: 12px;">
            <p>Bu email website AI asistanı tarafından otomatik gönderilmiştir.</p>
            <p style="margin: 5px 0;">Müşteriye yanıt vermek için: <a href="mailto:${customerEmail}" style="color: #D4A373;">${customerEmail}</a></p>
            <p style="margin: 5px 0;">Telefon: <a href="tel:${customerPhone}" style="color: #D4A373;">${customerPhone}</a></p>
          </div>
        </div>
      `
    };

    // Add attachments if any
    if (emailAttachments.length > 0) {
      salesEmail.attachments = emailAttachments;
    }

    await sendgrid.send(salesEmail);

    console.log(`Order ${orderNumber} sent to orcaahsap@orcaahsap.com with ${attachments.length} attachments`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        orderNumber: orderNumber
      })
    };

  } catch (error) {
    console.error('SendGrid Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
