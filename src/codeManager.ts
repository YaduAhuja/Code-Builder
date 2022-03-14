"use strict";

import { dirname, win32 } from 'path';
import * as vscode from 'vscode';
import * as utils from './utils';
import { platform } from 'os';
import { mapExternalCommand } from './terminal';
import { ChildProcess, exec } from 'child_process';
import { getBuildCommand } from './builder';
import terminate from 'terminate';
import upgrade from './upgrader';
import settings from './settings';

export class CodeManager implements vscode.Disposable {
	private _config: vscode.WorkspaceConfiguration;
	private _classPath: string | undefined;
	private _inputFilePath: string | undefined;
	private _outputFilePath: string | undefined;
	private _terminal: vscode.Terminal | undefined;
	private _document: vscode.TextDocument | undefined;
	private _externalProcess: ChildProcess | null = null;
	private _appInsightsClient: any | undefined;
	private _languagesArr: Array<string> | undefined;
	private _statusBarWidget: vscode.StatusBarItem | undefined;

	constructor() {
		this._config = vscode.workspace.getConfiguration("code-builder");
		upgrade();
		this.initializeStatusBarWidget();
		this.setContext();
		this.checkForOpenTerminal();
		this.lazyLoadAppInsights();
	}

	public onDidTerminalClosed() {
		this._terminal = undefined;
	}

	/**
	 *  Initializes the Status Bar Widget 
	 */
	private async initializeStatusBarWidget() {
		this._statusBarWidget = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
		this._statusBarWidget.command = "code-builder.switchTerminal";
		this._statusBarWidget.tooltip = "Code Builder Terminal Type";
		utils.refreshStatusBarWidget(this._statusBarWidget, this._config.get<boolean>("build.runInExternalTerminal"));
	}

	/**
	 * Lazy Loads App Insights as and when needed
	 */
	private async lazyLoadAppInsights(): Promise<void> {
		if (this._config.get<boolean>("build.enableAppInsights")) {
			if (this._appInsightsClient) {
				return;
			}
			const appInsights = await import("./appInsights");
			this._appInsightsClient = new appInsights.AppInsights();
		}
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
		executor = this.performTerminalChecks(executor);
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
		executor = this.performTerminalChecks(executor, true);
		this.runCommandInTerminal(executor, document);
	}

	public async customCommand(): Promise<void> {
		if (this.isRunning()) {
			return;
		}

		const document = this.initialize();
		this.logTelemetry("customCommand", document?.languageId);
		const executor = this._config.get<string>("build.customCommand");
		if (!executor || executor.trim().length === 0) {
			return;
		}
		this.runCommandInTerminal(executor, document);
	}

	public async stopBuild(): Promise<void> {
		this.logTelemetry("stopBuild");
		if (this._config.get<boolean>("build.runInExternalTerminal")) {
			if (this._externalProcess) {
				if (platform() === "win32") {
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
	 * Switches the Terminal at runtime
	 */

	public async switchTerminal(): Promise<void> {
		const val = !this._config.get<boolean>("build.runInExternalTerminal");
		await this._config.update("build.runInExternalTerminal", val, 1);
		this._config = vscode.workspace.getConfiguration("code-builder");
		utils.refreshStatusBarWidget(this._statusBarWidget, val);
	}

	/**
	 *  Clean the Extension's Executor Map Settings to default values
	 */

	public async reset(): Promise<void> {
		const prefix = "code-builder.";
		for (const [key, value] of Object.entries(settings)) {
			const preprocessKey = key.substring(prefix.length);
			const preprocessValue = value[0].toString().substring(prefix.length);

			this._config.update(preprocessKey, undefined, value[1] === 1 ? 1 : undefined);
			this._config.update(preprocessValue, undefined, value[1] === 1 ? 1 : undefined);
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
		this._classPath = this._config.get<string>("java.classPath");
		this._inputFilePath = this._config.get<string>("build.inputFilePath");
		this._outputFilePath = this._config.get<string>("build.outputFilePath");
		const executorMap = this._config.get<object>("build.executorMap");
		if (executorMap) {
			this._languagesArr = Object.keys(executorMap);
		}

		if (this._config.get<boolean>("build.debugData")) {
			this.logDebugData(document);
		}
		if (this._config.get<boolean>("build.saveFileBeforeRun")) {
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
			const response = await this.configModifierFromFileFolderPicker("build.inputFilePath", "Select The Input File");
			if (response) {
				this._inputFilePath = response;
			} else {
				return false;
			}
		}
		if (this._outputFilePath === "" || !this._outputFilePath) {
			const response = await this.configModifierFromFileFolderPicker("build.outputFilePath", "select the Output File");
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
		this.configModifierFromFileFolderPicker("java.classPath", "Select the ClassPath Directory", true, false)
			.then((uri) => {
				this._classPath = uri;
			});
	}

	/**
	 *  sets the Input File Path
	 */
	public setInputFilePath(): void {
		this.configModifierFromFileFolderPicker("build.inputFilePath", "Select Input File", false, false);
	}

	/**
	 *  sets the Output File Path
	 */
	public setOutputFilePath(): void {
		this.configModifierFromFileFolderPicker("build.outputFilePath", "Select Output File", false, false);
	}

	/**
	 * Logs the Debug data to Console
	 */
	private logDebugData(codeFile: vscode.TextDocument): void {
		console.log("Filename : " + codeFile.fileName);
		console.log("Path : " + codeFile.uri.path);
		console.log("Is AppInsights Enabled :" + this._config.get<boolean>("build.enableAppInsights"));
		console.log("App Insights Client :" + this._appInsightsClient);
		console.log("FS Path : " + codeFile.uri.fsPath);
		console.log("Qualified Name : " + this.getQualifiedName(codeFile));
		console.log("ClassPath: " + this.getClassPath());
		console.log("Dirname : " + this.getDirName());
		console.log("Compiler Args : " + this.getCompilerArgs(codeFile, true));
		console.log("Workspace Folder : " + this.getWorkspaceFolder(codeFile));
		console.log("Languages Arr :" + this._languagesArr);
		console.log("Custom Command :" + this._config.get<string>("build.customCommand"));
		console.log("Shell : " + vscode.env.shell);
		console.log("Terminals : " + JSON.stringify(vscode.window.terminals));
		console.log("External Terminals : " + JSON.stringify(vscode.workspace.getConfiguration("terminal.external")));
	}

	/**
	 * Checks for Previous runs in External Terminal
	 */
	private isRunning(): boolean {
		if (this._config.get<boolean>("build.runInExternalTerminal") && this._externalProcess) {
			vscode.window.showInformationMessage("Build is Already Running");
			return true;
		}

		return false;
	}

	private getWorkspaceDir(codeFile: string) {
		const end = Math.max(codeFile.lastIndexOf('\/'), codeFile.lastIndexOf('\\'));

		//If the user is using Git Bash on Windows
		if (platform() === "win32" && vscode.env.shell.toLowerCase().includes('bash')) {
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
		const executorMap = this._config.get<any>("build.executorMap");
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
		if (this._config.get<boolean>("java.useAutoClassPath")) {
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
	 * @returns Compiler Arguments for Source Files respectivve to their language Id
	 */
	private getCompilerArgs(codeFile: vscode.TextDocument, debug: boolean = false): string {
		const argSettingKey = `${codeFile.languageId}.compilerArgs`;
		if (debug) {
			console.log(`Compiler Args Setting Key : ${argSettingKey}`);
		}
		return this._config.get<string>(argSettingKey) || "";
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

			// A placeholder that has to be replaced by the compiler arguments for the source files
			{ regex: /\$compilerArgs/g, replaceValue: this.getCompilerArgs(codeFile) }
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
		vscode.commands.executeCommand('setContext', 'code-builder.build.languageSelector',
			this._config.get<any>("build.languageSelector"));
	}

	/**
	 * Runs the Command in Respective Terminal 
	 * According to the Config set by user. 
	 */
	private async runCommandInTerminal(executor: string, document?: vscode.TextDocument) {
		if (document && this._languagesArr?.includes(document.languageId)) {
			executor = this.mapPlaceHoldersInExecutor(executor, document);
		}

		if (this._config.get<boolean>("build.runInExternalTerminal")) {
			this.runCommandInExternalTerminal(executor);
		} else {
			this.runCommandInInternalTerminal(executor);
		}
		// Code before 0.6.0
		// if (this._config.get<boolean>("build.runInExternalTerminal")) {
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
	 * @param isIOCommand Whether the IO Command is invoked or not
	 * @returns Modified Executor based on Terminal  
	 */
	private performTerminalChecks(executor: string, isIOCommand: boolean = false) {
		const runInExternal = this._config.get<boolean>("build.runInExternalTerminal");
		const exec = getBuildCommand(executor, vscode.env.shell, vscode.workspace.getConfiguration("terminal.external"), runInExternal, isIOCommand);
		return exec;
	}

	/**
	 * Runs Command in Internal Terminal
	 */
	private async runCommandInInternalTerminal(executor: string) {
		if (!this._terminal) {
			this._terminal = vscode.window.createTerminal("Code-Builder");
		}

		if (this._config.get<boolean>("build.clearTerminal")) {
			utils.clearTerminal(this._terminal);
		}
		utils.sendTextToTerminal(executor, this._terminal);
		this._terminal.show(this._config.get<boolean>("build.preserveFocus"));
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
			usingAutoClassPath: this._config.get<boolean>("java.useAutoClassPath") ? true : false,
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