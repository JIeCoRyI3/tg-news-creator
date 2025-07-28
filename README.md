# TG News Creator

This project provides a simple Node.js server and React client that scrape Telegram channels. Posts are streamed to the client in real time via Server Sent Events (SSE).

## Getting Started

Install dependencies for both server and client:

```bash
npm run install-all
```

### Run both server and client

```bash
npm start
```
The server listens on **http://localhost:3001** and exposes an SSE endpoint `/api/tgnews?urls=channel1,channel2&history=true` streaming JSON objects. Set `history=false` to skip the initial batch when connecting. Swagger documentation is available at `/docs`.

The React UI will open on **http://localhost:3000**.

Use the **TG Scraping** tab to add Telegram channels and view posts in real time. You can also click **Start Posting** to forward items to your own channels. Press **Stop** to halt posting. Use the **Filters** tab to manage Custom GPTs that score posts before posting.

### Telegram Bot Setup

Create a `.env` file inside the `server` directory containing your bot token:

```bash
BOT_TOKEN=your_bot_token
OPENAI_API_KEY=your_openai_key
```

The server always loads this `server/.env` file so it works even when started
from the project root.

Channel and configuration data is stored in a small SQLite database under
`server/data.db`. Use the **Import data** button on the Users page to upload
your old `*.json` files and store them for the `root` user. Admin channels can
also be added by inviting the bot as an administrator.

On startup the bot resolves these links to channel IDs and rewrites the file with the channel information. It also keeps track of channels where it gains administrator rights. The React client loads this list so you can choose where to post news.

To receive post approval requests, approvers must first start a private chat with
the bot and run the `/start_approving` command. The bot checks if their
**username** is listed in `server/approvers.json` and, when matched, approval
messages are sent to that chat.

### POST `/api/post`

Send messages or media to a Telegram channel. The endpoint accepts a JSON body:

```json
{
  "channel": "<channel id>",
  "text": "optional caption or message",
  "media": "optional https url to an image or video"
}
```

At least one approver must have started `/start_approving`.
Otherwise the endpoint responds with `{ "error": "no active approvers" }` and
nothing is posted.

When `media` is provided, the server sends a photo or video to the channel. If
the URL ends with `.mp4` a video is sent, otherwise a photo. When only `text` is
present it falls back to a regular message.

### OpenAI Filters

You can create filters that rely on OpenAI models to score news before posting. The server now uses the official `openai` SDK and respects the `http_proxy`/`https_proxy` environment variables. Filters are created using the `/api/filters` endpoint which wraps the OpenAI Assistants API. A valid `OPENAI_API_KEY` must be present in `server/.env`.

Use `/api/models` to fetch the list of models available for your key. Pick a model from this list (for example `gpt-4o` or `gpt-3.5-turbo`). Supplying an unknown model will result in a `400` error from the OpenAI API.

If a filter creation fails the server now returns the full error message from
OpenAI which can help diagnose issues such as an invalid model name.

```bash
# create a filter with curl
curl -F title=News -F model=gpt-4o \
     -F instructions=@instructions.txt \
     http://localhost:3001/api/filters
```

Upload files first using the `/api/vector-stores` endpoint which creates a vector store. Pass the returned `vector_store_id` when creating the filter. When creation succeeds the API returns the filter id which can later be used to evaluate posts via `/api/filters/<id>/evaluate`.

### Image generation settings

The Administration tab lets you pick the image model, quality, and resolution. The available quality levels are **low**, **medium**, and **high** while the supported resolutions are **1024×1024**, **1024×1536**, and **1536×1024**. These options match the [OpenAI image API documentation](https://platform.openai.com/docs/api-reference/images/create).

Additional knowledge can be added later using `/api/filters/<id>/files`:

```bash
curl -F attachments=@notes.txt \
    http://localhost:3001/api/filters/<id>/files
```

### Database viewer

Run `npm run database-vis` to launch a small server showing the current
contents of `server/data.db` at <http://localhost:4000>.

## Sharing your local server

You can quickly share the app while your laptop is running using [localtunnel](https://github.com/localtunnel/localtunnel).
Run `npm run share` and keep the terminal open. The command builds the React client, starts the Node server and prints a temporary public URL.
If the `lt` command is not recognized or prints unreadable text, make sure the project dependencies are installed with `npm run install-all`. You can also start the tunnel manually via `npx localtunnel --port 3001`.
Open the printed URL on your phone to test the app.

