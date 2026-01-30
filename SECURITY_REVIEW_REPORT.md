# ORCA B2B Website - Comprehensive Security & Code Quality Review

**Date:** 2026-01-29 (Updated)
**Reviewer:** Claude Code (Automated Security Audit)
**Repository:** MertYakar66/Orca-Project
**Overall Health Score:** 6.5/10

---

## Executive Summary

The ORCA B2B website is a well-structured Turkish wood products ordering system with AI-powered chatbot functionality. The codebase demonstrates good practices in several areas (API keys in environment variables, input validation), but has **critical XSS vulnerabilities** where user input is rendered via `innerHTML` without sanitization, despite an `escapeHtml()` helper being defined but never used. The open serverless endpoints with permissive CORS also present spam/abuse risks.

---

## 1. SECURITY FINDINGS

### 🔴 HIGH Priority

#### 1.1 DOM XSS via Unescaped User Input in Chat UI (CRITICAL)
**File:** `js/orca-assistant.js:579-646` (`renderConfirmScreen()`)
**Issue:** User-provided fields are inserted into HTML templates via `innerHTML` without escaping. This includes contact details, product notes, and voice transcript.

```javascript
// Lines 596-606 - User input directly interpolated into innerHTML
elements.messagesContainer.innerHTML = `
    ...
    <p>${chatState.contact.name || '-'}</p>
    <p>🏢 ${chatState.contact.company || '-'}</p>
    <p>📱 ${chatState.contact.phone || '-'}</p>
    <p>📧 ${chatState.contact.email || '-'}</p>
    <p>🚚 ${chatState.contact.city || '-'}</p>
    ...
    <p>${chatState.product.notes}</p>  // Line 606 - User notes unescaped
`;
```

**Risk:** If an attacker enters `<img onerror=alert(1)>` or similar in any field, it executes in the chat modal context. This is a stored XSS that could steal session data or perform actions on behalf of users.

**Evidence:** An `escapeHtml()` helper exists at lines 126-130 but is **never called anywhere in the codebase**.

**Fix:** Wrap all user content with `escapeHtml()` before template injection:
```javascript
<p>${escapeHtml(chatState.contact.name) || '-'}</p>
<p>${escapeHtml(chatState.product.notes)}</p>
```

---

#### 1.2 Public Endpoints with Permissive CORS (Spam/Abuse Risk)
**Files:** `netlify/functions/chat.js:33`, `netlify/functions/send-order.js:43`
**Issue:** Both Netlify functions allow `Access-Control-Allow-Origin: *` and have no authentication. Rate limiting is in-memory only and resets per function instance.

```javascript
'Access-Control-Allow-Origin': '*'  // Any origin can call
const rateLimitMap = new Map();     // Resets on cold start!
```

**Risk:** Any website can call these endpoints, enabling:
- Email spam via SendGrid (costs money, damages sender reputation)
- AI API abuse via Gemini (costs money)
- DoS via repeated requests

**Fix:**
1. Restrict CORS to your domain: `'Access-Control-Allow-Origin': 'https://orcaahsap.com.tr'`
2. Use Netlify edge middleware or Upstash Redis for persistent rate limiting
3. Add CAPTCHA or signed tokens for abuse prevention

---

#### 1.3 Email Template HTML Injection
**File:** `netlify/functions/send-order.js:179-209`
**Issue:** `orderDetails`, `customerName`, `companyName`, and other user-controlled fields are interpolated into HTML emails without sanitization.

```javascript
// Line 187-192 - User input in HTML email
html: `
    <p><strong>Müşteri:</strong> ${customerName || 'İsimsiz'}</p>
    <p><strong>Şirket:</strong> ${companyName || '-'}</p>
    ...
    <pre style="...">${orderDetails}</pre>  // User notes injected raw
`
```

**Risk:** Attackers can inject malicious HTML or phishing links into emails sent to your team and customers.

**Fix:** Escape HTML before inserting into email templates, or send plaintext-only for user-supplied fields:
```javascript
const escapeHtml = (str) => str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
```

---

### 🟠 MEDIUM Priority

#### 2.1 Server-Side Attachment Validation Missing
**File:** `netlify/functions/send-order.js:130-170`
**Issue:** Photo/audio validation is done only client-side. Server trusts incoming attachments and doesn't validate MIME types or base64 correctness.

```javascript
// Server only checks count and aggregate size
if (attachments.length > MAX_ATTACHMENTS) { ... }
const totalSize = attachments.reduce(...);  // Size check only

// Then blindly assumes type is correct
if (att.type === 'image') {
    mimeType = 'image/jpeg';  // Trusts client-provided type
}
```

**Risk:** Attackers can bypass client validation and send malicious file types.

**Fix:**
- Validate base64 content is actually valid
- Check magic bytes match claimed MIME type
- Reject non-image/audio types server-side

---

#### 2.2 Order Number Regeneration Bug
**File:** `js/orca-assistant.js:576`
**Issue:** `generateOrderNumber()` runs each time `renderConfirmScreen()` is called. If users navigate back and return, the order number changes.

```javascript
function renderConfirmScreen() {
    ...
    const orderNumber = generateOrderNumber();  // Called every render!
    chatState.orderNumber = orderNumber;
```

**Risk:** Confuses users and creates duplicate/changing order numbers in the system.

**Fix:** Generate order number once when entering confirm screen for the first time:
```javascript
if (!chatState.orderNumber) {
    chatState.orderNumber = generateOrderNumber();
}
const orderNumber = chatState.orderNumber;
```

---

#### 2.3 Error Message Information Leakage
**File:** `netlify/functions/send-order.js:289-291`
```javascript
body: JSON.stringify({
    success: false,
    error: error.message  // Exposes internal error details
})
```
**Fix:** Return generic error messages to clients.

---

#### 2.4 Missing Content Security Policy
**Files:** All HTML files
**Issue:** No CSP headers to prevent XSS attacks.
**Fix:** Add CSP meta tag or Netlify headers.

---

### 🟢 LOW Priority

#### 3.1 PII Stored in localStorage Without Consent
**File:** `js/orca-assistant.js:761-784`
**Issue:** Contact data is persisted automatically without explicit user consent.

```javascript
function saveContactToStorage() {
    localStorage.setItem('orca_contact', JSON.stringify(chatState.contact));
}
```

**Risk:** Privacy concern on shared devices; potential GDPR implications.

**Fix:**
- Add "Remember my info" checkbox
- Only store if user opts in
- Provide "Clear saved info" option

---

#### 3.2 Unused escapeHtml Helper (Code Smell)
**File:** `js/orca-assistant.js:126-130`
**Issue:** Security helper is defined but **never used** - indicates missed sanitization.

```javascript
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// ^ Defined but grep shows 0 calls in entire codebase
```

---

#### 3.3 Console Statements in Production
**Files:** Multiple locations

| File | Line | Statement |
|------|------|-----------|
| `js/orca-assistant.js` | 765 | `console.log('Could not save to localStorage')` |
| `js/orca-assistant.js` | 781 | `console.log('Could not load from localStorage')` |
| `js/orca-assistant.js` | 1032 | `console.log('Speech recognition error:', event.error)` |
| `js/orca-assistant.js` | 1448 | `console.log('ORCA AI Assistant initialized')` |
| `urunler.html` | 571, 618, 652 | Debug click logs |
| `index.html` | 2629 | `console.log('sendMessage called')` |

---

#### 3.4 CDN Scripts Without Subresource Integrity
**File:** `index.html:11-18`
**Risk:** If CDN is compromised, malicious code could be served.
**Fix:** Add SRI hashes to CDN scripts.

---

#### 3.5 Missing Configuration Files
| File | Purpose | Priority |
|------|---------|----------|
| `.env.example` | Environment variable template | HIGH |
| `netlify.toml` | Netlify config + security headers | MEDIUM |

---

## 2. EXPOSED SECRETS (CRITICAL LIST)

### ✅ No secrets or API keys were found hardcoded in the repo.

Both SendGrid and Gemini keys are read from environment variables only:
- `process.env.SENDGRID_API_KEY` (send-order.js:76)
- `process.env.GEMINI_API_KEY` (chat.js:64)

The `.gitignore` properly excludes `.env` files.

---

## 3. API INTEGRATION REVIEW

### Gemini (chat.js)
| Aspect | Status | Notes |
|--------|--------|-------|
| API Key in env vars | ✅ Good | `process.env.GEMINI_API_KEY` |
| Message length limit | ✅ Good | MAX_MESSAGE_LENGTH = 1000 |
| Rate limiting | ⚠️ Weak | In-memory only, resets on cold start |
| Error handling | ✅ Good | Generic errors returned |
| Timeout/retry | ❌ Missing | No AbortController or retry logic |

### SendGrid (send-order.js)
| Aspect | Status | Notes |
|--------|--------|-------|
| API Key in env vars | ✅ Good | `process.env.SENDGRID_API_KEY` |
| Input validation | ✅ Good | Email/phone validation present |
| Attachment limits | ⚠️ Partial | Size checked, but MIME not validated server-side |
| Error handling | ⚠️ Leaky | Returns `error.message` to client |
| HTML sanitization | ❌ Missing | User content injected raw into HTML emails |

---

## 4. CHATBOT FUNCTIONALITY REVIEW

### Data Flow
```
User Input → Product Selection → Specs → Contact Info → Confirmation → Submission
                                                              ↓
                                            Email (SendGrid) OR WhatsApp (Deep Link)
```

### Findings

| Feature | Status | File:Line |
|---------|--------|-----------|
| Conversation flow | ✅ Complete | `orca-assistant.js:189-212` |
| WhatsApp link generation | ✅ Good | Uses `encodeURIComponent` |
| Photo upload (base64) | ⚠️ Client-only validation | `orca-assistant.js:863-887` |
| Voice recording | ⚠️ XSS risk | Transcript injected unescaped |
| Form validation | ✅ Good | `orca-assistant.js:788-841` |
| escapeHtml utility | ❌ Unused | Defined but never called |
| Order number | ⚠️ Bug | Regenerates on re-render |

---

## 5. CODE QUALITY ISSUES

### 5.1 Unused Helper Function
- `escapeHtml()` at line 126-130 is defined but never used - critical code smell

### 5.2 Dead Code
~~Previously had dead code in `index.html` - now removed.~~

### 5.3 Hardcoded Values
| Value | Locations |
|-------|-----------|
| `905336605802` (WhatsApp) | `orca-assistant.js:14`, HTML files |
| `orcaahsap@orcaahsap.com` | `orca-assistant.js:17`, `send-order.js` |

---

## 6. ACCESSIBILITY REVIEW

| Issue | Severity | Location |
|-------|----------|----------|
| Missing `role="dialog"` on modal | Medium | Chat modal |
| Missing `aria-modal="true"` | Medium | Chat modal |
| No focus trap in modal | Medium | Keyboard users can tab out |
| Close button lacks `aria-label` | Medium | Icon-only button |
| Images have `alt` attributes | ✅ Good | Most images |

---

## 7. PERFORMANCE CONSIDERATIONS

| Area | Finding | Recommendation |
|------|---------|----------------|
| Base64 in memory | Large images stored as data URLs | Use `URL.createObjectURL()` for previews |
| 3D rendering | Three.js loaded on every page | Lazy load on scroll |
| Image sizes | Some images >1MB | Compress and use WebP |

---

## 8. ACTIONABLE FIXES (Priority Order)

### Immediate (Critical Security)

1. **Use escapeHtml() for all user content in renderConfirmScreen()**
   - Lines 596-606: Escape name, company, phone, email, city
   - Line 606: Escape product.notes
   - Voice transcript: Escape before display

2. **Restrict CORS to your domain**
   ```javascript
   'Access-Control-Allow-Origin': 'https://orcaahsap.com.tr'
   ```

3. **Sanitize email template content**
   - Escape orderDetails, customerName, etc. in HTML emails

### Short-term

4. **Fix order number regeneration bug** - Generate once only
5. **Add server-side attachment MIME validation**
6. **Return generic error messages** - Don't expose error.message
7. **Remove debug console.log statements**

### Medium-term

8. **Implement persistent rate limiting** (Upstash Redis)
9. **Add Content Security Policy**
10. **Add ARIA attributes for accessibility**
11. **Create .env.example and netlify.toml**

---

## 9. POSITIVE FINDINGS

1. ✅ **API keys properly stored in environment variables**
2. ✅ **Input validation present** - Email, phone, message length
3. ✅ **.gitignore properly configured** - Excludes .env
4. ✅ **Attachment size limits** - Prevents resource exhaustion
5. ✅ **Modern async/await patterns** - Clean async code
6. ✅ **Mobile-first responsive design** - Good CSS
7. ✅ **WhatsApp links use encodeURIComponent** - Safe encoding

---

## 10. OVERALL HEALTH SCORE: 6.5/10

| Category | Score | Notes |
|----------|-------|-------|
| Security | 5/10 | Critical XSS, open endpoints, email injection |
| Code Quality | 7/10 | Dead code, unused helper, console logs |
| API Integration | 7/10 | Proper env vars, but weak validation |
| Functionality | 8/10 | Complete features, one bug (order number) |
| Performance | 7/10 | Large base64 in memory |
| Accessibility | 5/10 | Missing ARIA, focus management |
| Documentation | 8/10 | Good README and DEPLOYMENT docs |

**Summary:** The codebase has strong functionality but **critical XSS vulnerabilities** where the existing `escapeHtml()` helper is never used. The open serverless endpoints enable spam/abuse. Address the sanitization issues immediately before considering this production-ready.

---

*Report generated by Claude Code Security Audit - Updated with reconciled findings*
