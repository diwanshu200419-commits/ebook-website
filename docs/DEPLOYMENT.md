# Permanent Deployment

This project is set up for a permanent split deployment:

- Frontend: Vercel
- Backend API: Render
- Frontend API calls in production: same-origin `/api/...` and `/uploads/...`
- Vercel routes those paths to the Render backend through [`vercel.json`](/vercel.json)

## 1. Frontend

Deploy the repo to Vercel with the existing [`vercel.json`](/vercel.json).

Production behavior:

- On localhost or `file:` preview, [`frontend/config.js`](/frontend/config.js) points the frontend to the Render backend URL for development.
- On the public Vercel site, `window.API_BASE` is empty, so requests stay same-origin and use the Vercel rewrites.

## 2. Backend

Deploy the `backend` service to Render and set these required environment variables:

```env
MONGO_URI=...
NODE_ENV=production
JWT_SECRET=...
FRONTEND_URL=https://ebook-website-theta-nine.vercel.app
CLIENT_URL=https://ebook-website-theta-nine.vercel.app
ALLOWED_ORIGINS=https://ebook-website-theta-nine.vercel.app
BACKEND_URL=https://ebook-website-v2mj.onrender.com
RENDER_EXTERNAL_URL=https://ebook-website-v2mj.onrender.com
GOOGLE_CALLBACK_URL=https://ebook-website-v2mj.onrender.com/api/auth/google/callback
```

## 3. AI Options

The backend supports three AI modes, in this order:

1. OpenAI
2. Ollama
3. Local heuristic fallback

### Option A: Permanent hosted AI with OpenAI

Add these on Render:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODERATION_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=512
```

This is the easiest permanent hosted setup.

### Option B: Permanent hosted AI with remote Ollama

Do not point Render at `http://127.0.0.1:11434`, because that only works on your own laptop.

Instead, run Ollama on an always-on server or GPU box and set:

```env
OLLAMA_BASE_URL=https://your-remote-ollama-host
OLLAMA_MODEL=gemma3:1b
OLLAMA_EMBEDDING_MODEL=embeddinggemma
OLLAMA_TIMEOUT_MS=90000
```

### Option C: Free built-in fallback

If neither OpenAI nor Ollama is configured, the app still works with the built-in local heuristic review pipeline. That mode is permanently deployable because it does not depend on an external model server, but the results are much simpler than OpenAI or Ollama.

## 4. What Not To Use For Production

These were only for temporary demos and should not be used as the permanent public setup:

- `cloudflared` quick tunnels
- `localtunnel`
- laptop-hosted Ollama with Render pointed at `127.0.0.1`

## 5. Verify

After deployment, verify:

1. `https://ebook-website-theta-nine.vercel.app/api/health`
2. login/register flows
3. upload flow
4. AI review page provider label
