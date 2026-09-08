---
name: control-samsung-tv
description: Discover, inspect, pair, and control a selected Samsung Tizen television with local-network tools. Use for TV status, volume, mute, navigation, inputs, or power. Device selection and input shortcuts come from the user's private configuration.
---

# Control Samsung TV

Use the installed Samsung TV MCP tools, or the bundled `scripts/samsung-tv` CLI.
The package needs Node.js 20+, npm, and a POSIX shell. Its launcher installs only the pinned
runtime dependency when missing; starting the MCP server does not discover,
pair with, or operate a television.

- Start with `find_samsung_tvs` or `samsung_tv_status` when the target is not
  established. If multiple TVs are found, resolve the user's intended TV before
  a command; select it with `SAMSUNG_TV_HOST` or private configuration.
- Pairing displays a one-time approval prompt on the selected television.
  Explain that effect and run it only within an explicit pairing request. Keep
  the stable on-screen name “Codex for TV” for existing device authorization.
- Volume, mute, Home, Back, and explicit input changes can run when requested.
  Use `samsung_tv_power_off` only for an explicit request to turn the TV off.
- Never claim a command succeeded unless the tool returned a successful result.
  Read-only discovery does not authorize pairing or changing inputs.
- HDMI input must be explicitly provided as 1 through 4. A configured computer
  shortcut may use `preferredInput`; never assume a computer name or port.
- Device host and pairing tokens stay in private local state, by default
  `~/.config/codex-tv/samsung-tv.json` for compatibility. Override its path with
  `SAMSUNG_TV_CONFIG_PATH`. Never print tokens or commit that file.
- Optional non-secret preferences live at `~/.config/samsung-tv/preferences.json`
  or `SAMSUNG_TV_PREFERENCES_PATH`. They may configure `preferredInput`,
  `voiceGatewayUrl`, and `openrouterKeychainService`. Current explicit user
  instructions take precedence over defaults.
- `codex_tv_voice_status` checks an already-running external gateway configured
  through `SAMSUNG_TV_VOICE_URL` or `voiceGatewayUrl`. Require
  `provider: openrouter`. The Tizen voice app and gateway are separate optional
  products and are not launched or installed by this plugin. Do not recommend
  a direct-provider fallback for that existing OpenRouter voice lane.
- An optional `scripts/configure-openrouter-key` helper is for the user to run
  directly in an interactive macOS Terminal after selecting the gateway's
  existing Keychain service. It invokes the native hidden system prompt; the
  assistant must never collect, read, or relay the key. Do not run credential
  setup automatically, rotate a key, or change a service identity merely to
  check status.
- Use `samsung_tv_developer_status` before discussing a Tizen installation. A
  Developer Mode flag is an observation, not authorization to install or reboot.

See `README.md` for configuration and portable command examples.
