"use strict";
import { dirname, win32 } from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import { getProcessTree } from 'windows-process-tree';

export class CodeManager implements vscode.Disposable{
	private _config: vscode.WorkspaceConfiguration;
	private _classPath: string | undefined;
	private _inputFilePath: string | undefined;
	private _outputFilePath : string | undefined;
	private _terminal : vscode.Terminal | null = null;
	private _document: vscode.TextDocument | null = null;

	constructor(){
		this._config = vscode.workspace.getConfiguration("code-builder");
		this.setContext();
		this.checkForOpenTerminal();
	}

	public onDidTerminalClosed(){
		this._terminal = null;
	}


	public async buildAndRun(): Promise<void> {
		const document = this.initialize();
		if(!document){
			return;
		}
		this._document = document;
		
		let executor = this.getExecutor(this._document.languageId);
		if(!executor){
			return;
		}
		executor = this.modifyForPowershell(executor);
		executor = this.mapPlaceHoldersInExecutor(executor, this._document);
		this.runCommandInTerminal(executor);
	}
	
	public async buildWithIO():Promise<void>{
		const document = this.initialize();
		if(!document){
			return;
		}
		this._document = document;
		
		//Checking if the IO Files Paths are Set or Not
		const ioFlag = await this.checkInputOutputFilePaths();
		if(!ioFlag){
            return;
        }

		let executor = this.getExecutor(this._document.languageId);
		if(!executor){
			return;
		}
	
		executor = this.modifyForPowershell(executor);
		executor = this.addIOArgs(executor);
		executor = this.mapPlaceHoldersInExecutor(executor, this._document);
		this.runCommandInTerminal(executor);
	}

	/**
	 * Initializes the Extension
	 * @returns code Document which is Currently Opened in editor
	 */

	private initialize():vscode.TextDocument | undefined {
		
		const editor = vscode.window.activeTextEditor;
		let document = undefined;
		if(editor){
			document = editor.document;
		}else{
			return undefined;
		}

		this._config = vscode.workspace.getConfiguration("code-builder");
		this._classPath = this._config.get<string>("classPath");
		this._inputFilePath = this._config.get<string>("inputFilePath");
		this._outputFilePath = this._config.get<string>("outputFilePath");

		if(this._config.get<boolean>("debugData")){
			this.logDebugData(document);
		}
		if(this._config.get<boolean>("saveFileBeforeRun")){
			document.save();
		}

		return document;
	}

	/**
     *  Checks the Input and Output File Paths
     *  If the Paths are not present then opens
     *  File Picker to select IO Files
     */

	 private async checkInputOutputFilePaths(): Promise<boolean>{
        let areInputOutputFilePathsPresent = true;
        if(this._inputFilePath === "" || !this._inputFilePath){
            const response = await this.configModifierFromFileFolderPicker("inputFilePath","Select The Input File");
            if(response){
                this._inputFilePath = response;
            }else{
                return false;
            }
        }
        if(this._outputFilePath === "" || !this._outputFilePath){
            const response = await this.configModifierFromFileFolderPicker("outputFilePath","select the Output File");
            if(response){
                this._outputFilePath = response;
            }else{
                return false;
            }
        }

        return areInputOutputFilePathsPresent;
    }

	/**
	 *  sets the ClassPath for Java Source Files
	 */
	 public setClassPath(): void{
		this.configModifierFromFileFolderPicker("classPath","Select the ClassPath Directory",true,false)
		.then((uri) => {
			this._classPath = uri;
		});
	}

	/**
	 *  sets the Input File Path
	 */
	public setInputFilePath(): void {
        this.configModifierFromFileFolderPicker("inputFilePath","Select Input File",false,false);
    }

	/**
	 *  sets the Output File Path
	 */
    public setOutputFilePath(): void {
        this.configModifierFromFileFolderPicker("outputFilePath","Select Output File",false,false);
    }
	
	/**
	 * Logs the Debug data to Console
	 */
	private logDebugData(codeFile: vscode.TextDocument) : void {
		console.log("Filename : " + codeFile.fileName);
		console.log("Path : " + codeFile.uri.path);
		console.log("FS Path : " + codeFile.uri.fsPath);
		if(codeFile.languageId === "java"){
			console.log("Qualified Name : "+ this.getQualifiedName(codeFile));
			console.log("ClassPath: "+ this.getClassPath());
		}
		console.log("Workspace Folder : "+ this.getWorkspaceFolder(codeFile));
		console.log("Shell : "+ vscode.env.shell);
		console.log("Terminals : "+ vscode.window.terminals);
	}

	/**
	 * Adds the IO arguments for executor
	 */
	private addIOArgs(executor : string): string{
		if(!vscode.env.shell.toLowerCase().includes("powershell")){
			return executor += " < $inputFilePath > $outputFilePath";
		}

		const splitter = executor.lastIndexOf(";")+1;

		executor = executor.substring(0,splitter) + " Get-Content $inputFilePath | "+
					executor.substring(splitter)+" | Set-Content $outputFilePath";

		return executor;
	}

	/**
	 * If the Shell is Powershell then it will change the executor according to it 
	 * otherwise it will not change the executor
	 */
	private modifyForPowershell(executor : string): string {
		//Currently the Powershell does'nt supports the '&&' Operator but
		//it will be available in powershell 7

		//if there is no powershell then return
		if(!vscode.env.shell.toLowerCase().includes("powershell")){
			return executor;
		}

		executor = executor.replace(/&&/g,";");
		return executor;
	}

	private getWorkspaceDir(codeFile: string) {
		const end = Math.max(codeFile.lastIndexOf('\/'), codeFile.lastIndexOf('\\'));
		
		//If the user is using Git Bash on Windows
		if(os.platform() === "win32" && vscode.env.shell.toLowerCase().includes('bash')){
			return codeFile.substring(0,end);
		}
		return codeFile.substring(0,end+1);
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

	/**
	 *  Gets the Qualified Name used in Running
	 *  of Java Files with Package Declarations
	 *  it is Calculated based on the Classpath 
	 *  set in the Project (Default is .)
	 */
	private getQualifiedName(codeFile: vscode.TextDocument): string{
		if(this._config.get<boolean>("useAutoClassPath")){
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
		if(fsPath.includes(classPath) && classPath.length !== 1){
			splitter = classPath.length+1;
		}else {
			splitter = this.getDirName(codeFile).length+1;
			this._classPath = ".";
		}

		let qualifiedName = fsPath.substring(splitter, fsPath.length-5); 
		qualifiedName = qualifiedName.replace(/[\/\\]/g,'.');
		return qualifiedName;
	}	

	/**
	 * Sets the ClassPath according to Qualified name generated
	 */
	private setAdvancedClassPath(codeFile : vscode.TextDocument, qualifiedName: string) : void {
		const path = codeFile.uri.fsPath.replace(/[\/\\]/g,".");
		const splitter = path.indexOf(qualifiedName)-1;
		this._classPath = codeFile.uri.fsPath.substring(0,splitter);
	}

	/**
	 * Gets the Qualified Name through the package statement declared
	 * in the code file
	 * if fails to find package declaration
	 * then returns filename
	 */

	private getAdvancedQualifiedName(codeFile : vscode.TextDocument) : string {
		let qualifiedName = "";
		const lines = codeFile.lineCount;
		
		for(let i = 0; i < lines; i++){
			let line = codeFile.lineAt(i).text;

			//Checking for multiline Comments
			if(line.includes("/*")){
				while(!line.includes("*/")){
					i++;
					line = codeFile.lineAt(i).text;
				}
			}
			
			//Checking if the Line Includes Package and it is not Commented
			if(line.includes("package") && !line.match(/\/\/.*package/g)){
				line = line.replace(/^\s*package\s*/g,"");
				const match = line.match(/\w+(\.\w+)*/g);
				if(match){
					qualifiedName = match[0];
				}
			}
			
			//Checking if the Line Includes import statement or class Declaration
			//and if it includes that then it is should not commented
			if((line.includes("import") || line.includes("class")) && !line.match(/\/\/.*[class|import]/g)){
				break;
			}
		}
		
		let fileName = this.getFileName(codeFile.uri.fsPath);
		fileName = fileName.substring(0,fileName.length-5);
		if(qualifiedName.length > 0){
			qualifiedName += "." + fileName;
		}else{
			qualifiedName = fileName;
		}
		this.setAdvancedClassPath(codeFile, qualifiedName);
		return qualifiedName;
	}

	/**
     * Invokes A File or Folder Selector
     * if Selector is successful then returns the Path
     * else returns Empty String
     */
	 private async openFileOrFolderPicker(title: string, selectFolder: boolean = false, selectMany: boolean = false): Promise<string> {
        let returnString = "";
        await vscode.window.showOpenDialog({
            title:title,
            canSelectFolders: selectFolder,
            canSelectMany: selectMany,
            canSelectFiles: !selectFolder,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            filters: {"Text Files":["txt"]}
        }).then((uri) => {
            if(uri){
				//Previous Stable Build
				//returnString  = uri[0].path;
                returnString  = uri[0].fsPath;
            }
        });
        return returnString;
    }

	/** 
	 * @param configString Name of the config to be Modified
	 * @param fileFolderPickerTitle File/Folder picker window Title
	 * @param selectFolder Ability to Select Folders
	 * @param selectMany Ability to Select Many
	 * @returns Modified config
	 */
	private async configModifierFromFileFolderPicker(configString: string, fileFolderPickerTitle: string,selectFolder: boolean = false, selectMany: boolean = false): Promise<string>{
        let configModified = "";
        await this.openFileOrFolderPicker(fileFolderPickerTitle, selectFolder, selectMany).then((uri) =>{
            if(uri){
				//Previous Stable Build
				// if(os.platform() === "win32"){
                //     uri = uri.substr(1);
                // }
                this._config.update(configString,uri);
                vscode.window.showInformationMessage("Config Modified Successfully");
                configModified = uri;
            }else{
                vscode.window.showErrorMessage("Config Modification error using Defaults");
            }
        });

        return configModified;
    }

	private getInEnclosedQuotes(text: string) :string{
		return "\""+text+"\"";
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
			{ regex: /\$classPath/g, replaceValue: this.getInEnclosedQuotes(this.getClassPath()) },
			
			// A placeholder that has to be replaced by  the Input FilePath
			{ regex: /\$inputFilePath/g, replaceValue: this.getInEnclosedQuotes(this.getInputFilePath())},
			
			// A placeholder that has to be replaced by  the output FilePath
			{ regex: /\$outputFilePath/g, replaceValue: this.getInEnclosedQuotes(this.getOutputFilePath())},
		
			// A placeholder that has to be replaced by the directory of the code file
			{ regex: /\$dir/g, replaceValue: this.getInEnclosedQuotes(this.getWorkspaceDir(codeFile.uri.fsPath)) },
		];

		placeholders.forEach((placeholder) => {
			command = command.replace(placeholder.regex, placeholder.replaceValue);
		});

		return command !== executor ? command : "";
	}

	/**
	 * 	sets the Context of language Selector
	 *  Documentation : https://code.visualstudio.com/api/references/when-clause-contexts
	 */
	private setContext(): void {
		vscode.commands.executeCommand('setContext','code-builder.languageSelector',
		this._config.get<any>("languageSelector"));
	}

	/**
	 * Checking if the Code Builder is Already Running or not
	 */
	 private async isRunning(): Promise<boolean|undefined>{
		if(!this._terminal) {
			return false;
		}
		let resolution:any = undefined;

		const pid = await this._terminal?.processId;
		if(!pid){
			return false;
		}

		getProcessTree(pid,(tree) => {
			// console.log(tree);
			if(tree.children.length > 0){
				resolution = true;
			}else{
				resolution = false;
			}
		});

		return new Promise((resolve)=> {
			const check = setInterval(()=> {
				// console.log("reso" + resolution);
				if(resolution !== undefined){
					resolve(resolution);
					clearInterval(check);
				}
			},30);
		});
	}

	private async runCommandInTerminal(executor : string, isIOCommand: boolean = false): Promise<any> {
		if(!this._terminal){
			this._terminal = vscode.window.createTerminal("Code-Builder");
		}
		
		if(this._config.get<boolean>("clearTerminal")){
			vscode.commands.executeCommand("workbench.action.terminal.clear");
			if(this._config.get<boolean>("preserveFocus")){
				vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
			}
		}

		this._terminal.show(this._config.get<boolean>("preserveFocus"));
		this._terminal.sendText(executor);
	}

	/**
	 *  Checks if there are any open terminals from previous Instances
	 */
	private checkForOpenTerminal(){
		const openTerminals = vscode.window.terminals; 
		for(let i = 0; i < openTerminals.length; i++){
			if(openTerminals[i].name === "Code-Builder"){
				this._terminal = openTerminals[i];
			}
		}
	}

	dispose() : void {
		this._terminal?.dispose();
	}
}