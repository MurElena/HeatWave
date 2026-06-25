# HeatWave — Translation Model Evaluation

A modular platform to build challenge datasets, evaluate translation models, and
compare them with automatic metrics, Quality Estimation (QE), and an LLM jury.

## Real model evaluation via the Vercel AI Gateway

Translation, QE, and the LLM-as-a-jury are powered by real models through the
[Vercel AI Gateway](https://vercel.com/docs/ai-gateway). The provider/model
catalog, the QE model, and the jury LLMs are all gateway model slugs (e.g.
`openai/gpt-5.4`, `anthropic/claude-sonnet-4.6`, `google/gemini-3-flash`).

Server routes that talk to models:

- `POST /api/translate` — translates a batch of segments with one model.
- `POST /api/qe` — scores translations 0–100 using the QE prompt from Settings.
- `POST /api/jury` — collects Good/Neutral/Bad votes from the selected jury LLMs.

API keys are **never** sent from the browser — the routes authenticate to the
gateway server-side.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure AI Gateway auth (see `.env.example`):

   - **Static key** — set `AI_GATEWAY_API_KEY` in `.env.local`, or
   - **OIDC (recommended on Vercel)**:

```bash
vercel link
vercel env pull .env.local   # provisions VERCEL_OIDC_TOKEN
```

3. Run the dev server:

```bash
npm run dev
```

## Deploying

Push to GitHub and import the project in Vercel. Enable **AI Gateway** in the
project settings (every team gets monthly free credits). On Vercel, OIDC tokens
are provisioned and auto-refreshed, so no manual key management is needed.

## Notes

- App data (datasets, evaluations, reviews, settings) is stored in `localStorage`
  per browser. Models and which ones are enabled are configured under
  **Settings → Models to test** and **Settings → Jury LLMs**.
- See `AGGREGATED_SCORE_README.md` for how the aggregated ranking score is
  computed.
