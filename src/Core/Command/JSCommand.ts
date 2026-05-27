import { CompileOption } from "../Base/CompileOption";
import { FileUtils } from "../Base/FileUtils";
import { Compiler } from "../Compiler/Compiler";
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
		const result = await IncludeUtils.CheckFile(option);
		if (!result.exsist)
			return;

		const line = option.GetCurrent<CommandLine>();
		const tag: JSCommandTag = { path: result.path };
		line.tag = tag;
	}

	async Compile(option: CompileOption) {
		if (Compiler.FirstCompile()) {
			await this.AnalyseFirst(option);
		}

		const line = option.GetCurrent<CommandLine>();
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
		if (data instanceof Uint8Array) {
			line.lineResult.result = Array.from(data);
			line.lineResult.AddAddress();
		} else {
			line.lineType = LineType.Error;
		}
	}
}