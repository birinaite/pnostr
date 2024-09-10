let relayUrl;let mTagValue;async function fetchControlFragments(postId,relay){const relayUrl=relay;const ws=new WebSocket(relay);const subscriptionId="sub_"+Date.now();const fragmentList=[];const eventIdsHexGlobal=[];return new Promise((resolve,reject)=>{ws.onopen=function(){const reqMessage=["REQ",subscriptionId,{ids:[postId]}];ws.send(JSON.stringify(reqMessage))};ws.onmessage=function(event){try{const data=JSON.parse(event.data);if(data[0]==="EVENT"&&data[2]&&data[2].content){const content=data[2].content;fragmentList.unshift(content);const mTag=data[2].tags.find(tag=>tag[0]==="m");if(mTag&&mTag[1]){mTagValue=mTag[1];console.log(`Valor da tag 'm': ${mTagValue}`)}const nextTag=data[2].tags.find(tag=>tag[0]==="e");if(nextTag&&nextTag[1]){const reqMessage=["REQ",subscriptionId,{ids:[nextTag[1]]}];ws.send(JSON.stringify(reqMessage))}else{ws.close();resolve(processBase64Concatenation(fragmentList,eventIdsHexGlobal,relayUrl))}}}catch(error){reject(error)}};ws.onerror=function(err){reject(err)};ws.onclose=function(){resolve()}})}function processBase64Concatenation(fragmentList,eventIdsHexGlobal,relayUrl){const base64Concatenated=fragmentList.join("");try{const decodedContent=atob(base64Concatenated);eventIdsHexGlobal=JSON.parse(decodedContent);return fetchFragments(eventIdsHexGlobal,relayUrl)}catch(error){console.error("Erro ao decodificar o Base64:",error.message)}}async function fetchFragments(eventIdsHexGlobal,relayUrl){const ws=new WebSocket(relayUrl);const subscriptionId="sub_"+Date.now();let dataList="";let fragmentCount=0;return new Promise((resolve,reject)=>{ws.onopen=function(){console.log("Conectado ao relay: "+relayUrl);eventIdsHexGlobal.forEach(id=>{const reqMessage=["REQ",subscriptionId,{ids:[id]}];ws.send(JSON.stringify(reqMessage))})};ws.onmessage=function(event){try{const data=JSON.parse(event.data);if(data[0]==="EVENT"&&data[2]&&data[2].content){const content=data[2].content;dataList+=content;fragmentCount++;if(fragmentCount===eventIdsHexGlobal.length){ws.close();resolve(dataList)}}}catch(error){reject(error)}};ws.onerror=function(err){reject(err)};ws.onclose=function(){if(fragmentCount===eventIdsHexGlobal.length){resolve(dataList)}else{reject("WebSocket fechado antes de receber todos os fragmentos")}}})}function base64ToArrayBuffer(base64){const binaryString=window.atob(base64);const len=binaryString.length;const bytes=new Uint8Array(len);for(let i=0;i<len;i++){bytes[i]=binaryString.charCodeAt(i)}return bytes.buffer}function base64ToBlob(base64){const binaryString=window.atob(base64);const len=binaryString.length;const bytes=new Uint8Array(len);for(let i=0;i<len;i++){bytes[i]=binaryString.charCodeAt(i)}return new Blob([bytes],{type:mTagValue})}function getPostIdFromUrl(){const params=new URLSearchParams(window.location.search);return params.get("id")}