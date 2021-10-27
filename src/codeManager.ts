"use strict";

import { dirname, win32 } from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import * as utils from './utils';
import { mapExternalCommand } from './terminal';
import { AppInsights } from './appInsights';
import { ChildProcess, exec } from 'child_process';
import terminate from 'terminate';

export class CodeManager implements vscode.Disposable {
	private _config: vscode.WorkspaceConfiguration;
	private _classPath: string | undefined;
	private _inputFilePath: string | undefined;
	private _outputFilePath: string | undefined;
	private _terminal: vscode.Terminal | undefined;
	private _document: vscode.TextDocument | null = null;
	private _externalProcess: ChildProcess | null = null;
	private _appInsightsClient: AppInsights | undefined;
	private _languagesArr: Array<string> | undefined;

	constructor() {
		this._config = vscode.workspace.getConfiguration("code-builder");
		this.setContext();
		this.checkForOpenTerminal();
		if (this._config.get<boolean>("enableAppInsights")) {
			this._appInsightsClient = new AppInsights();
		}
	}

	public onDidTerminalClosed() {
		this._terminal = undefined;
	}

	public async buildAndRun(): Promise<void> {
		if (this.isRunning()) {
			return;
		}

		const document = this.initialize();
		if (!document) {
			return;
		}
		this._document = document;
		this.logTelemetry("BuildAndRun", this._document.languageId);
		let executor = this.getExecutor(this._document.languageId);
		if (!executor) {
			return;
		}
		executor = this.performTerminalChecks(executor, document);
		this.runCommandInTerminal(executor, document);
	}

	public async buildWithIO(): Promise<void> {
		if (this.isRunning()) {
			return;
		}

		const document = this.initialize();
		if (!document) {
			return;
		}
		this._document = document;
		this.logTelemetry("BuildWithIO", this._document.languageId);

		//Checking if the IO Files Paths are Set or Not
		const ioFlag = await this.checkInputOutputFilePaths();
		if (!ioFlag) {
			return;
		}

		let executor = this.getExecutor(this._document.languageId);
		if (!executor) {
			return;
		}
		executor = this.performTerminalChecks(executor, document, true);
		this.runCommandInTerminal(executor, document);
	}

	public async customCommand(): Promise<void> {
		if (this.isRunning()) {
			return;
		}

		const document = this.initialize();
		this.logTelemetry("customCommand", document?.languageId);
		const executor = this._config.get<string>("customCommand");
		if (!executor || executor.trim().length === 0) {
			return;
		}
		this.runCommandInTerminal(executor, document);
	}

	public async stopBuild(): Promise<void> {
		this.logTelemetry("stopBuild");
		if (this._config.get<boolean>("runInExternalTerminal")) {
			if (this._externalProcess) {
				if (os.platform() === "win32") {
					if (this._externalProcess.pid) {
						terminate(this._externalProcess.pid);
						vscode.window.showInformationMessage("Build Stopped");
					}
				}
				vscode.window.showInformationMessage("This Platform does not supports stopping command currently.");
			}
		} else {
			if (!this._terminal) {
				return;
			}
			//Sending the CTRL+C to Terminal
			utils.sendTextToTerminal("\u0003\u000D", this._terminal);
			utils.clearTerminal(this._terminal);
			vscode.window.showInformationMessage("Build Stopped");
		}
	}

	/**
	 * Initializes the Extension
	 * @returns code Document which is Currently Opened in editor
	 */

	private initialize(): vscode.TextDocument | undefined {
		const editor = vscode.window.activeTextEditor;
		let document = undefined;
		if (editor) {
			document = editor.document;
		} else {
			return undefined;
		}

		this._config = vscode.workspace.getConfiguration("code-builder");
		this._classPath = this._config.get<string>("classPath");
		this._inputFilePath = this._config.get<string>("inputFilePath");
		this._outputFilePath = this._config.get<string>("outputFilePath");
		const executorMap = this._config.get<object>("executorMap");
		if (executorMap) {
			this._languagesArr = Object.keys(executorMap);
		}

		if (this._config.get<boolean>("debugData")) {
			this.logDebugData(document);
		}
		if (this._config.get<boolean>("saveFileBeforeRun")) {
			document.save();
		}

		return document;
	}

	/**
	 *  Checks the Input and Output File Paths
	 *  If the Paths are not present then opens
	 *  File Picker to select IO Files
	 */

	private async checkInputOutputFilePaths(): Promise<boolean> {
		if (this._inputFilePath === "" || !this._inputFilePath) {
			const response = await this.configModifierFromFileFolderPicker("inputFilePath", "Select The Input File");
			if (response) {
				this._inputFilePath = response;
			} else {
				return false;
			}
		}
		if (this._outputFilePath === "" || !this._outputFilePath) {
			const response = await this.configModifierFromFileFolderPicker("outputFilePath", "select the Output File");
			if (response) {
				this._outputFilePath = response;
			} else {
				return false;
			}
		}

		return true;
	}

	/**
	 *  sets the ClassPath for Java Source Files
	 */
	public setClassPath(): void {
		this.configModifierFromFileFolderPicker("classPath", "Select the ClassPath Directory", true, false)
			.then((uri) => {
				this._classPath = uri;
			});
	}

	/**
	 *  sets the Input File Path
	 */
	public setInputFilePath(): void {
		this.configModifierFromFileFolderPicker("inputFilePath", "Select Input File", false, false);
	}

	/**
	 *  sets the Output File Path
	 */
	public setOutputFilePath(): void {
		this.configModifierFromFileFolderPicker("outputFilePath", "Select Output File", false, false);
	}

	/**
	 * Logs the Debug data to Console
	 */
	private logDebugData(codeFile: vscode.TextDocument): void {
		console.log("Filename : " + codeFile.fileName);
		console.log("Path : " + codeFile.uri.path);
		console.log("FS Path : " + codeFile.uri.fsPath);
		console.log("Qualified Name : " + this.getQualifiedName(codeFile));
		console.log("ClassPath: " + this.getClassPath());
		console.log("Dirname : " + this.getDirName());
		console.log("Workspace Folder : " + this.getWorkspaceFolder(codeFile));
		console.log("Languages Arr :" + this._languagesArr);
		console.log("Custom Command :" + this._config.get<string>("customCommand"));
		console.log("Shell : " + vscode.env.shell);
		console.log("Terminals : " + JSON.stringify(vscode.window.terminals));
		console.log("External Terminals : " + JSON.stringify(vscode.workspace.getConfiguration("terminal.external")));
	}

	/**
	 * Checks for Previous runs in External Terminal
	 */
	private isRunning(): boolean {
		if (this._config.get<boolean>("runInExternalTerminal") && this._externalProcess) {
			vscode.window.showInformationMessage("Build is Already Running");
			return true;
		}

		return false;
	}

	private getWorkspaceDir(codeFile: string) {
		const end = Math.max(codeFile.lastIndexOf('\/'), codeFile.lastIndexOf('\\'));

		//If the user is using Git Bash on Windows
		if (os.platform() === "win32" && vscode.env.shell.toLowerCase().includes('bash')) {
			return codeFile.substring(0, end);
		}
		return codeFile.substring(0, end + 1);
	}

	private getFileName(codeFile: string) {
		const end = Math.max(codeFile.lastIndexOf('\/'), codeFile.lastIndexOf('\\')) + 1;
		return codeFile.substring(end);
	}

	private getFileNameWithoutDirAndExt(codeFile: string) {
		const regexMatch = codeFile.match(/.*[\/\\](.*(?=\..*))/);
		return regexMatch ? regexMatch[1] : codeFile;
	}

	private getExecutor(languageId: string) {
		const executorMap = this._config.get<any>("executorMap");
		const executor = executorMap[languageId];

		if (!executor) {
			vscode.window.showInformationMessage("Code Language not Supported");
		}
		return executor;
	}

	private getWorkspaceFolder(codeFile: vscode.TextDocument): string | undefined {
		const workspace = vscode.workspace.getWorkspaceFolder(codeFile.uri);
		if (workspace) {
			return workspace.uri.fsPath;
		}
		return undefined;
	}

	private getDirName(): string {
		if (!this._document) {
			return "";
		}
		return dirname(this._document.fileName);
	}

	private getClassPath(): string {
		if (this._classPath) {
			return this._classPath;
		}
		return ".";
	}

	/**
	 *  Gets the Qualified Name used in Running
	 *  of Java Files with Package Declarations
	 *  it is Calculated based on the Classpath 
	 *  set in the Project (Default is .)
	 */
	private getQualifiedName(codeFile: vscode.TextDocument): string {
		if (this._config.get<boolean>("useAutoClassPath")) {
			return this.getAdvancedQualifiedName(codeFile);
		}
		const classPath = this.getClassPath();
		let fsPath = codeFile.uri.fsPath;
		//Changing the Drive Letter of Windows to UpperCase
		// if(os.platform() === 'win32'){
		// 	let driveLetter = fsPath.charAt(0);
		// 	fsPath = driveLetter.toUpperCase()+ fsPath.substring(1);
		// }

		let splitter = 0;
		if (fsPath.includes(classPath) && classPath.length !== 1) {
			splitter = classPath.length + 1;
		} else {
			splitter = this.getDirName().length + 1;
			this._classPath = ".";
		}

		let qualifiedName = fsPath.substring(splitter, fsPath.length - 5);
		qualifiedName = qualifiedName.replace(/[\/\\]/g, '.');
		return qualifiedName;
	}

	/**
	 * Sets the ClassPath according to Qualified name generated
	 */
	private setAdvancedClassPath(codeFile: vscode.TextDocument, qualifiedName: string): void {
		const path = codeFile.uri.fsPath.replace(/[\/\\]/g, ".");
		const splitter = path.lastIndexOf(qualifiedName) - 1;
		this._classPath = codeFile.uri.fsPath.substring(0, splitter);
	}

	/**
	 * Gets the Qualified Name through the package statement declared
	 * in the code file
	 * if fails to find package declaration
	 * then returns filename
	 */

	private getAdvancedQualifiedName(codeFile: vscode.TextDocument): string {
		if (codeFile.languageId !== "java") {
			return "";
		}

		let qualifiedName = "";
		const lines = codeFile.lineCount;

		for (let i = 0; i < lines; i++) {
			let line = codeFile.lineAt(i).text;

			//Checking for multiline Comments
			if (line.includes("/*")) {
				while (!line.includes("*/")) {
					i++;
					line = codeFile.lineAt(i).text;
				}
			}

			//Checking if the Line Includes Package and it is not Commented
			if (line.includes("package") && !line.match(/\/\/.*package/g)) {
				line = line.replace(/^\s*package\s*/g, "");
				const match = line.match(/\w+(\.\w+)*/g);
				if (match) {
					qualifiedName = match[0];
				}
			}

			//Checking if the Line Includes import statement or class Declaration
			//and if it includes that then it is should not commented
			if ((line.includes("import") || line.includes("class")) && !line.match(/\/\/.*[class|import]/g)) {
				break;
			}
		}

		let fileName = this.getFileName(codeFile.uri.fsPath);
		fileName = fileName.substring(0, fileName.length - 5);
		if (qualifiedName.length > 0) {
			qualifiedName += "." + fileName;
		} else {
			qualifiedName = fileName;
		}
		this.setAdvancedClassPath(codeFile, qualifiedName);
		return qualifiedName;
	}

	/** 
	 * @param configString Name of the config to be Modified
	 * @param fileFolderPickerTitle File/Folder picker window Title
	 * @param selectFolder Ability to Select Folders
	 * @param selectMany Ability to Select Many
	 * @returns Modified config
	 */
	private async configModifierFromFileFolderPicker(configString: string, fileFolderPickerTitle: string, selectFolder: boolean = false, selectMany: boolean = false): Promise<string> {
		let configModified = "";
		await utils.openFileOrFolderPicker(fileFolderPickerTitle, selectFolder, selectMany).then((uri) => {
			if (uri) {
				//Previous Stable Build
				// if(os.platform() === "win32"){
				//     uri = uri.substr(1);
				// }
				this._config.update(configString, uri);
				vscode.window.showInformationMessage("Config Modified Successfully");
				configModified = uri;
			} else {
				vscode.window.showErrorMessage("Config Modification error using Defaults");
			}
		});

		return configModified;
	}

	/**
	 *  Gets the Input Path of File 
	 *  for IO Support in Run With IO Command
	 */
	private getInputFilePath(): string {
		return this._inputFilePath ? this._inputFilePath : "";
	}

	/**
	 *  Gets the Output Path of File 
	 *  for IO Support in Run With IO Command
	 */
	private getOutputFilePath(): string {
		return this._outputFilePath ? this._outputFilePath : "";
	}

	private mapPlaceHoldersInExecutor(executor: string, codeFile?: vscode.TextDocument) {
		if (!codeFile) {
			return executor;
		}
		let command = executor;
		// console.log(executor.replace(/\$dir/g, this.getWorkspaceDir(codeFile)));
		const placeholders: Array<{ regex: RegExp, replaceValue: string }> = [
			// A placeholder that has to be replaced by the path of the folder opened in VS Code
			// If no folder is opened, replace with the directory of the code file

			// A placeholder that has to be replaced by the code file name without its extension
			{ regex: /\$fileNameWithoutExt/g, replaceValue: utils.getInEnclosedQuotes(this.getFileNameWithoutDirAndExt(codeFile.uri.fsPath)) },

			// A placeholder that has to be replaced by the code file name without the directory
			{ regex: /\$fileName/g, replaceValue: utils.getInEnclosedQuotes(this.getFileName(codeFile.uri.fsPath)) },

			// A placeholder that has to be replaced by the Qualified Code Name in Java only
			{ regex: /\$qualifiedName/g, replaceValue: this.getQualifiedName(codeFile) },

			// A placeholder that has to be replaced by the ClassPath of Java Souce files
			{ regex: /\$classPath/g, replaceValue: utils.getInEnclosedQuotes(this.getClassPath()) },

			// A placeholder that has to be replaced by  the Input FilePath
			{ regex: /\$inputFilePath/g, replaceValue: utils.getInEnclosedQuotes(this.getInputFilePath()) },

			// A placeholder that has to be replaced by  the output FilePath
			{ regex: /\$outputFilePath/g, replaceValue: utils.getInEnclosedQuotes(this.getOutputFilePath()) },

			// A placeholder that has to be replaced by the directory of the code file
			{ regex: /\$dir/g, replaceValue: utils.getInEnclosedQuotes(this.getWorkspaceDir(codeFile.uri.fsPath)) },
		];

		placeholders.forEach((placeholder) => {
			command = command.replace(placeholder.regex, placeholder.replaceValue);
		});

		return command;
	}

	/**
	 * 	sets the Context of language Selector
	 *  Documentation : https://code.visualstudio.com/api/references/when-clause-contexts
	 */
	private setContext(): void {
		vscode.commands.executeCommand('setContext', 'code-builder.languageSelector',
			this._config.get<any>("languageSelector"));
	}

	/**
	 * Runs the Command in Respective Terminal 
	 * According to the Config set by user. 
	 */
	private async runCommandInTerminal(executor: string, document?: vscode.TextDocument) {
		if (document && this._languagesArr?.includes(document.languageId)) {
			executor = this.mapPlaceHoldersInExecutor(executor, document);
		}

		if (this._config.get<boolean>("runInExternalTerminal")) {
			this.runCommandInExternalTerminal(executor);
		} else {
			this.runCommandInInternalTerminal(executor);
		}
		// Code before 0.6.0
		// if (this._config.get<boolean>("runInExternalTerminal")) {
		// 	if (isIOCommand) {
		// 		executor = utils.addIOArgs(executor, true);
		// 	}
		// 	executor = this.mapPlaceHoldersInExecutor(executor, document);
		// 	this.runCommandInExternalTerminal(executor);

		// } else {
		// 	executor = utils.modifyForPowershell(executor, document.languageId);
		// 	if (isIOCommand) {
		// 		executor = utils.addIOArgs(executor);
		// 	}
		// 	executor = this.mapPlaceHoldersInExecutor(executor, document);

		// 	this.runCommandInInternalTerminal(executor);
		// }
	}

	/**
	 * 
	 * @param executor executor Command which is Selected As per Language
	 * @param document Document Object which is in Active Text Editor
	 * @param isIOCommand Whether the IO Command is invoked or not
	 * @returns Modified Executor based on Terminal  
	 */
	private performTerminalChecks(executor: string, document: vscode.TextDocument, isIOCommand: boolean = false) {
		const runInExternal = this._config.get<boolean>("runInExternalTerminal");

		if (!runInExternal) {
			executor = utils.modifyForPowershell(executor, document.languageId);
		}
		if (isIOCommand) {
			executor = utils.addIOArgs(executor, runInExternal);
		}

		return executor;
	}

	/**
	 * Runs Command in Internal Terminal
	 */
	private async runCommandInInternalTerminal(executor: string) {
		if (!this._terminal) {
			this._terminal = vscode.window.createTerminal("Code-Builder");
		}

		if (this._config.get<boolean>("clearTerminal")) {
			utils.clearTerminal(this._terminal);
		}
		utils.sendTextToTerminal(executor, this._terminal);
		this._terminal.show(this._config.get<boolean>("preserveFocus"));
	}

	/**
	 * Runs Command in External Terminal
	 */
	private async runCommandInExternalTerminal(executor: string) {
		executor = mapExternalCommand(executor);
		if (!executor || executor.trim().length === 0) {
			return;
		}
		this._externalProcess = exec(executor, { cwd: this.getDirName() });
		this._externalProcess.on("close", () => this._externalProcess = null);
	}

	/**
	 *  Checks if there are any open terminals from previous Instances
	 */
	private checkForOpenTerminal() {
		const openTerminals = vscode.window.terminals;
		for (let i = 0; i < openTerminals.length; i++) {
			if (openTerminals[i].name === "Code-Builder") {
				this._terminal = openTerminals[i];
			}
		}
	}

	/**
	 * @param event Event Name to be Logged
	 * @param languageId Language id to be logged
	 */
	private async logTelemetry(event: string, languageId?: string): Promise<void> {
		//creating Telemetry Data
		if (!this._appInsightsClient) {
			return;
		}

		const properties: any = {
			usingAutoClassPath: this._config.get<boolean>("useAutoClassPath") ? true : false,
			usingExternalTerminal: this._config.get<boolean>("useExternalTerminal") ? true : false,
			languageId: languageId,
			terminal: vscode.env.shell,
			version: vscode.extensions.getExtension("yaduahuja.code-builder")?.packageJSON.version,
		};

		this._appInsightsClient.sendEvent(event, properties);
	}

	dispose(): void {
		this._terminal?.dispose();
	}
}