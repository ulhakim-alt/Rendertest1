# Quotation Studio

A Japan tour pricing calculator — internal cost breakdown, per-day itinerary builder,
auto-suggested routing, and a customer-facing quotation PDF generator using the
official MKJ Travel branded template.

## Architecture

Two separate pieces, both deployed on Render:

1. **Frontend** (`src/`) — the React calculator, deployed as a Render Static Site.
   All pricing logic runs in the browser.
2. **Backend** (`server/`) — a small persistent Express server running Puppeteer +
   headless Chrome, deployed as a Render Web Service. Only handles one job: turn
   the itinerary/pricing data into a real, text-selectable PDF using the MKJ
   Travel template.

They're separate because Puppeteer needs a real running server, not a
short-lived serverless function — this sidesteps the timeout problems that
serverless platforms (Netlify Functions, Vercel, etc.) have with headless Chrome
cold-starts.

## Run it locally (to test before deploying)

You need [Node.js](https://nodejs.org) installed (v18 or newer).

**Frontend:**
```bash
npm install
npm run dev
```
Opens at `http://localhost:5173`.

**Backend** (in a separate terminal):
```bash
cd server
npm install
npm start
```
Runs at `http://localhost:4000`. Set `VITE_API_URL=http://localhost:4000` in a
`.env` file at the project root (copy `.env.example`) so the frontend talks to
your local backend instead of a deployed one.

## Deploy to Render

The included `render.yaml` is a **Blueprint** — Render reads it and sets up both
services automatically.

1. Push this whole folder to a GitHub repository.
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New** →
   **Blueprint** → connect your repo. Render detects `render.yaml` and shows
   both services (`mkj-pdf-server` and `quotation-studio`) ready to deploy.
3. Click **Apply** / **Deploy**.
4. **After the first deploy**, two manual follow-ups (Render assigns URLs only
   once services exist, so this can't be automated in advance):
   - Copy the actual URL Render gave `mkj-pdf-server` (shown in its dashboard page).
   - Go to the `quotation-studio` service → **Environment** → update `VITE_API_URL`
     to that real URL → this triggers a redeploy of the frontend with the correct
     backend address baked in.
   - Optionally also update `mkj-pdf-server`'s `ALLOWED_ORIGIN` env var to the
     frontend's real URL instead of `"*"`, for tighter CORS.

### About the free tier

Render's free Web Services **spin down after 15 minutes of inactivity** and take
~30-50 seconds to wake back up on the next request. This means the first "Generate
MKJ PDF" click after a period of no use will be slow (the request is waiting for
the server to wake up, not stuck) — subsequent clicks will be fast until it goes
idle again. This is different from Netlify's problem (a hard timeout that fails
outright); Render will still succeed, just slowly on a cold start. If that delay
is a problem in practice, Render's paid tier keeps the service always-on.

### If the backend build fails with a Chrome/Puppeteer error

`server/render-build.sh` handles the known Render + Puppeteer gotcha (Chrome
downloading to the wrong cache directory, causing "Browser was not found at the
configured executablePath"). If you still hit that error, check Render's build
logs — the fix pattern is documented in the script's comments and is a common,
well-known issue with an established solution.

## Notes

- `server/_mkjTemplate.js` holds the MKJ Travel HTML/CSS template (navy + gold
  branding). Edit colors/layout there to change the generated PDF's design
  without touching the calculator logic in `src/App.jsx`.
- The "Print / Save as PDF" and "Download File" buttons in the app are fully
  client-side and need no backend at all — they work even if the Render backend
  is asleep, slow, or you haven't deployed it yet.
- If you want a real backend later (saved quotations, multi-user access, login,
  auto-emailing the PDF to customers), `server/` is a reasonable place to grow
  that from — it's already a persistent Node server, not a one-shot function.
