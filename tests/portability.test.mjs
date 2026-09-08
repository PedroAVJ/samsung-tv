import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import { SamsungTvController } from "../src/controller.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

async function isolated(callback) {
  const directory = await mkdtemp(path.join(root, ".test-tmp-"));
  const env = {
    ...process.env,
    SAMSUNG_TV_CONFIG_PATH: path.join(directory, "state.json"),
    SAMSUNG_TV_PREFERENCES_PATH: path.join(directory, "preferences.json"),
  };
  for (const key of ["SAMSUNG_TV_HOST", "SAMSUNG_TV_PREFERRED_INPUT", "MAC_MINI_HDMI", "SAMSUNG_TV_VOICE_URL"]) delete env[key];
  try { return await callback(directory, env); } finally { await rm(directory, { recursive: true, force: true }); }
}

function script(source, env) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", source], { cwd: root, env, encoding: "utf8", timeout: 4000 });
}

test("CLI help works through the relocated front door without touching a device", async () => {
  await isolated(async (directory, env) => {
    const result = spawnSync(path.join(root, "scripts/samsung-tv"), ["--help"], { cwd: directory, env, encoding: "utf8", timeout: 4000 });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage: samsung-tv/);
    await assert.rejects(stat(env.SAMSUNG_TV_CONFIG_PATH), { code: "ENOENT" });
  });
});

test("MCP initialize and tool discovery work without a device or authentication", async () => {
  await isolated(async (directory, env) => {
    const input = [
      { jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18" } },
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
    ].map(value => JSON.stringify(value)).join("\n") + "\n";
    const manifest = JSON.parse(await readFile(path.join(root, ".mcp.json"), "utf8"));
    const server = manifest.mcpServers["samsung-tv"];
    const result = spawnSync(server.command, server.args, { cwd: directory, env: { ...env, CLAUDE_PLUGIN_ROOT: root }, input, encoding: "utf8", timeout: 4000 });
    assert.equal(result.status, 0, result.stderr);
    const messages = result.stdout.trim().split("\n").map(line => JSON.parse(line));
    assert.equal(messages.find(value => value.id === 0).result.serverInfo.version, "0.2.1");
    const names = messages.find(value => value.id === 1).result.tools.map(tool => tool.name);
    assert.ok(names.includes("find_samsung_tvs"));
    assert.ok(names.includes("samsung_tv_power_off"));
    assert.ok(names.includes("codex_tv_voice_status"));
    await assert.rejects(stat(env.SAMSUNG_TV_CONFIG_PATH), { code: "ENOENT" });
  });
});

test("unconfigured shortcuts fail before any remote command", async () => {
  await isolated(async (_directory, env) => {
    const result = script(`import { executeAction } from './src/actions.mjs';
      await executeAction({ switchInput() { throw new Error('REMOTE_COMMAND_SENT'); } }, 'tv_switch_to_mac_mini');`, env);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Configure a preferred HDMI input/);
    assert.doesNotMatch(result.stderr, /REMOTE_COMMAND_SENT/);
  });
});

test("private preferences preserve an explicitly configured shortcut", async () => {
  await isolated(async (_directory, env) => {
    await writeFile(env.SAMSUNG_TV_PREFERENCES_PATH, JSON.stringify({ preferredInput: 3 }));
    const result = script(`import { executeAction } from './src/actions.mjs';
      console.log(JSON.stringify(await executeAction({ switchInput(input) { return { input }; } }, 'tv_switch_to_mac_mini')));`, env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { input: 3 });
  });
});

test("invalid HDMI inputs fail before a remote key is sent", async () => {
  const controller = new SamsungTvController();
  const keys = [];
  controller.sendKey = async key => { keys.push(key); return { key }; };
  for (const value of [undefined, null, "", 0, 5, 1.5, "invalid"]) await assert.rejects(controller.switchInput(value), /HDMI input/);
  assert.deepEqual(keys, []);
  await controller.switchInput(2);
  assert.deepEqual(keys, ["KEY_HDMI2"]);
});

test("private state writes stay at the selected path and preserve existing tokens", async () => {
  await isolated(async (_directory, env) => {
    await writeFile(env.SAMSUNG_TV_CONFIG_PATH, JSON.stringify({ tokens: { "example-tv": "test-token" } }));
    const result = script(`import { writeConfig } from './src/config.mjs'; await writeConfig({ host: 'example-tv' });`, env);
    assert.equal(result.status, 0, result.stderr);
    const value = JSON.parse(await readFile(env.SAMSUNG_TV_CONFIG_PATH, "utf8"));
    assert.equal(value.tokens["example-tv"], "test-token");
    assert.equal(value.host, "example-tv");
    assert.equal((await stat(env.SAMSUNG_TV_CONFIG_PATH)).mode & 0o777, 0o600);
    assert.equal(result.stdout, "");
  });
});

test("voice status uses configured service and returns only bounded metadata", async () => {
  await isolated(async (_directory, env) => {
    await writeFile(env.SAMSUNG_TV_PREFERENCES_PATH, JSON.stringify({ voiceGatewayUrl: "http://example-gateway:8787" }));
    const result = script(`import { voiceStatus } from './src/voice-status.mjs';
      console.log(JSON.stringify(await voiceStatus(async url => ({ ok: true, json: async () => ({ ok: true, provider: 'openrouter', credential: { configured: true, token: 'not-for-output' }, apiKey: 'not-for-output' }) }))));`, env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { ok: true, provider: "openrouter", credential: { configured: true } });
    assert.doesNotMatch(result.stdout, /not-for-output/);
  });
});
