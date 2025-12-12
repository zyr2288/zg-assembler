import { CompileOption } from "../Base/CompileOption";
import { ILabelNormal, LabelScope, LabelType, LabelUtils } from "../Base/Label";
import { Macro } from "../Base/Macro";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Utils } from "../Base/Utils";
import { Analyser } from "../Compiler/Analyser";
import { Compiler } from "../Compiler/Compiler";
import { Localization } from "../I18n/Localization";
import { HighlightOption, HighlightingProvider } from "../LanguageHelper/HighlightingProvider";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { LabelLine } from "../Lines/LabelLine";
import { MacroLine } from "../Lines/MacroLine";
import { Command, ICommand } from "./Command";

export type MacroLineTag = Macro;

export class MacroCommand implements ICommand {

	static GetHighlight(option: HighlightOption) {
		const line = option.GetCurrent<CommandLine>();
		const tag: MacroLineTag = line!.tag;

		const macroOp = new HighlightOption();
		macroOp.lines = tag.lines;
		macroOp.result = option.result;

		HighlightingProvider.GetHighlight(macroOp);

		option.index += tag.lines.length;
	}

	/***** class *****/

	start = { name: ".MACRO", min: 1 };
	end = ".ENDM";

	async AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();

		if (!LabelUtils.CheckIllegal(line.arguments[0].text, false)) {
			const error = Localization.GetMessage("Label {0} illegal", line.arguments[0].text);
			MyDiagnostic.PushException(line.arguments[0], error);
			line.lineType = LineType.Error;
			return;
		}

		const macroName = line.arguments[0];
		if (LabelUtils.FindLabel(macroName) || Compiler.enviroment.allMacro.has(macroName.text)) {
			const error = Localization.GetMessage("Label {0} is already defined", macroName.text);
			MyDiagnostic.PushException(line.arguments[0], error);
			line.lineType = LineType.Error;
			return;
		}

		const matchEnd = option.matchIndex![0];

		const macro = new Macro();
		macro.name = line.arguments[0];
		macro.fileIndex = Compiler.enviroment.fileIndex;
		macro.comment = line.comment;

		for (let i = 1; i < line.arguments.length; i++) {
			const token = line.arguments[i].Trim();
			// 这里是不定参数，还不知道需不需要
			// if (i === last && token.text.startsWith("...")) {
			// 	const copy = token.Copy().Substring(3);
			// 	macro.indParams = { name: copy, values: [] };
			// 	break;
			// }

			if (!LabelUtils.CheckIllegal(token.text, false)) {
				const error = Localization.GetMessage("Label {0} illegal", token.text);
				MyDiagnostic.PushException(token, error);
				line.lineType = LineType.Error;
				continue;
			}

			const label: ILabelNormal = { token, type: LabelType.Parameter, scope: LabelScope.Global, fileIndex: 0 };
			macro.params.set(token.text, { label, values: [] });
		}

		macro.lines = Utils.DeepClone(option.allLines.slice(option.index + 1, matchEnd));
		macro.lineOffset = option.index + 1;

		Compiler.enviroment.SetRange({
			type: "macro",
			key: macro.name.text,
			startLine: macro.lineOffset,
			endLine: matchEnd
		});

		// 标记为已分析行
		Command.MarkLineFinished(option, option.index + 1, matchEnd);

		line.tag = macro as MacroLineTag;
		Compiler.enviroment.AddMacro(macro);

		const macroOp = new CompileOption();
		macroOp.macro = macro;
		macroOp.allLines = macro.lines;

		await Analyser.AnalyseFirst(macroOp);
	}

	async AnalyseSecond(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const macro: MacroLineTag = line.tag;

		const macroOp = new CompileOption();
		macroOp.macro = macro;
		macroOp.allLines = macro.lines;

		await Analyser.AnalyseSecond(macroOp);
	}

	async AnalyseThird(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		const macro: MacroLineTag = line.tag;

		const macroOp = new CompileOption();
		macroOp.macro = macro;
		macroOp.allLines = macro.lines;

		await Analyser.AnalyseThird(macroOp);
	}

	async Compile(option: CompileOption) {
		if (!Compiler.FirstCompile())
			return;

		await this.AnalyseFirst(option);
		const line = option.GetCurrent<CommandLine>();
		if (line.lineType === LineType.Error)
			return;

		const macro = line.tag as Macro;

		for (let i = 0; i < macro.lines.length; i++) {
			const line = macro.lines[i];
			if (!line || line.lineType === LineType.Error)
				continue;

			let temp;
			switch (line.key) {
				case "unknow":
					const result = Analyser.MatchLine(line.org, false, ["macro", Compiler.enviroment.allMacro]);
					if (result.key === "macro") {
						temp = MacroLine.Create(result.content!, line.comment);
					} else {
						temp = LabelLine.Create(line.org, line.comment);
					}
					break;
			}

			if (temp)
				macro.lines[i] = temp;
		}
	}
}