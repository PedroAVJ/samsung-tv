import { readConfig } from "./config.mjs";

export async function executeAction(controller, action, args = {}) {
  switch (action) {
    case "tv_get_status": return controller.status();
    case "tv_switch_to_mac_mini": {
      const input = args.input ?? process.env.SAMSUNG_TV_PREFERRED_INPUT ?? process.env.MAC_MINI_HDMI ?? (await readConfig()).preferredInput;
      if (input === undefined || input === "") throw new Error("Configure a preferred HDMI input or provide an explicit input.");
      return controller.switchInput(input);
    }
    case "tv_switch_input": return controller.switchInput(args.input);
    case "tv_volume_up": return controller.volumeUp(args.steps);
    case "tv_volume_down": return controller.volumeDown(args.steps);
    case "tv_toggle_mute": return controller.toggleMute();
    case "tv_home": return controller.home();
    case "tv_back": return controller.back();
    case "tv_power_off": return controller.powerOff();
    case "tv_remote_key": return controller.sendKey(args.key);
    case "pair_samsung_tv": return controller.pair();
    default: throw new Error(`Unknown TV action: ${action}`);
  }
}
