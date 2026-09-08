import WebSocket from "ws";
import { discoverSamsungTvs, inspectTv } from "./discovery.mjs";
import { readConfig, writeConfig } from "./config.mjs";

const APP_NAME = "Codex for TV";
const appName = Buffer.from(APP_NAME).toString("base64");

export class SamsungTvController {
  constructor({ host, timeout = 10000 } = {}) {
    this.host = host;
    this.timeout = timeout;
  }

  async resolveHost() {
    if (this.host) return this.host;
    const config = await readConfig();
    if (process.env.SAMSUNG_TV_HOST) return process.env.SAMSUNG_TV_HOST;
    if (config.host) {
      try { await inspectTv(config.host); return config.host; } catch (_) {}
    }
    const televisions = await discoverSamsungTvs();
    if (!televisions.length) throw new Error("No Samsung television was found on this network");
    if (televisions.length > 1) throw new Error("Multiple Samsung TVs were found; set SAMSUNG_TV_HOST or select a host in private configuration.");
    this.host = televisions[0].host;
    await writeConfig({ host: this.host, model: televisions[0].model });
    return this.host;
  }

  async status() {
    return inspectTv(await this.resolveHost());
  }

  async connect() {
    const host = await this.resolveHost();
    const config = await readConfig();
    const token = config.tokens?.[host];
    const query = new URLSearchParams({ name: appName });
    if (token) query.set("token", token);
    const url = `wss://${host}:8002/api/v2/channels/samsung.remote.control?${query}`;

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url, { rejectUnauthorized: false });
      const timer = setTimeout(() => {
        socket.terminate();
        reject(new Error("Timed out waiting for the TV. Accept the Codex remote prompt on-screen, then try again."));
      }, this.timeout);
      const fail = (error) => { clearTimeout(timer); reject(error); };
      socket.once("error", fail);
      socket.on("message", async (buffer) => {
        let message;
        try { message = JSON.parse(buffer.toString()); } catch (_) { return; }
        if (message.event === "ms.channel.unauthorized") {
          clearTimeout(timer);
          socket.close();
          reject(new Error("The television rejected the Codex remote connection"));
          return;
        }
        if (message.event === "ms.channel.connect") {
          clearTimeout(timer);
          const issuedToken = message.data?.token;
          if (issuedToken && issuedToken !== token) {
            await writeConfig({ ...config, host, tokens: { ...(config.tokens || {}), [host]: issuedToken } });
          }
          resolve(socket);
        }
      });
    });
  }

  async pair() {
    const socket = await this.connect();
    socket.close();
    return { ok: true, host: await this.resolveHost(), paired: true };
  }

  async sendKey(key, { command = "Click" } = {}) {
    if (!/^KEY_[A-Z0-9_]+$/.test(key)) throw new Error(`Invalid Samsung remote key: ${key}`);
    const socket = await this.connect();
    socket.send(JSON.stringify({
      method: "ms.remote.control",
      params: { Cmd: command, DataOfCmd: key, Option: "false", TypeOfRemote: "SendRemoteKey" },
    }));
    await new Promise((resolve) => setTimeout(resolve, 180));
    socket.close();
    return { ok: true, key };
  }

  async sendRepeated(key, steps = 1) {
    const count = Math.max(1, Math.min(20, Number(steps) || 1));
    const socket = await this.connect();
    for (let index = 0; index < count; index += 1) {
      socket.send(JSON.stringify({
        method: "ms.remote.control",
        params: { Cmd: "Click", DataOfCmd: key, Option: "false", TypeOfRemote: "SendRemoteKey" },
      }));
      await new Promise((resolve) => setTimeout(resolve, 110));
    }
    socket.close();
    return { ok: true, key, steps: count };
  }

  volumeUp(steps) { return this.sendRepeated("KEY_VOLUP", steps); }
  volumeDown(steps) { return this.sendRepeated("KEY_VOLDOWN", steps); }
  toggleMute() { return this.sendKey("KEY_MUTE"); }
  home() { return this.sendKey("KEY_HOME"); }
  back() { return this.sendKey("KEY_RETURN"); }
  powerOff() { return this.sendKey("KEY_POWEROFF"); }

  async switchInput(input) {
    const number = Number(input);
    if (!Number.isInteger(number) || number < 1 || number > 4) throw new Error("HDMI input must be an integer from 1 through 4.");
    return this.sendKey(`KEY_HDMI${number}`);
  }
}
