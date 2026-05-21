# Production Deployment

This project is designed for a split production setup:

- Frontend: Vercel
- Backend API: Render
- Database: MongoDB Atlas

The frontend now uses same-origin `/api/...` and `/uploads/...` calls in production. Vercel proxy functions forward those requests to the backend origin you configure with env vars, so the deploy no longer depends on a hardcoded Render URL inside `vercel.json`.

## Frontend on Vercel

Deploy the repo to Vercel with the existing [`vercel.json`](/vercel.json).

Set this Vercel environment variable:

```env
BACKEND_PROXY_ORIGIN=https://your-backend.onrender.com
```

Production behavior:

- Public Vercel site: frontend requests stay same-origin and flow through the Vercel proxy functions in [`api/[...path].js`](/c:/Users/DELL/OneDrive/Desktop/E%20book%20website/api/%5B...path%5D.js:1) and [`uploads/[...path].js`](/c:/Users/DELL/OneDrive/Desktop/E%20book%20website/uploads/%5B...path%5D.js:1)
- Localhost or `file:` preview: [`frontend/config.js`](/c:/Users/DELL/OneDrive/Desktop/E%20book%20website/frontend/config.js:1) defaults to `http://localhost:5000`
- Manual override: append `?apiBase=https://your-backend.example.com` to any frontend URL

## Backend on Render

Deploy the `backend` service to Render and set these baseline env vars:

```env
MONGO_URI=...
NODE_ENV=production
JWT_SECRET=...
FRONTEND_URL=https://your-frontend.vercel.app
CLIENT_URL=https://your-frontend.vercel.app
ALLOWED_ORIGINS=https://your-frontend.vercel.app
BACKEND_URL=https://your-backend.onrender.com
RENDER_EXTERNAL_URL=https://your-backend.onrender.com
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/api/auth/google/callback
```

Payments and lifecycle:

```env
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_AUTOMATIC_TAX=true
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=
EMAIL_WEBHOOK_URL=
EMAIL_WEBHOOK_TOKEN=
LIFECYCLE_CRON_SECRET=...
```

Global market pricing:

```env
FX_RATE_USD=0.012
FX_RATE_GBP=0.0095
FX_RATE_EUR=0.011
FX_RATE_AED=0.044
FX_RATE_SGD=0.016
```

## Storage Modes

Uploads are controlled through the storage helpers in [`backend/utils/uploads.js`](/c:/Users/DELL/OneDrive/Desktop/E%20book%20website/backend/utils/uploads.js:1).

### Local or Render disk

```env
UPLOAD_STORAGE_PROVIDER=local
UPLOAD_ROOT=/var/data/ebook-uploads
```

Use this when your Render service is attached to a persistent disk or volume.

### Hybrid or external public assets

```env
UPLOAD_STORAGE_PROVIDER=hybrid
UPLOAD_ROOT=/var/data/ebook-uploads
UPLOAD_PUBLIC_BASE_URL=https://cdn.yourdomain.com
```

Use this when files still exist on backend disk for processing, but public asset URLs should resolve from a CDN or object-storage domain.

## AI Options

The backend supports these AI modes, in priority order:

1. OpenAI
2. Remote Ollama
3. Local heuristic fallback

### Hosted AI with OpenAI

```env
OPENAI_API_KEY=sk-...
OPENAI_MODERATION_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=512
```

Optional compatible provider:

```env
OPENAI_BASE_URL=https://your-provider-api-base
```

### Remote Ollama

```env
OLLAMA_BASE_URL=https://your-remote-ollama-host
OLLAMA_MODEL=gemma3:1b
OLLAMA_EMBEDDING_MODEL=embeddinggemma
OLLAMA_AUTH_TOKEN=
OLLAMA_TIMEOUT_MS=90000
```

Do not point production envs at `http://127.0.0.1:11434` inside Render.

## What To Verify

After deployment, verify:

1. `https://your-frontend.vercel.app/api/health`
2. `https://your-frontend.vercel.app/api/ai/status`
3. `explore -> cart -> Stripe checkout -> success`
4. `manual UPI proof flow for India`
5. upload flow, creator profile images, and product covers
6. admin launch-readiness screen in reports

Expected `/api/ai/status` `mode` values:

- `fallback`: built-in heuristic only
- `openai`: direct OpenAI production setup
- `hosted-compatible`: another OpenAI-compatible hosted provider
- `ollama`: remote Ollama server
