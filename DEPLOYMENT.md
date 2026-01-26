# Deployment & Configuration Guide

This guide explains how to deploy the **ORCA Assistant** to Netlify and configure the necessary email services.

## 1. Netlify Deployment

### Step 1: Connect Repository
1. Log in to [Netlify](https://app.netlify.com/).
2. Click **"Add new site"** > **"Import an existing project"**.
3. Select your Git provider (GitHub/GitLab/Bitbucket) and choose the `Orca` repository.

### Step 2: Build Settings
- **Base directory**: `.` (Root)
- **Build command**: (Leave empty, this is a static site with functions)
- **Publish directory**: `.` (Root)
- **Functions directory**: `netlify/functions` (Netlify usually detects this automatically)

### Step 3: Environment Variables (Critical)
You must set these variables in **Site Settings > Environment Variables** for emails and AI to work:

| Key | Value Description |
|-----|-------------------|
| `SENDGRID_API_KEY` | Your SendGrid API Key (starts with `SG.`) |
| `GEMINI_API_KEY` | Your Google Gemini API Key |

## 2. Email Configuration (SendGrid)

If emails are not sending, it is likely due to missing **Domain Authentication**.

### Why it happens
Email providers (Gmail, Outlook) block emails coming from "random" servers to prevent spam. You need to prove you own `orcaahsap.com`.

### How to Fix (DNS Configuration)
1. Go to **SendGrid Dashboard** > **Settings** > **Sender Authentication**.
2. Click **"Authenticate Your Domain"**.
3. Choose your DNS host (e.g., GoDaddy, Namecheap, Cloudflare).
4. Enter your domain: `orcaahsap.com`.
5. SendGrid will give you **3 CNAME records**.
6. Go to your domain's **DNS Management** page (where you bought the domain).
7. Add these 3 CNAME records exactly as shown.
8. Click **"Verify"** in SendGrid.

### Authorized Sender
1. In SendGrid, go to **Sender Authentication** > **Verify a Single Sender**.
2. Create a sender with `orcaahsap@orcaahsap.com`.
3. Verify the email link.

## 3. Troubleshooting

### Emails not sending?
1. Check **Netlify Function Logs**:
   - Go to **Netlify Dashboard** > **Functions** > `send-order`.
   - Look for error messages (e.g., `401 Unauthorized` = bad API key).
2. Check **Spam Folder**: Without DNS authentication, emails often go to spam.

### AI not responding?
1. Verify `GEMINI_API_KEY` is set in Netlify.
2. Check Function logs for `chat`.
