### 0.10.3 (2022-11-08)
* Code Builder now support external jars just place them in the lib directory in project root folder.
* Improved classpath detection for java files.
* Changed java executor to support classpath for compile.

### 0.10.2 (2022-09-29)
* Added Rust Support
* Improved the terminal close detection

### 0.10.1 (2022-07-23)
* Improved Performance
* Removed Telemetry

### 0.10.0 (2022-06-27)
* Added a project run config, this config supercedes all single file configs
* Code Builder now supports Workspace Trust
* Code Builder now supports Virtual Workspaces

### 0.9.1 (2022-03-20)
* Added a new Compiler Arguments
* Added a new Setting for the C/CPP Compiler Arguments

### 0.9.0 (2022-01-03)
* Modified the Settings Now the Language Specific Settings are categorized according to language and others are in build category
* Removed the Build System Notification
* Previous Settings are marked as Deprecated
* Now the reset Command resets the whole extension's Settings

### 0.8.1 (2021-11-27)
* Added Settings Map
* Fixed Typos in Readme

### 0.8.0 (2021-11-16)
* Added a new Command to reset Extension
* Added the New Build System (Please reset Executor Map First to use this Build System without any issues)
* Fixed issues with Git-Bash on windows

### 0.7.2 (2021-11-8)
* Fixed Activation Events

### 0.7.1 (2021-11-2)
* Optimized Performance
* Added a Status Bar Widget to Switch Terminal

### 0.7.0 (2021-10-26)
* Added Support for WSL on Windows

### 0.6.3 (2021-10-05)
* Fixed Multiple Notification issue on MAC

### 0.6.2 (2021-09-28)
* Fixed iTerm Naming scheme

### 0.6.1 (2021-09-24)
* Fixed Bug where unknown files also mapped Variables in Custom Command
* Improved Custom Command
* Added Support for iTerminal

### 0.6.0 (2021-09-15)
* Added Custom Command Functionality
* Added Support for R

### 0.5.1 (2021-09-13)
* Fixed issues for Executable Languages in Powershell
* Changed the Build Command for GO

### 0.5.0 (2021-09-09)
* Added Support for Ruby
* Added Support for GO

### 0.4.2 (2021-09-03)
* Changed the Default Build command of Typescript to use ts-node

### 0.4.1 (2021-08-27)
* Fixed C/CPP Compilation when Executing in Powershell

### 0.4.0 (2021-08-23)
* Changed the Filenames to Enclosed Quotes in All Languages.
* Fixed Issues with Typescript Files when Executing in Powershell.
* Added the Execution of Source Files with WhiteSpace in their name for All Terminals.
* Removed the Terminal not Spawing after being closed in Mac.
* Improved Automatic Classpath Detection in Java

### 0.3.2 (2021-08-15)
* Fixed the Hidden External Terminal Bug in Mac

### 0.3.1 (2021-07-21)
* Language Selector can be modified from settings page no need to edit it through settings.json

### 0.3.0 (2021-07-19)
* Fixed Crashes on Linux External Terminal
* Added Support for Konsole, XFCE4 Linux Terminal
* Fixed notifications When External Terminal is not Found
* Fixed External Terminal not Spawning in Mac
* Improved Automatic ClassPath detection for Java Files

### 0.2.4 (2021-07-14)
* Added the Application Insights which will help to Know us which features need more development
* Added the Setting to Enable/Disable Application Insights
* Fixed Typos in Settings

### 0.2.3 (2021-07-12)
* Added the Support to Run Program in External Gnome-terminal, Mate-terminal, Tilix for Linux 
* Fixed issues with Preserve Focus
* Fixed Multiple External Terminal Spawns in Windows & Gnome Systems
* Added the Support for Windows to Close the External Terminal using Stop Command
* Added the Build Command for TypeScript
* Changed the preserve Focus default to false

### 0.2.2 (2021-07-10)
* Added the Setting to Run Program in External Terminal

### 0.2.1 (2021-07-04)
* Fixed the Subscription Bug of Stop Build Command

### 0.2.0 (2021-07-03)
* Added the Stop Build Command
* Made the Clear Terminal Enabled By Default

### 0.1.0 (2021-06-20)
* Added Icon
* Fixed Multiple Line Comment Bug in Automatic ClassPath

### 0.0.6 (2021-06-15)
* Fixed some bugs in Automatic Class Path detection
* Added an Option to Clear Terminal at every Run
* Added an Option to whether to Preserve Focus or not at every run
* Fixed multiple terminals issue

### 0.0.5 (2021-06-14)
* Added an Experimental Feature of Automatic Class Path Detection

### 0.0.4 (2021-06-13)
* Added License

### 0.0.3 (2021-06-13)
* Added Support for Powershell

### 0.0.2 (2021-06-12)
* Added Support for IO Files

### 0.0.1 (2021-06-11)
* Initial Release