# AGENTS.md

## Repo shape
- This repo has **two independent npm projects**: `frontend/` and `backend/`. There is **no root `package.json` or workspace runner**, so do not assume root-level `npm` commands exist.
- Production is a **single Express server**: the backend serves `/api/*` and also serves the built Vue app from `../frontend/dist` by default (`backend/server.js`).
- This demo is the LnkChatBI embedded-integration demo. It only demonstrates the two assistant integration paths that LnkChatBI actually exposes: **basic assistant** (loads `assistant.js`) and **advanced assistant** (third-party datasource endpoint + AES). The legacy "embedded assistant" / "standalone embedded page" modes and the JWT signing path have been removed because LnkChatBI itself no longer ships them.

## Commands
- Install deps separately:
  - `cd frontend && npm install`
  - `cd backend && npm install`
- Frontend dev: `cd frontend && npm run dev` (port `5180`, proxies `/api` → `http://127.0.0.1:3100`)
- Backend dev: `cd backend && npm run dev` (port `3100`)
- Frontend build: `cd frontend && npm run build`
  - This runs `vue-tsc -b && vite build`, so it is the repo's main frontend typecheck step.
- Backend prod run: `cd backend && npm start`
- Focused frontend typecheck: `cd frontend && npx vue-tsc -b --noEmit`
- Backend unit tests: `cd backend && npm test` (vitest)
- Frontend unit tests: `cd frontend && npm test` (vitest)
- E2E: `npx playwright test` (defaults to `http://localhost:5180`, override via `E2E_BASE_URL`)

## Verification
- For frontend changes, use `cd frontend && npm run build` as the primary verification step.
- For backend changes, verify by running the server (`cd backend && npm start` or `npm run dev`) because there is no automated typecheck coverage there. `npm test` covers the middleware and a few model units.
- There is **no linter, formatter, GitHub Actions workflow, or pre-commit hook** in this repo.

## Architecture notes
- Backend routes are **auto-registered** from every `backend/controller/*.js` file. Each controller exports `{ prefix, mapping }`; `backend/server.js` loads them dynamically. There is no central router file to update. The remaining controllers are `setting.js`, `assistant.js` (assistant-list proxy), and `datasource.js`.
- The active PostgreSQL pool wrapper is `backend/config/db_pool.js`. `backend/config/database.js` also exists, but current models use `db_pool.js` instead.
- Frontend routing is in `frontend/src/router/index.ts` and uses **hash history** plus dynamic route registration based on the Pinia setting/user stores. The root path `/` redirects to `/setting/base-assistant`. Routes are gated on whether the basic/advanced assistant IDs are configured.
- Frontend API calls go through `frontend/src/utils/request.ts`, which injects the `lnkchatbi-embedded-token` header from client storage (demo-local login).
- The configuration pages (`#/setting/base-assistant` and `#/setting/advanced-assistant`) populate the assistant picker by calling the demo backend's `/api/assistant/list` endpoint, which proxies LnkChatBI's `GET /api/v1/system/assistant` with the operator-provided `access_token` (stored in the `setting` row). The token is copied out of LnkChatBI's browser localStorage (`user.token` key). This is a transitional path; LnkChatBI change proposal `add-embedded-assistant-listing-endpoint` will introduce a login-free Origin-bound listing endpoint that lets the demo drop `access_token` entirely.

## LnkChatBI integration contracts (must stay in sync with LnkChatBI source)
- Basic & advanced assistants both load `<LnkChatBI-domain>/assistant.js?id=<assistantId>`. The script registers `window.lnkchatbi_assistant_handler[id]` with methods: `setOnline / refresh / destroy / setHistory / createConversation`. The script-tag id prefix is `lnkchatbi-assistant-float-script-`.
- For the advanced assistant, LnkChatBI calls this demo's `GET /api/datasource/` with credentials converted from the assistant's `certificate` config (header / cookie / param). The response must be `{ code: 0|200, data: [...] }`. Code in `backend/controller/datasource.js`.
- AES (advanced assistant): AES-256-CBC + PKCS7, key = first 32 chars (pad with `\0`), IV = first 16 chars (pad with `\0`). Default IV in LnkChatBI is `lnkchatbi_em_aes_iv`. Encrypted fields: `host, user, password, dataBase, db_schema, schema, mode` (7 fields). Implementation in `backend/controller/datasource.js`. The IV constant name is `LNKCHATBI_SIMPLE_AES_IV`.
- The full-screen assistant views use iframe + `postMessage` handshake with event name `lnkchatbi_embedded_event` and iframe URL `<LnkChatBI-domain>/#/embeddedPage?id=<id>`.

## Environment and runtime quirks
- Backend env lives in `backend/.env` for local app settings. The checked-in `backend/.env.example` expects PostgreSQL on `localhost:5432` and sets `STATIC_DIR=../frontend/dist`.
- Frontend env files set API base URLs:
  - dev: `frontend/.env.development` → `VITE_API_BASE_URL=/api` (proxied by Vite)
  - prod: `frontend/.env.production` → `VITE_API_BASE_URL=./api`
- Default login password (demo-only) is `LnkChatBIDemo@123`, defined in `frontend/src/utils/entity.ts`. The e2e login test asserts this value.

## Data and startup behavior
- The backend requires PostgreSQL credentials from env on startup and exits on connection failure (`backend/config/db_pool.js`).
- Demo tables/settings are created and seeded from backend model code on startup/import, so schema/data behavior is partly driven by model side effects.
- The `setting` table only carries `domain`, `base_assistant_id`, `advanced_assistant_id`, `aes_enable`, `aes_key`, plus the JSON columns `base_assistant_config` and `advanced_assistant_config`. Older deployments may still have legacy `embedded_*` columns; they are unused and harmlessly ignored.

## Change guidance
- If you add a backend API, follow the existing controller auto-registration pattern instead of creating a new manual router layer.
- If you change how the assistant handshakes work, cross-check against LnkChatBI source: `frontend/public/assistant.js` and `frontend/src/views/embedded/*.vue` for the runtime contract, `backend/common/xpack_compat/crypto_first_party.py` for the AES contract, and `backend/apps/system/crud/assistant.py::AssistantOutDs.get_ds_from_api` for the datasource endpoint contract.
