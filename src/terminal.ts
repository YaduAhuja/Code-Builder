"use strict";

import * as os from 'os';
import { window, workspace } from 'vscode';

/**
 * 
 * Modifies the Internal Terminal Command to External Terminal
 * @param executor Script for Internal Terminal
 * @param isIOCommand to be used in Future Builds
 * @returns External Terminal Script
 */

export function mapExternalCommand(executor: string, isIOCommand: boolean = false) {
	switch (os.platform()) {

		case "win32":
			return `start cmd /c "${executor} && echo( && pause"`;

		case "darwin":
			//Escaping the Sequences for External Terminal
			executor = executor.replace(/\"/g, "\\\"");
			return `osascript -e 'tell application "Terminal" to activate' -e 'tell app "Terminal" to do script "${executor}" in first window '`;

		case "linux":
			const linuxTerminal = getLinuxTerminal();
			if (!linuxTerminal || linuxTerminal.trim().length === 0) {
				window.showErrorMessage("External Terminal not set. Use a Valid a Terminal in 'terminal.external.linuxExec'");
			}

			switch (linuxTerminal) {
				case "mate-terminal":
				case "tilix":
				case "gnome-terminal":
					return `${linuxTerminal} --wait -- bash -c '${executor} && echo; read -n1 -p "Press any Key to Continue"'`;
				case "konsole":
					return `${linuxTerminal} -e bash -c '${executor} && echo read -n1 -p "Press any Key to Continue"'`;
				case "xfce4-terminal":
					executor = executor.replace(/\"/g, "\\\"");
					return `${linuxTerminal} -e 'bash -c "${executor} && echo; read -n1 -p \\"Press any Key to Continue\\""'`;
				default:
					window.showErrorMessage("This Terminal is not Supported yet Switch to a Gnome-Terminal,Konsole");
					return "";
			}

		default:
			return "";
	}
}


function getLinuxTerminal(): string | undefined {
	return workspace.getConfiguration().get<string>("terminal.external.linuxExec");
}