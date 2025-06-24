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

## Getting Started

Install dependencies for both server and client:

```bash
npm run install-all
```

### Run both server and client

```bash
npm start
```
The server listens on **http://localhost:3001** and exposes an SSE endpoint `/api/news?sources=source1,source2&history=true` streaming JSON objects. Set `history=false` to skip the initial batch of two recent items from each source. Swagger documentation is available at `/docs`.

The React UI will open on **http://localhost:3000**.

Select news sources and use **Start Getting** to display the live stream of headlines.
You can also select Telegram channels and click **Start Posting** to forward all
new items directly to Telegram. Press **Stop** to close the connection and halt
posting.
Use the **Filters** tab to manage Custom GPTs that score posts before posting.

### Telegram Bot Setup

Create a `.env` file inside the `server` directory containing your bot token:

```bash
BOT_TOKEN=your_bot_token
OPENAI_API_KEY=your_openai_key
```

Put the Telegram channel links you want to post to in `server/admin-channels.json`:

```json
["https://t.me/mychannel"]
```

On startup the bot resolves these links to channel IDs and rewrites the file with the channel information. It also keeps track of channels where it gains administrator rights. The React client loads this list so you can choose where to post news.

### POST `/api/post`

Send messages or media to a Telegram channel. The endpoint accepts a JSON body:

```json
{
  "channel": "<channel id>",
  "text": "optional caption or message",
  "media": "optional https url to an image or video"
}
```

When `media` is provided, the server sends a photo or video to the channel. If
the URL ends with `.mp4` a video is sent, otherwise a photo. When only `text` is
present it falls back to a regular message.
