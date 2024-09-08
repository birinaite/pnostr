const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('uploadAndPublish');
const statusMessage = document.getElementById("statusMessage");
const lastPostIdElement = document.getElementById("lastPostId");

// Exibir nome do arquivo após seleção via drag-and-drop
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.style.backgroundColor = '#e0e0e0';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.backgroundColor = '#fff';
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.style.backgroundColor = '#fff';
    const file = event.dataTransfer.files[0];
    fileInput.files = event.dataTransfer.files;
    if (file) {
        dropZone.querySelector('p').textContent = `Arquivo selecionado: ${file.name}`;
    }
});

// Exibir nome do arquivo após seleção manual
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        dropZone.querySelector('p').textContent = `Arquivo selecionado: ${file.name}`;
    }
});

uploadButton.addEventListener("click", async function () {
    const file = fileInput.files[0];

    if (!file) {
        alert("Por favor, selecione um arquivo MP3.");
        return;
    }

    // Ocultar o botão de envio durante o upload
    uploadButton.style.display = 'none';
    statusMessage.innerText = "Enviando arquivo...";

    const nsecPrivateKey = NostrTools.nip19.nsecEncode(NostrTools.generateSecretKey());
    const { type, data: privateKeyHex } = NostrTools.nip19.decode(nsecPrivateKey);

    if (type !== 'nsec') {
        console.error('Chave privada inválida.');
        return;
    }

    const reader = new FileReader();

    reader.onload = async function (event) {
        const arrayBuffer = event.target.result;

        // Converter o ArrayBuffer para base64 antes de realizar operações assíncronas
        const base64String = arrayBufferToBase64(arrayBuffer);

        // Calcular a duração dos fragmentos em 1.2 segundos
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const duration = audioBuffer.duration; // Duração total do áudio

        // const bitrate = 128000; // Assumindo um bitrate de 128 kbps
        // const chunkDuration = 1.2; // 1.2 segundos por fragmento
        // const bytesPerSecond = bitrate / 8; // Quantidade de bytes por segundo com base no bitrate
        // const chunkSize = Math.floor(bytesPerSecond * chunkDuration); // Quantidade de bytes por fragmento de 1.2 segundos
        const bitrate = audioBuffer.sampleRate * audioBuffer.numberOfChannels * 16; // Cálculo mais preciso
        const chunkDuration = 0.3; // 1.2 segundos por fragmento
        const bytesPerSecond = bitrate / 8;
        const chunkSize = Math.floor(bytesPerSecond * chunkDuration);


        const totalChunks = Math.ceil(base64String.length / chunkSize);
        let eventIds = [];

        var hellLay = ['wss://kr.purplerelay.com','wss://relay.primal.net'];

        const connect = hellLay[Math.floor(Math.random() * hellLay.length)];

        let relay = await NostrTools.Relay.connect(connect);
        console.log(`Conectado ao ${relay.url}`);

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, base64String.length);
            const base64Chunk = base64String.slice(start, end);

            let eventTemplate = {
                kind: 1,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: base64Chunk
            };

            let signedEvent = NostrTools.finalizeEvent(eventTemplate, privateKeyHex);
            await relay.publish(signedEvent);
            eventIds.push(signedEvent.id);
            console.log(`Fragmento ${i + 1} de ${totalChunks} publicado.`);
            statusMessage.innerText = `Enviando fragmento ${i + 1} de ${totalChunks} do arquivo...`;
        }

        const base64Ids = btoa(JSON.stringify(eventIds));
        const indexChunkSize = 50000;
        const totalIdChunks = Math.ceil(base64Ids.length / indexChunkSize);
        let finalEventIds = [];
        let lastId = null;

        for (let i = 0; i < totalIdChunks; i++) {
            const start = i * indexChunkSize;
            const end = Math.min(start + indexChunkSize, base64Ids.length);
            const idChunk = base64Ids.slice(start, end);

            let tags = [];

            // Adiciona a tag `e` com o ID do último post, se existir
            if (lastId) {
                tags.push(["e", lastId]);
            }

            // Adiciona a tag `t` com o tempo total no último post
            if (i === totalIdChunks - 1) {
                tags.push(["t", `${duration}`]);
            }

            let idEventTemplate = {
                kind: 1,
                created_at: Math.floor(Date.now() / 1000),
                tags: tags,
                content: idChunk
            };

            let signedIdEvent = NostrTools.finalizeEvent(idEventTemplate, privateKeyHex);
            await relay.publish(signedIdEvent);
            finalEventIds.push(signedIdEvent.id);
            lastId = signedIdEvent.id;
            console.log(`Fragmento de ID ${i + 1} de ${totalIdChunks} publicado.`);
            statusMessage.innerText = `Enviando fragmento ${i + 1} de ${totalIdChunks} do índice...`;
        }

        const lastPostId = finalEventIds[finalEventIds.length - 1];
        const key=JSON.stringify({"relay":connect,"id":lastPostId})
        const encoder = new TextEncoder();
        const bytes = btoa(String.fromCharCode(...encoder.encode(key)))

        lastPostIdElement.innerHTML = `ID da última postagem de fragmento de IDs: ${lastPostId}<br><a class="listen-link" href="./?id=${bytes}" target="_blank">OUVIR</a>`;
        console.log('ID da última postagem de fragmento de IDs:', lastPostId);
        console.log()

        statusMessage.innerText = "Envio concluído!";

        fileInput.value = '';
        dropZone.querySelector('p').textContent = 'Arraste o arquivo MP3 aqui ou clique para selecionar';
        uploadButton.style.display = 'inline-block';
        relay.close();
        console.log('Conexão com o relay fechada.');
    };

    reader.readAsArrayBuffer(file);
});

// Função para converter um array buffer em base64 sem exceder o tamanho da pilha
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}