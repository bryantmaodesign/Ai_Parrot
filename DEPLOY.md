# Deploy Japanese Shadowing to Netlify (with GitHub)

## 1. Push your code to GitHub

If you haven’t already:

1. **Create a repo on GitHub**  
   Go to [github.com/new](https://github.com/new), create a repository (e.g. `shadowing-japanese`). Don’t add a README if your project already has one.

2. **Initialize Git and push** (in your project folder):

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name.

---

## 2. Connect the repo to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) and sign in (or create an account).
2. Click **Add new site** → **Import an existing project**.
3. Choose **GitHub** and authorize Netlify if asked.
4. Select the repository you pushed in step 1.
5. Netlify should detect Next.js and use your `netlify.toml`:
   - **Build command:** `npm run build` (from `netlify.toml`)
   - **Publish directory:** handled by the Next.js plugin (leave default)
6. Before deploying, add environment variables (see step 3).
7. Click **Deploy site**.

---

## 3. Set environment variables

Your app needs `OPENAI_API_KEY` for sentence generation, TTS, and feedback.

1. In Netlify: **Site settings** → **Environment variables** → **Add a variable** (or **Add single variable**).
2. **Key:** `OPENAI_API_KEY`  
   **Value:** your OpenAI API key (same as in `.env.local`).
3. **Scopes:** check **All** (or at least “Production” and “Deploy previews”).
4. Save. Then trigger a new deploy: **Deploys** → **Trigger deploy** → **Deploy site** so the new variable is used.

---

## 4. After deploy

- Your site will be at `https://YOUR_SITE_NAME.netlify.app` (or a custom domain if you add one).
- Future pushes to `main` will trigger a new deploy automatically.
- To share with a friend, send them the Netlify URL.

---

## Troubleshooting

- **Build fails:** Check the build log in Netlify (**Deploys** → click the deploy → **Build log**). Common issues: missing `OPENAI_API_KEY`, Node version (Netlify usually uses a recent LTS).
- **API errors on the live site:** Ensure `OPENAI_API_KEY` is set in Netlify and a new deploy was run after adding it.
- **Need a specific Node version:** Add an `.nvmrc` file with the version (e.g. `20`) or set `NODE_VERSION` in Netlify environment variables.
