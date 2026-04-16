# Interview Copilot — Desktop

Local-first desktop app for interview prep. BYOK (OpenAI / Anthropic). All data in SQLite on your device.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Stack

- Electron 33
- Vite + React 19 + TypeScript
- Tailwind CSS v4
- React Router v6
- better-sqlite3 (local DB)
- keytar (macOS Keychain for API keys)

## Architecture

- `electron/main` — Node process: DB, AI calls, filesystem
- `electron/preload` — contextBridge exposing typed `window.api`
- `src` — React renderer

Web version (legacy / live demo): `/Users/renan/Desktop/_ideas/interview-copilot`
