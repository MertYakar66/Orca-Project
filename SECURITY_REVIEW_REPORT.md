# ORCA B2B Website - Comprehensive Security & Code Quality Review

**Date:** 2026-01-28
**Reviewer:** Claude Code (Automated Security Audit)
**Repository:** MertYakar66/Orca-Project
**Overall Health Score:** 7/10

---

## Executive Summary

The ORCA B2B website is a well-structured Turkish wood products ordering system with AI-powered chatbot functionality. The codebase demonstrates good practices in several areas (API keys in environment variables, rate limiting attempts, input validation), but has room for improvement in XSS prevention, production logging, and serverless-specific security patterns.

---

## 1. SECURITY FINDINGS

### 🔴 HIGH Priority

#### 1.1 Unused API Key Variable in Client Code
**File:** `index.html:2291`
**Issue:** Empty `apiKey` variable in client-side JavaScript
```javascript
const apiKey = "";
```
**Risk:** This appears to be remnant code that previously held an API key. Even though empty now, it indicates potential past exposure.
**Fix:** Remove this unused variable entirely.

---

#### 1.2 Potential XSS in Image Modal (urunler.html)
**File:** `urunler.html:1787-1800`
**Issue:** Direct interpolation of `imageSrc` and `title` into innerHTML without sanitization
```javascript
function openImageModal(imageSrc, title) {
    modal.innerHTML = `
        <img src="${imageSrc}" alt="${title}" class="w-full h-auto rounded-lg">
        <div class="text-center mt-4 text-white text-xl font-bold">${title}</div>
    `;
}
```
**Risk:** If image paths or titles come from user-controlled sources, attackers could inject malicious HTML/JS.
**Fix:** Use the `escapeHtml()` function for the title, and validate imageSrc is a proper URL:
```javascript
// Already defined in orca-assistant.js:126-130, move to shared utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

---

#### 1.3 Dangerous Force Push Script
**File:** `push.sh:4`
```bash
git push origin main --force
```
**Risk:** Force pushing can overwrite remote history and destroy team members' work.
**Fix:** Remove `--force` flag or add confirmation prompt.

---

#### 1.4 Local Path Exposure in push.sh
**File:** `push.sh:2`
```bash
cd /Users/mertyakar/Desktop/Orca
```
**Risk:** Exposes local development environment paths. While not directly exploitable, it's information leakage.
**Fix:** Use relative paths or remove this file from version control.

---

### 🟠 MEDIUM Priority

#### 2.1 Ineffective Rate Limiting (Serverless)
**Files:** `netlify/functions/chat.js:8-27`, `netlify/functions/send-order.js:10-27`
**Issue:** Rate limiting uses in-memory `Map()` which resets on every function cold start.
```javascript
const rateLimitMap = new Map(); // Resets on cold start!
```
**Risk:** Rate limiting is ineffective in serverless environments where instances are ephemeral.
**Fix:** Implement persistent rate limiting using:
- Netlify's built-in rate limiting
- Redis/Upstash for persistent counters
- Cloudflare rate limiting

---

#### 2.2 Overly Permissive CORS
**Files:** `netlify/functions/chat.js:33`, `netlify/functions/send-order.js:43`
```javascript
'Access-Control-Allow-Origin': '*'
```
**Risk:** Allows any website to call your APIs. While acceptable for public APIs, it enables CSRF-like attacks.
**Fix:** Restrict to your domain:
```javascript
'Access-Control-Allow-Origin': 'https://orcaahsap.com.tr'
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
**Risk:** Internal error messages can reveal system information to attackers.
**Fix:** Return generic error messages to clients, log detailed errors server-side:
```javascript
body: JSON.stringify({
    success: false,
    error: 'An error occurred processing your request'
})
// Keep: console.error('SendGrid Error:', error);
```

---

#### 2.4 Missing Content Security Policy
**Files:** All HTML files
**Issue:** No CSP headers or meta tags to prevent XSS attacks.
**Fix:** Add to HTML head or Netlify headers:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;">
```

---

#### 2.5 CDN Scripts Without Subresource Integrity
**File:** `index.html:11-18`
```html
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
```
**Risk:** If CDN is compromised, malicious code could be served.
**Fix:** Add SRI hashes:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```

---

### 🟢 LOW Priority

#### 3.1 Console Statements in Production
**Files:** Multiple locations

| File | Line | Statement |
|------|------|-----------|
| `js/orca-assistant.js` | 765 | `console.log('Could not save to localStorage')` |
| `js/orca-assistant.js` | 781 | `console.log('Could not load from localStorage')` |
| `js/orca-assistant.js` | 1032 | `console.log('Speech recognition error:', event.error)` |
| `js/orca-assistant.js` | 1448 | `console.log('ORCA AI Assistant (Dual-Path) initialized')` |
| `urunler.html` | 571 | `console.log('Kontrplak palet button clicked')` |
| `urunler.html` | 618 | `console.log('Ahşap palet button clicked')` |
| `urunler.html` | 652 | `console.log('2. El palet button clicked')` |
| `index.html` | 2629 | `console.log('sendMessage called - waiting for orca-assistant.js')` |

**Fix:** Remove debug console.log statements or use a proper logging library with log levels.

---

#### 3.2 Missing Environment Variable Template
**Issue:** No `.env.example` file exists for team onboarding.
**Fix:** Create `.env.example`:
```env
# ORCA Website Environment Variables
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxx
```

---

#### 3.3 Missing netlify.toml Configuration
**Issue:** No `netlify.toml` file for deployment configuration.
**Fix:** Create `netlify.toml`:
```toml
[build]
  publish = "."
  functions = "netlify/functions"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## 2. API INTEGRATION REVIEW

### SendGrid Integration (netlify/functions/send-order.js)
| Aspect | Status | Notes |
|--------|--------|-------|
| API Key in env vars | ✅ Good | `process.env.SENDGRID_API_KEY` |
| Input validation | ✅ Good | Email and phone validation present |
| Attachment limits | ✅ Good | 5 attachments, 4.5MB max |
| Error handling | ⚠️ Partial | Leaks error.message to client |
| Rate limiting | ⚠️ Partial | In-memory only, resets on cold start |

### Gemini AI Integration (netlify/functions/chat.js)
| Aspect | Status | Notes |
|--------|--------|-------|
| API Key in env vars | ✅ Good | `process.env.GEMINI_API_KEY` |
| Message length limit | ✅ Good | MAX_MESSAGE_LENGTH = 1000 |
| Prompt injection protection | ⚠️ Partial | User input is quoted but not escaped |
| Error handling | ✅ Good | Generic errors returned |
| Rate limiting | ⚠️ Partial | In-memory only |

---

## 3. CHATBOT FUNCTIONALITY REVIEW

### Data Flow Analysis
```
User Input → Product Selection → Specs → Contact Info → Confirmation → Submission
                                                              ↓
                                            Email (SendGrid) OR WhatsApp (Deep Link)
```

### Findings:

| Feature | Status | File:Line |
|---------|--------|-----------|
| Conversation flow | ✅ Complete | `orca-assistant.js:189-212` |
| WhatsApp link generation | ✅ Good | `orca-assistant.js:135-184` |
| Photo upload (base64) | ✅ Good | `orca-assistant.js:863-887` |
| Voice recording | ✅ Good | `orca-assistant.js:967-1107` |
| Form validation | ✅ Good | `orca-assistant.js:788-841` |
| Contact info persistence | ✅ Good | `orca-assistant.js:761-784` (localStorage) |
| escapeHtml utility | ⚠️ Defined but underused | `orca-assistant.js:126-130` |

---

## 4. CODE QUALITY ISSUES

### 4.1 Dead/Unused Code
| File | Line | Code | Issue |
|------|------|------|-------|
| `index.html` | 2291 | `const apiKey = "";` | Empty unused variable |
| `index.html` | 2292-2293 | `calculateLoadWithAI()`, `toggleChat()` | Functions with `/* ... */` placeholder |

### 4.2 Duplicate Code Patterns
- Rate limiting logic duplicated in `chat.js` and `send-order.js`
- Consider extracting to shared utility

### 4.3 Hardcoded Values
| Value | Locations |
|-------|-----------|
| `905336605802` (WhatsApp) | `orca-assistant.js:14`, multiple HTML files |
| `orcaahsap@orcaahsap.com` | `orca-assistant.js:17`, `send-order.js:173-175` |
| `0224 482 2892` | `orca-assistant.js:16`, multiple locations |

**Recommendation:** Centralize configuration in a single config object.

---

## 5. FILE STRUCTURE REVIEW

### Current Structure
```
Orca-Project/
├── .gitignore          ✅ Good - includes .env, node_modules
├── index.html          ✅ Main homepage
├── urunler.html        ✅ Products page
├── pages/              ✅ Sub-pages
│   ├── hakkimizda.html
│   ├── iletisim.html
│   ├── kariyer.html
│   ├── kurumsal-bilgiler.html
│   └── misyon-vizyon.html
├── js/
│   └── orca-assistant.js  ✅ Main chatbot logic
├── css/
│   ├── design-system.css  ✅ Global styles
│   └── chat-widget.css    ✅ Chat-specific styles
├── netlify/
│   └── functions/
│       ├── chat.js        ✅ Gemini proxy
│       └── send-order.js  ✅ SendGrid handler
├── assets/             ✅ Images and documents
├── package.json        ✅ Dependencies
├── DEPLOYMENT.md       ✅ Deployment guide
├── README.md           ✅ Project overview
└── push.sh             ⚠️ Should be removed or gitignored
```

### Missing Files
| File | Purpose | Priority |
|------|---------|----------|
| `.env.example` | Environment variable template | HIGH |
| `netlify.toml` | Netlify configuration | MEDIUM |
| `.nvmrc` | Node version specification | LOW |

---

## 6. ACCESSIBILITY REVIEW

### Findings:

| Issue | Severity | Location |
|-------|----------|----------|
| Missing `aria-label` on icon buttons | Medium | Multiple close/action buttons |
| Missing `aria-live` regions for chat | Medium | `orca-assistant.js` chat messages |
| Images have `alt` attributes | ✅ Good | Most images |
| Form inputs have labels | ✅ Good | `orca-assistant.js` |
| Focus management in modal | ⚠️ Partial | `index.html:2607` focuses input |

### Recommended Fixes:
```html
<!-- Close button -->
<button onclick="closeAIChat()" aria-label="Sohbeti kapat" class="...">
    <i class="fa-solid fa-times" aria-hidden="true"></i>
</button>

<!-- Chat messages container -->
<div id="chat-messages-new" role="log" aria-live="polite" aria-atomic="false">
```

---

## 7. PERFORMANCE CONSIDERATIONS

| Area | Finding | Recommendation |
|------|---------|----------------|
| 3D rendering | Three.js loaded on every page | Consider lazy loading |
| Image sizes | Some images >1MB | Compress and use WebP |
| CDN scripts | Multiple external scripts | Consider bundling |
| Base64 photos | Up to 5MB sent as base64 | Consider direct upload to S3/Cloudinary |

---

## 8. SPECIFIC ACTIONABLE FIXES

### Immediate (Do Now):

1. **Remove dead code in index.html:2291-2293**
```diff
- const apiKey = "";
- async function calculateLoadWithAI() { /* ... */ }
- function toggleChat() { /* ... */ }
```

2. **Remove or gitignore push.sh**
```bash
echo "push.sh" >> .gitignore
rm push.sh
```

3. **Create .env.example**
```env
# Required for Netlify Functions
SENDGRID_API_KEY=
GEMINI_API_KEY=
```

### Short-term (This Week):

4. **Add escapeHtml to urunler.html modal**
5. **Create netlify.toml with security headers**
6. **Replace wildcard CORS with domain restriction**
7. **Remove console.log debug statements**

### Medium-term (This Month):

8. **Implement persistent rate limiting (Upstash Redis)**
9. **Add Content Security Policy**
10. **Add SRI hashes to CDN scripts**

---

## 9. POSITIVE FINDINGS

The codebase demonstrates several good practices:

1. ✅ **API keys properly stored in environment variables** - Not exposed in client code
2. ✅ **Input validation present** - Email, phone, message length validation
3. ✅ **CORS handling** - Proper OPTIONS preflight handling
4. ✅ **Rate limiting attempted** - Shows security awareness (even if ineffective in serverless)
5. ✅ **.gitignore properly configured** - Excludes .env and node_modules
6. ✅ **Attachment size limits** - Prevents resource exhaustion
7. ✅ **Error boundaries in client code** - Try-catch blocks for localStorage operations
8. ✅ **User-friendly validation messages** - Turkish language error messages
9. ✅ **Modern async/await patterns** - Clean asynchronous code
10. ✅ **Mobile-first responsive design** - Proper media queries

---

## 10. OVERALL HEALTH SCORE: 7/10

| Category | Score | Notes |
|----------|-------|-------|
| Security | 6/10 | XSS risks, CORS too permissive |
| Code Quality | 7/10 | Some dead code, console logs |
| API Integration | 8/10 | Proper env vars, good validation |
| Functionality | 9/10 | Complete feature set |
| Performance | 7/10 | Large images, many CDN calls |
| Accessibility | 5/10 | Missing ARIA labels |
| Documentation | 8/10 | Good README and DEPLOYMENT docs |

**Summary:** The codebase is production-ready with moderate security improvements needed. The primary concerns are XSS vulnerabilities in dynamic HTML rendering and the ineffective serverless rate limiting. No critical secrets were found exposed in the codebase.

---

*Report generated by Claude Code Security Audit*
