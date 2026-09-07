# trigger-event

A Cloudflare Worker that schedules delayed Landbot bot assignments using Durable Objects. When triggered via the `/trigger` endpoint, it stores the conversation details and sets an alarm for the specified delay (minutes, hours, days, or weeks). When the alarm fires, it calls the Landbot assign API to route the customer to the specified bot and node. Pending assignments can be cancelled at any time via the `/cancel` endpoint using the same `conversationId`.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/YOUR_USERNAME/YOUR_REPO)

## Setup

After deploying, no secrets need to be configured in the Cloudflare dashboard. The `apiKey` is passed per request in the request body, so each call can use whichever Landbot API key is appropriate.

## API Reference

### POST `/trigger`

Schedule a delayed bot assignment.

**Request body:**

```json
{
  "conversationId": "12345",
  "userId": "67890",
  "botId": "111",
  "nodeId": "222",
  "apiKey": "your-landbot-api-key",
  "delaySeconds": 86400
}
```

| Field            | Type   | Description                                                                 |
|------------------|--------|-----------------------------------------------------------------------------|
| `conversationId` | string | Landbot conversation ID (`message.customer.conversation_id` from webhook)   |
| `userId`         | string | Landbot customer ID to assign                                               |
| `botId`          | string | ID of the bot to assign the customer to                                     |
| `nodeId`         | string | Node within the bot to start from                                           |
| `apiKey`         | string | Landbot API token                                                           |
| `delaySeconds`   | number | Seconds to wait before triggering the assignment                            |

**Response:**

```json
{
  "scheduled": true,
  "fireAt": 1234567890000
}
```

---

### POST `/cancel`

Cancel a pending bot assignment.

**Request body:**

```json
{
  "conversationId": "12345"
}
```

**Response:**

```json
{
  "cancelled": true
}
```
