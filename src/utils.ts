import * as vscode from 'vscode';

export function createNewTerminal(name: string = "Code-Builder"): vscode.Terminal {
	const terminal = vscode.window.createTerminal(name);
	return terminal;
}

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

	if (vscode.env.shell.toLowerCase().includes("cmd.exe")) {
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
 * Refreshes the Status Bar text 
 * @param statusBarWidget 
 * @param isExternal 
 */
export function refreshStatusBarWidget(statusBarWidget?: vscode.StatusBarItem, isExternal?: boolean) {
	if (!statusBarWidget) {
		return;
	}
	statusBarWidget.text = isExternal ? "External" : "Internal";
	statusBarWidget.show();
}