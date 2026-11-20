# AIMARKATER QR Review Assistant

A single public website serves many client QR links. There is **no admin dashboard**.
Each client is configured by adding one JSON file in `backend/data/clients/`.
Customers open `/r/<client-slug>`, share their real experience, receive an editable
AI-assisted draft, then decide whether to copy it and open that business's Google
review page.

## Stack
- React + Vite
- Node.js + Express
- Google Gemini via the official `@google/genai` SDK
- `qrcode` CLI utility for printable client QR PNGs

## Requirements
- Node.js 20+ (Node 22 LTS recommended)
- Gemini API key from https://aistudio.google.com/apikey
- GitHub account (for deployment)
- Vercel (frontend) and Render (backend), or another static host + Node host

## 1. Install

Open two terminals.

### Backend
```bash
cd backend
npm install
cp .env.example .env
```
Put your Gemini key in `backend/.env`. Do not put it in the frontend.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
```
For local development, the default API URL is `http://localhost:5000`.

## 2. Add a client (no dashboard)

Edit or create `backend/data/clients/<slug>.json`. Example:
```json
{
  "slug": "shree-bhojak-studio",
  "businessName": "Shree Bhojak Stationery & Studio",
  "city": "Sardarshahar, Rajasthan",
  "services": [
    "Stationery",
    "Digital printing",
    "Photography",
    "Wedding photography"
  ],
  "reviewUrl": "https://g.page/r/REPLACE_WITH_REAL_REVIEW_LINK",
  "languages": ["Hinglish", "Hindi", "English"],
  "brandColor": "#0864EB"
}
```
Use a lowercase URL-safe slug. `reviewUrl` must be the actual Google review link supplied by the client.

## 3. Generate the client's QR PNG

From the `backend` folder:
```bash
npm run qr -- shree-bhojak-studio https://YOUR-FRONTEND-DOMAIN.vercel.app
```
The PNG is saved to `backend/generated-qr/shree-bhojak-studio.png`.
Print this QR and give it to the client. Test it with a phone before printing.

For local testing:
```bash
npm run qr -- shree-bhojak-studio http://localhost:5173
```
A local QR only works on the same network/device setup; use the deployed HTTPS URL for customers.

## 4. Run locally

Terminal 1:
```bash
cd backend
npm run dev
```
Terminal 2:
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173/r/shree-bhojak-studio`.

## 5. Deploy

### Backend on Render
1. Push this project to a GitHub repository.
2. In Render, create a **Web Service** from that repository.
3. Set Root Directory to `backend`.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Add environment variables:
   - `GEMINI_API_KEY` = your Gemini API key
   - `FRONTEND_ORIGIN` = your deployed Vercel URL, e.g. `https://your-app.vercel.app`
   - `GEMINI_MODEL` = `gemini-3.8-flash` (change only if your AI Studio project does not have access)
   - `NODE_ENV` = `production`
7. Deploy and test `https://YOUR-RENDER-SERVICE.onrender.com/api/health`.

### Frontend on Vercel
1. Import the same GitHub repository.
2. Set Root Directory to `frontend`.
3. Add environment variable:
   - `VITE_API_BASE_URL` = your Render backend URL, e.g. `https://your-service.onrender.com`
4. Deploy.
5. Copy the final Vercel URL.

### Connect the domains
Update Render's `FRONTEND_ORIGIN` to the exact Vercel URL and redeploy backend.
Then generate each client's QR using the live Vercel URL:
```bash
cd backend
npm run qr -- shree-bhojak-studio https://YOUR-FRONTEND-DOMAIN.vercel.app
```

## 6. Add another client later
1. Add another JSON file in `backend/data/clients/`.
2. Commit and push to GitHub so Render redeploys the backend.
3. Run `npm run qr -- client-slug https://YOUR-FRONTEND-DOMAIN.vercel.app`.
4. Deliver the new PNG to that client.

No frontend redeploy is needed when only backend client JSON changes. The backend redeploy is needed because this starter stores client records as JSON files.

## Google review policy and trust
- Ask every customer for honest feedback, regardless of whether it is positive, neutral, or negative.
- Do not offer discounts, gifts, or other incentives for reviews.
- Do not filter customers based on sentiment or route unhappy customers away from Google.
- AI must not invent experiences or force location/service keywords into reviews.
- The customer must review, edit, and submit the draft themselves. This app never posts to Google.
- A draft is optional assistance, not a guarantee of Google ranking.

## Security before production
This starter includes basic input limits, rate limiting, slug validation, strict CORS, and keeps the Gemini key on the backend.
For a higher-traffic paid service, add persistent rate limiting (Redis), monitoring, abuse controls, and a database or managed config store. Do not log customer feedback or sensitive personal information.
