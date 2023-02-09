import { Token } from "../Base/Token";
import { ICommonLine } from "./CommonLine";

export interface IUnknowLine extends ICommonLine {
	orgToken: Token;
}