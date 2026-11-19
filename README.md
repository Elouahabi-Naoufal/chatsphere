# ChatSphere

Embeddable AI chatbot: one `<script>` tag on any site, a Node/Express backend that streams tokens over WebSocket, and a React dashboard to configure each bot.

Runs against a **local Ollama model** or **OpenRouter** (cloud), switchable per bot.

> Migrated from `naoufal-emsi/chatsphere` (school account). This is the working April 2026 version; the page-context iteration described in my later write-up is not in this repository yet — see [Roadmap](#roadmap).

---

## What is in the repo

```text
chatsphere/
├── backend/
│   ├── server.js          # Express REST API + WebSocket streaming
│   ├── package.json
│   └── configs.json       # bot configs, auto-created, gitignored
├── widget/
│   └── widget.js          # dependency-free embeddable widget
├── dashboard/
│   ├── index.html
│   └── src/
│       ├── App.jsx        # React admin: create/edit bots
│       ├── main.jsx
│       └── index.css
├── demo.html              # integration example
└── README.md
```

## How it works

```text
Client site
  └── <script src=".../widget/widget.js" data-bot-id="..." data-server="...">
          │  fetches bot config (name, colour, welcome message)
          │  opens WebSocket
          ▼
      Node/Express backend
          ├── loads the bot's system prompt + knowledge base
          ├── Ollama       (local, default)
          └── OpenRouter   (cloud, per-bot API key)
          │
          ▼
      tokens streamed back over the same socket
```

The backend stores bot configurations in `backend/configs.json` — a JSON file, no database. That file is gitignored because it can contain an OpenRouter key.

## Prerequisites

- Node.js 18+
- Either:
  - [Ollama](https://ollama.com) running locally, with a model pulled: `ollama pull llama3`
  - or an OpenRouter API key

## Run it

### 1. Backend

```bash
cd backend
npm install
npm run dev          # nodemon, or: npm start
# → http://localhost:3001
```

### 2. Dashboard

```bash
cd dashboard
npm install
npm run dev
# → http://localhost:5173
```

### 3. Create a bot

1. Open `http://localhost:5173`.
2. Create a bot: name, system prompt, welcome message, colour, model.
3. Choose the provider: `ollama` (local) or `openrouter` (paste the key).
4. Optionally attach a knowledge base as JSON — it is appended to the system prompt.
5. Save; the dashboard gives you a **Bot ID** and the embed snippet.

### 4. Embed it

```html
<script
  src="http://localhost:3001/widget/widget.js"
  data-bot-id="YOUR_BOT_ID"
  data-server="http://localhost:3001">
</script>
```

Place it before `</body>`. The widget renders a bubble in the bottom-right corner and streams answers into a chat panel.

### 5. Demo

Open `demo.html`, replace `YOUR_BOT_ID` with a real bot ID, and serve it over HTTP (not `file://`) so the widget can reach the backend.

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/config/:botId` | Public bot config used by the widget |
| `GET` | `/api/configs` | All configs (dashboard) |
| `POST` | `/api/config` | Create a bot |
| `PUT` | `/api/config/:botId` | Update a bot |
| `GET` | `/api/models` | Models available in local Ollama |
| `GET` | `/api/openrouter/models` | OpenRouter catalogue; `?free=true` filters free models |
| `POST` | `/api/chat` | One-shot, non-streaming reply |
| `WS` | `/` | `{type:"chat", botId, message, history}` → `chunk` / `done` / `error` |

## Security status

This is a development build, not a hardened deployment:

- No authentication on the dashboard or the config API.
- CORS is open (`app.use(cors())`).
- Bot IDs are public identifiers, not secrets.
- The OpenRouter key is stored server-side in `configs.json`; it must never be committed.
- A public bot has no rate limit or origin allow-list.

Before exposing it publicly: add auth, restrict CORS, add per-bot quotas/origin checks, and move the key to a secret store.

## Roadmap

- [ ] Page-aware context: send the host page's URL, title and visible text with each turn (the iteration described in the ChatSphere write-up; **not implemented here**).
- [ ] Authentication and multi-tenant isolation.
- [ ] Rate limiting and origin allow-list per bot.
- [ ] Conversation persistence and analytics.
- [ ] Tests: prompt assembly, socket protocol, provider adapter.
- [ ] Docker Compose for backend + dashboard + Ollama.

## Stack

Node.js · Express · `ws` · React · Vite · Ollama · OpenRouter

## Contact

Naoufal Elouahabi — [github.com/Elouahabi-Naoufal](https://github.com/Elouahabi-Naoufal)
