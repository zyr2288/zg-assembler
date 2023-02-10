import { Utils } from "../Utils";

export class Environment {
	private files: Map<number, string> = new Map();

	GetFile(hash: number) {
		return this.files.get(hash);
	}

	SetFile(filePath: string) {
		let hash = Utils.GetHashcode(filePath);
		this.files.set(hash, filePath);
		return hash;
	}
}