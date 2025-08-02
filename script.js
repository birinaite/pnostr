// Configuração inline substituindo arquivos JSON
const config = {
  en: {
    title: "File Manager",
    uploadTab: "Upload",
    viewTab: "View",
    dropText: "Drag a file here or click",
    sendButton: "Upload",
    preparing: "Preparing...",
    sendingFragment: "Sending fragment",
    of: "of",
    creatingIndex: "Creating index...",
    uploadCompleted: "Upload completed!",
    fileId: "File ID:",
    view: "View",
    error: "Error:",
    allRelaysFailed: "Fragment {0} failed on all relays",
    unknown: "unknown",
    enterId: "Enter ID",
    loadButton: "Load",
    loading: "Loading...",
    loaded: "Loaded!",
    notSupported: "Not supported",
    useDownload: "Use the button below to download.",
    download: "Download",
    fileSize: "Size:",
    fileType: "Type:",
    uploadFile: "Upload Your File",
  },
  pt: {
    title: "Gerenciador de Arquivos",
    uploadTab: "Envio",
    viewTab: "Visualizar",
    dropText: "Arraste um arquivo ou clique aqui",
    sendButton: "Enviar",
    preparing: "Preparando...",
    sendingFragment: "Enviando fragmento",
    of: "de",
    creatingIndex: "Criando índice...",
    uploadCompleted: "Envio concluído!",
    fileId: "ID do arquivo:",
    view: "Visualizar",
    error: "Erro:",
    allRelaysFailed: "Fragmento {0} falhou em todos os relays",
    unknown: "desconhecido",
    enterId: "Digite o ID",
    loadButton: "Carregar",
    loading: "Carregando...",
    loaded: "Carregado!",
    notSupported: "Não suportado",
    useDownload: "Use o botão abaixo para baixar.",
    download: "Baixar",
    uploadFile: "Envie Seu Arquivo",
  },
};

const relays = [
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://nostr.wine'
];

// Language detection
let lang = navigator.language.slice(0, 2);
if (!(lang in config)) lang = "en";
const t = config[lang];

// DOM elements
const uploadTab = document.getElementById("uploadTab");
const viewTab = document.getElementById("viewTab");
const uploadContent = document.getElementById("uploadContent");
const viewContent = document.getElementById("viewContent");
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const uploadProgress = document.getElementById("uploadProgress");
const uploadProgressBar = document.getElementById("uploadProgressBar");
const uploadStatus = document.getElementById("uploadStatus");
const uploadBtn = document.getElementById("uploadBtn");
const uploadResult = document.getElementById("uploadResult");
const fileId = document.getElementById("fileId");
const viewLink = document.getElementById("viewLink");

// Viewer Elements
const fileIdInput = document.getElementById("fileIdInput");
const loadButton = document.getElementById("loadButton");
const viewProgress = document.getElementById("viewProgress");
const viewProgressBar = document.getElementById("viewProgressBar");
const viewStatus = document.getElementById("viewStatus");
const viewFileInfo = document.getElementById("viewFileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const fileType = document.getElementById("fileType");
const mediaContainer = document.getElementById("mediaContainer");
const downloadSection = document.getElementById("downloadSection");
const downloadLink = document.getElementById("downloadLink");

// Set texts safely
document.title = t.title;
const safeSetText = (id, text) => {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
};

const safeSetProperty = (element, property, value) => {
  if (element) element[property] = value;
};

if(document.getElementById("appTitle")) document.getElementById("appTitle").textContent = t.title;
if(uploadTab) uploadTab.textContent = t.uploadTab;
if(viewTab) viewTab.textContent = t.viewTab;
safeSetText("dropText", t.dropText);
if(uploadBtn) uploadBtn.textContent = t.sendButton;
safeSetText("fileIdLabel", t.fileId);
if(viewLink) viewLink.textContent = t.view;
safeSetProperty(fileIdInput, "placeholder", t.enterId);
if(loadButton) loadButton.textContent = t.loadButton;
if(downloadLink) downloadLink.textContent = t.download;

// Variables
let selectedFile = null;
let currentRelayIndex = 0;
let lastSuccessfulRelayIndex = -1;

// Tab switching
if (uploadTab && viewTab && uploadContent && viewContent) {
  uploadTab.addEventListener("click", () => {
    uploadTab.classList.add("active");
    viewTab.classList.remove("active");
    uploadContent.classList.add("active");
    viewContent.classList.remove("active");
  });

  viewTab.addEventListener("click", () => {
    viewTab.classList.add("active");
    uploadTab.classList.remove("active");
    viewContent.classList.add("active");
    uploadContent.classList.remove("active");
  });
}

// File handling
if (dropZone && fileInput) {
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () =>
    dropZone.classList.remove("dragover")
  );
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });
}

if (uploadBtn) {
  uploadBtn.addEventListener("click", handleUpload);
}

function handleFile(file) {
  selectedFile = file;
  dropZone.querySelector("p").textContent = `✓ ${file.name}`;

  const size =
    file.size < 1024
      ? `${file.size} B`
      : file.size < 1048576
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / 1048576).toFixed(1)} MB`;

  fileInfo.textContent = `${size} • ${file.type || t.unknown}`;
  fileInfo.style.display = "block";
  uploadBtn.disabled = false;
  uploadResult.style.display = "none";
}

function showUploadStatus(message, type) {
  uploadStatus.textContent = message;
  uploadStatus.className = `status ${type}`;
  uploadStatus.style.display = "block";
}

function updateUploadProgress(percent) {
  uploadProgressBar.style.width = percent + "%";
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function connectRelay(url) {
  try {
    const relay = await NostrTools.Relay.connect(url);
    console.log(`Connected to relay: ${url}`);
    return relay;
  } catch (error) {
    console.error(`Failed to connect to ${url}:`, error);
    throw error;
  }
}

async function getWorkingRelay() {
  if (currentRelayIndex >= relays.length) {
    currentRelayIndex = 0;
  }
  const relayUrl = relays[currentRelayIndex];
  if (!relayUrl) {
    throw new Error("No relays available");
  }
  const relayIndexUsed = currentRelayIndex;
  currentRelayIndex++;

  try {
    const relay = await connectRelay(relayUrl);
    lastSuccessfulRelayIndex = relayIndexUsed;
    return { relay, index: relayIndexUsed };
  } catch (error) {
    throw error;
  }
}

async function handleUpload() {
  if (!selectedFile) {
    showUploadStatus(`${t.error} No file selected`, "error");
    return;
  }

  uploadBtn.disabled = true;
  uploadProgress.style.display = "block";
  uploadResult.style.display = "none";

  let currentRelay = null;
  try {
    showUploadStatus(t.preparing, "info");

    const nsecPrivateKey = NostrTools.nip19.nsecEncode(
      NostrTools.generateSecretKey()
    );
    const { data: privateKeyHex } = NostrTools.nip19.decode(nsecPrivateKey);

    const arrayBuffer = await selectedFile.arrayBuffer();
    const base64String = arrayBufferToBase64(arrayBuffer);
    const chunkSize = 50000;
    const totalChunks = Math.ceil(base64String.length / chunkSize);

    showUploadStatus(
      `${t.sendingFragment} 0 ${t.of} ${totalChunks}...`,
      "info"
    );

    const eventIds = [];
    const relayIndices = new Array(totalChunks).fill(-1);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, base64String.length);
      const chunk = base64String.slice(start, end);

      let success = false;
      let attempts = 0;
      const maxAttempts = relays.length * 2;

      while (!success && attempts < maxAttempts) {
        try {
          if (!currentRelay || currentRelay.closed) {
            const newConnection = await getWorkingRelay();
            currentRelay = newConnection.relay;
            lastSuccessfulRelayIndex = newConnection.index;
          }

          const eventTemplate = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
              ["file", selectedFile.name],
              ["chunk", i.toString()],
              ["total", totalChunks.toString()],
            ],
            content: chunk,
          };

          const signedEvent = NostrTools.finalizeEvent(
            eventTemplate,
            privateKeyHex
          );
          await currentRelay.publish(signedEvent);
          eventIds.push(signedEvent.id);
          relayIndices[i] = lastSuccessfulRelayIndex;
          success = true;

          updateUploadProgress(((i + 1) / totalChunks) * 90);
          showUploadStatus(
            `${t.sendingFragment} ${i + 1} ${t.of} ${totalChunks}...`,
            "info"
          );
        } catch (error) {
          attempts++;
          console.warn(
            `Chunk ${i + 1} failed (attempt ${attempts}):`,
            error.message
          );

          try {
            if (currentRelay) currentRelay.close();
          } catch {}
          currentRelay = null;

          if (attempts < maxAttempts) {
            try {
              const newConnection = await getWorkingRelay();
              currentRelay = newConnection.relay;
              lastSuccessfulRelayIndex = newConnection.index;
            } catch (relayError) {
              console.warn(
                "Failed to connect new relay:",
                relayError.message
              );
            }
          }
        }
      }

      if (!success) {
        throw new Error(t.allRelaysFailed.replace("{0}", i + 1));
      }
    }

    showUploadStatus(t.creatingIndex, "info");
    updateUploadProgress(95);

    const fileMetadata = {
      n: selectedFile.name,
      t: selectedFile.type || t.unknown,
      s: selectedFile.size,
      c: totalChunks,
      u: Date.now(),
    };

    const indexData = {
      m: fileMetadata,
      ch: eventIds,
      rm: relayIndices,
    };

    const base64Index = btoa(JSON.stringify(indexData));
    const indexTemplate = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["index", "true"],
        ["file", selectedFile.name],
      ],
      content: base64Index,
    };

    if (!currentRelay || currentRelay.closed) {
      const newConnection = await getWorkingRelay();
      currentRelay = newConnection.relay;
      lastSuccessfulRelayIndex = newConnection.index;
    }
    const signedIndexEvent = NostrTools.finalizeEvent(
      indexTemplate,
      privateKeyHex
    );
    await currentRelay.publish(signedIndexEvent);

    const finalRelayIndex = lastSuccessfulRelayIndex;
    if (finalRelayIndex < 0 || finalRelayIndex >= relays.length) {
      throw new Error("No valid relay index found for index event");
    }

    const shareCode =
      finalRelayIndex.toString().padStart(2, "0") + signedIndexEvent.id;
    fileId.textContent = shareCode;
    viewLink.href = `${window.location.origin}${window.location.pathname}?s=${shareCode}`;
    uploadResult.style.display = "block";
    uploadProgress.style.display = "none";

    showUploadStatus(t.uploadCompleted, "success");
    updateUploadProgress(100);
    
    try {
      if (currentRelay) currentRelay.close();
    } catch {}
  } catch (error) {
    console.error("Upload error:", error);
    showUploadStatus(`${t.error} ${error.message}`, "error");
    uploadProgress.style.display = "none";
  } finally {
    uploadBtn.disabled = false;
    try {
      if (currentRelay) currentRelay.close();
    } catch {}
  }
}

// Viewer functions
loadButton.addEventListener("click", handleLoad);
fileIdInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleLoad();
});

function showViewStatus(message, type) {
  viewStatus.textContent = message;
  viewStatus.className = `status ${type}`;
  viewStatus.style.display = "block";
}

function updateViewProgress(percent) {
  viewProgressBar.style.width = percent + "%";
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Global createMediaPlayer for modal integration
window.createMediaPlayer = function(blob, metadata) {
  const mimeType = metadata.t;
  const url = URL.createObjectURL(blob);

  mediaContainer.innerHTML = "";

  if (mimeType.startsWith("video/")) {
    const video = document.createElement("video");
    video.className = "video-player";
    video.controls = true;
    video.autoplay = true;
    video.src = url;
    mediaContainer.appendChild(video);
  } else if (mimeType.startsWith("audio/")) {
    const audio = document.createElement("audio");
    audio.className = "audio-player";
    audio.controls = true;
    audio.autoplay = true;
    audio.src = url;
    mediaContainer.appendChild(audio);
  } else if (mimeType.startsWith("image/")) {
    const img = document.createElement("img");
    img.className = "image-viewer";
    img.src = url;
    img.alt = metadata.n;
    mediaContainer.appendChild(img);
  } else if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("css") ||
    mimeType.includes("html")
  ) {
    blob.text().then((content) => {
      const textDiv = document.createElement("div");
      textDiv.className = "text-viewer";
      textDiv.textContent = content;
      mediaContainer.appendChild(textDiv);
    });
  } else {
    const unsupported = document.createElement("div");
    unsupported.className = "unsupported";
    unsupported.innerHTML = `
            <h3>${t.notSupported}</h3>
            <p>${t.useDownload}</p>
        `;
    mediaContainer.appendChild(unsupported);
  }

  downloadLink.href = url;
  downloadLink.download = metadata.n;
  downloadSection.style.display = "block";
}

async function handleLoad() {
  let shareCode = fileIdInput.value;

  if (!shareCode || typeof shareCode !== "string") {
    shareCode = "";
  }

  shareCode = shareCode.trim();

  if (!shareCode) {
    showViewStatus(`${t.error} ${t.enterId}`, "error");
    return;
  }

  loadButton.disabled = true;
  viewProgress.style.display = "block";
  viewFileInfo.style.display = "none";
  mediaContainer.style.display = "none";
  downloadSection.style.display = "none";

  try {
    showViewStatus(t.loading, "info");

    if (shareCode.length < 66) {
      throw new Error("Invalid ID format: too short");
    }

    const relayIndexStr = shareCode.slice(0, 2);
    const relayIndex = parseInt(relayIndexStr);
    if (
      isNaN(relayIndex) ||
      relayIndex < 0 ||
      relayIndex >= relays.length
    ) {
      throw new Error("Invalid ID format: incorrect relay index");
    }

    const indexId = shareCode.slice(2);
    if (indexId.length !== 64 || !/^[0-9a-f]{64}$/.test(indexId)) {
      throw new Error("Invalid ID format: incorrect event ID");
    }

    const relayUrl = relays[relayIndex];
    console.log(`Loading from relay: ${relayUrl}, index ID: ${indexId}`);

    const indexFragments = await fetchIndexFragments(relayUrl, indexId);
    const indexData = JSON.parse(atob(indexFragments.join("")));
    const metadata = indexData.m;
    const chunks = indexData.ch;
    const relayIndices = indexData.rm;
    const relayMap = relayIndices.map((idx) => {
      if (idx < 0 || idx >= relays.length) {
        throw new Error(`Invalid relay index in relayMap: ${idx}`);
      }
      return relays[idx];
    });

    fileName.textContent = metadata.n;
    fileSize.textContent = `${t.fileSize} ${formatFileSize(metadata.s)}`;
    fileType.textContent = `${t.fileType} ${metadata.t}`;
    viewFileInfo.style.display = "block";

    const downloadedChunks = await downloadFileChunks(chunks, relayMap);

    const base64File = downloadedChunks.join("");
    const binaryString = atob(base64File);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: metadata.t });
    window.createMediaPlayer(blob, metadata);

    showViewStatus(t.loaded, "success");
    viewProgress.style.display = "none";
    mediaContainer.style.display = "block";
  } catch (error) {
    console.error("Load error:", error);
    showViewStatus(`${t.error} ${error.message}`, "error");
    viewProgress.style.display = "none";
  } finally {
    loadButton.disabled = false;
  }
}

async function fetchIndexFragments(relayUrl, startEventId) {
  return new Promise((resolve, reject) => {
    const fragments = [];
    const ws = new WebSocket(relayUrl);
    const subscriptionId = "index_" + Date.now();

    ws.onopen = function () {
      const reqMessage = ["REQ", subscriptionId, { ids: [startEventId] }];
      ws.send(JSON.stringify(reqMessage));
    };

    ws.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        if (data[0] === "EVENT" && data[2] && data[2].content) {
          fragments.unshift(data[2].content);

          const nextTag = data[2].tags.find((tag) => tag[0] === "e");
          if (nextTag && nextTag[1]) {
            const reqMessage = [
              "REQ",
              subscriptionId,
              { ids: [nextTag[1]] },
            ];
            ws.send(JSON.stringify(reqMessage));
          } else {
            ws.close();
            resolve(fragments);
          }
        }
      } catch (error) {
        ws.close();
        reject(error);
      }
    };

    ws.onerror = function (error) {
      reject(new Error(`WebSocket error for relay ${relayUrl}`));
    };

    setTimeout(() => {
      ws.close();
      reject(new Error("Timeout fetching index fragments"));
    }, 30000);
  });
}

async function downloadFileChunks(chunkIds, relayMap) {
  return new Promise((resolve, reject) => {
    const chunks = {};
    let receivedCount = 0;
    const totalChunks = chunkIds.length;
    const wsConnections = {};
    let hasResolved = false;

    for (let i = 0; i < totalChunks; i++) {
      const relayUrl = relayMap[i];
      const chunkId = chunkIds[i];

      if (!wsConnections[relayUrl]) {
        wsConnections[relayUrl] = {
          ws: new WebSocket(relayUrl),
          subs: [],
          ready: false,
        };

        wsConnections[relayUrl].ws.onopen = () => {
          wsConnections[relayUrl].ready = true;
          wsConnections[relayUrl].subs.forEach((sub) => {
            const reqMessage = ["REQ", sub.subId, { ids: [sub.id] }];
            wsConnections[relayUrl].ws.send(JSON.stringify(reqMessage));
          });
        };

        wsConnections[relayUrl].ws.onmessage = (event) => {
          if (hasResolved) return;
          
          try {
            const data = JSON.parse(event.data);
            if (data[0] === "EVENT" && data[2] && data[2].content) {
              const chunkTag = data[2].tags.find(
                (tag) => tag[0] === "chunk"
              );
              if (chunkTag) {
                const index = parseInt(chunkTag[1]);
                chunks[index] = data[2].content;
                receivedCount++;

                updateViewProgress((receivedCount / totalChunks) * 100);

                if (receivedCount === totalChunks && !hasResolved) {
                  hasResolved = true;
                  Object.values(wsConnections).forEach((conn) =>
                    conn.ws.close()
                  );
                  const orderedChunks = [];
                  for (let j = 0; j < totalChunks; j++) {
                    if (chunks[j] === undefined) {
                      throw new Error(`Missing chunk ${j}`);
                    }
                    orderedChunks.push(chunks[j]);
                  }
                  resolve(orderedChunks);
                }
              }
            }
          } catch (error) {
            console.error("Chunk download error:", error);
          }
        };

        wsConnections[relayUrl].ws.onerror = (error) => {
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error(`WebSocket error for relay ${relayUrl}`));
          }
        };
      }

      const subId = "chunk_" + Date.now() + "_" + i;
      const sub = { subId, id: chunkId };
      wsConnections[relayUrl].subs.push(sub);

      if (wsConnections[relayUrl].ready) {
        const reqMessage = ["REQ", sub.subId, { ids: [chunkId] }];
        wsConnections[relayUrl].ws.send(JSON.stringify(reqMessage));
      }
    }

    setTimeout(() => {
      if (!hasResolved && receivedCount < totalChunks) {
        hasResolved = true;
        Object.values(wsConnections).forEach((conn) => conn.ws.close());
        reject(new Error("Timeout waiting for chunks"));
      }
    }, 30000);
  });
}

// Auto-load from URL
window.onload = function () {
  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get("s");
  if (urlId) {
    viewTab.click();
    fileIdInput.value = urlId;
    handleLoad();
  }
};