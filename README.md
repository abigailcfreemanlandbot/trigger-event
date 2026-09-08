# trigger-event

A Cloudflare Worker that schedules delayed Landbot bot assignments using Durable Objects. When `/trigger` is called, it sets a single alarm either at a specified delay or a specific unix timestamp. When the alarm fires, it calls the Landbot assign API to route the customer to the specified bot and node. Pending alarms can be checked via `/status` and cancelled at any time via `/cancel`.

## Setup

1. Clone the repo
   ```bash
   git clone https://github.com/abigailcfreemanlandbot/trigger-event.git
   cd trigger-event
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Deploy to Cloudflare
   ```bash
   npm run deploy
   ```
4. Go to **Cloudflare dashboard → Workers → trigger-event → Settings → Variables and Secrets**
5. Add a secret named `LANDBOT_TOKEN` with your raw Landbot API token as the value (e.g. `xxxxxxx`, without the `Token ` prefix)

| Secret name | What it is |
|---|---|
| `LANDBOT_TOKEN` | Your raw Landbot API token (without the `Token ` prefix) |

## Security model

`LANDBOT_TOKEN` serves two purposes: it authenticates incoming requests to the Worker (callers must include it in the `Authorization` header), and it's used by the Worker to authenticate outbound calls to the Landbot API when alarms fire. The token is never passed in request bodies, never stored in Durable Object storage, and never appears in logs.

## API reference

All requests require the header:

```
Authorization: Token xxxxxxx
```

### POST /trigger

Schedule a bot assignment. Pass either `delaySeconds` (relative) or `timestamp` (absolute unix ms). If both are provided, `timestamp` takes precedence.

**Request body (relative delay):**
```json
{
  "conversationId": "abc123",
  "userId": "456",
  "botId": "789",
  "nodeId": "B_xxx",
  "delaySeconds": 120
}
```

**Request body (specific timestamp):**
```json
{
  "conversationId": "abc123",
  "userId": "456",
  "botId": "789",
  "nodeId": "B_xxx",
  "timestamp": 1234567890000
}
```

**Response:**
```json
{
  "scheduled": true,
  "alarms": [1234567890000]
}
```

### GET /status

Check the pending alarm for a conversation.

```
GET /status?conversationId=abc123
```

**Response:**
```json
{
  "alarms": [1234567890000],
  "nextAlarm": 1234567890000
}
```

`nextAlarm` is `null` if the alarm has already fired or been cancelled.

### POST /cancel

Cancel the pending alarm for a conversation.

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
