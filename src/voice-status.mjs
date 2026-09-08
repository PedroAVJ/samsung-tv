import { readConfig } from "./config.mjs";

export async function voiceStatus(fetchImpl = fetch) {
  const config = await readConfig();
  const base = process.env.SAMSUNG_TV_VOICE_URL || config.voiceGatewayUrl;
  if (!base) throw new Error("Configure SAMSUNG_TV_VOICE_URL or voiceGatewayUrl for an existing external OpenRouter gateway.");
  const url = new URL("health", `${String(base).replace(/\/$/, "")}/`);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Voice gateway URL must use HTTP(S) without embedded credentials.");
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error(`Voice gateway returned HTTP ${response.status}.`);
  const status = await response.json();
  if (status.provider !== "openrouter") throw new Error("The configured voice gateway did not report the required OpenRouter provider.");
  return {
    ok: status.ok === true,
    provider: "openrouter",
    ...(typeof status.service === "string" ? { service: status.service } : {}),
    ...(typeof status.model === "string" ? { model: status.model } : {}),
    ...(status.credential && typeof status.credential.configured === "boolean" ? { credential: { configured: status.credential.configured } } : {}),
  };
}
