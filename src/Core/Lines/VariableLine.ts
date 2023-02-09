import { Token } from "../Base/Token";
import { ICommonLine } from "./CommonLine";

export interface IVariableLine extends ICommonLine {
	labelToken: Token;
	expression: Token;
}