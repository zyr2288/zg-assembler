import { Token } from "../Base/Token";
import { ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class UnknowLine implements ICommonLine {
	type: LineType.Unknow = LineType.Unknow;
	orgText!: Token;
	compileType = LineCompileType.None;
	comment?: string;
}