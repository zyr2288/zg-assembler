export class DocumentChangeProvider {

	static async LoadAllFile(files: { text: string, filePath: string }[]) {
		LSPUtils.fileUpdateFinished = false;
		let files = await LSPUtils.GetWorkspaceFilterFile();

		let tempFiles: { text: string, filePath: string }[] = [];
		for (let i = 0; i < files.length; i++) {
			let buffer = await LSPUtils.assembler.fileUtils.ReadFile(files[i].fsPath);
			let text = LSPUtils.assembler.fileUtils.BytesToString(buffer);
			tempFiles.push({ text, filePath: files[i].fsPath });
		}
		await LSPUtils.assembler.compiler.DecodeText(tempFiles);
		LSPUtils.fileUpdateFinished = true;

		UpdateFile.UpdateDiagnostic();
	}


}