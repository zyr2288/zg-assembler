import { Asm6502 } from "./Asm6502";
import { Asm65816 } from "./Asm65816";
import { InstructionBase } from "./InstructionBase";

export class Platform {

	static instructionAnalyser: InstructionBase;

	static SwitchPlatform(platform: string) {
		switch(platform) {
			case "6502":
				this.instructionAnalyser = new Asm6502();
				break;
			case "65816":
				this.instructionAnalyser = new Asm65816();
				break;
			default:
				console.error("不支持平台" + platform);
				break;
		}
	}

}