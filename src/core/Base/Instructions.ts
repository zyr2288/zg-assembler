import { asm6502 } from "../Platform/asm6502";
import { asm65816 } from "../Platform/asm65816";
import { Platform } from "../Platform/Platform";

export class Instructions {

	static platform: Platform;
	static readonly SupportPlatform = ["6502", "65816"];

	static SwitchPlatform(platform: string) {
		switch (platform) {
			case "6502":
				Instructions.platform = new asm6502();
				break;
			case "65816":
				Instructions.platform = new asm65816();
				break;
			default:
				throw new Error("Unsupport Platform");
		}
	}

}