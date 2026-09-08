import { DurableObject } from "cloudflare:workers";

export class DelayedAssignment extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.storage = state.storage;
    this.env = env;
  }

  async schedule(userId, botId, nodeId, delaySeconds, timestamp) {
    const fireAt = timestamp ?? Date.now() + delaySeconds * 1000;

    // Future: replace single alarm with multi-alarm sequence
    // const now = Date.now();
    // const twoHours = now + (2 * 60 * 60 * 1000);
    // const twentyFourHours = now + (24 * 60 * 60 * 1000);
    // const oneMonthFromNow = new Date();
    // oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    // const threeMonthsFromNow = new Date();
    // threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    // const alarms = [twoHours, twentyFourHours, oneMonthFromNow.getTime(), threeMonthsFromNow.getTime()].filter(t => t > now);

    await this.storage.put("userId", userId);
    await this.storage.put("botId", botId);
    await this.storage.put("nodeId", nodeId);
    await this.storage.put("alarms", JSON.stringify([fireAt]));
    await this.storage.setAlarm(fireAt);

    return { scheduled: true, alarms: [fireAt] };
  }

  async cancel() {
    await this.storage.deleteAlarm();
    return { cancelled: true };
  }

  async status() {
    const alarms = await this.storage.get("alarms");
    const nextAlarm = await this.storage.getAlarm();
    return {
      alarms: alarms ? JSON.parse(alarms) : [],
      nextAlarm
    };
  }

  async alarm() {
    const userId = await this.storage.get("userId");
    const botId = await this.storage.get("botId");
    const nodeId = await this.storage.get("nodeId");

    const response = await fetch(`https://api.landbot.io/v1/customers/${userId}/assign_bot/${botId}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${this.env.LANDBOT_TOKEN}`
      },
      body: JSON.stringify({ launch: true, node: nodeId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Landbot assign failed: ${response.status} ${errorText}`);
    }

    // Future: chain to next alarm in sequence
    // const alarms = JSON.parse(await this.storage.get("alarms"));
    // const now = Date.now();
    // const nextAlarm = alarms.find(t => t > now);
    // if (nextAlarm) {
    //   await this.storage.setAlarm(nextAlarm);
    // }
  }
}

export default {
  async fetch(request, env) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Token ${env.LANDBOT_TOKEN}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);

    if (url.pathname === "/trigger" && request.method === "POST") {
      const body = await request.json();
      const { conversationId, userId, botId, nodeId, delaySeconds, timestamp } = body;

      const id = env.DELAYED_ASSIGNMENT.idFromName(conversationId);
      const stub = env.DELAYED_ASSIGNMENT.get(id);
      const result = await stub.schedule(userId, botId, nodeId, delaySeconds, timestamp);

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

    if (url.pathname === "/status" && request.method === "GET") {
      const conversationId = url.searchParams.get("conversationId");

      const id = env.DELAYED_ASSIGNMENT.idFromName(conversationId);
      const stub = env.DELAYED_ASSIGNMENT.get(id);
      const result = await stub.status();

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
