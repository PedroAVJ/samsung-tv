import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const expectedName = "samsung-tv";
const expectedSkills = ["control-samsung-tv"];

async function json(path) { return JSON.parse(await readFile(new URL(path, root), "utf8")); }

test("both clients share the published package contract", async () => {
  const [codex, claude, pkg] = await Promise.all([json(".codex-plugin/plugin.json"), json(".claude-plugin/plugin.json"), json("package.json")]);
  for (const manifest of [codex, claude, pkg]) {
    assert.equal(manifest.name, expectedName);
    assert.equal(manifest.version, "0.2.0");
    assert.equal(manifest.license, "MIT");
  }
  assert.equal(codex.repository, `https://github.com/PedroAVJ/${expectedName}`);
  assert.equal(claude.repository, codex.repository);
  assert.equal(codex.skills, "./skills/");
  assert.equal(claude.skills, codex.skills);
  assert.equal(codex.interface.logo, "./assets/icon.svg");
  assert.deepEqual(codex.interface.screenshots, []);
  assert.ok((await stat(new URL(codex.interface.logo, root))).size > 100);
});

test("skill names, discovery metadata, and package documentation are complete", async () => {
  assert.deepEqual((await readdir(new URL("skills/", root))).sort(), expectedSkills);
  for (const name of expectedSkills) {
    const skill = await readFile(new URL(`skills/${name}/SKILL.md`, root), "utf8");
    const metadata = await readFile(new URL(`skills/${name}/agents/openai.yaml`, root), "utf8");
    assert.ok(skill.startsWith(`---\nname: ${name}\n`));
    assert.ok(metadata.includes(`Use $${name} `));
    assert.match(metadata, /allow_implicit_invocation: true/);
    assert.doesNotMatch(skill, /\[TODO:/);
  }
  for (const path of ["README.md", "AGENTS.md", "LICENSE", "PROVENANCE.md", "ICON-SOURCES.md"]) await stat(new URL(path, root));
});

test("published text excludes machine-specific source paths and private observations", async () => {
  for (const folder of ["skills/", ".codex-plugin/", ".claude-plugin/"]) {
    async function inspect(directory) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
        if (entry.isDirectory()) await inspect(file);
        else {
          const text = await readFile(file, "utf8");
          assert.doesNotMatch(text, /\/Users\/|\/home\/[^/]+\/|192\.168\.\d+\.\d+|Verified on \d+ [A-Z][a-z]+ \d{4}/);
        }
      }
    }
    await inspect(new URL(folder, root));
  }
});
