const relayUrl = 'wss://relay.primal.net';
let fragmentsReceived = 0;
let totalFragments = 0;
let eventIdsHexGlobal = [];
let mediaSource;
let sourceBuffer;
const FRAGMENTS_PER_CONNECTION = 1000;
let totalDuration = 0; // Duração total inicializada em 0

const loadingDiv = document.getElementById('loading');
const logDiv = document.getElementById('log');
const logContainerDiv = document.getElementById('logContainer');
const audioPlayerContainerDiv = document.getElementById('audioPlayerContainer');
const audioPlayer = document.getElementById('audioPlayer');

function logMessage(message) {
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logDiv.appendChild(logEntry);
    logContainerDiv.scrollTop = logContainerDiv.scrollHeight;
}

async function fetchPostContent(postId) {
    logMessage(`Conectando ao relay ${relayUrl} para obter o conteúdo do post ID: ${postId}`);
    const eventIdsHex = await fetchEventIds(postId);
    if (eventIdsHex.length > 0) {
        totalFragments = eventIdsHex.length;
        eventIdsHexGlobal = eventIdsHex;
        initializeMediaSource();
        await processEvents();
    } else {
        logMessage("Nenhum evento encontrado.");
        loadingDiv.style.display = 'none';
    }
}

async function fetchEventIds(postId) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(relayUrl);
        const subscriptionId = 'sub_' + Date.now();

        ws.onopen = function () {
            logMessage(`Conexão aberta para obter IDs de eventos.`);
            const reqMessage = ["REQ", subscriptionId, { "ids": [postId] }];
            ws.send(JSON.stringify(reqMessage));
        };

        ws.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);
                if (data[0] === "EVENT" && data[1] === subscriptionId) {
                    const fragmentIds = JSON.parse(data[2].content); // Array com IDs dos fragmentos
                    logMessage(`IDs de fragmentos recebidos: ${fragmentIds.length}`);
                    resolve(fragmentIds);
                    ws.close();
                }
            } catch (error) {
                logMessage('Erro ao processar a mensagem recebida: ' + error.message);
                reject(error);
            }
        };

        ws.onerror = function (err) {
            logMessage('Erro na conexão');
            reject(err);
        };

        ws.onclose = function () {
            logMessage('Conexão fechada');
        };
    });
}

function initializeMediaSource() {
    mediaSource = new MediaSource();
    audioPlayer.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', () => {
        sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        sourceBuffer.mode = 'sequence';
        audioPlayerContainerDiv.style.display = 'block';
        logMessage('MediaSource inicializado e SourceBuffer adicionado.');
    });

    audioPlayer.addEventListener('canplay', () => {
        logMessage('Reprodução de áudio iniciada.');
        audioPlayer.play();
    });

    // Lidar com seeking para posições que ainda não foram carregadas
    audioPlayer.addEventListener('seeking', (event) => {
        const currentTime = audioPlayer.currentTime;
        const bufferedEnd = sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.end(0) : 0;

        // Verifica se a posição do buffer já contém dados suficientes
        if (!sourceBuffer || sourceBuffer.buffered.length === 0 || currentTime > bufferedEnd) {
            event.preventDefault();
            logMessage('Não é possível pular, os fragmentos ainda não foram carregados.');
            audioPlayer.currentTime = bufferedEnd - 0.5; // Mova para a última posição carregada
        } else {
            logMessage(`Seeking para o tempo: ${currentTime}`);
        }
    });

    audioPlayer.addEventListener('ended', () => {
        logMessage('Reprodução finalizada.');
    });
}

function updateTotalDuration(fragmentDuration) {
    // Atualiza a duração total progressivamente conforme os fragmentos chegam
    totalDuration += fragmentDuration;
    logMessage(`Duração total atualizada: ${totalDuration} segundos.`);
}

async function processEvents(startIndex = 0) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(relayUrl);
        const subscriptionId = 'sub_' + Date.now();
        let timeoutHandle;

        ws.onopen = function () {
            logMessage(`Processando fragmentos a partir do índice ${startIndex}`);
            for (let i = startIndex; i < eventIdsHexGlobal.length && i < startIndex + FRAGMENTS_PER_CONNECTION; i++) {
                const eventIdHex = eventIdsHexGlobal[i];
                const reqMessage = ["REQ", subscriptionId, { "ids": [eventIdHex] }];
                ws.send(JSON.stringify(reqMessage));
            }

            timeoutHandle = setTimeout(() => {
                if (fragmentsReceived < totalFragments) {
                    logMessage(`Timeout atingido. Fragmentos recebidos: ${fragmentsReceived}/${totalFragments}`);
                    ws.close();
                }
            }, 3000);
        };

        ws.onmessage = function (event) {
            try {
                const data = JSON.parse(event.data);
                if (data[0] === "EVENT" && data[1] === subscriptionId) {
                    const audioDataBase64 = data[2].content;
                    if (audioDataBase64) {
                        const audioData = atob(audioDataBase64);
                        const audioBuffer = new Uint8Array(audioData.length);
                        for (let i = 0; i < audioData.length; i++) {
                            audioBuffer[i] = audioData.charCodeAt(i);
                        }
                        appendBuffer(audioBuffer);
                        fragmentsReceived++;
                        logMessage(`Fragmento de áudio adicionado. Fragmentos recebidos: ${fragmentsReceived}/${totalFragments}`);

                        // Estimar duração de cada fragmento com base no tamanho (assumindo que tamanhos semelhantes têm durações semelhantes)
                        let fragmentDuration = 3; // Exemplo de duração padrão (ajustar se houver uma estimativa melhor)
                        updateTotalDuration(fragmentDuration);

                        if (fragmentsReceived === totalFragments) {
                            clearTimeout(timeoutHandle);
                            ws.close();
                            endStreamWhenReady();
                            resolve();
                        }
                    } else {
                        logMessage(`Fragmento não contém dados válidos.`);
                    }
                }
            } catch (error) {
                logMessage('Erro ao processar a mensagem recebida: ' + error.message);
                reject(error);
            }
        };

        ws.onerror = function (err) {
            logMessage('Erro na conexão');
            clearTimeout(timeoutHandle);
            reject(err);
        };

        ws.onclose = function () {
            clearTimeout(timeoutHandle);
            logMessage('Conexão fechada após processar fragmentos.');
            if (fragmentsReceived < totalFragments) {
                logMessage("Reconectando para continuar o processamento...");
                processEvents(fragmentsReceived).then(resolve).catch(reject);
            } else {
                resolve();
            }
        };
    });
}

function appendBuffer(buffer) {
    if (sourceBuffer && !sourceBuffer.updating) {
        try {
            sourceBuffer.appendBuffer(buffer);
            logMessage("Buffer adicionado ao SourceBuffer.");
        } catch (error) {
            logMessage("Erro ao adicionar buffer: " + error.message);
        }
    } else {
        setTimeout(() => appendBuffer(buffer), 100);
    }
}

function endStreamWhenReady() {
    if (sourceBuffer && !sourceBuffer.updating) {
        try {
            mediaSource.endOfStream();
            logMessage("Fim do stream.");
        } catch (error) {
            logMessage("Erro ao finalizar o stream: " + error.message);
        }
    } else {
        setTimeout(endStreamWhenReady, 100);
    }
}

function startProcess(postId) {
    logDiv.innerHTML = '';
    loadingDiv.style.display = 'block';
    audioPlayerContainerDiv.style.display = 'none';
    fragmentsReceived = 0;
    totalFragments = 0;
    totalDuration = 0; // Resetar a duração total
    eventIdsHexGlobal = [];
    logMessage(`Iniciando processo para o post ID: ${postId}`);
    fetchPostContent(postId);
}
