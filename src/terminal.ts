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

export function mapExternalCommand(executor : string, isIOCommand: boolean = false){
	switch(os.platform()){
		
		case "win32":
			return `start cmd /c "${executor} && echo( && pause"`;
		
		case "darwin":
			return `osascript -e 'tell application "Terminal" to do script "${executor}" in first window'`;
		
		case "linux":
			const linuxTerminal = getLinuxTerminal();
			if(!linuxTerminal || linuxTerminal.trim().length == 0){
				window.showErrorMessage("This Terminal is not Supported. Use a Valid a Terminal in 'terminal.external.linuxExec'");
			}

			switch(linuxTerminal){
				case "mate-terminal":
				case "tilix":
				case "gnome-terminal":
					return `${linuxTerminal} --wait -- bash -c '${executor} && echo; read -n1 -p "Press any Key to Continue"'`;
				default:
					return "";
			}

		default:
			return "";
	}
}


function getLinuxTerminal() : string | undefined{
	return workspace.getConfiguration().get<string>("terminal.external.linuxExec");
}