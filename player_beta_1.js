const relayUrl = 'wss://relay.primal.net'
let audioContext
let gainNode
let bufferQueue = []
let currentPlaybackPosition = 0
let eventIdsHexGlobal = []
let fragmentList = []
let playing = false
let source
let totalDuration = 0
let isSeeking = false
let fragmentsLoaded = 0
const progressSlider = document.getElementById('audioProgress')
const currentTimeDisplay = document.getElementById('currentTime')
const totalTimeDisplay = document.getElementById('totalTime')
const loadProgressBar = document.getElementById('loadProgress')
const logContainer = document.getElementById('logContainer')
let updateProgressInterval

function toggleLogs () {
  logContainer.classList.toggle('hidden')
  const toggleButton = document.getElementById('toggleLogsButton')
  toggleButton.textContent = logContainer.classList.contains('hidden') ? 'Exibir Logs e Tabela' : 'Ocultar Logs e Tabela'
}

function logMessage (message) {
  const logBox = document.getElementById('logs')
  const logEntry = document.createElement('div')
  logEntry.classList.add('log-entry')
  logEntry.textContent = message
  logBox.appendChild(logEntry)
  logBox.scrollTop = logBox.scrollHeight
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

function showPlayPauseButton (show) {
  const playPauseButton = document.getElementById('playPauseButton')
  if (show) {
    playPauseButton.style.display = 'inline-block'
  } else {
    playPauseButton.style.display = 'none'
  }
}

function resetPlayer () {
  if (source) {
    source.stop()
  }

  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close()
  }

  bufferQueue = []
  currentPlaybackPosition = 0
  eventIdsHexGlobal = []
  fragmentList = []
  playing = false
  source = null
  fragmentsLoaded = 0

  progressSlider.value = 0
  currentTimeDisplay.textContent = '00:00'
  totalTimeDisplay.textContent = '00:00'

  showPlayPauseButton(false)

  logMessage('Player resetado.')
}

function clearLogsAndProgress () {
  document.getElementById('logs').innerHTML = ''
  document.getElementById('logTableBody').innerHTML = ''
  loadProgressBar.style.width = '0%'
  progressSlider.value = 0
  currentTimeDisplay.textContent = '00:00'
  totalTimeDisplay.textContent = '00:00'
}

async function startProcess (postId) {
  resetPlayer()
  logMessage('Iniciando recuperação encadeada dos fragmentos de controle...')
  eventIdsHexGlobal = await fetchControlFragments(postId)
  if (eventIdsHexGlobal.length > 0) {
    logMessage(`Total de IDs de fragmentos de mídia recuperados: ${eventIdsHexGlobal.length}`)
    initializeAudioContext()
    await processAudioFragments()
    totalDuration = bufferQueue.reduce((sum, buffer) => sum + buffer.duration, 0)
    totalTimeDisplay.textContent = formatTime(totalDuration)
    playFromBuffer(currentPlaybackPosition)
    updateProgress()

    showPlayPauseButton(true)
  } else {
    logMessage('Nenhum fragmento de mídia foi encontrado.')
  }
}

let analyser
let dataArray
let bufferLength
let canvas
let canvasCtx

function initializeOscilloscope () {
  canvas = document.getElementById('oscilloscope')
  canvasCtx = canvas.getContext('2d')

  analyser = audioContext.createAnalyser()
  analyser.fftSize = 2048
  bufferLength = analyser.frequencyBinCount
  dataArray = new Uint8Array(bufferLength)

  gainNode.connect(analyser)
  analyser.connect(audioContext.destination)

  drawOscilloscope()
}

function drawOscilloscope () {
  requestAnimationFrame(drawOscilloscope)

  analyser.getByteTimeDomainData(dataArray)

  canvasCtx.clearRect(0, 0, canvas.width, canvas.height)

  canvasCtx.lineWidth = 2
  canvasCtx.strokeStyle = 'rgb(0, 0, 0)'

  canvasCtx.beginPath()

  const sliceWidth = canvas.width * 1.0 / bufferLength
  let x = 0

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0
    const y = v * canvas.height / 2

    if (i === 0) {
      canvasCtx.moveTo(x, y)
    } else {
      canvasCtx.lineTo(x, y)
    }

    x += sliceWidth
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2)
  canvasCtx.stroke()
}

function initializeAudioContext () {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    gainNode = audioContext.createGain()
    gainNode.connect(audioContext.destination)
    initializeOscilloscope()
    logMessage('AudioContext inicializado.')
  }
}

async function fetchControlFragments (postId) {
  const fragmentIds = []
  const currentPostId = postId

  const ws = new WebSocket(relayUrl)
  const subscriptionId = 'sub_' + Date.now()

  return new Promise((resolve, reject) => {
    ws.onopen = function () {
      logMessage('Conectado ao relay para buscar fragmentos de controle.')
      const reqMessage = ['REQ', subscriptionId, { ids: [currentPostId] }]
      ws.send(JSON.stringify(reqMessage))
    }

    ws.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data)

        if (data.length >= 3 && data[0] === 'EVENT' && data[2] && data[2].id && data[2].content) {
          logMessage(`Evento recebido: ${data[2].id}`)

          const content = data[2].content
          logTableEntry(data[2].id, content)
          fragmentList.unshift(content)

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
    }

    ws.onclose = function () {
      logMessage('Conexão com o relay fechada.')
      resolve(fragmentIds)
    }
  })
}

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
            bufferQueue.push(audioDecodedBuffer)
            fragmentsReceived++
            fragmentsLoaded++
            logMessage(`Fragmento de áudio ${fragmentsReceived}/${eventIdsHexGlobal.length} processado.`)

            if (fragmentsReceived === 1 && !playing) {
              playFromBuffer(currentPlaybackPosition)
              updateProgress()
            }
            updateLoadProgress()
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
    }

    ws.onclose = function () {
      logMessage('Conexão com o relay fechada.')
      resolve()
    }
  })
}

function updateLoadProgress () {
  const percentageLoaded = (fragmentsLoaded / eventIdsHexGlobal.length) * 100
  const loadProgressBar = document.getElementById('loadProgress')
  loadProgressBar.style.width = `${percentageLoaded}%`
}

function playFromBuffer (startFragmentIndex) {
  if (!playing && bufferQueue.length > 0) {
    playing = true
    playNextFragment(startFragmentIndex)
  }
}

function playNextFragment (index) {
  if (index < bufferQueue.length) {
    source = audioContext.createBufferSource()
    source.buffer = bufferQueue[index]
    source.connect(gainNode)

    source.onended = () => {
      currentPlaybackPosition++
      if (currentPlaybackPosition < bufferQueue.length) {
        playNextFragment(currentPlaybackPosition)
      } else {
        playing = false
        logMessage('Reprodução de áudio finalizada.')
      }
    }

    source.start()
    updateProgress()
  }
}

progressSlider.addEventListener('input', function () {
  if (!isSeeking) {
    isSeeking = true
  }
  const selectedPosition = (progressSlider.value / 100) * totalDuration
  currentTimeDisplay.textContent = formatTime(selectedPosition)
})

progressSlider.addEventListener('change', function () {
  if (bufferQueue.length > 0) {
    const selectedPosition = (progressSlider.value / 100) * totalDuration
    currentPlaybackPosition = Math.floor((selectedPosition / totalDuration) * bufferQueue.length)

    if (playing) {
      if (source) {
        source.stop()
      }
      playFromBuffer(currentPlaybackPosition)
    } else {
      playFromBuffer(currentPlaybackPosition)
    }
  }
  isSeeking = false
})

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('playPauseButton').addEventListener('click', function () {
    if (audioContext && playing) {
      audioContext.suspend().then(() => {
        playing = false
        logMessage('Áudio pausado.')
        document.getElementById('playPauseButton').textContent = 'Play'
      })
    } else if (audioContext && !playing) {
      audioContext.resume().then(() => {
        playing = true
        logMessage('Reprodução retomada.')
        document.getElementById('playPauseButton').textContent = 'Pause'
      })
    }
  })
})

function updateProgress () {
  if (playing && bufferQueue.length > 0 && !isSeeking) {
    const currentTime = currentPlaybackPosition / bufferQueue.length * totalDuration
    progressSlider.value = (currentPlaybackPosition / bufferQueue.length) * 100
    currentTimeDisplay.textContent = formatTime(currentTime)

    updateProgressInterval = setTimeout(updateProgress, 100)
  }
}

function formatTime (seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}
