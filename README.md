# TG News Creator

This project provides a simple Node.js server and React client that aggregate worldwide news from several open RSS feeds.

## Available Sources
- BBC
- CNN
- Reuters
- The Guardian
- Al Jazeera

## Getting Started

Install dependencies for both server and client:

```bash
cd server && npm install
cd ../client && npm install
```

### Run the server

```bash
npm start --prefix ../server
```
The server listens on **http://localhost:3001** and exposes `/api/news?sources=source1,source2` returning JSON.

### Run the client

```bash
npm run dev --prefix ../client
```
The React UI will open on **http://localhost:3000**.

Select news sources and press **Start** to load headlines.
