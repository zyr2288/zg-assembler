export class Environment {
	private files: Map<number, string> = new Map();

	GetFile(hash: number) {
		return this.files.get(hash);
	}

	SetFile(hash: number, filePath: string) {
		
	}
}