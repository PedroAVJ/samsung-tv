#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readConfig } from "./config.mjs";

if (process.platform !== "darwin" || !process.stdin.isTTY || !process.stdout.isTTY) {
  console.error("Run this optional Keychain setup directly in an interactive macOS Terminal.");
  process.exit(1);
}
const config = await readConfig();
const service = process.env.SAMSUNG_TV_OPENROUTER_KEYCHAIN_SERVICE || config.openrouterKeychainService;
if (!service) {
  console.error("Configure the existing gateway's Keychain service through SAMSUNG_TV_OPENROUTER_KEYCHAIN_SERVICE or private preferences first.");
  process.exit(1);
}
console.log("The system will prompt for the OpenRouter key directly. Never paste it into assistant chat.");
// Keep -w last: macOS prompts natively; no secret is read by Node or passed in argv.
const child = spawn("/usr/bin/security", ["add-generic-password", "-U", "-a", "api-key", "-s", service, "-l", "Samsung TV OpenRouter API key", "-w"], { stdio: "inherit" });
child.on("error", () => { console.error("Could not open the native Keychain setup command."); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
