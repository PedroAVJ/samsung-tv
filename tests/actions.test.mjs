import test from "node:test";
import assert from "node:assert/strict";
import { executeAction } from "../src/actions.mjs";

test("maps voice volume requests onto the Samsung controller", async () => {
  const calls = [];
  const controller = { volumeDown: async (steps) => { calls.push(["down", steps]); return { ok: true }; } };
  assert.deepEqual(await executeAction(controller, "tv_volume_down", { steps: 3 }), { ok: true });
  assert.deepEqual(calls, [["down", 3]]);
});

test("maps the Mac mini shortcut to the configured HDMI input", async () => {
  const controller = { switchInput: async (input) => ({ input: Number(input) }) };
  assert.deepEqual(await executeAction(controller, "tv_switch_to_mac_mini", { input: 2 }), { input: 2 });
});

test("rejects unknown actions", async () => {
  await assert.rejects(() => executeAction({}, "tv_launch_missiles"), /Unknown TV action/);
});
