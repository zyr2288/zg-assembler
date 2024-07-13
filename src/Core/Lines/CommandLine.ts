import { Token } from "../Base/Token";
import { Command } from "../Command/Command";
import { LineResult, LineType } from "./CommonLine";
import { LabelLine } from "./LabelLine";

export class CommandLine {
	key: "command" = "command";
	command!: Token;
	arguments: Token[] = [];

	label?: LabelLine;

	org!: Token;
	comment?:string;
	lineType: LineType = LineType.None;

	lineResult = new LineResult();

	tag: any;
	
	/**
	 * 创建一个命令行
	 * @param org 原始行内容
	 * @param content 分割好的内容
	 * @param comment 注释
	 * @returns 
	 */
	static Create(org: Token, content: { pre: Token, main: Token, rest: Token }, comment?: string) {
		const line = new CommandLine();
		line.org = org;
		line.comment = comment;
		line.command = content.main;

		line.label = LabelLine.Create(content.pre, comment);

		const args = Command.SplitArgument(content.main, content.rest);
		if (!args) {
			line.lineType = LineType.Error;
			return;
		}

		line.arguments = args;
		return line;
	}
}