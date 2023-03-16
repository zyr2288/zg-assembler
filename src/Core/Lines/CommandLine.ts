import { Compiler } from "../Base/Compiler";
import { ExpressionPart, ExpressionUtils } from "../Base/ExpressionUtils";
import { ILabel } from "../Base/Label";
import { Token } from "../Base/Token";
import { HighlightToken, HighlightType, ICommonLine, LineCompileType, LineType } from "./CommonLine";

export class CommandLine implements ICommonLine {

	type: LineType = LineType.Command;
	compileType = LineCompileType.None;

	orgText!: Token;
	comment?: string;

	orgAddress = -1;
	baseAddress = 0;

	label?: ILabel;
	command!: Token;
	expression?: Token;
	expParts: ExpressionPart[][] = [];
	result: number[] = [];

	tag?: any;

	SetResult: (value: number, index: number, length: number) => number;
	SetAddress: () => void;
	AddAddress: () => void;

	constructor() {
		this.SetResult = Compiler.SetResult.bind(this);
		this.SetAddress = Compiler.SetAddress.bind(this);
		this.AddAddress = Compiler.AddAddress.bind(this);
	}

	GetTokens() {
		let result: HighlightToken[] = [];

		if (this.label)
			result.push({ type: HighlightType.Label, token: this.label.token });

		result.push(...ExpressionUtils.GetHighlightingTokens(this.expParts));
		return result;
	}
}