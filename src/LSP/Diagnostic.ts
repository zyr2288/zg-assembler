// import { Diagnostic } from 'vscode-languageserver/node';
import * as vscode from 'vscode'
import { Assembler } from '../Core/Assembler';


export class MyDiagnostic {

	private assembler: Assembler;
	private errorCollection;

	constructor(assembler: Assembler) {
		this.assembler = assembler;
		this.errorCollection = vscode.languages.createDiagnosticCollection(this.assembler.config.FileExtension.language)
	}

	UpdateDiagnostic() {
		let errors = this.assembler.exceptions.GetException();

	}
}