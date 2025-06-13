import { CompileOption } from "../Base/CompileOption";
import { Config } from "../Base/Config";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Utils } from "../Base/Utils";
import { Compiler } from "../Compiler/Compiler";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { ICommand } from "./Command";

export class MsgCommand implements ICommand {
	start = { name: ".MSG", min: 1 };
	AnalyseFirst = Message.AnalyseFirst;
	AnalyseThird = Message.AnalyseThird;

	Compile(option: CompileOption) {
		if (Compiler.FirstCompile())
			this.AnalyseFirst(option);

		const line = option.GetCurrent<CommandLine>();
		Message.SetAddress(line);
		if (Compiler.enviroment.compileTime < Config.ProjectSetting.compileTimes - 1)
			return;

		Message.Compile(option);
	}
}

export class ErrorCommand implements ICommand {
	start = { name: ".ERROR", min: 1 };
	AnalyseFirst = Message.AnalyseFirst;
	AnalyseThird = Message.AnalyseThird;

	Compile(option: CompileOption) {
		if (Compiler.FirstCompile())
			this.AnalyseFirst(option);

		const line = option.GetCurrent<CommandLine>();
		Message.SetAddress(line);
		Message.Compile(option);
		line.lineType = LineType.Error;

		const error = Localization.GetMessage("compile error");
		MyDiagnostic.PushException(line.command, error);
		return;
	}
}

export interface MsgTag {
	message: Token;
	expressions: Expression[];
	address: { base: number; org: number };
}

class Message {

	static AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const str = line.arguments[0];
		if (!/^\".*\"$/g.test(str.text)) {
			const error = Localization.GetMessage("Command arguments error");
			MyDiagnostic.PushException(str, error);
			line.lineType = LineType.Error;
			return;
		}

		const tag: MsgTag = { message: str.Substring(1, str.length - 2), expressions: [], address: { base: -1, org: -1 } };
		for (let i = 1; i < line.arguments.length; i++) {
			const temp = ExpressionUtils.SplitAndSort(line.arguments[i]);
			if (!temp) {
				line.lineType = LineType.Error;
				continue;
			}

			tag.expressions[i - 1] = temp;
		}
		line.tag = tag;
	}

	static AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: MsgTag = line.tag;
		for (let i = 0; i < tag.expressions.length; i++)
			ExpressionUtils.CheckLabels(option, tag.expressions[i]);
	}

	static Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: MsgTag = line.tag;

		const values: { bin: string, dec: string, hex: string }[] = [];
		for (let i = 0; i < tag.expressions.length; ++i) {
			const exp = tag.expressions[i];
			const v = ExpressionUtils.GetValue(exp.parts, option);
			if (v.success) {
				values[i] = Utils.ConvertValue(v.value);
			}
		}

		const regex = /[@\$]?{(?<index>[0-9])}/g;
		let match: RegExpMatchArray | null;
		let result = "";
		let start = 0;
		let text = tag.message.text;
		while (match = regex.exec(tag.message.text)) {
			const index = parseInt(match.groups!["index"]);
			if (!values[index]) {
				const errorMsg = Localization.GetMessage("Command arguments error");
				const token = tag.message.Substring(match.index!, match[0].length);
				MyDiagnostic.PushException(token, errorMsg);
				line.lineType = LineType.Error;
				continue;
			}

			switch (match[0][0]) {
				case "@":
					result += text.substring(start, match.index!) + "@" + values[index].bin;
					break;
				case "$":
					result += text.substring(start, match.index!) + "$" + values[index].hex;
					break;
				default:
					result += text.substring(start, match.index!) + values[index].dec;
					break;
			}
			start = match.index! + match[0].length;
		}

		if (line.lineType === LineType.Error)
			return;

		result += text.substring(start);
		const filePath = Compiler.enviroment.GetFilePath(Compiler.enviroment.fileIndex);
		const message = Localization.GetMessage("out put message File{0}, Line{1}, Message{2}", filePath, line.command.line + 1, result);
		FileUtils.ShowMessage?.(message);
	}

	static SetAddress(line: CommandLine) {
		const tag: MsgTag = line.tag;
		if (tag.address.org < 0) {
			tag.address.org = Compiler.enviroment.address.org;
			tag.address.base = Compiler.enviroment.address.base;
		} else {
			Compiler.enviroment.address.org = tag.address.org;
			Compiler.enviroment.address.base = tag.address.base;
		}
	}

}
