import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Keep the original private pairing-state location for existing installations.
const configFile = path.resolve(process.env.SAMSUNG_TV_CONFIG_PATH || path.join(os.homedir(), ".config", "codex-tv", "samsung-tv.json"));
const preferencesFile = path.resolve(process.env.SAMSUNG_TV_PREFERENCES_PATH || path.join(os.homedir(), ".config", "samsung-tv", "preferences.json"));

async function readObject(file) {
  try {
    const result = JSON.parse(await readFile(file, "utf8"));
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("Expected a JSON object");
    return result;
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new Error("Samsung TV configuration is invalid; review the configured private file.");
  }
}

export async function readConfig() {
  return { ...await readObject(preferencesFile), ...await readObject(configFile) };
}

export async function writeConfig(update) {
  const next = { ...await readObject(configFile), ...update };
  await mkdir(path.dirname(configFile), { recursive: true, mode: 0o700 });
  await writeFile(configFile, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  await chmod(configFile, 0o600);
  return next;
}

export { configFile, preferencesFile };
