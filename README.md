# SMS Hub

A personal-use React app for managing temporary SMS phone numbers using Twilio. Built with a mobile-first, PWA-enabled interface inspired by Hushed.

## Features

- **Provision temporary phone numbers** from Twilio (defaults to Australian numbers, supports US, GB, CA, NZ)
- **Send and receive SMS** through a native-feeling chat interface
- **Conversation management** with contact labeling and unread indicators
- **PWA support** — install on your phone's home screen for a native app experience
- **Real-time polling** for incoming messages
- **SQLite database** for local message storage

## Tech Stack

- **Frontend**: React + TypeScript, Vite, Tailwind CSS v4, shadcn/ui, React Router, TanStack Query
- **Backend**: Express.js, SQLite (better-sqlite3), Twilio SDK
- **PWA**: Service worker with offline shell support

## Setup

### Prerequisites

- Node.js 18+
- A [Twilio account](https://www.twilio.com/) with Account SID and Auth Token

### Environment Variables

Copy the example env file in the server directory:

```bash
cp server/.env.example server/.env
```

Fill in your Twilio credentials:

```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
WEBHOOK_BASE_URL=https://your-server.ngrok.io
PORT=3001
```

The `WEBHOOK_BASE_URL` is needed so Twilio can forward incoming SMS to your server. Use [ngrok](https://ngrok.com/) for local development.

### Install & Run

```bash
# Install all dependencies
npm install
cd client && npm install
cd ../server && npm install
cd ..

# Run both client and server in development
npm run dev
```

The client runs on `http://localhost:5173` and proxies API requests to the server on port 3001.

### Production Build

```bash
npm run build    # Builds the client
npm start        # Starts the server (serves client build + API)
```

## Incoming SMS Webhook

For Twilio to deliver incoming SMS to your app, set up a public URL pointing to your server. During development, use ngrok:

```bash
ngrok http 3001
```

Then set `WEBHOOK_BASE_URL` in your `.env` to the ngrok URL. The app automatically configures new numbers to use `{WEBHOOK_BASE_URL}/api/webhooks/incoming-sms` as their SMS webhook.
