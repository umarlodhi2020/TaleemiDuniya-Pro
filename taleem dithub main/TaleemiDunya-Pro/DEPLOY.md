Deployment and Environment Setup

This document explains how to build and host the TaleemiDunya-Pro frontend on Vercel and how to configure required environment variables (including the OpenAI API key). It also explains secure options for sending emails (do NOT store credentials in source code).

1) Local build (quick sanity check)

Run these locally in project root:

```bash
npm install
npm run build
# Optional: preview production build locally
npm run preview
```

2) Deploy to Vercel (recommended for SPA)

- Option A: Quick deploy using the included npm script (requires Vercel CLI login)

```bash
npx vercel login
npm run deploy
```

- Option B: Use `npx vercel` interactive flow to create a new project and link it to your Git repo.

Notes:
- The project uses `vite` and the `base` is `./` (good for static hosting).
- `vercel.json` already rewrites all routes to `index.html` for SPA routing.

3) Environment variables

Add these environment variables in the Vercel dashboard (Project → Settings → Environment Variables) or via the Vercel CLI:

- `VITE_OPENAI_KEY` — Your OpenAI API key (used by `src/services/ai.js`).

Optional (if you plan to send emails from server-side):
- `SMTP_HOST` (e.g., `smtp.gmail.com`)
- `SMTP_PORT` (e.g., `587`)
- `SMTP_USER` (your SMTP username / email)
- `SMTP_PASS` (SMTP password or Gmail App Password)

Important security notes:
- Never commit secrets to Git. Use Vercel's environment settings for production and `.env.local` for local development (do not commit `.env.local`).
- Because this is a static React app, do NOT embed sensitive secrets into client-side `VITE_` variables for actions like sending emails. Instead, implement server-side functions (Vercel Serverless Functions or a backend) that hold SMTP credentials and expose limited endpoints.

4) Gmail SMTP specifics (if you insist on using Gmail)

- Create a dedicated Gmail account for sending app emails.
- Enable 2‑step verification and create an "App Password" in Google Account → Security → App Passwords.
- Use the generated app password as `SMTP_PASS`.
- Recommended: use a proper transactional email provider (SendGrid, Mailgun, Postmark) instead of Gmail for reliability and deliverability.

5) Setting env vars with Vercel CLI (example)

```bash
# add production variable
vercel env add VITE_OPENAI_KEY production
# follow prompt to paste the key
# or add SMTP creds similarly
vercel env add SMTP_USER production
vercel env add SMTP_PASS production
```

6) Post-deploy steps

- Remove access to the `/setup` route after you finish the initial setup (see `src/pages/auth/SuperAdminSetup.jsx`).
- Verify service worker and PWA behaviors (service worker registration is present in `src/main.jsx`).

7) Limitations from this environment

- I cannot run `npm run deploy` from this environment due to terminal/ConPTY restrictions. You can run the deploy commands locally, or provide CI credentials/token if you want me to automate via a trusted runner.

8) Need help?

If you'd like, I can:
- Add a small Vercel serverless function to send email securely using `SMTP_*` env vars.
- Create a sample `.env.example` file showing the variable names.
- Walk you through creating an OpenAI key and app password step-by-step.

---
