"use strict";
import * as fs from 'fs';
import { dirname } from 'path';
import * as vscode from 'vscode';
import {Utility} from './utility';

export class CodeManager implements vscode.Disposable{
	private _isRunning : boolean;
	private _process: any;
	private _config: vscode.WorkspaceConfiguration;
	private _classPath: string | undefined;
	private _terminal : vscode.Terminal | null;
	private _document: vscode.TextDocument | null = null;
	private _codeFile: string | null = null;

	constructor(){
		this._isRunning = false;
		this._config = vscode.workspace.getConfiguration("code-builder");
		this._terminal = null;
		this._classPath = this._config.get<string>("classPath");
		console.log(this._config);
	}

	public onDidTerminalClosed(){
		this._terminal = null;
	}

	public async build(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if(editor){
			this._document = editor.document;
		}else{
			return;
		}
		this._codeFile = this._document.uri.path;
		console.log("Filename : " + this._document.fileName);
		console.log("Path : " + this._document.uri.path);
		console.log("FS Path : " + this._document.uri.fsPath);
		this._document.save();
		let executor = this.getExecutor(this._document.languageId);
		if(!executor){
			return;
		}
		executor = this.mapPlaceHoldersInExecutor(executor, this._document.uri.fsPath);
		this.runCommandInTerminal(executor);
	}

	private getWorkspaceDir(codeFile: string) {
		const end = Math.max(codeFile.lastIndexOf('\/'), codeFile.lastIndexOf('\\'))+1;
		return codeFile.substring(0,end);
	}

	private getFileName(codeFile: string){
		const end = Math.max(codeFile.lastIndexOf('\/'), codeFile.lastIndexOf('\\'))+1;
		return codeFile.substring(end);
	}

	private getFileNameWithoutDirAndExt(codeFile: string){
		const regexMatch = codeFile.match(/.*[\/\\](.*(?=\..*))/);
        return regexMatch ? regexMatch[1] : codeFile;
	}

	private getExecutor(languageId: string) {
		const executorMap = this._config.get<any>("executorMap");
		const executor = executorMap[languageId];

		if(!executor){
			vscode.window.showInformationMessage("Code Language Not Supported");
			return;
		}
		return executor;
	}

	private mapPlaceHoldersInExecutor(executor : string, codeFile: string){
		let command = executor;
		// console.log(executor.replace(/\$dir/g, this.getWorkspaceDir(codeFile)));
		const placeholders: Array<{ regex: RegExp, replaceValue: string }> = [
			// A placeholder that has to be replaced by the path of the folder opened in VS Code
			// If no folder is opened, replace with the directory of the code file

			// A placeholder that has to be replaced by the code file name without its extension
			{ regex: /\$fileNameWithoutExt/g, replaceValue: this.getFileNameWithoutDirAndExt(codeFile) },

			// A placeholder that has to be replaced by the code file name without the directory
			{ regex: /\$fileName/g, replaceValue: this.getFileName(codeFile) },

			// A placeholder that has to be replaced by the Qualified Code Name in Java only
			// { regex: /\$qualifiedName/g, replaceValue: this.getQualifiedName()},
			// // A placeholder that has to be replaced by the ClassPath of Java Souce files
			// { regex: /\$classPath/g, replaceValue: this.getClassPath()},
			// // A placeholder that has to be replaced by  the Input FilePath
			// { regex: /\$inputFilePath/g, replaceValue: this.getInputFilePath()},
			// // A placeholder that has to be replaced by  the output FilePath
			// { regex: /\$outputFilePath/g, replaceValue: this.getOutputFilePath()},
		
			// A placeholder that has to be replaced by the directory of the code file
			{ regex: /\$dir/g, replaceValue: this.getWorkspaceDir(codeFile) },
		];

		placeholders.forEach((placeholder) => {
			command = command.replace(placeholder.regex, placeholder.replaceValue);
		});

		return command !== executor ? command : "";
	}

	private async runCommandInTerminal(executor : string, isIOCommand: boolean = false): Promise<any> {
		if(!this._terminal){
			this._terminal = vscode.window.createTerminal("Code-Builder");
		}
		this._terminal.show(true);
		this._terminal.sendText(executor);
	}

	dispose() : void {}
}