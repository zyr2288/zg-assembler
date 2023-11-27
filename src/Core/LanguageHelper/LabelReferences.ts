import { ILabel } from "../Base/Label";
import { Token } from "../Base/Token";
import { InstructionLine } from "../Lines/InstructionLine";
import { OnlyLabelLine } from "../Lines/OnlyLabelLine";

export interface LabelRef {
	orgFileHash: number;
	orgToken: Token;
	refTokens: Token[];
}

/**标签引用 */
export class LabelReferences {

	/**所有标签引用，Key为labelHash */
	private static labelRef = new Map<number, LabelRef>();

	static ClearAllRef() {
		LabelReferences.labelRef.clear();
	}

	static RemoveLabel(labelHash: number) {
		LabelReferences.labelRef.delete(labelHash);
	}

	static SetOrgLabel(label: ILabel, labelHash: number) {
		const labelRef = LabelReferences.labelRef.get(labelHash) ?? { orgFileHash: labelHash, orgToken: label.token, refTokens: [] };
		LabelReferences.labelRef.set(labelHash, labelRef);
	}

	static SetLabelRef(labelHash: number, token: Token) {
		const labelRef = LabelReferences.labelRef.get(labelHash);
		if (!labelRef)
			return;

		const index = labelRef.refTokens.findIndex((value) => value.line === token.line && value.start === token.start);
		if (index < 0)
			labelRef.refTokens.push(token);
	}
}