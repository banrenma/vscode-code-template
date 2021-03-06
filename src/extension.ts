// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import CodeTemplate from './plugin';



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed



export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "codetemplate" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	let codeTemp: CodeTemplate | undefined = undefined;

	let newcode = vscode.commands.registerCommand('codetemplate.newcode', (uri) => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// vscode.window.showInformationMessage('new code from CodeTemplate!');

		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		
		if(uri === undefined){
			let floders = vscode.workspace.workspaceFolders
			if(floders && floders.length > 0){
				uri = floders[0].uri
			}
		}
		
		if (codeTemp) {
			// If we already have a panel, show it in the target column
			codeTemp.getPanel()?.reveal(columnToShowIn);
			codeTemp.setTagetDir(uri);
			codeTemp.reEnterWebView()
		} else {
			codeTemp = new CodeTemplate();
			codeTemp.setTagetDir(uri);
			codeTemp.createWebview(context);

			codeTemp.getPanel()?.onDidDispose(
				() => {
					codeTemp = undefined;
				},
				null,
				context.subscriptions
			);

		}
	
	});



	context.subscriptions.push(newcode,);
}

// this method is called when your extension is deactivated
export function deactivate() { }
