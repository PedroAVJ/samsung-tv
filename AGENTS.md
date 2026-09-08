# Repository guidance

- This repository owns the public `samsung-tv` plugin, installed as `samsung-tv@package-manager`.
- Keep Codex and Claude plugin manifests and package version synchronized.
- Keep account identifiers, device addresses, pairing tokens, credentials, and private host observations outside Git.
- Runtime paths must resolve within the package or through explicitly configured external services. Never reference a developer's task folder or installed cache as source.
- Preserve source and icon provenance. First-party material is MIT licensed.
- Run `npm test`, the Codex plugin validator, and `claude plugin validate .` before release. Validation must not pair with or operate a physical device or initiate authentication.
