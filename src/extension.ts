// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import {CodeManager} from "./codeManager";

// this method is Scalled when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const codeManager = new CodeManager();
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	vscode.window.onDidCloseTerminal(()=>{ 
		codeManager.onDidTerminalClosed();
	});

	let helloWorld = vscode.commands.registerCommand('code-builder.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Code Builder!');
	});
	
	let build = vscode.commands.registerCommand("code-builder.build", ()=> {
		codeManager.build();
	});
 
	
	context.subscriptions.push(helloWorld);
	context.subscriptions.push(build);
}

// this method is called when your extension is deactivated
export function deactivate() {}
