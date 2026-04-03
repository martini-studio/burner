# Burner

A fully client-side React PWA for managing temporary SMS phone numbers using Twilio. No backend server required — all data is persisted locally in your browser using IndexedDB, and Twilio API calls are made directly from the client.

## Features

- **Provision temporary phone numbers** from Twilio (defaults to Australian numbers, supports US, GB, CA, NZ)
- **Send and receive SMS** through a native-feeling chat interface
- **Conversation management** with contact labeling and unread indicators
- **Settings page** to configure Twilio credentials (stored locally, never leaves your browser)
- **Automatic message polling** — checks Twilio for incoming messages on a configurable interval
- **PWA support** — install on your phone's home screen for a native app experience
- **IndexedDB persistence** via Dexie.js — robust local storage that survives browser restarts
- **Dark mode** following system preference

## Tech Stack

- **Frontend**: React + TypeScript, Vite, Tailwind CSS v4, shadcn/ui
- **Routing**: React Router
- **State**: TanStack Query (cache + polling)
- **Storage**: IndexedDB via Dexie.js
- **SMS**: Twilio REST API (called directly from the browser)

## Setup

### Prerequisites

- Node.js 18+
- A [Twilio account](https://www.twilio.com/) with Account SID and Auth Token

### Install & Run

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`, go to **Settings**, and enter your Twilio Account SID and Auth Token. Then start provisioning numbers and sending messages.

### Production Build

```bash
cd client
npm run build
npm run preview
```

The `dist/` folder can be deployed to any static hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

## How It Works

1. **Credentials** — Your Twilio Account SID and Auth Token are stored in `localStorage`. They are used to authenticate directly against the Twilio REST API from your browser.

2. **Data Storage** — All numbers, conversations, and messages are stored in IndexedDB (via Dexie.js). This is a real database in your browser with indexed queries, and persists across sessions.

3. **Sending Messages** — When you send an SMS, the app calls the Twilio Messages API directly using your credentials.

4. **Receiving Messages** — The app polls the Twilio Messages API on a configurable interval to check for new incoming messages and stores them locally.

## Security Note

This is a personal-use app. Your Twilio credentials are stored in your browser's local storage and used to make authenticated API calls to Twilio directly. Do not use this on shared or public computers.
