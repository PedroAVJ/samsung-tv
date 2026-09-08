import dgram from "node:dgram";

const SSDP_HOST = "239.255.255.250";
const SSDP_PORT = 1900;

function parseSsdp(message) {
  const headers = {};
  for (const line of message.toString().split(/\r?\n/).slice(1)) {
    const separator = line.indexOf(":");
    if (separator > 0) headers[line.slice(0, separator).toLowerCase()] = line.slice(separator + 1).trim();
  }
  return headers;
}

export async function inspectTv(host, fetchImpl = fetch) {
  const response = await fetchImpl(`http://${host}:8001/api/v2/`, { signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error(`Samsung TV at ${host} returned ${response.status}`);
  const payload = await response.json();
  return {
    host,
    name: payload.device?.name || payload.name || "Samsung TV",
    model: payload.device?.modelName || null,
    modelFamily: payload.device?.model || null,
    os: payload.device?.OS || "Tizen",
    version: payload.device?.firmwareVersion || null,
    poweredOn: payload.device?.PowerState === "on",
    raw: payload,
  };
}

export async function discoverSamsungTvs({ timeout = 1800, fetchImpl = fetch } = {}) {
  const explicitHost = process.env.SAMSUNG_TV_HOST;
  if (explicitHost) return [await inspectTv(explicitHost, fetchImpl)];

  const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  const locations = new Set();
  const query = Buffer.from([
    "M-SEARCH * HTTP/1.1",
    `HOST: ${SSDP_HOST}:${SSDP_PORT}`,
    'MAN: "ssdp:discover"',
    "MX: 1",
    "ST: ssdp:all",
    "",
    "",
  ].join("\r\n"));

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.close();
      resolve();
    }, timeout);
    socket.on("error", (error) => {
      clearTimeout(timer);
      try { socket.close(); } catch (_) {}
      reject(error);
    });
    socket.on("message", (message) => {
      const headers = parseSsdp(message);
      if (/samsung|tizen/i.test(message.toString()) && headers.location) locations.add(headers.location);
    });
    socket.bind(() => socket.send(query, SSDP_PORT, SSDP_HOST));
  });

  const hosts = [...locations].map((location) => {
    try { return new URL(location).hostname; } catch (_) { return null; }
  }).filter(Boolean);
  const inspected = await Promise.allSettled([...new Set(hosts)].map((host) => inspectTv(host, fetchImpl)));
  return inspected.filter((item) => item.status === "fulfilled").map((item) => item.value);
}
