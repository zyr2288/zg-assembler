import { Token } from "../Base/Token";
import { ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class UnknowLine implements ICommonLine {
	orgText!: Token;
	type = LineType.Unknow;
	compileType = LineCompileType.None;
	comment?: string;
}