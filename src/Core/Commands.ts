import { Utils } from "./Utils";


export class Commands {

	static readonly AllCommand = [".ORG", ".BASE", ".DB", ".DW", ".DL"];
	private static commandsRegex: string;

	static GetCommandRegexString() {
		if (Commands.commandsRegex)
			return Commands.commandsRegex;

		let temp = "";
		for (let i = 0; i < Commands.AllCommand.length; ++i)
			temp += Utils.TransformRegex(Commands.AllCommand[i]) + "|";

		temp = temp.substring(0, temp.length - 1);

		return Commands.commandsRegex = temp;
	}

}