import { Token } from "../Base/Token";
import { ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class UnknowLine {
	type: LineType.Unknow = LineType.Unknow;
	orgText!: Token;
	compileType = LineCompileType.None;
	comment?: string;
}