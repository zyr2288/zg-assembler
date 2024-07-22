import { CommonLine } from "../Lines/CommonLine";
import { ILabelNormal } from "./Label";
import { Token } from "./Token";

export class Macro {
	name!: Token;
	fileIndex!: number;
	labels: Map<string, ILabelNormal> = new Map();
	params: Map<string, { label: ILabelNormal, values: number[] }> = new Map();
	indParams?: { name: Token, values: number[][] };
	lines: CommonLine[] = [];
	lineOffset: number = 0;
	comment?: string;
}