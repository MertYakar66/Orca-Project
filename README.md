# Orca-Project
"Orca Orman Ürünleri - Company Website"

## Project Context for AI Assistants (v2.0)

### 1. Project Goal
A premium corporate website for a lumber/pallet company (Orca Orman Ürünleri) featuring an **AI-powered Ordering Assistant**.

### 2. Tech Stack
- **Frontend**: API-less Static HTML/JS (No framework).
- **Backend**: Netlify Functions (Node.js).
- **Styling**: Vanilla CSS (Tailwind concepts but custom).
- **AI**: Google Gemini API via `netlify/functions/chat.js`.
- **Email**: SendGrid via `netlify/functions/send-order.js`.

### 3. Key Files
- `index.html`: Main landing page (Sales funnel).
- `js/orca-assistant.js`: The "Brain" of the chatbot. Handles state, UI rendering, and logic.
- `netlify/functions/chat.js`: Proxy for Gemini API. Handles Smart Search and Validation.
- `netlify/functions/send-order.js`: Handles email sending (SendGrid).
- `DEPLOYMENT.md`: Instructions for Netlify & DNS setup.

### 4. Current Feature Set (Completed)
- **Dual-Path Flow**: Users choose "WhatsApp Direct" or "AI Form".
- **Product Selection**: Visual grid + "Magic Search" (AI text categorization).
- **Rich Media**:
  - Voice Recording (Web Speech API + MediaRecorder).
  - Photo Upload (Base64).
- **Smart Logic**:
  - Context-aware validation.
  - LocalStorage autofill for contacts.
- **Robustness**:
  - Browser feature detection (Mic support).
  - Graceful degradation.

### 5. Deployment
- Hosted on Netlify.
- Functions require `GEMINI_API_KEY` and `SENDGRID_API_KEY`.
- Email requires SendGrid DNS Authentication (CNAME records).
