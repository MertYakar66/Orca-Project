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

    // Prepare email attachments (photos)
    const emailAttachments = attachments.map(att => ({
      content: att.content, // base64 string (without data:image prefix)
      filename: att.filename || 'photo.jpg',
      type: 'image/jpeg',
      disposition: 'attachment'
    }));

    // Email to sales team
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
            <p style="color: #2e7d32; margin: 0;">📎 ${attachments.length} fotoğraf eklendi (aşağıda)</p>
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

    // Confirmation email to customer (no attachments needed)
    await sendgrid.send({
      to: customerEmail,
      from: 'siparis@orcaahsap.com.tr',
      subject: `✅ Sipariş Talebiniz Alındı - ${orderNumber}`,
      text: `Sayın ${customerName},

Sipariş talebinizi aldık. Satış ekibimiz en kısa sürede size dönüş yapacaktır.

${orderDetails}

Teşekkür ederiz,
ORCA Orman Ürünleri
📞 0224 482 2892
💬 WhatsApp: 0533 660 5802`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #D4A373 0%, #E8C39E 100%); padding: 30px; text-align: center;">
            <h1 style="color: #1a2e1a; margin: 0; font-size: 28px;">✅ Sipariş Talebiniz Alındı</h1>
            <p style="color: #1a2e1a; margin: 10px 0; font-size: 18px;">Sipariş No: <strong>${orderNumber}</strong></p>
          </div>
          
          <div style="background: white; padding: 30px;">
            <p style="font-size: 16px; color: #333;">Sayın <strong>${customerName}</strong>,</p>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              ORCA Orman Ürünleri'ni tercih ettiğiniz için teşekkür ederiz. 
              Sipariş talebiniz satış ekibimize iletilmiştir.
            </p>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              <strong style="color: #D4A373;">⏱️ 2 saat içinde</strong> size dönüş yapacağız.
            </p>
            
            <div style="background: #f9f9f9; border-left: 4px solid #D4A373; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1a2e1a;">📋 Sipariş Detaylarınız:</h3>
              <pre style="font-family: monospace; font-size: 12px; white-space: pre-wrap; line-height: 1.6; color: #333;">${orderDetails}</pre>
            </div>
            
            <div style="background: #1a2e1a; color: white; padding: 20px; border-radius: 8px; margin-top: 30px;">
              <h3 style="margin-top: 0; color: #D4A373;">Acele mi ediyorsunuz?</h3>
              <p style="margin: 10px 0;">📞 Telefon: <a href="tel:02244822892" style="color: #D4A373; text-decoration: none;">0224 482 2892</a></p>
              <p style="margin: 10px 0;">💬 WhatsApp: <a href="https://wa.me/905336605802" style="color: #D4A373; text-decoration: none;">0533 660 5802</a></p>
              <p style="margin: 10px 0;">📧 Email: <a href="mailto:orcaahsap@orcaahsap.com" style="color: #D4A373; text-decoration: none;">orcaahsap@orcaahsap.com</a></p>
            </div>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 5px 0;">ORCA Orman Ürünleri</p>
            <p style="margin: 5px 0;">Çalı Mahallesi Dönüş Cadde No:13 Nilüfer/BURSA</p>
            <p style="margin: 5px 0;">www.orcaahsap.com.tr</p>
          </div>
        </div>
      `
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Emails sent successfully',
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
