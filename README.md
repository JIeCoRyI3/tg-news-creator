# TG News Creator

This project provides a simple Node.js server and React client that aggregate worldwide news from several open RSS feeds. News are streamed to the client in real time via Server Sent Events (SSE).

## Available Sources
- BBC
- CNN
- Reuters
- The Guardian
- Al Jazeera
- Kyiv Independent
- Kyiv Post
- UNIAN
- Ukrainska Pravda
- Ukrinform
- RFE/RL
- RBC Ukraine
- Suspilne
- Sky News
- Fox News
- Hromadske
- Telegram Channel

## Getting Started

Install dependencies for both server and client:

```bash
npm run install-all
```

### Run both server and client

```bash
npm start
```
The server listens on **http://localhost:3001** and exposes an SSE endpoint `/api/news?sources=source1,source2` streaming JSON objects. Swagger documentation is available at `/docs`.

The React UI will open on **http://localhost:3000**.

Select news sources and press **Start** to start the live stream of headlines.

### Telegram Bot

The `bot` folder contains a simple Telegram bot that can stream the same news
directly to a chat. Create a `.env` file inside the folder using the provided
`.env.sample` and run it together with the server and client via:

```bash
npm run install-all
npm start
```

Bot commands:

- `/connect` – connect to the server
- `/show-news` – ask for permission and start sending news
- `/stop` – stop sending news
- `/disconnect` – close the connection

The bot automatically subscribes to all available sources and will send a short
status message every 30 seconds if no new headlines arrive.

### Telegram Setup

To enable Telegram channel fetching without using a bot, create a `.env` file
inside the `server` directory with these variables:

```bash
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION=your_session_string
# Optionally provide a default channel
TELEGRAM_CHANNEL=@your_channel
TG_INTEGRATION_FF=true
```

For the React client, create a `.env` inside the `client` directory with:

```bash
VITE_TG_INTEGRATION_FF=true
```

Set the value to `false` to completely disable Telegram integration in both the server and UI.

Generate `TELEGRAM_SESSION` by running:

```bash
node login-telegram.js
```
and following the interactive prompts. The script will output a session string
to paste into the `.env` file.

Once the server is running you can add additional Telegram channels from the UI
by pasting the channel link into the input above the sources table. The channel
name will be resolved automatically and added as a selectable source.
