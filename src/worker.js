import { DurableObject } from "cloudflare:workers";

export class DelayedAssignment extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.storage = state.storage;
  }

  async schedule(userId, botId, nodeId, apiKey, delaySeconds) {
    await this.storage.put("userId", userId);
    await this.storage.put("botId", botId);
    await this.storage.put("nodeId", nodeId);
    await this.storage.put("apiKey", apiKey);
    await this.storage.setAlarm(Date.now() + delaySeconds * 1000);
    return { scheduled: true, fireAt: Date.now() + delaySeconds * 1000 };
  }

  async cancel() {
    await this.storage.deleteAlarm();
    return { cancelled: true };
  }

  async alarm() {
    const userId = await this.storage.get("userId");
    const botId = await this.storage.get("botId");
    const nodeId = await this.storage.get("nodeId");
    const apiKey = await this.storage.get("apiKey");

    const response = await fetch(`https://api.landbot.io/v1/customers/${userId}/assign_bot/${botId}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${apiKey}`
      },
      body: JSON.stringify({ launch: true, node: nodeId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Landbot assign failed: ${response.status} ${errorText}`);
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/trigger" && request.method === "POST") {
      const body = await request.json();
      const { conversationId, userId, botId, nodeId, apiKey, delaySeconds } = body;

      const id = env.DELAYED_ASSIGNMENT.idFromName(conversationId);
      const stub = env.DELAYED_ASSIGNMENT.get(id);
      const result = await stub.schedule(userId, botId, nodeId, apiKey, delaySeconds);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/cancel" && request.method === "POST") {
      const body = await request.json();
      const { conversationId } = body;

      const id = env.DELAYED_ASSIGNMENT.idFromName(conversationId);
      const stub = env.DELAYED_ASSIGNMENT.get(id);
      const result = await stub.cancel();

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};