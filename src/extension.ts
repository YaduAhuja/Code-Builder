// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { CodeManager } from "./codeManager";

// this method is Scalled when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const codeManager = new CodeManager();
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	vscode.window.onDidCloseTerminal(() => {
		codeManager.onDidTerminalClosed();
	});

	const buildAndRun = vscode.commands.registerCommand("code-builder.buildAndRun", () => {
		codeManager.buildAndRun();
	});

	const buildWithIO = vscode.commands.registerCommand("code-builder.buildWithIO", () => {
		codeManager.buildWithIO();
	});

	const customCommand = vscode.commands.registerCommand("code-builder.customCommand", () => {
		codeManager.customCommand();
	});

	const stopBuild = vscode.commands.registerCommand("code-builder.stopBuild", () => {
		codeManager.stopBuild();
	});

	const setClassPath = vscode.commands.registerCommand("code-builder.setClassPath", () => {
		codeManager.setClassPath();
	});

	const setInputFilePath = vscode.commands.registerCommand("code-builder.setInputFilePath", () => {
		codeManager.setInputFilePath();
	});

	const setOutputFilePath = vscode.commands.registerCommand("code-builder.setOutputFilePath", () => {
		codeManager.setOutputFilePath();
	});

	const switchTerminal = vscode.commands.registerCommand("code-builder.switchTerminal", () => {
		codeManager.switchTerminal();
	});

	context.subscriptions.push(
		buildAndRun,
		buildWithIO,
		customCommand,
		stopBuild,
		setClassPath,
		setInputFilePath,
		setOutputFilePath,
		switchTerminal
	);
}

// this method is called when your extension is deactivated
export function deactivate() { }
