#!/usr/bin/env node
import readline from "node:readline";
import { SamsungTvController } from "./controller.mjs";
import { discoverSamsungTvs } from "./discovery.mjs";
import { executeAction } from "./actions.mjs";
import { voiceStatus } from "./voice-status.mjs";

const controller = new SamsungTvController();
const tools = [
  tool("find_samsung_tvs", "Discover Samsung televisions on the local network and return model and power state.", {}),
  tool("samsung_tv_status", "Read the current Samsung TV identity and power state.", {}),
  tool("samsung_tv_developer_status", "Read whether Samsung Developer Mode is enabled and which computer IP is authorized.", {}),
  tool("codex_tv_voice_status", "Verify that the local Codex for TV voice gateway is running through OpenRouter.", {}),
  tool("pair_samsung_tv", "Pair Codex as a local Samsung remote. The television displays a one-time approval prompt.", {}),
  tool("samsung_tv_remote_key", "Send one Samsung remote key such as KEY_HOME or KEY_RETURN.", { key: { type: "string", pattern: "^KEY_[A-Z0-9_]+$" } }, ["key"]),
  tool("samsung_tv_volume_up", "Raise the TV volume by 1 to 20 steps.", { steps: integer(1, 20) }),
  tool("samsung_tv_volume_down", "Lower the TV volume by 1 to 20 steps.", { steps: integer(1, 20) }),
  tool("samsung_tv_toggle_mute", "Toggle TV mute.", {}),
  tool("samsung_tv_home", "Open Samsung Home.", {}),
  tool("samsung_tv_back", "Send the Back command.", {}),
  tool("samsung_tv_switch_input", "Switch directly to HDMI input 1 through 4 when supported by the TV.", { input: integer(1, 4) }, ["input"]),
  tool("samsung_tv_power_off", "Turn the television off.", {}),
];

function tool(name, description, properties, required = []) {
  return { name, description, inputSchema: { type: "object", properties, required, additionalProperties: false } };
}
function integer(minimum, maximum) { return { type: "integer", minimum, maximum }; }
function result(payload) { return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] }; }

async function callTool(name, args) {
  if (name === "find_samsung_tvs") return discoverSamsungTvs();
  if (name === "samsung_tv_status") return controller.status();
  if (name === "samsung_tv_developer_status") {
    const status = await controller.status();
    return {
      host: status.host,
      developerMode: status.raw?.device?.developerMode === "1",
      developerIP: status.raw?.device?.developerIP || null,
    };
  }
  if (name === "codex_tv_voice_status") return voiceStatus();
  const actions = {
    pair_samsung_tv: "pair_samsung_tv",
    samsung_tv_remote_key: "tv_remote_key",
    samsung_tv_volume_up: "tv_volume_up",
    samsung_tv_volume_down: "tv_volume_down",
    samsung_tv_toggle_mute: "tv_toggle_mute",
    samsung_tv_home: "tv_home",
    samsung_tv_back: "tv_back",
    samsung_tv_switch_input: "tv_switch_input",
    samsung_tv_power_off: "tv_power_off",
  };
  if (!actions[name]) throw new Error(`Unknown tool: ${name}`);
  return executeAction(controller, actions[name], args);
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", async (line) => {
  let request;
  try { request = JSON.parse(line); } catch (_) { return; }
  if (request.id === undefined || request.id === null) return;
  try {
    let value;
    if (request.method === "initialize") {
      value = { protocolVersion: request.params?.protocolVersion || "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "samsung-tv", version: "0.2.0" } };
    } else if (request.method === "ping") value = {};
    else if (request.method === "tools/list") value = { tools };
    else if (request.method === "tools/call") value = result(await callTool(request.params?.name, request.params?.arguments || {}));
    else throw Object.assign(new Error(`Method not found: ${request.method}`), { code: -32601 });
    process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, result: value })}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { code: error.code || -32000, message: error.message } })}\n`);
  }
});
