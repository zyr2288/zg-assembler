import { CompileOption } from "../Base/CompileOption";
import { Expression, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabelNormal, LabelType, LabelUtils } from "../Base/Label";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Token } from "../Base/Token";
import { Analyser } from "../Compiler/Analyser";
import { Compiler } from "../Compiler/Compiler";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { Command, CommandTagBase, ICommand } from "./Command";

export interface EnumTag extends CommandTagBase {
	startValue?: number;
	lines: ({ labelToken: Token, expression: Expression, value?: number } | undefined)[];
}

export class EnumCommand implements ICommand {

	/***** class *****/

	start = { name: ".ENUM", min: 1, max: 1 };
	end = ".ENDE";
	allowLabel = false;

	AnalyseFirst(option: CompileOption) {
		const currentLine = option.GetCurrent<CommandLine>();
		const matchEnd = option.matchIndex![0];

		const start = option.index + 1;
		const lines = option.allLines.slice(start, matchEnd);

		const tag: EnumTag = { startValue: undefined, exp: undefined, lines: [] };
		const startExp = ExpressionUtils.SplitAndSort(currentLine.arguments[0]);
		if (startExp)
			tag.exp = startExp;

		// 标记为已分析行
		Command.MarkLineFinished(option, option.index + 1, matchEnd);

		tag.lines.length = lines.length;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line)
				continue;

			let tokens: Token[] | undefined;
			switch (line.key) {
				case "label":
				case "macro":
					console.error("不可能是这种行");
					continue;
				default:
					tokens = Analyser.SplitComma(line.org, { count: 1 });
					if (!tokens || tokens.length !== 2) {
						const error = Localization.GetMessage("Command arguments error");
						MyDiagnostic.PushException(line.org, error);
						continue;
					}
					break;
			}

			const expression = ExpressionUtils.SplitAndSort(tokens[1]);
			if (!expression)
				continue;

			tokens[0] = tokens[0].Trim();
			if (Compiler.enviroment.compileTime < 0) {
				const label = LabelUtils.CreateCommonLabel(tokens[0], { ableNameless: false, comment: line.comment });
				if (label) {
					label.type = LabelType.Defined;
					label.comment = line.comment;
				}
			}

			tag.lines[i] = { labelToken: tokens[0], expression };
		}

		Compiler.enviroment.SetRange({ type: "enum", key: "", startLine: option.index, endLine: matchEnd });
		currentLine.tag = tag;
	}

	AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: EnumTag = line.tag;

		let start: number | undefined = undefined;
		if (tag.exp) {
			if (ExpressionUtils.CheckLabels(option, tag.exp))
				return;

			const temp = ExpressionUtils.GetValue(tag.exp.parts);
			if (temp.success)
				start = temp.value;
		}

		if (start === undefined)
			return;

		for (let i = 0; i < tag.lines.length; i++) {
			const line = tag.lines[i];
			if (!line)
				continue;

			if (ExpressionUtils.CheckLabels(option, line.expression))
				break;

			const label = LabelUtils.FindLabel(line.labelToken);
			if (!label)
				break;

			label.value = start;
			const temp = ExpressionUtils.GetValue(line.expression.parts, option);
			if (temp.success) {
				start += temp.value;
			} else {
				break;
			}
		}
	}

	Compile(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: EnumTag = line.tag;

		let start: number | undefined = undefined;
		if (tag.startValue !== undefined) {
			start = tag.startValue;
		} else {
			const temp = ExpressionUtils.GetValue(tag.exp!.parts, option);
			if (temp.success) {
				tag.startValue = temp.value;
				start = temp.value;
			}
		}

		if (start === undefined)
			return;

		const notLastCompile = Compiler.NotLastCompile();
		let error = false;

		for (let i = 0; i < tag.lines.length; i++) {
			const line = tag.lines[i];
			if (!line)
				continue;

			let label: ILabelNormal | undefined;
			if (notLastCompile) {
				label = LabelUtils.CreateCommonLabel(line.labelToken, { ableNameless: false }) as ILabelNormal | undefined;
			} else {
				label = LabelUtils.FindLabel(line.labelToken) as ILabelNormal | undefined;
			}

			if (error || !label)
				continue;

			label.value = start;

			const temp = ExpressionUtils.GetValue(line.expression.parts, option);
			if (!temp.success) {
				error = true;
				continue;
			}

			start += temp.value;
		}
	}
}