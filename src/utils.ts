import * as vscode from 'vscode';
import config from './config';

export function sendTextToTerminal(text: string, terminal?: vscode.Terminal) {
	if (!terminal) {
		return;
	}

	terminal.sendText(text);
}

export function getInEnclosedQuotes(text: string): string {
	return "\"" + text + "\"";
}

/**
 * Clears the Passed Terminal
 */
export function clearTerminal(terminal: vscode.Terminal): void {
	if (!terminal) {
		return;
	}

	if (vscode.env.shell.toLowerCase().includes("cmd")) {
		sendTextToTerminal("cls", terminal);
	} else {
		sendTextToTerminal("clear", terminal);
	}
	vscode.commands.executeCommand("workbench.action.terminal.clear");
}

/**
 * Invokes A File or Folder Selector
 * if Selector is successful then returns the Path
 * else returns Empty String
 */
export async function openFileOrFolderPicker(title: string, selectFolder: boolean = false, selectMany: boolean = false): Promise<string> {
	let returnString = "";
	await vscode.window.showOpenDialog({
		title: title,
		canSelectFolders: selectFolder,
		canSelectMany: selectMany,
		canSelectFiles: !selectFolder,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		filters: { "Text Files": ["txt"] }
	}).then((uri) => {
		if (uri) {
			//Previous Stable Build
			//returnString  = uri[0].path;
			returnString = uri[0].fsPath;
		}
	});
	return returnString;
}

/**
 * Adds the IO arguments for executor
 */
export function addIOArgs(executor: string, isExternal: boolean = false): string {
	if (!vscode.env.shell.toLowerCase().includes("powershell") || isExternal) {
		return executor += " < $inputFilePath > $outputFilePath";
	}

	const splitter = executor.lastIndexOf(";") + 1;

	executor = executor.substring(0, splitter) + " Get-Content $inputFilePath | " +
		executor.substring(splitter) + " | Set-Content $outputFilePath";

	return executor;
}

/**
 * If the Shell is Powershell then it will change the executor according to it 
 * otherwise it will not change the executor
 */
export function modifyForPowershell(executor: string, languageId: string): string {
	//Currently the Powershell does'nt supports the '&&' Operator but
	//it will be available in powershell 7

	//if there is no powershell then return
	if (!vscode.env.shell.toLowerCase().includes("powershell")) {
		return executor;
	}

	executor = executor.replace(/&&/g, ";");
	//Issue of Running the Current Directory Files with './' Prefix in Powershell
	//As the current directory is not in Path of Powershell
	if (config.executableLanguages.includes(languageId)) {
		const splitter = executor.lastIndexOf("$dir");
		executor = executor.substring(0, splitter) + "./" + executor.substring(splitter + 4);
	}
	return executor;
}