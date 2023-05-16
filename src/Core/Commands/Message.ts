import { Compiler } from "../Base/Compiler";
import { ExpressionResult, ExpressionUtils, PriorityType } from "../Base/ExpressionUtils";
import { FileUtils } from "../Base/FileUtils";
import { MyDiagnostic } from "../Base/MyException";
import { DecodeOption } from "../Base/Options";
import { Utils } from "../Base/Utils";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineCompileType } from "../Lines/CommonLine";
import { Commands } from "./Commands";

export class Message {

	static Initialize() {
		Commands.AddCommand({
			name: ".MSG", min: 1, max: -1, label: false,
			firstAnalyse: Message.FirstAnalyse_Msg,
			thirdAnalyse: Message.ThirdAnalyse_Msg,
			compile: Message.Compiler_Msg
		});
	}

	private static FirstAnalyse_Msg(option: DecodeOption) {
		Commands.FirstAnalyse_Common(option);
		const line = option.GetCurrectLine<CommandLine>();
		if (line.expParts[0]?.length !== 1 || line.expParts[0][0].type !== PriorityType.Level_3_String) {
			let errorMsg = Localization.GetMessage("Command arguments error");
			let token = ExpressionUtils.CombineExpressionPart(line.expParts[0]);
			MyDiagnostic.PushException(token, errorMsg);
			line.compileType = LineCompileType.Error;
		}
	}

	private static ThirdAnalyse_Msg(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		for (let i = 1; i < line.expParts.length; ++i)
			if (ExpressionUtils.CheckLabelsAndShowError(line.expParts[i], option))
				line.compileType = LineCompileType.Error;

	}

	private static Compiler_Msg(option: DecodeOption) {
		const line = option.GetCurrectLine<CommandLine>();
		line.tag ??= [];
		line.compileType = LineCompileType.Finished;
		for (let i = 1; i < line.expParts.length; ++i) {
			let temp = ExpressionUtils.GetExpressionValue(line.expParts[i], ExpressionResult.GetResultAndShowError, option);
			if (temp.success) {
				line.tag[i - 1] ??= temp.value;
			} else {
				line.compileType = LineCompileType.None;
			}
		}

		if (line.compileType !== LineCompileType.Finished)
			return;

		let values = [];
		for (let i = 0; i < line.tag.length; ++i)
			values.push(Utils.ConvertValue(line.tag[i]));

		let regex = /[@\$]?{(?<index>[0-9])}/g;
		let match: RegExpMatchArray | null;
		let result = "";
		let start = 0;
		let text = line.expParts[0][0].token.text;
		while (match = regex.exec(text)) {
			let index = parseInt(match.groups!["index"]);
			if (!values[index]) {
				let errorMsg = Localization.GetMessage("Command arguments error");
				let token = line.expParts[0][0].token.Substring(match.index!, match[0].length);
				MyDiagnostic.PushException(token, errorMsg);
				line.compileType = LineCompileType.Error;
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
		
		if (line.compileType === LineCompileType.Error)
			return;

		result += text.substring(start);
		let filePath = Compiler.enviroment.GetFile(line.command.fileHash);
		let message = Localization.GetMessage("out put message File{0}, Line{1}, Message{2}", filePath, line.command.line + 1, result);
		FileUtils.ShowMessage?.(message);
	}
}