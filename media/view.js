

(function(){

    let rootDom = document.getElementById("root");
    const vscode = acquireVsCodeApi();
    let parents = rootDom.children;
    let templateParentNode = parents[0];
    let templateInputNode = templateParentNode.getElementsByTagName("input")[0];
    let templateInputBtnNode = templateParentNode.getElementsByTagName("button")[0];
    templateInputBtnNode.onclick = function(){
        vscode.postMessage({
            event: 'openTemplateFloder',
        });
    };


    let outputParentNode = parents[1];
    let outputInputNode =  outputParentNode.getElementsByTagName("input")[0];
    let outputInputBtnNode =  outputParentNode.getElementsByTagName("button")[0];
     outputInputBtnNode.onclick = function(){
        vscode.postMessage({
            event: 'openOutputFloder',
        });
    };

    let authorParentNode = parents[2];
    let authorInputNode =  authorParentNode.getElementsByTagName("input")[0];

    let timeParentNode = parents[3];
    let timeInputNode =  timeParentNode.getElementsByTagName("input")[0];
    function dateFormat(fmt, date) {
        let ret;
        const opt = {
            "Y+": date.getFullYear().toString(),        // 年
            "m+": (date.getMonth() + 1).toString(),     // 月
            "d+": date.getDate().toString(),            // 日
            "H+": date.getHours().toString(),           // 时
            "M+": date.getMinutes().toString(),         // 分
            "S+": date.getSeconds().toString()          // 秒
            // 有其他格式化字符需求可以继续添加，必须转化成字符串
        };
        for (let k in opt) {
            ret = new RegExp("(" + k + ")").exec(fmt);
            if (ret) {
                fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")));
            };
        };
        return fmt;
    }
    timeInputNode.value = dateFormat("YYYY-mm-dd HH:MM",new Date());

    function removeAllChildren(node){
        node.innerHTML = "";
    }

    
    let tagParentNode = parents[4];
    let menuParentNode = parents[5];
    let contentParentNode = parents[6];


    let tags;
    let selectTag;
    let tagContents = {};

    function onClickTag(tagName){
        if(!tagName || !tags){
            return;
        }
        if(selectTag){
            let n =  tags[selectTag];
            if(n){
                n.className = "";
            }
        }
        selectTag = tagName;
        let n =  tags[selectTag];
        if(n){
            n.className = "active";
        }
        let cacheContent = tagContents[selectTag];
        if(cacheContent){
            updateTagContent(cacheContent);
        }else{
            vscode.postMessage({
                event: 'loadTagContent',
                tag:selectTag
            });
        }
    }

    function createBtnElement(name, callback){
        let e = document.createElement("button");
        e.textContent = name;
        if(callback){
            e.onclick = callback;
        }
        return e;
    }

    function updateTemplateTag(dirs){
        removeAllChildren(tagParentNode);
        removeAllChildren(menuParentNode);
        removeAllChildren(contentParentNode);
        tags = {};
        if(dirs && dirs.length > 0){
            for(let dir of dirs){
                let temp = dir;
                b = createBtnElement(dir, () => {
                    onClickTag(temp);
                });
                tagParentNode.appendChild(b);
                tags[dir] = b;
            }
            onClickTag(dirs[0]);
        }
    }




    let contentMenuNodes;
    let selectContent;
    let selectContentMenuIndex;

    let varInputNodes = {};

    function onClickContentMenu(index){
        if(!selectContent || !contentMenuNodes){
            return;
        }
        if(selectContentMenuIndex !== undefined){
            let n =  contentMenuNodes[selectContentMenuIndex];
            if(n){
                n.className = "";
            }
        }
        selectContentMenuIndex = index;
        let n =  contentMenuNodes[selectContentMenuIndex];
        if(n){
            n.className = "active";
        }
        updateMenuContent(selectContent[selectContentMenuIndex]);
    }
    
    function updateTagContent(tagContent){
        removeAllChildren(menuParentNode);
        removeAllChildren(contentParentNode);
        if(!tagContent){
            return; 
        }
        selectContent = tagContent;

        contentMenuNodes = [];

        if(tagContent && tagContent.length > 0){
            let cIndex = 0;
            for(let c of tagContent){
                let tempIndex = cIndex;
                b = createBtnElement(c.name, () => {
                    onClickContentMenu(tempIndex);
                });
                menuParentNode.appendChild(b);
                contentMenuNodes.push(b);
                cIndex++;
            }
            onClickContentMenu(0);
        }
    }


    function updateMenuContent(config){
        if(!config){
            console.error("not find menu content");
            return;
        }
        removeAllChildren(contentParentNode);

        let descNode = document.createElement("div");
        descNode.textContent = config.desc || "";
        descNode.className="template_desc";
        contentParentNode.appendChild(descNode);
        varInputNodes = [];
        if (config.input && config.input.length > 0){
            for(let ic of config.input){

                let ele;
                switch(ic.type){
                    case "input":
                        ele = document.createElement("input");
                        break;
                    case "select":
                        ele = document.createElement("select");
                        for(let o of ic.options){
                            let t = document.createElement("option");
                            t.textContent = o;
                            ele.appendChild(t);
                        }
                        break;
                }

                varInputNodes.push(ele);
                let descNode = document.createElement("div");
                descNode.textContent = `${ic.name}(${ic.desc})` || "";
                contentParentNode.appendChild(descNode);
                contentParentNode.appendChild(ele);
            }
        }
    }

    let btnParentNode = parents[7];
    let btnsNode =  btnParentNode.getElementsByTagName("button");
    let createBtnNode = btnsNode[0];
    let cancelBtnNode = btnsNode[1];

    createBtnNode.onclick = () => {
        if(!selectTag || !varInputNodes || !selectContent){
            console.log(!selectTag , !varInputNodes , !selectContent);
            return;
        }


        let config = selectContent[selectContentMenuIndex];
        if(!config){
            console.log("not find config");
            return;
        }
        let varsMap = {};
        for(let k in varInputNodes){
            varsMap[config.input[k].name] = varInputNodes[k].value;
            if(!config.input[k].isOption){
                if(varInputNodes[k].value === undefined || varInputNodes[k].value === ""  ){
                    vscode.postMessage({event:"showMessage", msg:`please input var value (${config.input[k].name})`});
                    return;
                }
            }
        }
        let targetPath = outputInputNode.value;
        if(!targetPath || targetPath === ""){
            vscode.postMessage({event:"showMessage", msg:"please select output path"});
            return;
        }

        varsMap["TIME"] = timeInputNode.value;
        varsMap["AUTHOR"] = authorInputNode.value;
        let message = {
            event:"createTemplate",
            tag:selectTag,
            config:config,
            vars:varsMap,
            templatePath:templateInputNode.value,
            targetPath:outputInputNode.value,
        };
        
        vscode.postMessage(message);
    };
    cancelBtnNode.onclick = () => {
        vscode.postMessage({event:"cancelCreate"});
    };


    window.addEventListener("message", function(event){
        const message = event.data;
        switch (message.event) {
            case 'onCreateWebview':
                // if(message.)
                if(message.targetDir){
                    outputInputNode.value = message.targetDir;
                }
                if(message.author){
                    authorInputNode.value = message.author;
                }
                break;
            case "selectOutputPath":
                if(message.targetDir){
                    outputInputNode.value = message.targetDir;
                }
                break;
            case "refreshTemplateDir":
                templateInputNode.value = message.dirPath;
                if(message.isInvalidDir){
                    templateInputNode.className += " red"; 
                }else{
                    templateInputNode.className = "";
                }
                updateTemplateTag(message.dirs);
                break;
            case "loadTagContentReturn":
                tagContents[message.tag] = message.content;
                updateTagContent(message.content);
                break;
        }
    });
}());