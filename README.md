# CodeQuest Academy

Static MVP for a gamified programming-learning platform.

## Local Preview

```bash
node dev-server.mjs
```

Open `http://localhost:4173/`.

## GitHub Pages

The app is ready for GitHub Pages. The deployment workflow publishes the repository root from the `main` branch.

Expected Pages URL:

```text
https://milkiees6faceit.github.io/codequest/
```

## Supabase Auth

1. Open `supabase/schema.sql` in the Supabase SQL Editor and run it once.
2. In `index.html`, fill `window.CODEQUEST_SUPABASE.url` and `window.CODEQUEST_SUPABASE.key` with your project URL and public anon/publishable key.
3. Enable Email auth in Supabase Authentication settings.

Only public browser keys belong in `index.html`. Never put a service-role key in this static app.
