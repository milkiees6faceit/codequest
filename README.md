# CodeQuest Academy

Static release MVP for a gamified programming academy: course maps, locked lesson progression, XP, coins, projects, certificates, RU/ENG switching, local progress, and optional Supabase Auth.

## Local Preview

```bash
node dev-server.mjs
```

Open `http://localhost:4173/`.

## Release Features

- GitHub Pages-ready static app.
- Hash-based section URLs for static hosting, for example `#courses` and `#profile`.
- PWA manifest and service worker for cached core assets.
- `404.html` fallback for Pages refresh/direct-link behavior.
- Sequential Duolingo-style lesson map.
- Exportable progress snapshot.
- Certificate previews with stable verification IDs.
- Public `?verify=CQ-...` certificate verification screen.
- Supabase-ready profile, progress, project, certificate, and subscription schema.

## GitHub Pages

The deployment workflow publishes the repository root from the `main` branch.

Expected Pages URL:

```text
https://milkiees6faceit.github.io/codequest/
```

## Supabase Auth

1. Open `supabase/schema.sql` in the Supabase SQL Editor and run it once.
2. In `index.html`, fill `window.CODEQUEST_SUPABASE.url` and `window.CODEQUEST_SUPABASE.key` with your project URL and public anon/publishable key.
3. Enable Email auth in Supabase Authentication settings.

Only public browser keys belong in `index.html`. Never put a service-role key in this static app.

## Pre-Release Checks

```bash
node --check src/app.js
node --check src/store/userStore.js
node --check src/data/demoCourses.js
node --check src/lib/supabaseClient.js
node dev-server.mjs
```

Then verify:

- home page opens;
- registration/demo login opens the workspace;
- lesson completion unlocks the next level;
- project requirements lock/unlock correctly;
- export downloads JSON;
- certificate preview opens and the copied verify link loads;
- GitHub Pages deployment succeeds.
