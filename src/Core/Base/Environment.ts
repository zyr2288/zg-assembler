import { HightlightRange } from "../Lines/CommonLine";
import { Utils } from "./Utils";

export class Environment {

	private files = new Map<number, string>();
	private highlightRanges = new Map<number, HightlightRange[]>();

	GetFile(hash: number) {
		return this.files.get(hash) ?? "";
	}

	SetFile(filePath: string) {
		let hash = Utils.GetHashcode(filePath);
		this.files.set(hash, filePath);
		return hash;
	}

	SetRange(fileHash: number, range: HightlightRange) {
		let ranges = this.highlightRanges.get(fileHash);
		if (!ranges) {
			ranges = [];
			this.highlightRanges.set(fileHash, ranges);
		}

		ranges.push(range);
	}

	GetRange(fileHash: number) {
		return this.highlightRanges.get(fileHash) ?? [];
	}

	ClearFileRange(fileHash:number) {
		this.highlightRanges.set(fileHash, []);
	}
}