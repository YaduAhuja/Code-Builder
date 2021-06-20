# Code Builder
Build & Run Code files for **C, C++, Java, JavaScript, Python** with or without Input & Output Files.


## Features

* Run code file of current active Text Editor
* Run code file With IO Files
* Select Languages at which the Extension will show Run Button

## Usages

* To run code:
  * use shortcut `Ctrl+Alt+B`
  * or press `F1` and then Select/Type `Code Builder : Build & Run File`
* To run code with IO Files :
  * use shortcut `Ctrl+Alt+K`
  * or press `F1` and then Select/Type `Code Builder : Build and Run File with IO Files`
* To Set Input File Path:
  * use shortcut `Ctrl+Alt+I`
  * or press `F1` and then Select/Type `Code Builder : Set Input File Path`
* To Set Output File Path:
  * use shortcut `Ctrl+Alt+O`
  * or press `F1` and then Select/Type `Code Builder : Set Output File Path`
* To Set ClassPath:
  * use shortcut `Ctrl+Alt+P`
  * or press `F1` and then Select/Type `Code Builder : Set Class Path`

## Configuration

Make sure the executor PATH of each language is set in the environment variable.
You could also add entry into `code-builder.executorMap` to set the executor PATH.

**Note :** if you add an entry in executorMap make sure that language for which you added the entry is present in Language Selector as well otherwise run button will not show in editor.
```json
{
    "code-runner.executorMap": {
		"c": "cd $dir && g++ $fileName -o $fileNameWithoutExt && $dir$fileNameWithoutExt",
		"cpp": "cd $dir && g++ $fileName -o $fileNameWithoutExt && $dir$fileNameWithoutExt",
		"python": "cd $dir && python $fileName",
		"java": "cd $dir && javac $fileName && java -cp $classPath $qualifiedName",
		"javascript": "cd $dir && node $fileName"
    }
}
```

**Supported customized parameters**
  * **$dir**: The directory of the code file being run
  * **$fileName**: The base name of the code file being run, that is the file without the directory
  * **$fileNameWithoutExt**: The base name of the code file being run without its extension
  * **$qualifiedName**: The qualified name of the code file for Java
  * **$classPath**: the ClassPath for Java Source Files

**Please take care of the back slash and the space in file path of the executor**
  * Back slash: please use `\\`
  * If there ares spaces in file path, please use `\"` to surround your file path

To set the languages at which the run button will show(Default is Given Below):
```json
{
	"code-builder.languageSelector" : ["java", "python", "cpp", "c", "javascript"]
}
```

To set whether to save the current file before running (default is true):
```json
{
    "code-builder.saveFileBeforeRun": true
}
```

To set Whether to log the Debug data in Console (default is false):
```json
{
    "code-builder.debugData": false
}
```

To set Whether to Clear the Terminal before Every Run (default is false):
```json
{
    "code-builder.clearTerminal": false
}
```

To set Whether to Preserve Focus at every run or not (default is true):
```json
{
    "code-builder.preserveFocus": true
}
```

To set Whether to use Automatic Class Path Detection (default is false):
**Note :** This is an Experimental Feature and may have some issues
```json
{
    "code-builder.useAutoClassPath": false
}
```

To set ClassPath for Java Source Files which will be Replaced with **$classPath** (default is "." , the JVM will use Current Folder as ClassPath) :

**Note :** Edit this setting through **Set Class Path** command only

```json
{
    "code-builder.classPath": "."
}
```
To set Input File Path for replaced with **$inputFilePath** (default is "") :

**Note :** Edit this setting through **Set Input File Path** command only

```json
{
    "code-builder.inputFilePath": ""
}
```

To set Output File Path for replaced with **$outputFilePath** (default is "") :

**Note :** Edit this setting through **Set Output File Path** command only

```json
{
    "code-builder.outputFilePath": ""
}
```

## Issues
Submit the [issues](https://github.com/YaduAhuja/Code-Builder/issues) if you find any bug or have any suggestion.

## Contribution
Fork the [repo](https://github.com/YaduAhuja/Code-Builder) and submit pull requests.