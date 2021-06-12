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
	private _terminal : vscode.Terminal | null = null;
	private _document: vscode.TextDocument | null = null;

	constructor(){
		this._isRunning = false;
		this._config = vscode.workspace.getConfiguration("code-builder");
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
		this._classPath = this._config.get<string>('classPath');
		this._document.save();
		console.log("Filename : " + this._document.fileName);
		console.log("Path : " + this._document.uri.path);
		console.log("FS Path : " + this._document.uri.fsPath);
		console.log("Qualified Name : "+ this.getQualifiedName(this._document));
		console.log("Workspace Folder : "+ this.getWorkspaceFolder(this._document));
		console.log("ClassPath: "+ this.getClassPath());


		let executor = this.getExecutor(this._document.languageId);
		if(!executor){
			vscode.window.showInformationMessage('This Language is not Supported Yet');
			return;
		}
		executor = this.mapPlaceHoldersInExecutor(executor, this._document);
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

	private getWorkspaceFolder(codeFile : vscode.TextDocument):string|undefined{
		const workspace = vscode.workspace.getWorkspaceFolder(codeFile.uri);
		if(workspace){
			return workspace.uri.fsPath;
		}
		return undefined;
	}	

	private getDirName(codeFile : vscode.TextDocument): string{
		return dirname(codeFile.uri.fsPath);
	}

	private getClassPath(): string {
		if(this._classPath){
			return this._classPath;
		}
		return ".";
	}

	private getQualifiedName(codeFile: vscode.TextDocument): string{
		const classPath = this.getClassPath();

		let splitter = 0;

		if(codeFile.uri.fsPath.includes(classPath) && classPath.length !== 1){
			splitter = classPath.length+1;
		}else {
			splitter = this.getDirName(codeFile).length+1;
			this._classPath = ".";
		}

		let qualifiedName = codeFile.uri.fsPath.substring(splitter, codeFile.uri.fsPath.length-5); 
		qualifiedName = qualifiedName.replace(/[\/\\]/g,'.');
		return qualifiedName;
	}	

	private mapPlaceHoldersInExecutor(executor : string, codeFile: vscode.TextDocument){
		let command = executor;
		// console.log(executor.replace(/\$dir/g, this.getWorkspaceDir(codeFile)));
		const placeholders: Array<{ regex: RegExp, replaceValue: string }> = [
			// A placeholder that has to be replaced by the path of the folder opened in VS Code
			// If no folder is opened, replace with the directory of the code file

			// A placeholder that has to be replaced by the code file name without its extension
			{ regex: /\$fileNameWithoutExt/g, replaceValue: this.getFileNameWithoutDirAndExt(codeFile.uri.fsPath) },

			// A placeholder that has to be replaced by the code file name without the directory
			{ regex: /\$fileName/g, replaceValue: this.getFileName(codeFile.uri.fsPath) },

			// A placeholder that has to be replaced by the Qualified Code Name in Java only
			{ regex: /\$qualifiedName/g, replaceValue: this.getQualifiedName(codeFile)},

			// A placeholder that has to be replaced by the ClassPath of Java Souce files
			{ regex: /\$classPath/g, replaceValue: this.getClassPath()},
			// A placeholder that has to be replaced by  the Input FilePath
			// { regex: /\$inputFilePath/g, replaceValue: this.getInputFilePath()},
			// A placeholder that has to be replaced by  the output FilePath
			// { regex: /\$outputFilePath/g, replaceValue: this.getOutputFilePath()},
		
			// A placeholder that has to be replaced by the directory of the code file
			{ regex: /\$dir/g, replaceValue: this.getWorkspaceDir(codeFile.uri.fsPath) },
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