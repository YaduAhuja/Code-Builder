"use strict";

import * as os from 'os';

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
		default:
			return "";
	}
}