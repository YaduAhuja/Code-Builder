import { platform } from "os";

/**
 * Gets the Build command for the run and takes care for terminals where the build will run
 * @param executor the Executor String for Language
 * @param terminal The Terminal Where command is going to be executed
 */
export function getBuildCommand(executor: string, shell: string, externalTerminals: any, isExternal: boolean = false, isIOCommand: boolean = false) {
	const terminal = getTerminalForBuild(shell, externalTerminals, isExternal);

	if (!terminal) {
		console.log("Terminal not found");
		return undefined;
	}

	executor = getExecutorForTerminal(executor, terminal);
	if (isIOCommand) {
		executor = addIOArgs(executor, terminal);
	}
	return executor;
}

/**
 * @param shell integrated terminal
 * @param externalTerminals External Terminals Object
 * @param isExternal Flag tells if the build is External or not
 * @returns Terminal where the build will run
 */
function getTerminalForBuild(shell: string, externalTerminals: any, isExternal: boolean): string | undefined {
	if (!isExternal) {
		return shell;
	}
	switch (platform()) {
		case "win32": return externalTerminals["windowsExec"];
		case "linux": return externalTerminals["linuxExec"];
		case "darwin": return externalTerminals["osxExec"];
	}

	return undefined;
}

/**
 * @param executor the generic build command
 * @param terminal the Terminal where the command will be used
 * @returns specific terminal executor
 */
function getExecutorForTerminal(executor: string, terminal: string): string {
	terminal = terminal.toLowerCase();
	if (terminal.includes("powershell.exe")) {
		return modifyForPowershell(executor);
	}

	if (terminal.includes("cmd.exe")) {
		return modifyForCMD(executor);
	}

	return executor;
}


/**
 * If the Shell is Powershell then it will change the executor according to it 
 * otherwise it will not change the executor
 */
function modifyForPowershell(executor: string): string {
	//Currently the Powershell does'nt supports the '&&' Operator but
	//it will be available in powershell 7

	executor = executor.replace(/&&/g, ";");
	return executor;
}

/**
 * If the Shell is CMD then it will change the executor according to it 
 * otherwise it will not change the executor
 */
function modifyForCMD(executor: string): string {
	//Replaces the Linux/Unix build Command to cmd Command by changing the slashes
	executor = executor.replace(/\//g, "\\");
	return executor;
}


/**
 * Adds the IO arguments for executor
 * @param executor the Build Command for the Terminal
 * @param terminal the terminal where the build will run
 */
function addIOArgs(executor: string, terminal: string): string {
	if (!terminal.includes("powershell")) {
		return executor + " < $inputFilePath > $outputFilePath";
	}

	const splitter = executor.lastIndexOf(";") + 1;

	executor = executor.substring(0, splitter) + " Get-Content $inputFilePath | " +
		executor.substring(splitter) + " | Set-Content $outputFilePath";

	return executor;
}