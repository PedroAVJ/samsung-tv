# Samsung TV

A portable CLI and MCP server for discovering, pairing with, and controlling a
Samsung Tizen TV on your local network. Install `samsung-tv@package-manager` in
Codex or Claude. Node.js 20+, npm, and a POSIX shell (macOS or Linux) are required. The launcher installs the
lockfile-pinned `ws` dependency when needed; no device is contacted during
startup or tool discovery.

```bash
./scripts/samsung-tv --help
./scripts/samsung-tv discover
./scripts/samsung-tv status
```

Choose the intended device with `SAMSUNG_TV_HOST` or private state before a
mutation. Pairing prompts once on the television. Remote commands require the
user's request; HDMI input is explicit and ranges from 1 through 4. The
on-screen pairing name remains “Codex for TV” for compatibility.

## Private configuration

Pairing state remains at `~/.config/codex-tv/samsung-tv.json`, or
`SAMSUNG_TV_CONFIG_PATH`, with restrictive file permissions. This location is
retained so existing device authorization continues to work. Keep its host and
tokens outside Git. The plugin never bundles device state.

Optional preferences live at `~/.config/samsung-tv/preferences.json`, or
`SAMSUNG_TV_PREFERENCES_PATH`. Supported non-secret fields are `preferredInput`,
`voiceGatewayUrl`, and `openrouterKeychainService`. `SAMSUNG_TV_PREFERRED_INPUT`
overrides the stored shortcut; the legacy `MAC_MINI_HDMI` override is also
recognized. No computer name, device address, or HDMI default is shipped.

The optional `voice-status` command checks an existing external OpenRouter
gateway through `SAMSUNG_TV_VOICE_URL` or `voiceGatewayUrl`. It does not start a
voice server or install a Tizen application. The optional Keychain setup helper
uses the selected service and a native hidden Terminal prompt; it never asks
for a key through the assistant. It requires macOS and an interactive Terminal.
Do not change the gateway's existing credential identity merely to install this
plugin.

## Validate

Run `npm ci --ignore-scripts` and `npm test`. Tests use fake controllers,
temporary private paths, and MCP initialization/tool discovery only. They do
not discover a physical device, pair, change TV state, or access credentials.

The first-party code and original SVG icon are MIT licensed. See
`PROVENANCE.md`, `ICON-SOURCES.md`, and `THIRD-PARTY-NOTICES.md`. Samsung is a
vendor name; this plugin contains no Samsung logo or private screenshots.
