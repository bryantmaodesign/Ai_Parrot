# Japanese Shadowing PWA

A mobile-first PWA for Japanese shadowing: AI-generated sentence cards with casual/polite toggle, swipe to skip or save, a saved-cards library, and record-and-get-feedback practice. Vocabulary drives sentence generation (or N5-level generic sentences when empty).

## Setup

1. Copy `.env.example` to `.env.local` and set your OpenAI API key:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and set OPENAI_API_KEY=sk-...
   ```

2. Install and run:
   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000). Use the bottom nav: **Stack**, **Library**, **Vocabulary**, **Practice**.

## Build

```bash
npm run build   # uses webpack (required for PWA)
npm start       # run production server
```

## Features

- **Stack**: Pre-generated queue of cards; swipe left to skip, right to save. Play TTS, switch casual/polite.
- **Library**: Saved cards; play or open Practice.
- **Vocabulary**: Add words by text; AI uses them when generating sentences.
- **Practice**: Record yourself repeating a sentence; get a score and short feedback (from Library or with a card).
- **PWA**: Install prompt when supported; offline page at `/offline`.

Data is stored locally (IndexedDB). No backend user DB; API key stays in server env.

## Launch (deploy to the web)

### Option A: Vercel (recommended)

1. **Push your code to GitHub** (if you haven’t already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
   - Click **Add New** → **Project** and import your GitHub repo.
   - In **Environment Variables**, add:
     - Name: `OPENAI_API_KEY`  
     - Value: your OpenAI API key (starts with `sk-...`)  
     - Apply to: Production (and Preview if you want).
   - Click **Deploy**. Vercel will build and host the site and give you a URL (e.g. `your-app.vercel.app`).

3. **Optional:** Add a custom domain in the project’s **Settings** → **Domains**.

### Option B: Build and run yourself (VPS, Railway, etc.)

1. **Set the API key** in the environment where the app runs, e.g.:
   ```bash
   export OPENAI_API_KEY=sk-your-key-here
   ```

2. **Build and start**:
   ```bash
   npm run build
   npm start
   ```
   The app runs on port 3000 by default. Use a process manager (e.g. PM2) and a reverse proxy (e.g. Nginx) if you want it always on and behind HTTPS.
