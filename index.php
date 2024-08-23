<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carregando Áudio</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        #loading {
            font-size: 18px;
            color: #333;
        }
        #eventContent, #audioPlayerContainer {
            display: none;
        }
        #audioPlayerContainer {
            margin-top: 20px;
        }
        button {
            margin: 10px;
            padding: 10px;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div>
        <button onclick="startProcess('2273f05320f2e4112d96487f0489afcf38ee4b53a2d4899fc601d581537a9577')">Risada do Dov</button>
        <button onclick="startProcess('93d127b38e3644ec66577d2645e369f90c6327bdb5eefe77badd23d650240c71')">Bom dia Guerreiros</button>
        <button onclick="startProcess('c79fc5c0a630c5b47ff6995166e66b62b4621244ff41c83b3b193af91314a1fb')">PNC do gd palestina</button>
        <button onclick="startProcess('535a4ee07e85c105110237ad1d7576d7f9b9b2b34c76af6b0ecc3fe9ae70323b')">Bruce Its Time!</button>
    </div>
    <div id="loading"></div>
    <div id="eventContent"></div>
    <div id="audioPlayerContainer">
        <audio id="audioPlayer" controls>
            Seu navegador não suporta o elemento de áudio.
        </audio>
    </div>

    <script>
        const relayUrl = 'wss://relay.primal.net'; 

        let eventIdsHex = [];
        let combinedPartContent = '';  
        let eventsProcessed = 0;   

        const loadingDiv = document.getElementById('loading');
        const eventContentDiv = document.getElementById('eventContent');
        const audioPlayerContainerDiv = document.getElementById('audioPlayerContainer');

        function fetchPostContent(postId) {
            const ws = new WebSocket(relayUrl);
            const subscriptionId = 'sub_' + Date.now();

            ws.onopen = function() {
                const reqMessage = ["REQ", subscriptionId, { "ids": [postId] }];
                ws.send(JSON.stringify(reqMessage));
                loadingDiv.textContent = "Carregando, por favor aguarde...";
            };

            ws.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data[0] === "EVENT" && data[1] === subscriptionId) {
                        const content = data[2].content;
                        eventIdsHex = content.split('|'); 
                        ws.close(); 
                        fetchAudioParts(); 
                    }
                } catch (error) {
                    loadingDiv.textContent = 'Erro ao processar a mensagem recebida';
                }
            };

            ws.onerror = function(err) {
                loadingDiv.textContent = 'Erro na conexão';
            };

            ws.onclose = function() {
                
            };
        }

        function fetchAudioParts() {
            const ws = new WebSocket(relayUrl);
            const subscriptionId = 'sub_' + Date.now();

            ws.onopen = function() {
                eventIdsHex.forEach(eventIdHex => {
                    const reqMessage = ["REQ", subscriptionId, { "ids": [eventIdHex] }];
                    ws.send(JSON.stringify(reqMessage));
                });
            };

            ws.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data[0] === "EVENT" && data[1] === subscriptionId) {
                        const content = JSON.parse(data[2].content);
                        if (content.part) {
                            combinedPartContent += content.part;
                        }
                        eventsProcessed++;
                        if (eventsProcessed === eventIdsHex.length) {
                            createAudioPlayer(combinedPartContent);
                        }
                    }
                } catch (error) {
                    loadingDiv.textContent = 'Erro ao processar a mensagem recebida';
                }
            };

            ws.onerror = function(err) {
                loadingDiv.textContent = 'Erro na conexão';
            };

            ws.onclose = function() {
                
            };
        }

        function createAudioPlayer(base64String) {
            const byteCharacters = atob(base64String);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'audio/mp3' });
            const blobURL = URL.createObjectURL(blob);
            const audioPlayer = document.getElementById('audioPlayer');
            audioPlayer.src = blobURL;

            loadingDiv.style.display = 'none';
            audioPlayerContainerDiv.style.display = 'block';
            audioPlayer.play();
        }

        function startProcess(postId) {
            loadingDiv.style.display = 'block';
            audioPlayerContainerDiv.style.display = 'none';
            loadingDiv.textContent = 'Carregando...';
            combinedPartContent = '';
            eventsProcessed = 0;
            fetchPostContent(postId);
        }
    </script>
</body>
</html>
