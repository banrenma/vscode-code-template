
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
// 


interface Message {
    event: string
    [key: string]: any
}
interface VarMap {
    [key: string]: any
}

class CodeTemplate {
    private _panel: vscode.WebviewPanel | undefined;
    private _dirUri: vscode.Uri | undefined;
    private _targetDirUri: vscode.Uri | undefined;
    constructor() {

    }
    setTagetDir(targetDirUri: vscode.Uri | undefined) {
        this._targetDirUri = targetDirUri;
    }
    async createWebview(context: vscode.ExtensionContext) {
        const panel = vscode.window.createWebviewPanel("codetemplate", "code template", vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden:true,

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
                    this.createTempate(message).catch(err=>{
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

    reEnterWebView(){
        let author = vscode.workspace.getConfiguration().get("codetemplate.author");
        this._panel?.webview.postMessage({ event: "onCreateWebview", targetDir: this._targetDirUri?.path, author:author });
        this.readTemplateDir(undefined);
    }

    async readConfigByUri(fileUri: vscode.Uri) {
        let content = await vscode.workspace.fs.readFile(fileUri);
        let cObj = JSON.parse(new TextDecoder().decode(content));
        return cObj;
    }

    async readTagContent(tag: string) {
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
        const options: vscode.OpenDialogOptions = {
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
        const options: vscode.OpenDialogOptions = {
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

    async readTemplateDirByString(path: string) {
        if(path === "" || !path){
            return []
        }
        let dirUri = vscode.Uri.file(path);
        this._dirUri = dirUri;
        let dirs = await vscode.workspace.fs.readDirectory(dirUri);
        let rets = [];
        if (dirs) {
            for (let v of dirs) {
                if (v[1] === 2 && v[0].charAt(0) !== ".") {
                    rets.push(v[0]);
                }

            }
        }
        return rets;
    }

    async readTemplateDir(dirPath: string | undefined) {
        if (!this._panel) {
            return;
        }
        if (!dirPath) {
            dirPath = String(vscode.workspace.getConfiguration().get("codetemplate.templateDir"));
        }

        let isInvalidDir = false;
        let message: Message = {
            event: "refreshTemplateDir",
        };
        if (dirPath !== undefined || dirPath !== "") {
            let dirs = await this.readTemplateDirByString(dirPath).catch(err => {
                console.log("can not find template dir");
                isInvalidDir = true;
            });
            message.dirs = dirs;
        } else {
            isInvalidDir = true;
        }
        message.dirPath = dirPath;
        message.isInvalidDir = isInvalidDir;
        this.postMessage(message);
    }

    postMessage(message: Message) {
        if (!this._panel) {
            return;
        }
        this._panel.webview.postMessage(message);
    }


    async replaceVar(content: string, vars: VarMap) {
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
            } else if (state === 1) {
                // var state
                if (c === '}') {
                    let varName = content.substring(startIndex, i);
                    if (vars.hasOwnProperty(varName)) {
                        stringArr.push(vars[varName]);
                    } else {
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
        } else {
            stringArr.push(content.substring(startIndex, contentLen));
        }
        return stringArr.join("");
    }


    async checkFileIsExist(outputUri: vscode.Uri) {
        let isExist = true;
        try {
            await vscode.workspace.fs.stat(outputUri);
        }catch(err){
            isExist = false;
        }
        return isExist;
    }
    async handleOneFile(srcDir: vscode.Uri, name:string, vars: VarMap, outputDir: vscode.Uri) {
        console.log(srcDir.path, name, outputDir.path);
        let fileUri = vscode.Uri.joinPath(srcDir, name);
        let unt8Arr = await vscode.workspace.fs.readFile(fileUri);
        let content = new TextDecoder().decode(unt8Arr);

        let warpIndex = content.indexOf("\n");
        let firstLine;
        if (warpIndex !== -1) {
            firstLine = content.substring(0, warpIndex);
        }
        firstLine = firstLine ? firstLine.trim() : content.trim();
        let newName = name;
        if (/^__.*\$\{.*\}.*__$/.test(firstLine)) {
            if(warpIndex !== -1){
                content = content.substring(warpIndex+1, content.length);
            }
            newName = await this.replaceVar(firstLine, vars);
            newName = newName.substring(2, newName.length - 2);
        }

        let outputContent = await this.replaceVar(content, vars);
        let outputUri = vscode.Uri.joinPath(outputDir, newName);
        
        // console.log(vscode.FileSystemError.FileExists(outputUri))
        
        let isExist = await this.checkFileIsExist(outputUri);
        
        if(isExist){
            throw new Error(`"file already exist!" ${outputUri.path}`);
        }
        // filehandler
        console.log("==========write==>>", outputUri.path);
        await vscode.workspace.fs.writeFile(outputUri, new TextEncoder().encode(outputContent));
    }
    async handleDir(dirUri: vscode.Uri, vars: VarMap, outputUri: vscode.Uri) {
        // if (!vscode.FileSystemError.FileExists(outputUri)) {
        //     vscode.workspace.fs.createDirectory(outputUri)
        // }
        let dirs = await vscode.workspace.fs.readDirectory(dirUri);
        if (dirs) {
            for (let v of dirs) {
                if (v[1] === 1) {
                    // 文件
                    await this.handleOneFile(dirUri, v[0], vars, outputUri);
                } else if (v[1] === 2) {
                    //文件夹
                   await this.handleDir(vscode.Uri.joinPath(dirUri, v[0]), vars, vscode.Uri.joinPath(outputUri, v[0]));
                }
            }
        }
    }

    async createTempate(createParams: Message) {
        console.log(createParams);
        let config = createParams.config;
        let outputUri = vscode.Uri.file(createParams.targetPath);
        let varMap = createParams.vars;
        let srcUri = vscode.Uri.joinPath(vscode.Uri.file(createParams.templatePath), createParams.tag);

        let author = vscode.workspace.getConfiguration().get("codetemplate.author");
        if((author === "" || author === undefined) && varMap["AUTHOR"] !== ""){
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

    getPanel(){
        return this._panel;
    }


};


export default CodeTemplate;