import { CompileOption } from "../Base/CompileOption";
import { Config } from "../Base/Config";
import { FileUtils } from "../Base/FileUtils";
import { MyDiagnostic } from "../Base/MyDiagnostic";
import { Compiler } from "../Compiler/Compiler";
import { Localization } from "../I18n/Localization";
import { CommandLine } from "../Lines/CommandLine";
import { LineType } from "../Lines/CommonLine";
import { ZGAssembler } from "../ZGAssembler";
import { ICommand } from "./Command";
import { IncludeTag, IncludeUtils } from "./Include";

interface JSCommandTag {
	path: string;
}

export class JSCommand implements ICommand {
	start = { name: ".JS", min: 1, max: 1 };
	allowLabel = false;

	async AnalyseFirst(option: CompileOption) {
		const line = option.GetCurrent<CommandLine>();
		if (Config.ProjectSetting.useJS !== true) {
			const error = Localization.GetMessage("Can not use JS script");
			MyDiagnostic.PushWarning(line.command, error);
			line.lineType = LineType.Finished;
			return;
		}

		const result = await IncludeUtils.CheckFile(option);
		if (!result.exsist) {
			line.lineType = LineType.Error;
			return;
		}

		const tag: JSCommandTag = { path: result.path };
		line.tag = tag;
	}

	async Compile(option: CompileOption) {
		if (Compiler.FirstCompile())
			await this.AnalyseFirst(option);

		const line = option.GetCurrent<CommandLine>();
		if (line.lineType === LineType.Error || line.lineType === LineType.Finished)
			return;

		line.lineResult.SetAddress();
		line.lineType = LineType.Finished;

		const tag = line.tag as JSCommandTag;
		if (!tag) {
			line.lineType = LineType.Error;
			return;
		}

		const fileBuffer = await FileUtils.ReadFile(tag.path);
		const fileContent = FileUtils.BytesToString(fileBuffer);

		const func = new Function("ZGAssembler", `return (${fileContent})(ZGAssembler)`);
		const data = func(ZGAssembler.instance);
		if (!(data instanceof Uint8Array)) {
			const error = Localization.GetMessage("JS script must return Uint8Array");
			MyDiagnostic.PushException(line.command, error);
			line.lineType = LineType.Error;
			return;
		}

		const tempData = Array.from(data);
		if (line.lineResult.result.length === 0) {
			line.lineResult.result = tempData;
			line.lineResult.AddAddress();
		} else if (line.lineResult.result.length !== tempData.length) {
			const error = Localization.GetMessage("Return array must be same length");
			MyDiagnostic.PushException(line.command, error);
			line.lineType = LineType.Error;
			return;
		} else {
			line.lineResult.result = tempData;
		}
	}
}