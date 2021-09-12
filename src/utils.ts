import * as vscode from 'vscode';

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
 * Clears the Terminal
 */
export function clearTerminal(terminal : vscode.Terminal): void {
	if(!terminal){
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
