// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { CodeManager } from "./codeManager";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const codeManager = new CodeManager();
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	// vscode.env.onDidChangeTelemetryEnabled((isTelemetryEnabled) => {
	// 	codeManager.onDidChangeTelemetryEnabled(isTelemetryEnabled);
	// });

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

	const setProjectBuildCommand = vscode.commands.registerCommand("code-builder.setProjectBuildCommand", () => {
		codeManager.setProjectBuildCommand();
	});

	// Created in 0.9.0 to remove Build System keys
	// to be Removed in 0.11 
	updateGlobalState(context, "newBuildSystemMessage", undefined);

	const reset = vscode.commands.registerCommand("code-builder.reset", () => {
		codeManager.reset();

		// Dummy Code for Upgrader for testing purpose
		// const conf = vscode.workspace.getConfiguration("code-builder");
		// const obj = {
		// 	"code-builder.inputFilePath": "code-builder.build.inputFilePath",
		// 	"code-builder.outputFilePath": "code-builder.build.outputFilePath",
		// };
		// console.log(conf);
		// const matcher = /code-builder./g;
		// for (const [key, value] of Object.entries(obj)) {
		// 	const preprocessKey = key.replace(matcher, "").trim();
		// 	const preprocessValue = value.replace(matcher, "").trim();
		// 	console.log("Upgrading Value from " + preprocessKey + " to " + preprocessValue);
		// 	conf.update(preprocessValue, conf.get(preprocessKey));
		// 	conf.update(preprocessKey, undefined);
		// }

		// console.log(conf);
	});

	context.subscriptions.push(
		buildAndRun,
		buildWithIO,
		customCommand,
		stopBuild,
		setClassPath,
		setInputFilePath,
		setOutputFilePath,
		setProjectBuildCommand,
		switchTerminal,
		reset
	);

	// New Build System Messages To be removed in 0.9.0 (Removed)
	// const showBuildSystemMessage = context.globalState.get("newBuildSystemMessage");
	// if (!showBuildSystemMessage) {
	// 	vscode.window.showInformationMessage("This Version of Code Builder comes with new Build System. If you face any issues then use \"Reset\" Command and try again"
	// 		, "Do not show this Message Again").then((resolved) => {
	// 			if (!resolved) {
	// 				return;
	// 			}

	// 			updateGlobalState(context, "newBuildSystemMessage", true);
	// 		});
	// }
}

// this method is called when your extension is deactivated
export function deactivate() { }

/**
 * Updates the Global New Build System Message State of Extension
 */
function updateGlobalState(context: vscode.ExtensionContext, key: string, value: any) {
	context.globalState.update(key, value);
}