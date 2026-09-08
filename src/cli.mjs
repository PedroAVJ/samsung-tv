#!/usr/bin/env node
import { SamsungTvController } from "./controller.mjs";
import { discoverSamsungTvs } from "./discovery.mjs";
import { executeAction } from "./actions.mjs";
import { voiceStatus } from "./voice-status.mjs";

const [command, value] = process.argv.slice(2);
const controller = new SamsungTvController();

try {
  let result;
  if (command === "--help" || command === "help" || command === undefined) {
    process.stdout.write("Usage: samsung-tv discover|status|developer-status|voice-status|pair|key KEY_*|volume-up [n]|volume-down [n]|mute|home|back|input 1..4|power-off\n");
    process.exit(0);
  }
  if (command === "--version") { process.stdout.write("0.2.0\n"); process.exit(0); }
  if (command === "discover") result = await discoverSamsungTvs();
  else if (command === "status") result = await controller.status();
  else if (command === "developer-status") {
    const status = await controller.status();
    result = {
      host: status.host,
      developerMode: status.raw?.device?.developerMode === "1",
      developerIP: status.raw?.device?.developerIP || null,
    };
  }
  else if (command === "voice-status") result = await voiceStatus();
  else if (command === "pair") result = await controller.pair();
  else if (command === "key") result = await controller.sendKey(value);
  else if (command === "volume-up") result = await controller.volumeUp(value);
  else if (command === "volume-down") result = await controller.volumeDown(value);
  else if (command === "mute") result = await controller.toggleMute();
  else if (command === "home") result = await controller.home();
  else if (command === "back") result = await controller.back();
  else if (command === "input") result = await controller.switchInput(value);
  else if (command === "power-off") result = await controller.powerOff();
  else if (command === "action") result = await executeAction(controller, value, JSON.parse(process.argv[4] || "{}"));
  else throw new Error("Usage: samsung-tv discover|status|developer-status|voice-status|pair|key KEY_*|volume-up [n]|volume-down [n]|mute|home|back|input [n]|power-off");
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
