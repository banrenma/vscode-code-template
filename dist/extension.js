(()=>{"use strict";var e={828:(e,t,i)=>{Object.defineProperty(t,"__esModule",{value:!0});const a=i(837),n=i(496);t.default=class{constructor(){}setTagetDir(e){this._targetDirUri=e}async createWebview(e){const t=n.window.createWebviewPanel("codetemplate","code template",n.ViewColumn.One,{enableScripts:!0,retainContextWhenHidden:!0}),i=t.webview.asWebviewUri(n.Uri.joinPath(e.extensionUri,"media","view.css")),a=t.webview.asWebviewUri(n.Uri.joinPath(e.extensionUri,"media","view.js"));t.webview.html=`\n            <!DOCTYPE html>\n            <html lang="en">\n            <head>\n                <meta charset="UTF-8">\n                <meta name="viewport" content="width=device-width, initial-scale=1.0">\n                <title>Cat Coding</title>\n                <link rel="stylesheet" type="text/css" href="${i}">\n            </head>\n            <body>\n                <h1 class="red"">Code Template</h1>\n                <div id="root">\n                    <div id="template_parent" class="flexline">\n                        <input disabled></input>\n                        <button>select template floder</button>\n                    </div>\n\n                    <div id="output_parent" class="flexline">\n                        <input disabled></input>\n                        <button>select output floder</button>\n                    </div>\n                    \n                    <div id="author_parent" class="input_desc">\n                        <div>AUTHOR</div>\n                        <input></input>\n                    </div>\n                    <div id="time_parent" class="input_desc">\n                        <div>TIME</div>\n                        <input></input>\n                    </div>\n                    <div id="tag_parent" class="tab">\n\n                    </div>\n                    <div id="menu_parent" class="tab">\n\n                    </div>\n                    <div id="content_parent" class="input_desc">\n\n                    </div>\n\n                    <div id="btn_parent">\n                        <button id="create">create</button>\n                        <button id="cancel">cancel</button>\n                    </div>\n\n                </div>\n                <script  src="${a}"><\/script>\n            </body>\n            </html>\n        `,t.webview.onDidReceiveMessage((e=>{switch(e.event){case"openTemplateFloder":this.openCodeTemplateFloder();break;case"openOutputFloder":this.openOutputFloder();break;case"loadTagContent":this.readTagContent(e.tag);break;case"createTemplate":this.createTempate(e).catch((e=>{console.error(e.toString()),n.window.showErrorMessage(e.toString())})),this._panel?.dispose();break;case"cancelCreate":this._panel?.dispose();break;case"showMessage":n.window.showInformationMessage(e.msg)}}),void 0,e.subscriptions),this._panel=t,this.reEnterWebView()}reEnterWebView(){let e=n.workspace.getConfiguration().get("codetemplate.author");this._panel?.webview.postMessage({event:"onCreateWebview",targetDir:this._targetDirUri?.path,author:e}),this.readTemplateDir(void 0)}async readConfigByUri(e){let t=await n.workspace.fs.readFile(e);return JSON.parse((new a.TextDecoder).decode(t))}async readTagContent(e){if(!this._dirUri)return;let t,i=n.Uri.joinPath(this._dirUri,e,"config.json");t=await this.readConfigByUri(i).catch((e=>{n.window.showErrorMessage(" error : "+e.toString()),t=null})),this.postMessage({event:"loadTagContentReturn",content:t,tag:e})}async openCodeTemplateFloder(){let e=await n.window.showOpenDialog({canSelectMany:!1,canSelectFiles:!1,canSelectFolders:!0,title:"Open Code Template Folder"});if(e){let t=e[0];setTimeout((()=>{n.workspace.getConfiguration().update("codetemplate.templateDir",t.path,!0),this.readTemplateDir(t.path)}),10)}}async openOutputFloder(){let e=await n.window.showOpenDialog({canSelectMany:!1,canSelectFiles:!1,canSelectFolders:!0,title:"Open Code Template Folder"});if(e){let t=e[0];this.postMessage({event:"selectOutputPath",targetDir:t.path})}}async readTemplateDirByString(e){if(""===e||!e)return[];let t=n.Uri.file(e);this._dirUri=t;let i=await n.workspace.fs.readDirectory(t),a=[];if(i)for(let e of i)2===e[1]&&"."!==e[0].charAt(0)&&a.push(e[0]);return a}async readTemplateDir(e){if(!this._panel)return;e||(e=String(n.workspace.getConfiguration().get("codetemplate.templateDir")));let t=!1,i={event:"refreshTemplateDir"};if(void 0!==e||""!==e){let a=await this.readTemplateDirByString(e).catch((e=>{console.log("can not find template dir"),t=!0}));i.dirs=a}else t=!0;i.dirPath=e,i.isInvalidDir=t,this.postMessage(i)}postMessage(e){this._panel&&this._panel.webview.postMessage(e)}async replaceVar(e,t){let i,a,n=[],r=0,s=e.length,o=0;for(let l=0;l<s;l++)if(i=e.charAt(l),0===r)"$"===i&&(a=e.charAt(l+1),"{"===a&&(r=1,n.push(e.substring(o,l)),o=l+2));else if(1===r&&"}"===i){let i=e.substring(o,l);t.hasOwnProperty(i)?n.push(t[i]):(n.push("${undefined}"),console.warn("can not find varname ",i)),r=0,o=l+1}if(1===r){let t=e.substring(o,s);n.push("${"+t)}else n.push(e.substring(o,s));return n.join("")}async checkFileIsExist(e){let t=!0;try{await n.workspace.fs.stat(e)}catch(e){t=!1}return t}async handleOneFile(e,t,i,r){console.log(e.path,t,r.path);let s,o=n.Uri.joinPath(e,t),l=await n.workspace.fs.readFile(o),d=(new a.TextDecoder).decode(l),c=d.indexOf("\n");-1!==c&&(s=d.substring(0,c)),s=s?s.trim():d.trim();let p=t;/^__.*\$\{.*\}.*__$/.test(s)&&(-1!==c&&(d=d.substring(c+1,d.length)),p=await this.replaceVar(s,i),p=p.substring(2,p.length-2));let h=await this.replaceVar(d,i),u=n.Uri.joinPath(r,p);if(await this.checkFileIsExist(u))throw new Error(`"file already exist!" ${u.path}`);console.log("==========write==>>",u.path),await n.workspace.fs.writeFile(u,(new a.TextEncoder).encode(h))}async handleDir(e,t,i){let a=await n.workspace.fs.readDirectory(e);if(a)for(let r of a)1===r[1]?await this.handleOneFile(e,r[0],t,i):2===r[1]&&await this.handleDir(n.Uri.joinPath(e,r[0]),t,n.Uri.joinPath(i,r[0]))}async createTempate(e){console.log(e);let t=e.config,i=n.Uri.file(e.targetPath),a=e.vars,r=n.Uri.joinPath(n.Uri.file(e.templatePath),e.tag),s=n.workspace.getConfiguration().get("codetemplate.author");""!==s&&void 0!==s||""===a.AUTHOR||n.workspace.getConfiguration().update("codetemplate.author",a.AUTHOR,!0);for(let e of t.template)switch(e.type){case"file":await this.handleOneFile(r,e.name,a,i);break;case"dir":await this.handleDir(n.Uri.joinPath(r,e.name),a,i)}}getPanel(){return this._panel}}},496:e=>{e.exports=require("vscode")},837:e=>{e.exports=require("util")}},t={};function i(a){var n=t[a];if(void 0!==n)return n.exports;var r=t[a]={exports:{}};return e[a](r,r.exports,i),r.exports}var a={};(()=>{var e=a;Object.defineProperty(e,"__esModule",{value:!0}),e.deactivate=e.activate=void 0;const t=i(496),n=i(828);e.activate=function(e){let i;console.log('Congratulations, your extension "codetemplate" is now active!');let a=t.commands.registerCommand("codetemplate.newcode",(a=>{const r=t.window.activeTextEditor?t.window.activeTextEditor.viewColumn:void 0;i?(i.getPanel()?.reveal(r),i.setTagetDir(a),i.reEnterWebView()):(i=new n.default,i.setTagetDir(a),i.createWebview(e),i.getPanel()?.onDidDispose((()=>{i=void 0}),null,e.subscriptions))}));e.subscriptions.push(a)},e.deactivate=function(){}})(),module.exports=a})();