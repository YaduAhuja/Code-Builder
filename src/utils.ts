import * as vscode from 'vscode';

export function sendTextToTerminal(text: string, terminal?: vscode.Terminal) {
	if (!terminal) {
		return;
	}

	terminal.sendText(text);
}