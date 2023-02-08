export class FilePath {
	static ReadFile: () => Promise<Uint8Array>;
	static SaveFile: () => Promise<void>;
}