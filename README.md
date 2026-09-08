# trigger-event

A Cloudflare Worker that schedules delayed Landbot bot assignments using Durable Objects. When `/trigger` is called with a `conversationId`, `userId`, `botId`, and `nodeId`, the Worker schedules four outbound calls to the Landbot assign API — at 2 hours, 24 hours, 1 month, and 3 months from the moment the request is received. Each alarm fires in sequence, calling `PUT /v1/customers/{userId}/assign_bot/{botId}/` on the Landbot API. Pending alarms for a conversation can be cancelled at any time via `/cancel`.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/YOUR_USERNAME/YOUR_REPO)

## Setup

One secret is required:

| Secret name | What it is | Where to set it |
|---|---|---|
| `LANDBOT_TOKEN` | Your raw Landbot API token (e.g. `xxxxxxx`, without the `Token ` prefix) | Cloudflare dashboard → Worker → Settings → Variables and Secrets |

## Security model

`LANDBOT_TOKEN` serves two purposes: it authenticates incoming requests to the Worker (callers must include it in the `Authorization` header), and it's used by the Worker to authenticate outbound calls to the Landbot API when alarms fire. The token is never passed in request bodies, never stored in Durable Object storage, and never appears in logs.

## API reference

All requests require the header:

```
Authorization: Token xxxxxxx
```

### POST /trigger

Schedule bot assignment alarms for a conversation.

**Request body:**
```json
{
  "conversationId": "abc123",
  "userId": "456",
  "botId": "789",
  "nodeId": "B_xxx"
}
```

**Response:**
```json
{
  "scheduled": true,
  "alarms": [1234567890000, 1234654290000, 1237246290000, 1242430290000]
}
```

### POST /cancel

Cancel all pending alarms for a conversation.

**Request body:**
```json
{
  "conversationId": "abc123"
}
```

**Response:**
```json
{
  "cancelled": true
}
```
