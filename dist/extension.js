/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const util_1 = __webpack_require__(3);
const vscode = __webpack_require__(1);
class CodeTemplate {
    constructor() {
    }
    setTagetDir(targetDirUri) {
        this._targetDirUri = targetDirUri;
    }
    async createWebview(context) {
        const panel = vscode.window.createWebviewPanel("codetemplate", "code template", vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        const cssUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'view.css'));
        const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'view.js'));
        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cat Coding</title>
                <link rel="stylesheet" type="text/css" href="${cssUri}">
            </head>
            <body>
                <h1 class="red"">Code Template</h1>
                <div id="root">
                    <div id="template_parent" class="flexline">
                        <input disabled></input>
                        <button>select template floder</button>
                    </div>

                    <div id="output_parent" class="flexline">
                        <input disabled></input>
                        <button>select output floder</button>
                    </div>
                    
                    <div id="author_parent" class="input_desc">
                        <div>AUTHOR</div>
                        <input></input>
                    </div>
                    <div id="time_parent" class="input_desc">
                        <div>TIME</div>
                        <input></input>
                    </div>
                    <div id="tag_parent" class="tab">

                    </div>
                    <div id="menu_parent" class="tab">

                    </div>
                    <div id="content_parent" class="input_desc">

                    </div>

                    <div id="btn_parent">
                        <button id="create">create</button>
                        <button id="cancel">cancel</button>
                    </div>

                </div>
                <script  src="${scriptUri}"></script>
            </body>
            </html>
        `;
        panel.webview.onDidReceiveMessage(message => {
            switch (message.event) {
                case 'openTemplateFloder':
                    this.openCodeTemplateFloder();
                    break;
                case "openOutputFloder":
                    this.openOutputFloder();
                    break;
                case "loadTagContent":
                    this.readTagContent(message.tag);
                    break;
                case "createTemplate":
                    this.createTempate(message).catch(err => {
                        console.error(err.toString());
                        vscode.window.showErrorMessage(err.toString());
                    });
                    this._panel?.dispose();
                    break;
                case "cancelCreate":
                    this._panel?.dispose();
                    break;
                case "showMessage":
                    vscode.window.showInformationMessage(message.msg);
                    break;
            }
        }, undefined, context.subscriptions);
        this._panel = panel;
        this.reEnterWebView();
    }
    reEnterWebView() {
        let author = vscode.workspace.getConfiguration().get("codetemplate.author");
        this._panel?.webview.postMessage({ event: "onCreateWebview", targetDir: this._targetDirUri?.path, author: author });
        this.readTemplateDir(undefined);
    }
    async readConfigByUri(fileUri) {
        let content = await vscode.workspace.fs.readFile(fileUri);
        let cObj = JSON.parse(new util_1.TextDecoder().decode(content));
        return cObj;
    }
    async readTagContent(tag) {
        if (!this._dirUri) {
            return;
        }
        let fileUri = vscode.Uri.joinPath(this._dirUri, tag, "config.json");
        let cObj;
        cObj = await this.readConfigByUri(fileUri).catch(err => {
            vscode.window.showErrorMessage(" error : " + err.toString());
            cObj = null;
        });
        this.postMessage({
            event: "loadTagContentReturn",
            content: cObj,
            tag: tag
        });
    }
    async openCodeTemplateFloder() {
        const options = {
            canSelectMany: false,
            canSelectFiles: false,
            canSelectFolders: true,
            title: 'Open Code Template Folder',
        };
        let selected = await vscode.window.showOpenDialog(options);
        if (selected) {
            let dirUri = selected[0];
            setTimeout(() => {
                vscode.workspace.getConfiguration().update("codetemplate.templateDir", dirUri.path, true);
                this.readTemplateDir(dirUri.path);
            }, 10);
        }
    }
    async openOutputFloder() {
        const options = {
            canSelectMany: false,
            canSelectFiles: false,
            canSelectFolders: true,
            title: 'Open Code Template Folder',
        };
        let selected = await vscode.window.showOpenDialog(options);
        if (selected) {
            let dirUri = selected[0];
            this.postMessage({ event: "selectOutputPath", targetDir: dirUri.path });
        }
    }
    async readTemplateDirByString(path) {
        let dirUri = vscode.Uri.file(path);
        this._dirUri = dirUri;
        let dirs = await vscode.workspace.fs.readDirectory(dirUri);
        let rets = [];
        if (dirs) {
            for (let v of dirs) {
                if (v[1] === 2) {
                    rets.push(v[0]);
                }
            }
        }
        return rets;
    }
    async readTemplateDir(dirPath) {
        if (!this._panel) {
            return;
        }
        if (!dirPath) {
            dirPath = String(vscode.workspace.getConfiguration().get("codetemplate.templateDir"));
        }
        let isInvalidDir = false;
        let message = {
            event: "refreshTemplateDir",
        };
        if (dirPath !== undefined || dirPath !== "") {
            let dirs = await this.readTemplateDirByString(dirPath).catch(err => {
                console.log("can not find template dir");
                isInvalidDir = true;
            });
            message.dirs = dirs;
        }
        else {
            isInvalidDir = true;
        }
        message.dirPath = dirPath;
        message.isInvalidDir = isInvalidDir;
        this.postMessage(message);
    }
    postMessage(message) {
        if (!this._panel) {
            return;
        }
        this._panel.webview.postMessage(message);
    }
    async replaceVar(content, vars) {
        let stringArr = [];
        let state = 0; // $ 
        let contentLen = content.length;
        let c, nextC;
        let startIndex = 0;
        for (let i = 0; i < contentLen; i++) {
            c = content.charAt(i);
            if (state === 0) {
                // normal  state
                if (c === '$') {
                    nextC = content.charAt(i + 1);
                    if (nextC === "{") {
                        // switch var read
                        state = 1;
                        stringArr.push(content.substring(startIndex, i));
                        startIndex = i + 2;
                    }
                }
            }
            else if (state === 1) {
                // var state
                if (c === '}') {
                    let varName = content.substring(startIndex, i);
                    if (vars.hasOwnProperty(varName)) {
                        stringArr.push(vars[varName]);
                    }
                    else {
                        stringArr.push("${undefined}");
                        console.warn("can not find varname ", varName);
                    }
                    state = 0;
                    startIndex = i + 1;
                }
            }
        }
        if (state === 1) {
            let varName = content.substring(startIndex, contentLen);
            stringArr.push("${" + varName);
        }
        else {
            stringArr.push(content.substring(startIndex, contentLen));
        }
        return stringArr.join("");
    }
    async checkFileIsExist(outputUri) {
        let isExist = true;
        try {
            await vscode.workspace.fs.stat(outputUri);
        }
        catch (err) {
            isExist = false;
        }
        return isExist;
    }
    async handleOneFile(srcDir, name, vars, outputDir) {
        console.log(srcDir.path, name, outputDir.path);
        let fileUri = vscode.Uri.joinPath(srcDir, name);
        let unt8Arr = await vscode.workspace.fs.readFile(fileUri);
        let content = new util_1.TextDecoder().decode(unt8Arr);
        let warpIndex = content.indexOf("\n");
        let firstLine;
        if (warpIndex !== -1) {
            firstLine = content.substring(0, warpIndex);
        }
        firstLine = firstLine ? firstLine.trim() : content.trim();
        let newName = name;
        if (/^__.*\$\{.*\}.*__$/.test(firstLine)) {
            if (warpIndex !== -1) {
                content = content.substring(warpIndex + 1, content.length);
            }
            newName = await this.replaceVar(firstLine, vars);
            newName = newName.substring(2, newName.length - 2);
        }
        let outputContent = await this.replaceVar(content, vars);
        let outputUri = vscode.Uri.joinPath(outputDir, newName);
        // console.log(vscode.FileSystemError.FileExists(outputUri))
        let isExist = await this.checkFileIsExist(outputUri);
        if (isExist) {
            throw new Error(`"file already exist!" ${outputUri.path}`);
        }
        // filehandler
        console.log("==========write==>>", outputUri.path);
        await vscode.workspace.fs.writeFile(outputUri, new util_1.TextEncoder().encode(outputContent));
    }
    async handleDir(dirUri, vars, outputUri) {
        // if (!vscode.FileSystemError.FileExists(outputUri)) {
        //     vscode.workspace.fs.createDirectory(outputUri)
        // }
        let dirs = await vscode.workspace.fs.readDirectory(dirUri);
        if (dirs) {
            for (let v of dirs) {
                if (v[1] === 1) {
                    // 文件
                    await this.handleOneFile(dirUri, v[0], vars, outputUri);
                }
                else if (v[1] === 2) {
                    //文件夹
                    await this.handleDir(vscode.Uri.joinPath(dirUri, v[0]), vars, vscode.Uri.joinPath(outputUri, v[0]));
                }
            }
        }
    }
    async createTempate(createParams) {
        console.log(createParams);
        let config = createParams.config;
        let outputUri = vscode.Uri.file(createParams.targetPath);
        let varMap = createParams.vars;
        let srcUri = vscode.Uri.joinPath(vscode.Uri.file(createParams.templatePath), createParams.tag);
        let author = vscode.workspace.getConfiguration().get("codetemplate.author");
        if ((author === "" || author === undefined) && varMap["AUTHOR"] !== "") {
            vscode.workspace.getConfiguration().update("codetemplate.author", varMap["AUTHOR"], true);
        }
        for (let t of config.template) {
            switch (t.type) {
                case "file":
                    await this.handleOneFile(srcUri, t.name, varMap, outputUri);
                    break;
                case "dir":
                    await this.handleDir(vscode.Uri.joinPath(srcUri, t.name), varMap, outputUri);
                    break;
            }
        }
    }
    getPanel() {
        return this._panel;
    }
}
;
exports["default"] = CodeTemplate;


/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("util");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __webpack_require__(1);
const plugin_1 = __webpack_require__(2);
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "codetemplate" is now active!');
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let codeTemp = undefined;
    let newcode = vscode.commands.registerCommand('codetemplate.newcode', (uri) => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        // vscode.window.showInformationMessage('new code from CodeTemplate!');
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (codeTemp) {
            // If we already have a panel, show it in the target column
            codeTemp.getPanel()?.reveal(columnToShowIn);
            codeTemp.setTagetDir(uri);
            codeTemp.reEnterWebView();
        }
        else {
            codeTemp = new plugin_1.default();
            codeTemp.setTagetDir(uri);
            codeTemp.createWebview(context);
            codeTemp.getPanel()?.onDidDispose(() => {
                codeTemp = undefined;
            }, null, context.subscriptions);
        }
    });
    context.subscriptions.push(newcode);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map