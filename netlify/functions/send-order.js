const sendgrid = require('@sendgrid/mail');

// Configuration
const MAX_ATTACHMENTS = 5;
const MAX_TOTAL_SIZE_MB = 4.5; // Netlify has 6MB payload limit, keep safe
const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5;
const ALLOWED_ORIGINS = ['https://orcaahsap.com.tr', 'https://www.orcaahsap.com.tr'];

// Security: HTML escape function to prevent injection in emails
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Security: Validate attachment MIME type matches content
function isValidBase64Image(content) {
  if (!content || typeof content !== 'string') return false;
  // Check if it looks like valid base64 (basic check)
  try {
    // Base64 should only contain these characters
    return /^[A-Za-z0-9+/=]+$/.test(content.substring(0, 100));
  } catch (e) {
    return false;
  }
}

// Get CORS origin - restrict in production
function getCorsOrigin(requestOrigin) {
  if (process.env.NODE_ENV === 'development' || !requestOrigin) {
    return '*'; // Allow all in development
  }
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
}

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

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^[\d\s\+\-\(\)]{10,20}$/.test(phone);
}

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const corsOrigin = getCorsOrigin(origin);

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
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

  // Rate Limiting
  const clientIp = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  if (clientIp !== 'unknown' && !checkRateLimit(clientIp)) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return {
      statusCode: 429,
      headers: { 'Access-Control-Allow-Origin': corsOrigin },
      body: JSON.stringify({
        success: false,
        error: 'Too many requests. Please try again later.'
      })
    };
  }

  try {
    const API_KEY = process.env.SENDGRID_API_KEY;
    if (!API_KEY) {
      console.error('SendGrid API key not configured');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: 'Server configuration error'
        })
      };
    }

    sendgrid.setApiKey(API_KEY);

    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON payload' })
      };
    }

    const {
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      companyName,
      orderDetails,
      attachments = []
    } = body;

    // --- Validation ---
    const errors = [];
    if (!orderNumber) errors.push('Order number is required');
    if (!customerEmail || !validateEmail(customerEmail)) errors.push('Valid email is required');
    if (customerPhone && !validatePhone(customerPhone)) errors.push('Valid phone number is required');
    if (!orderDetails) errors.push('Order details are required');

    if (errors.length > 0) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: false, error: 'Validation failed', details: errors })
      };
    }

    // --- Attachment Limits ---
    if (attachments.length > MAX_ATTACHMENTS) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': corsOrigin },
        body: JSON.stringify({ success: false, error: `Too many attachments. Max ${MAX_ATTACHMENTS}.` })
      };
    }

    // Calculate roughly size of attachments
    // Base64 string length * 0.75 is roughly byte size
    const totalSize = attachments.reduce((acc, att) => acc + (att.content ? att.content.length * 0.75 : 0), 0);

    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': corsOrigin },
        body: JSON.stringify({
          success: false,
          error: `Attachments too large. Total limit is ${MAX_TOTAL_SIZE_MB}MB.`
        })
      };
    }

    // Validate attachment content (server-side validation)
    for (const att of attachments) {
      if (att.content && !isValidBase64Image(att.content)) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': corsOrigin },
          body: JSON.stringify({
            success: false,
            error: 'Invalid attachment format. Please upload valid image or audio files.'
          })
        };
      }
      // Validate type is one of allowed types
      if (att.type && !['image', 'audio'].includes(att.type)) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': corsOrigin },
          body: JSON.stringify({
            success: false,
            error: 'Invalid attachment type. Only images and audio are allowed.'
          })
        };
      }
    }

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

    // Escape all user-provided content for HTML emails to prevent injection
    const safeOrderNumber = escapeHtml(orderNumber);
    const safeCustomerName = escapeHtml(customerName);
    const safeCompanyName = escapeHtml(companyName);
    const safeCustomerEmail = escapeHtml(customerEmail);
    const safeCustomerPhone = escapeHtml(customerPhone);
    const safeOrderDetails = escapeHtml(orderDetails);

    // Email to sales team (with attachments)
    const salesEmail = {
      to: 'orcaahsap@orcaahsap.com',
      from: 'orcaahsap@orcaahsap.com', // Using the main company email as sender
      replyTo: customerEmail,
      subject: `🔔 Yeni Sipariş Talebi: ${safeOrderNumber} - ${safeCompanyName || 'Bireysel'}`,
      text: orderDetails,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a2e1a 0%, #2d4a2d 100%); padding: 20px; text-align: center;">
            <h1 style="color: #D4A373; margin: 0;">ORCA Orman Ürünleri</h1>
            <p style="color: white; margin: 5px 0;">Yeni Sipariş Talebi</p>
          </div>
          <div style="background: #f5f5f5; padding: 20px;">
            <p><strong>Sipariş No:</strong> ${safeOrderNumber}</p>
            <p><strong>Müşteri:</strong> ${safeCustomerName || 'İsimsiz'}</p>
            <p><strong>Şirket:</strong> ${safeCompanyName || '-'}</p>
            <p><strong>E-posta:</strong> ${safeCustomerEmail}</p>
            <p><strong>Telefon:</strong> ${safeCustomerPhone || '-'}</p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;">
            <pre style="background: white; padding: 20px; border-left: 4px solid #D4A373; font-family: monospace; white-space: pre-wrap; line-height: 1.6;">${safeOrderDetails}</pre>
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
            <p style="margin: 5px 0;">Müşteriye yanıt vermek için: <a href="mailto:${safeCustomerEmail}" style="color: #D4A373;">${safeCustomerEmail}</a></p>
            <p style="margin: 5px 0;">Telefon: <a href="tel:${safeCustomerPhone}" style="color: #D4A373;">${safeCustomerPhone}</a></p>
          </div>
        </div>
      `
    };

    if (emailAttachments.length > 0) {
      salesEmail.attachments = emailAttachments;
    }

    await sendgrid.send(salesEmail);
    console.log(`Order ${orderNumber} sent to sales team`);

    // Confirmation email to customer (using escaped values)
    const customerConfirmEmail = {
      to: customerEmail,
      from: 'orcaahsap@orcaahsap.com',
      subject: `✅ Sipariş Talebiniz Alındı - ${safeOrderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #D4A373 0%, #E8C39E 100%); padding: 30px; text-align: center;">
            <h1 style="color: #1a2e1a; margin: 0; font-size: 28px;">✅ Sipariş Talebiniz Alındı</h1>
            <p style="color: #1a2e1a; margin: 10px 0; font-size: 18px;">Sipariş No: <strong>${safeOrderNumber}</strong></p>
          </div>

          <div style="background: white; padding: 30px;">
            <p style="font-size: 16px; color: #333;">Sayın <strong>${safeCustomerName || 'Müşterimiz'}</strong>,</p>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              ORCA Orman Ürünleri'ni tercih ettiğiniz için teşekkür ederiz.
              Sipariş talebiniz satış ekibimize iletilmiştir.
            </p>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              <strong style="color: #D4A373;">⏱️ 2 saat içinde</strong> size dönüş yapacağız.
            </p>

            <div style="background: #f9f9f9; border-left: 4px solid #D4A373; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1a2e1a;">📋 Sipariş Detaylarınız:</h3>
              <pre style="font-family: monospace; font-size: 12px; white-space: pre-wrap; line-height: 1.6; color: #333;">${safeOrderDetails}</pre>
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
    };

    await sendgrid.send(customerConfirmEmail);
    console.log(`Confirmation email sent to ${customerEmail}`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Emails sent successfully',
        orderNumber: orderNumber
      })
    };

  } catch (error) {
    // Log detailed error server-side for debugging
    console.error('SendGrid Error:', error);

    // Return generic error message to client (don't expose internal details)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: 'An error occurred while sending your order. Please try again or contact us directly.'
      })
    };
  }
};
