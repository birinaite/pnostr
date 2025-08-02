// Base62 encoding for maximum compactness while keeping reliability
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function toBase62(hex) {
  // Validate hex input
  if (typeof hex !== 'string') {
    console.error('❌ toBase62: input is not string:', typeof hex, hex);
    throw new Error('toBase62: input must be string');
  }
  
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    console.error('❌ toBase62: invalid hex string:', hex);
    throw new Error('toBase62: invalid hex characters');
  }
  
  console.log(`🔄 Converting hex to Base62: ${hex}`);
  
  try {
    let num = BigInt('0x' + hex);
    let encoded = '';
    const base = BigInt(62);
    
    if (num === 0n) return '0';
    
    while (num > 0) {
      const remainder = num % base;
      encoded = BASE62_ALPHABET[Number(remainder)] + encoded;
      num = num / base;
    }
    
    console.log(`✅ Base62 result: ${encoded}`);
    return encoded;
  } catch (error) {
    console.error('❌ toBase62 conversion failed:', error);
    throw new Error('toBase62: conversion failed - ' + error.message);
  }
}

function fromBase62(base62) {
  // Validate Base62 input
  if (typeof base62 !== 'string') {
    console.error('❌ fromBase62: input is not string:', typeof base62, base62);
    throw new Error('fromBase62: input must be string');
  }
  
  console.log(`🔄 Converting Base62 to hex: ${base62}`);
  
  try {
    let num = 0n;
    const base = BigInt(62);
    
    for (let char of base62) {
      const charIndex = BASE62_ALPHABET.indexOf(char);
      if (charIndex === -1) {
        console.error(`❌ fromBase62: invalid character '${char}' in '${base62}'`);
        throw new Error(`Invalid Base62 character: ${char}`);
      }
      num = num * base + BigInt(charIndex);
    }
    
    let hex = num.toString(16);
    // Pad to 64 chars if needed
    while (hex.length < 64) {
      hex = '0' + hex;
    }
    
    console.log(`✅ Hex result: ${hex}`);
    return hex;
  } catch (error) {
    console.error('❌ fromBase62 conversion failed:', error);
    throw new Error('fromBase62: conversion failed - ' + error.message);
  }
}

// Reliable compact ID using Base62 encoding
function generateSearchableId(eventId, relayIndex, fileName) {
  // Validate inputs with detailed logging
  console.log(`🔧 Generating ID with:`, { eventId, relayIndex, fileName });
  
  if (typeof eventId !== 'string' || eventId.length !== 64) {
    throw new Error(`Invalid eventId: "${eventId}" (type: ${typeof eventId}, length: ${eventId?.length})`);
  }
  if (typeof relayIndex !== 'number' || isNaN(relayIndex) || relayIndex < 0 || relayIndex >= relays.length) {
    throw new Error(`Invalid relayIndex: "${relayIndex}" (type: ${typeof relayIndex})`);
  }
  
  // Use Base62 to encode the full eventId - much more compact than hex
  const base62EventId = toBase62(eventId);
  const shortId = relayIndex.toString() + base62EventId;
  
  console.log(`✅ Generated Base62 ID: ${shortId}`);
  console.log(`- Relay: ${relayIndex} (${relays[relayIndex]})`);
  console.log(`- Original eventId: ${eventId} (${eventId.length} chars)`);
  console.log(`- Base62 eventId: ${base62EventId} (${base62EventId.length} chars)`);
  console.log(`- Final ID length: ${shortId.length} chars`);
  console.log(`- Compression: ${Math.round((1 - base62EventId.length / eventId.length) * 100)}%`);
  
  return shortId;
}

function parseSearchableId(shortId) {
  if (typeof shortId !== 'string' || shortId.length < 5) {
    throw new Error(`Invalid shortId format: "${shortId}" (length: ${shortId?.length || 0})`);
  }
  
  const relayIndex = parseInt(shortId.charAt(0));
  const base62EventId = shortId.slice(1);
  
  console.log(`Parsing Base62 ID: ${shortId} (${shortId.length} chars)`);
  console.log(`- Relay: ${relayIndex} (${relays[relayIndex] || 'INVALID'})`);
  console.log(`- Base62 part: ${base62EventId} (${base62EventId.length} chars)`);
  
  if (isNaN(relayIndex) || relayIndex < 0 || relayIndex >= relays.length) {
    throw new Error(`Invalid relay index in ID: ${relayIndex}`);
  }
  
  try {
    const eventId = fromBase62(base62EventId);
    console.log(`- Decoded eventId: ${eventId} (${eventId.length} chars)`);
    return { relayIndex, eventId };
  } catch (error) {
    throw new Error('Invalid Base62 encoding in ID: ' + error.message);
  }
}

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
    copyLink: "Copy Link",
    linkCopied: "Copied!"
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
    fileSize: "Tamanho:",
    fileType: "Tipo:",
    uploadFile: "Envie Seu Arquivo",
    copyLink: "Copiar Link",
    linkCopied: "Copiado!"
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
const copyBtn = document.getElementById("copyBtn");
const footerUpload = document.getElementById("footerUpload");
const uploadFooterBtn = document.getElementById("uploadFooterBtn");

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
if(copyBtn) copyBtn.textContent = t.copyLink;
if(uploadFooterBtn) uploadFooterBtn.textContent = t.uploadFile;

// Variables
let selectedFile = null;
let currentRelayIndex = 0;
let lastSuccessfulRelayIndex = 0; // Initialize with 0 instead of -1
let isViewMode = false;

// Check URL for direct view mode
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get("id");
  
  if (urlId) {
    isViewMode = true;
    // Hide tabs and show only view content
    document.querySelector('.container').classList.add('hide-tabs');
    if (viewTab && fileIdInput) {
      showViewContent();
      fileIdInput.value = urlId;
      setTimeout(() => handleLoad(), 500);
    }
    // Show footer upload button
    if (footerUpload) {
      footerUpload.style.display = 'block';
    }
  }
}

// Tab switching functions
function showUploadContent() {
  if (uploadTab) uploadTab.classList.add("active");
  if (viewTab) viewTab.classList.remove("active");
  if (uploadContent) uploadContent.classList.add("active");
  if (viewContent) viewContent.classList.remove("active");
  if (footerUpload) footerUpload.style.display = 'none';
  isViewMode = false;
}

function showViewContent() {
  if (viewTab) viewTab.classList.add("active");
  if (uploadTab) uploadTab.classList.remove("active");
  if (viewContent) viewContent.classList.add("active");
  if (uploadContent) uploadContent.classList.remove("active");
  if (footerUpload) footerUpload.style.display = 'block';
  isViewMode = true;
}

// Tab switching
if (uploadTab && viewTab && uploadContent && viewContent) {
  uploadTab.addEventListener("click", showUploadContent);
  viewTab.addEventListener("click", showViewContent);
}

// Footer upload button
if (uploadFooterBtn) {
  uploadFooterBtn.addEventListener("click", () => {
    // Remove URL parameters and show upload tab
    window.history.pushState({}, '', window.location.pathname);
    document.querySelector('.container').classList.remove('hide-tabs');
    showUploadContent();
  });
}

// Copy button functionality
if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    const shareCode = fileIdInput.value;
    if (shareCode) {
      const url = `${window.location.origin}${window.location.pathname}?id=${shareCode}`;
      try {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = t.linkCopied;
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = t.copyLink;
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
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
  if (dropZone) {
    const p = dropZone.querySelector("p");
    if (p) p.textContent = `✓ ${file.name}`;
  }

  const size =
    file.size < 1024
      ? `${file.size} B`
      : file.size < 1048576
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / 1048576).toFixed(1)} MB`;

  if (fileInfo) {
    fileInfo.textContent = `${size} • ${file.type || t.unknown}`;
    fileInfo.style.display = "block";
  }
  if (uploadBtn) uploadBtn.disabled = false;
  if (uploadResult) uploadResult.style.display = "none";
}

function showUploadStatus(message, type) {
  if (uploadStatus) {
    uploadStatus.textContent = message;
    uploadStatus.className = `status ${type}`;
    uploadStatus.style.display = "block";
  }
}

function updateUploadProgress(percent) {
  if (uploadProgressBar) {
    uploadProgressBar.style.width = percent + "%";
  }
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

  console.log(`🔄 Trying relay ${relayIndexUsed}: ${relayUrl}`);

  try {
    const relay = await connectRelay(relayUrl);
    console.log(`✅ Connected to relay ${relayIndexUsed}: ${relayUrl}`);
    return { relay, index: relayIndexUsed };
  } catch (error) {
    console.warn(`❌ Failed to connect to relay ${relayIndexUsed}: ${relayUrl}`, error);
    throw error;
  }
}

async function handleUpload() {
  if (!selectedFile) {
    showUploadStatus(`${t.error} No file selected`, "error");
    return;
  }

  if (uploadBtn) uploadBtn.disabled = true;
  if (uploadProgress) uploadProgress.style.display = "block";

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
            console.log(`🔄 Switched to relay ${lastSuccessfulRelayIndex} for chunk ${i + 1}`);
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
              console.log(`🔄 Retry with relay ${lastSuccessfulRelayIndex} for chunk ${i + 1}`);
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
      console.log(`🔄 Final relay connection: ${lastSuccessfulRelayIndex}`);
    }
    
    const signedIndexEvent = NostrTools.finalizeEvent(
      indexTemplate,
      privateKeyHex
    );
    
    // Validate the generated event
    if (!signedIndexEvent || !signedIndexEvent.id) {
      throw new Error('Failed to create signed index event');
    }
    
    console.log(`📋 Created index event:`, {
      id: signedIndexEvent.id,
      kind: signedIndexEvent.kind,
      created_at: signedIndexEvent.created_at
    });
    
    await currentRelay.publish(signedIndexEvent);

    // Ensure we have a valid relay index with multiple fallbacks
    let finalRelayIndex = lastSuccessfulRelayIndex;
    
    console.log(`🔍 Checking relay index: ${finalRelayIndex} (type: ${typeof finalRelayIndex})`);
    
    // Multiple fallback strategies
    if (finalRelayIndex === undefined || finalRelayIndex === null || isNaN(finalRelayIndex)) {
      console.warn(`⚠️ Relay index is undefined/null/NaN, using fallback`);
      finalRelayIndex = 0;
    }
    
    if (finalRelayIndex < 0 || finalRelayIndex >= relays.length) {
      console.warn(`⚠️ Relay index ${finalRelayIndex} out of bounds, using fallback`);
      finalRelayIndex = 0;
    }
    
    // Final validation
    finalRelayIndex = Math.floor(Number(finalRelayIndex)); // Ensure it's an integer
    
    console.log(`🏁 Final validated relay index: ${finalRelayIndex}`);
    console.log(`📋 Event ID: ${signedIndexEvent.id}`);
    console.log(`🔗 Using relay: ${relays[finalRelayIndex]}`);
    
    const shareCode = generateSearchableId(signedIndexEvent.id, finalRelayIndex, selectedFile.name);
    
    showUploadStatus(t.uploadCompleted, "success");
    updateUploadProgress(100);

    if (fileId) fileId.textContent = shareCode;
    if (viewLink) {
      viewLink.href = `?id=${shareCode}`;
    }
    if (uploadResult) uploadResult.style.display = "block";

    // Hide progress bar after completion
    if (uploadProgress) {
      setTimeout(() => {
        uploadProgress.style.display = "none";
      }, 1000);
    }

    // Auto-switch to view tab and load the uploaded file
    setTimeout(() => {
      if (viewTab && fileIdInput) {
        showViewContent();
        fileIdInput.value = shareCode;
        handleLoad();
      }
    }, 1500);
    
    try {
      if (currentRelay) currentRelay.close();
    } catch {}
  } catch (error) {
    console.error("Upload error:", error);
    showUploadStatus(`${t.error} ${error.message}`, "error");
    if (uploadProgress) uploadProgress.style.display = "none";
  } finally {
    if (uploadBtn) uploadBtn.disabled = false;
    try {
      if (currentRelay) currentRelay.close();
    } catch {}
  }
}

// Viewer functions
if (loadButton) {
  loadButton.addEventListener("click", handleLoad);
}
if (fileIdInput) {
  fileIdInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleLoad();
  });
}

function showViewStatus(message, type) {
  if (viewStatus) {
    if (!message) {
      viewStatus.style.display = "none";
      return;
    }
    viewStatus.textContent = message;
    viewStatus.className = `status ${type}`;
    viewStatus.style.display = "block";
  }
}

function updateViewProgress(percent) {
  if (viewProgressBar) {
    viewProgressBar.style.width = percent + "%";
  }
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
  if (!mediaContainer) return;
  
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
    img.addEventListener('click', function() {
      this.classList.toggle('zoomed');
    });
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

  if (downloadLink) {
    downloadLink.href = url;
    downloadLink.download = metadata.n;
  }
  if (downloadSection) {
    downloadSection.style.display = "block";
  }
}

async function handleLoad() {
  if (!fileIdInput) return;
  
  let shareCode = fileIdInput.value;

  if (!shareCode || typeof shareCode !== "string") {
    shareCode = "";
  }

  shareCode = shareCode.trim();

  if (!shareCode) {
    showViewStatus(`${t.error} ${t.enterId}`, "error");
    return;
  }

  if (loadButton) loadButton.disabled = true;
  if (viewProgress) viewProgress.style.display = "block";
  if (viewFileInfo) viewFileInfo.style.display = "none";
  if (mediaContainer) mediaContainer.style.display = "none";
  if (downloadSection) downloadSection.style.display = "none";

  try {
    showViewStatus(t.loading, "info");

    // Base62 compressed ID - reliable and compact
    if (shareCode.length < 10) {
      throw new Error("Invalid file ID format - too short");
    }

    console.log('Loading file with Base62 ID:', shareCode, `(${shareCode.length} chars)`);
    const parsed = parseSearchableId(shareCode);
    const relayIndex = parsed.relayIndex;
    const eventId = parsed.eventId;
    
    if (isNaN(relayIndex) || relayIndex < 0 || relayIndex >= relays.length) {
      throw new Error("Invalid file ID - relay not available");
    }
    
    const relayUrl = relays[relayIndex];
    console.log(`🎯 Direct fetch from ${relayUrl} with eventId: ${eventId}`);
    
    // Direct fetch by full eventId - guaranteed to work!
    const indexFragments = await fetchIndexFragments(relayUrl, eventId);
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

    if (fileName) fileName.textContent = metadata.n;
    if (fileSize) fileSize.textContent = `${t.fileSize} ${formatFileSize(metadata.s)}`;
    if (fileType) fileType.textContent = `${t.fileType} ${metadata.t}`;
    if (viewFileInfo) viewFileInfo.style.display = "block";

    const downloadedChunks = await downloadFileChunks(chunks, relayMap);

    const base64File = downloadedChunks.join("");
    const binaryString = atob(base64File);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: metadata.t });
    window.createMediaPlayer(blob, metadata);

    // Hide loading status and progress
    if (viewStatus) viewStatus.style.display = "none";
    if (viewProgress) viewProgress.style.display = "none";
    if (mediaContainer) mediaContainer.style.display = "block";

    // Update URL without refreshing page
    const newUrl = `${window.location.pathname}?id=${shareCode}`;
    window.history.pushState({}, '', newUrl);

  } catch (error) {
    console.error("Load error:", error);
    
    // Check if it's an invalid ID error and redirect to upload
    const isInvalidId = error.message.includes("Invalid file ID") || 
                       error.message.includes("Invalid ID format") ||
                       error.message.includes("Timeout") ||
                       error.message.includes("WebSocket error");
    
    if (isInvalidId && !isViewMode) {
      showViewStatus(`${t.error} ${error.message}`, "error");
      setTimeout(() => {
        if (uploadTab) {
          showUploadContent();
          if (fileIdInput) fileIdInput.value = "";
          showViewStatus("", "");
          if (viewStatus) viewStatus.style.display = "none";
        }
      }, 2000);
    } else {
      showViewStatus(`${t.error} ${error.message}`, "error");
    }
    
    if (viewProgress) viewProgress.style.display = "none";
  } finally {
    if (loadButton) loadButton.disabled = false;
  }
}

async function searchByEventSuffix(relayUrl, eventSuffix) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    const subscriptionId = "suffix_" + Date.now();
    let foundEvent = null;
    let eventsChecked = 0;

    console.log(`🔗 Searching for event ending with: ${eventSuffix} on ${relayUrl}`);

    ws.onopen = function () {
      // Search for index events
      const reqMessage = ["REQ", subscriptionId, { 
        kinds: [1], 
        "#index": ["true"],
        limit: 500
      }];
      ws.send(JSON.stringify(reqMessage));
    };

    ws.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        
        if (data[0] === "EVENT" && data[2] && data[2].content) {
          const eventData = data[2];
          const eventId = eventData.id;
          eventsChecked++;
          
          // Check if this event ends with our suffix
          if (eventId.endsWith(eventSuffix)) {
            console.log(`🎯 FOUND! Event: ${eventId} ends with ${eventSuffix}`);
            foundEvent = eventId;
            const indexData = JSON.parse(atob(eventData.content));
            ws.close();
            resolve({ eventId, indexData });
            return;
          }
          
          if (eventsChecked <= 10) {
            console.log(`📋 Event ${eventsChecked}: ...${eventId.slice(-8)}`);
          }
        }
        
        if (data[0] === "EOSE") {
          console.log(`⏹️ Search complete. Checked ${eventsChecked} events.`);
          if (!foundEvent) {
            ws.close();
            reject(new Error(`No event found ending with: ${eventSuffix}`));
          }
        }
        
      } catch (error) {
        console.error('❌ Search error:', error);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = function (error) {
      console.error('❌ WebSocket error:', error);
      reject(new Error(`WebSocket error for relay ${relayUrl}`));
    };

    setTimeout(() => {
      if (!foundEvent) {
        console.error(`⏰ Search timeout for suffix: ${eventSuffix}`);
        ws.close();
        reject(new Error(`Timeout searching for event suffix: ${eventSuffix}`));
      }
    }, 30000);
  });
}

async function searchByCompactHash(relayUrl, compactHash) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    const subscriptionId = "compact_" + Date.now();
    let foundEvent = null;
    let eventsChecked = 0;

    console.log(`🔗 Searching for compact hash: ${compactHash} on ${relayUrl}`);

    ws.onopen = function () {
      // Search recent index events
      const reqMessage = ["REQ", subscriptionId, { 
        kinds: [1], 
        "#index": ["true"],
        limit: 200
      }];
      ws.send(JSON.stringify(reqMessage));
    };

    ws.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        
        if (data[0] === "EVENT" && data[2] && data[2].content) {
          const eventData = data[2];
          const eventId = eventData.id;
          eventsChecked++;
          
          // Test if this event could generate our compact hash
          // We need to try different timestamps around the event creation time
          const eventTime = eventData.created_at * 1000; // Convert to milliseconds
          
          // Try timestamps within a 10-second window of event creation
          for (let offset = -5000; offset <= 5000; offset += 100) {
            const testTimestamp = eventTime + offset;
            const combined = eventId + testTimestamp.toString();
            const testCrc = crc32(combined);
            const testHash = testCrc.toString(36).slice(0, 6);
            
            if (testHash === compactHash) {
              console.log(`🎯 MATCH FOUND! Event: ${eventId}`);
              foundEvent = eventId;
              const indexData = JSON.parse(atob(eventData.content));
              ws.close();
              resolve({ eventId, indexData });
              return;
            }
          }
          
          if (eventsChecked <= 5) {
            console.log(`📋 Checked event ${eventsChecked}: ${eventId.slice(-8)}`);
          }
        }
        
        if (data[0] === "EOSE") {
          console.log(`⏹️ Search complete. Checked ${eventsChecked} events.`);
          if (!foundEvent) {
            ws.close();
            reject(new Error(`No event found with compact hash: ${compactHash}`));
          }
        }
        
      } catch (error) {
        console.error('❌ Search error:', error);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = function (error) {
      console.error('❌ WebSocket error:', error);
      reject(new Error(`WebSocket error for relay ${relayUrl}`));
    };

    setTimeout(() => {
      if (!foundEvent) {
        console.error(`⏰ Search timeout for hash: ${compactHash}`);
        ws.close();
        reject(new Error(`Timeout searching for compact hash: ${compactHash}`));
      }
    }, 30000);
  });
}

async function searchByRefererAndId(relayUrl, shortId, parsed) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    const subscriptionId = "search_" + Date.now();
    let foundEvent = null;
    let eventsChecked = 0;

    ws.onopen = function () {
      console.log(`🔗 Connected to relay: ${relayUrl}`);
      console.log(`🔍 Looking for events ending with: "${parsed.eventSuffix}"`);
      console.log(`📁 Expected file hash: "${parsed.fileHash}"`);
      
      // Search for ALL index events first (no referer filter to start)
      const reqMessage = ["REQ", subscriptionId, { 
        kinds: [1], 
        "#index": ["true"],
        limit: 1000
      }];
      ws.send(JSON.stringify(reqMessage));
    };

    ws.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        
        if (data[0] === "EVENT" && data[2] && data[2].content) {
          const eventData = data[2];
          const eventId = eventData.id;
          const fileName = eventData.tags.find(tag => tag[0] === "file")?.[1] || "";
          
          eventsChecked++;
          
          // Log first few events for debugging
          if (eventsChecked <= 5) {
            console.log(`📋 Event ${eventsChecked}: ${eventId.slice(-8)} | File: "${fileName}"`);
          }
          
          // Check if this could be our event
          if (eventId.endsWith(parsed.eventSuffix)) {
            console.log(`✅ Found candidate event: ${eventId}`);
            console.log(`📁 File name: "${fileName}"`);
            
            const testFileHash = simpleHash(fileName).toString(36).slice(0, 4);
            console.log(`🔢 Computed file hash: "${testFileHash}" (expected: "${parsed.fileHash}")`);
            
            if (testFileHash === parsed.fileHash) {
              console.log(`🎯 PERFECT MATCH FOUND!`);
              foundEvent = eventId;
              const indexData = JSON.parse(atob(eventData.content));
              ws.close();
              resolve({ eventId, indexData });
              return;
            } else {
              console.log(`❌ File hash mismatch for event ending in ${parsed.eventSuffix}`);
            }
          }
        }
        
        if (data[0] === "EOSE") {
          console.log(`⏹️ Search complete. Checked ${eventsChecked} events total.`);
          
          if (!foundEvent) {
            console.log(`❌ No event found ending with "${parsed.eventSuffix}" and file hash "${parsed.fileHash}"`);
            ws.close();
            reject(new Error(`File not found with ID: ${shortId}. Checked ${eventsChecked} events.`));
          }
        }
        
      } catch (error) {
        console.error('❌ Parse error:', error);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = function (error) {
      console.error('❌ WebSocket error:', error);
      reject(new Error(`WebSocket error for relay ${relayUrl}`));
    };

    setTimeout(() => {
      if (!foundEvent) {
        console.error(`⏰ Search timeout. Checked ${eventsChecked} events for ID: ${shortId}`);
        ws.close();
        reject(new Error(`Timeout searching for file ID: ${shortId}. Checked ${eventsChecked} events.`));
      }
    }, 45000);
  });
}

async function searchIndexByPartial(relayUrl, partial, checksum) {
  return new Promise((resolve, reject) => {
    const fragments = [];
    const ws = new WebSocket(relayUrl);
    const subscriptionId = "search_" + Date.now();
    let foundEvent = null;

    ws.onopen = function () {
      // Search for recent index events
      const reqMessage = ["REQ", subscriptionId, { 
        kinds: [1], 
        "#index": ["true"],
        limit: 100
      }];
      ws.send(JSON.stringify(reqMessage));
    };

    ws.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        if (data[0] === "EVENT" && data[2] && data[2].content) {
          const eventId = data[2].id;
          
          // Check if this event matches our partial + checksum
          if (eventId.slice(-8) === partial) {
            const computedChecksum = crc32(eventId).toString(36).slice(0, 3);
            if (computedChecksum === checksum) {
              foundEvent = eventId;
              fragments.push(data[2].content);
              
              // Look for linked events
              const nextTag = data[2].tags.find((tag) => tag[0] === "e");
              if (nextTag && nextTag[1]) {
                const reqMessage = ["REQ", subscriptionId + "_next", { ids: [nextTag[1]] }];
                ws.send(JSON.stringify(reqMessage));
              } else {
                ws.close();
                resolve(fragments);
              }
              return;
            }
          }
        }
        
        if (data[0] === "EOSE") {
          if (!foundEvent) {
            ws.close();
            reject(new Error("Event not found with partial ID"));
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
      reject(new Error("Timeout searching for partial ID"));
    }, 30000);
  });
}

async function fetchIndexFragments(relayUrl, startEventId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(relayUrl);
    const subscriptionId = "direct_" + Date.now();

    console.log(`🔗 Connecting to ${relayUrl} to fetch event: ${startEventId}`);

    ws.onopen = function () {
      console.log(`📡 Connected! Requesting event directly...`);
      const reqMessage = ["REQ", subscriptionId, { ids: [startEventId] }];
      ws.send(JSON.stringify(reqMessage));
      console.log(`📤 Sent request:`, reqMessage);
    };

    ws.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        console.log(`📨 Received:`, data[0], data[1]);
        
        if (data[0] === "EVENT" && data[2] && data[2].content) {
          console.log(`✅ Found event! ID: ${data[2].id}`);
          console.log(`📋 Content length: ${data[2].content.length}`);
          
          ws.close();
          resolve([data[2].content]); // Return as array for compatibility
          
        } else if (data[0] === "EOSE") {
          console.log(`❌ End of stream - event not found`);
          ws.close();
          reject(new Error("Event not found on relay"));
          
        } else if (data[0] === "NOTICE") {
          console.log(`⚠️ Relay notice: ${data[1]}`);
        }
      } catch (error) {
        console.error(`❌ Parse error:`, error);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = function (error) {
      console.error(`❌ WebSocket error:`, error);
      reject(new Error(`WebSocket error for relay ${relayUrl}`));
    };

    ws.onclose = function() {
      console.log(`🔌 Connection closed to ${relayUrl}`);
    };

    setTimeout(() => {
      console.log(`⏰ Timeout fetching event ${startEventId} from ${relayUrl}`);
      ws.close();
      reject(new Error("Timeout fetching event"));
    }, 15000);
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

// Initialize on page load
window.onload = function () {
  checkUrlParams();
};