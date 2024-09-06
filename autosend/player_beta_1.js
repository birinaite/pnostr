const relayUrl = 'wss://relay.primal.net'
let audioContext
let gainNode
let bufferQueue = []  // Fila de buffers de áudio decodificados
let currentPlaybackPosition = 0  // Posição atual na fila de fragmentos
let eventIdsHexGlobal = [] // IDs dos fragmentos de mídia
let fragmentList = []  // Lista para armazenar os fragmentos na ordem correta
let playing = false  // Status de reprodução
let source  // Fonte de áudio atual
let totalDuration = 0  // Duração total do áudio
let isSeeking = false  // Flag para verificar se o usuário está arrastando o slider
let fragmentsLoaded = 0  // Número de fragmentos carregados
const progressSlider = document.getElementById('audioProgress')
const currentTimeDisplay = document.getElementById('currentTime')
const totalTimeDisplay = document.getElementById('totalTime')
const loadProgressBar = document.getElementById('loadProgress')  // Barra de carregamento
const logContainer = document.getElementById('logContainer')
let updateProgressInterval

// Função para alternar a exibição dos logs
function toggleLogs () {
  logContainer.classList.toggle('hidden')
    const toggleButton = document.getElementById('toggleLogsButton')
    toggleButton.textContent = logContainer.classList.contains('hidden') ? 'Exibir Logs e Tabela' : 'Ocultar Logs e Tabela'
}

// Função para exibir mensagens no log
function logMessage (message) {
  const logBox = document.getElementById('logs')
    const logEntry = document.createElement('div')
    logEntry.classList.add('log-entry')
    logEntry.textContent = message
    logBox.appendChild(logEntry)
    logBox.scrollTop = logBox.scrollHeight  // Faz o scroll descer automaticamente ao adicionar logs
    console.log(message)
}

function logTableEntry (eventId, content) {
  const row = document.createElement('tr')
    const eventIdCell = document.createElement('td')
    const contentCell = document.createElement('td')

    eventIdCell.textContent = eventId
    contentCell.textContent = content

    row.appendChild(eventIdCell)
    row.appendChild(contentCell)
    document.getElementById('logTableBody').appendChild(row)
}

// Função para exibir ou ocultar o botão Play/Pause
function showPlayPauseButton(show) {
    const playPauseButton = document.getElementById('playPauseButton');
    if (show) {
        playPauseButton.style.display = 'inline-block';  // Exibe o botão
    } else {
        playPauseButton.style.display = 'none';  // Oculta o botão
    }
}

// Função para resetar o player (chama ao iniciar um novo áudio)
function resetPlayer() {
    if (source) {
        source.stop();
    }

    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }

    // Limpa as variáveis
    bufferQueue = [];
    currentPlaybackPosition = 0;
    eventIdsHexGlobal = [];
    fragmentList = [];
    playing = false;
    source = null;
    fragmentsLoaded = 0;

    // Reseta barra de progresso e tempo
    progressSlider.value = 0;
    currentTimeDisplay.textContent = '00:00';
    totalTimeDisplay.textContent = '00:00';

    // Esconde o botão Play/Pause até que o áudio seja iniciado
    showPlayPauseButton(false);

    logMessage('Player resetado.');
}



// Função para limpar logs, tabela, e gráfico de progresso
function clearLogsAndProgress () {
  document.getElementById('logs').innerHTML = ''  // Limpa os logs
    document.getElementById('logTableBody').innerHTML = ''  // Limpa a tabela
    loadProgressBar.style.width = '0%'  // Reseta a barra de carregamento
    progressSlider.value = 0  // Reseta o slider de progresso
    currentTimeDisplay.textContent = '00:00'  // Reseta o tempo atual
    totalTimeDisplay.textContent = '00:00'  // Reseta o tempo total
}

// Função que inicia o processo de reprodução
async function startProcess(postId) {
    resetPlayer();  // Reseta o player e oculta o botão Play/Pause
    logMessage("Iniciando recuperação encadeada dos fragmentos de controle...");
    eventIdsHexGlobal = await fetchControlFragments(postId);
    if (eventIdsHexGlobal.length > 0) {
        logMessage(`Total de IDs de fragmentos de mídia recuperados: ${eventIdsHexGlobal.length}`);
        initializeAudioContext();  // Inicializa o AudioContext para tocar o áudio
        await processAudioFragments();  // Processa os eventos de mídia e preenche o buffer
        totalDuration = bufferQueue.reduce((sum, buffer) => sum + buffer.duration, 0);  // Calcula a duração total
        totalTimeDisplay.textContent = formatTime(totalDuration);  // Exibe o tempo total
        playFromBuffer(currentPlaybackPosition);  // Inicia a reprodução
        updateProgress();  // Inicia a atualização da barra de progresso e do tempo

        // Mostra o botão Play/Pause agora que o áudio foi iniciado
        showPlayPauseButton(true);
    } else {
        logMessage("Nenhum fragmento de mídia foi encontrado.");
    }
}

let analyser;
let dataArray;
let bufferLength;
let canvas;
let canvasCtx;

function initializeOscilloscope() {
    // Obter o elemento canvas e seu contexto 2D
    canvas = document.getElementById('oscilloscope');
    canvasCtx = canvas.getContext('2d');
    
    // Configura o AnalyserNode
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    // Conectar o gainNode ao analyser e depois ao destination (alto-falante)
    gainNode.connect(analyser);
    analyser.connect(audioContext.destination);

    // Começar a desenhar o osciloscópio
    drawOscilloscope();
}

// Função para desenhar o osciloscópio
function drawOscilloscope() {
    requestAnimationFrame(drawOscilloscope);

    // Pegar os dados de tempo do audio
    analyser.getByteTimeDomainData(dataArray);

    // Limpar o canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Configurar o estilo de desenho
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    // Começar a desenhar a linha
    canvasCtx.beginPath();

    let sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;

    // Desenhar a linha com base nos dados de tempo
    for (let i = 0; i < bufferLength; i++) {
        let v = dataArray[i] / 128.0;
        let y = v * canvas.height / 2;

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
}


function initializeAudioContext() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        initializeOscilloscope();  // Iniciar o osciloscópio junto com o áudio
        logMessage("AudioContext inicializado.");
    }
}


// Função para buscar os fragmentos de controle no Nostr
async function fetchControlFragments (postId) {
  const fragmentIds = [];
  const currentPostId = postId;

  const ws = new WebSocket(relayUrl)
    const subscriptionId = 'sub_' + Date.now()

    return new Promise((resolve, reject) => {
    ws.onopen = function () {
      logMessage('Conectado ao relay para buscar fragmentos de controle.')
            const reqMessage = ['REQ', subscriptionId, { ids: [currentPostId] }]
            ws.send(JSON.stringify(reqMessage))
        };

    ws.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data)

                if (data.length >= 3 && data[0] === 'EVENT' && data[2] && data[2].id && data[2].content) {
          logMessage(`Evento recebido: ${data[2].id}`)

                    const content = data[2].content
                    logTableEntry(data[2].id, content)  // Adiciona à tabela
                    fragmentList.unshift(content)  // Adiciona o conteúdo à lista na ordem inversa

                    const nextTag = data[2].tags.find(tag => tag[0] === 'e')
                    if (nextTag && nextTag[1]) {
            logMessage(`Encadeamento encontrado. Próximo post ID: ${nextTag[1]}`)
                        const reqMessage = ['REQ', subscriptionId, { ids: [nextTag[1]] }]
                        ws.send(JSON.stringify(reqMessage))
                    } else {
            logMessage("Fim do encadeamento ou evento sem tag 'e'.")
                        ws.close()
                        resolve(processBase64Concatenation())
                    }
        } else {
          logMessage('Dados inválidos recebidos.')
                }
      } catch (error) {
        logMessage('Erro ao processar a mensagem recebida: ' + error.message)
                reject(error)
            }
    }

        ws.onerror = function (err) {
      logMessage('Erro na conexão com o relay.')
            reject(err)
        };

    ws.onclose = function () {
      logMessage('Conexão com o relay fechada.')
            resolve(fragmentIds)
        };
  })
}

// Concatena os fragmentos e decodifica o Base64
function processBase64Concatenation () {
  base64Concatenated = fragmentList.join('')
    try {
    logMessage(`Base64 concatenado antes da decodificação: ${base64Concatenated}`)
        const decodedContent = atob(base64Concatenated)
        logMessage('Base64 decodificado com sucesso.')
        const fragmentIds = JSON.parse(decodedContent)
        logMessage(`Total de fragmentos de mídia: ${fragmentIds.length}`)
        return fragmentIds
    } catch (error) {
    logMessage('Erro ao decodificar o Base64: ' + error.message)
        return []
    }
}

async function processAudioFragments () {
  logMessage('Processando os fragmentos de mídia...')
    const ws = new WebSocket(relayUrl)
    const subscriptionId = 'sub_' + Date.now()
    let fragmentsReceived = 0

    return new Promise((resolve, reject) => {
    ws.onopen = function () {
      logMessage('Conectado ao relay para buscar fragmentos de mídia.')
            for (let i = 0; i < eventIdsHexGlobal.length; i++) {
        const reqMessage = ['REQ', subscriptionId, { ids: [eventIdsHexGlobal[i]] }]
                ws.send(JSON.stringify(reqMessage))
            }
    }

        ws.onmessage = async function (event) {
      try {
        const data = JSON.parse(event.data)

                if (data[0] === 'EVENT' && data[1] === subscriptionId && data[2] && data[2].content) {
          const audioDataBase64 = data[2].content
                    const audioData = atob(audioDataBase64)
                    const audioBuffer = new Uint8Array(audioData.length)

                    for (let i = 0; i < audioData.length; i++) {
            audioBuffer[i] = audioData.charCodeAt(i)
                    }

          try {
            const audioDecodedBuffer = await audioContext.decodeAudioData(audioBuffer.buffer)
                        bufferQueue.push(audioDecodedBuffer)  // Adiciona o buffer decodificado à fila
                        fragmentsReceived++
                        fragmentsLoaded++  // Incrementa o número de fragmentos carregados
                        logMessage(`Fragmento de áudio ${fragmentsReceived}/${eventIdsHexGlobal.length} processado.`)

                        // Se for o primeiro fragmento, iniciar a reprodução
                        if (fragmentsReceived === 1 && !playing) {
              playFromBuffer(currentPlaybackPosition)
                            updateProgress()  // Inicia a atualização da barra de progresso
                        }
            updateLoadProgress()  // Atualiza o gráfico de carregamento
                    } catch (decodeError) {
            logMessage(`Erro ao decodificar o fragmento de áudio: ${decodeError.message}`)
                    }

          if (fragmentsReceived === eventIdsHexGlobal.length) {
            logMessage('Todos os fragmentos de áudio foram processados e armazenados na memória.')
                        ws.close()
                        resolve()
                    }
        }
      } catch (error) {
        logMessage('Erro ao processar o fragmento de áudio: ' + error.message)
                reject(error)
            }
    }

        ws.onerror = function (err) {
      logMessage('Erro na conexão com o relay.')
            reject(err)
        };

    ws.onclose = function () {
      logMessage('Conexão com o relay fechada.')
            resolve()
        };
  })
}

// Atualiza o gráfico de carregamento com base nos fragmentos carregados
function updateLoadProgress() {
    const percentageLoaded = (fragmentsLoaded / eventIdsHexGlobal.length) * 100;
    const loadProgressBar = document.getElementById('loadProgress');
    loadProgressBar.style.width = `${percentageLoaded}%`;  // Atualiza a largura da barra de carregamento
}

// Função para reproduzir o áudio a partir do buffer decodificado
function playFromBuffer (startFragmentIndex) {
  if (!playing && bufferQueue.length > 0) {
    playing = true
        playNextFragment(startFragmentIndex)  // Inicia a reprodução do próximo fragmento
    }
}

function playNextFragment (index) {
  if (index < bufferQueue.length) {
    source = audioContext.createBufferSource()
        source.buffer = bufferQueue[index]  // Define o buffer do fragmento atual
        source.connect(gainNode)

        source.onended = () => {
      currentPlaybackPosition++  // Avança para o próximo fragmento
            if (currentPlaybackPosition < bufferQueue.length) {
        playNextFragment(currentPlaybackPosition)  // Reproduz o próximo fragmento
            } else {
        playing = false
                logMessage('Reprodução de áudio finalizada.')
            }
    }

        source.start()
        updateProgress()  // Atualiza o progresso durante a reprodução
    }
}

// Função para controle de seek (tracking virtual)
progressSlider.addEventListener('input', function () {
  if (!isSeeking) {
    isSeeking = true
    }
  const selectedPosition = (progressSlider.value / 100) * totalDuration
    currentTimeDisplay.textContent = formatTime(selectedPosition)  // Atualiza o tempo atual enquanto arrasta
})

progressSlider.addEventListener('change', function () {
  if (bufferQueue.length > 0) {
    const selectedPosition = (progressSlider.value / 100) * totalDuration
        currentPlaybackPosition = Math.floor((selectedPosition / totalDuration) * bufferQueue.length)  // Calcula a posição correta no buffer

        if (playing) {
      if (source) {
        source.stop()  // Para o fragmento atual
            }
      playFromBuffer(currentPlaybackPosition)  // Reproduz a partir do ponto buscado
        } else {
      playFromBuffer(currentPlaybackPosition)
        }
  }
  isSeeking = false
})

// Função para alternar entre play e pause
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('playPauseButton').addEventListener('click', function () {
    if (audioContext && playing) {
      audioContext.suspend().then(() => {
        playing = false
            logMessage('Áudio pausado.')
            document.getElementById('playPauseButton').textContent = 'Play'  // Atualiza o texto do botão
        })
    } else if (audioContext && !playing) {
      audioContext.resume().then(() => {
        playing = true
            logMessage('Reprodução retomada.')
            document.getElementById('playPauseButton').textContent = 'Pause'  // Atualiza o texto do botão
        })
    }
  })
})

// Atualiza o progresso do slider e o tempo durante a reprodução
function updateProgress () {
  if (playing && bufferQueue.length > 0 && !isSeeking) {
    const currentTime = currentPlaybackPosition / bufferQueue.length * totalDuration
        progressSlider.value = (currentPlaybackPosition / bufferQueue.length) * 100  // Atualiza o slider
        currentTimeDisplay.textContent = formatTime(currentTime)  // Atualiza o tempo atual

        // Use setTimeout para atualizar o progresso a cada 100ms
        updateProgressInterval = setTimeout(updateProgress, 100)  // Atualiza o progresso a cada 100ms
    }
}

// Atualiza o tempo no formato mm:ss
function formatTime (seconds) {
  const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}
