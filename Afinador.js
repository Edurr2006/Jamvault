const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

let audioContext = null;
let analyser = null;
let mediaStreamSource = null;
let isTunerRunning = false;
let rafId = null;

const startButton = document.getElementById('startButton');
const noteDisplay = document.getElementById('note');
const freqDisplay = document.getElementById('freq');
const deviationDisplay = document.getElementById('deviation');

startButton.addEventListener('click', toggleTuner);

async function toggleTuner() {
    if (isTunerRunning) {
        stopTuner();
    } else {
        await startTuner();
    }
}

async function startTuner() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        mediaStreamSource.connect(analyser);

        isTunerRunning = true;
        startButton.textContent = "Detener afinador";
        startButton.classList.add('active'); // Opcional: estilo para indicar activo

        updatePitch();
    } catch (err) {
        console.error("Error al acceder al micrófono:", err);
        alert("No se pudo acceder al micrófono. Por favor, verifica los permisos.");
    }
}

function stopTuner() {
    isTunerRunning = false;
    startButton.textContent = "Iniciar afinador";
    startButton.classList.remove('active');

    if (rafId) {
        cancelAnimationFrame(rafId);
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}

function updatePitch() {
    if (!isTunerRunning) return;

    const bufferLength = analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(buffer);

    const frequency = autoCorrelate(buffer, audioContext.sampleRate);

    if (frequency === -1) {
        // No se detectó tono claro
        // Podríamos mantener el último valor o mostrar guiones
    } else {
        const note = getNote(frequency);
        const cents = getCents(frequency, note);

        displayNote(note, cents, frequency);
    }

    rafId = requestAnimationFrame(updatePitch);
}

function autoCorrelate(buf, sampleRate) {
    // Algoritmo de autocorrelación simple
    let SIZE = buf.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
        const val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    if (rms < 0.01) // Señal muy débil
        return -1;

    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++)
        if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++)
        if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    let c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++)
        for (let j = 0; j < SIZE - i; j++)
            c[i] = c[i] + buf[j] * buf[j + i];

    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    let T0 = maxpos;

    let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    let a = (x1 + x3 - 2 * x2) / 2;
    let b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
}

function getNote(frequency) {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
}

function getCents(frequency, note) {
    return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2));
}

function frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function displayNote(note, cents, frequency) {
    const noteName = noteStrings[note % 12];
    noteDisplay.textContent = noteName;
    freqDisplay.textContent = `Frecuencia: ${frequency.toFixed(1)} Hz`;

    let deviationText = cents + " cents";
    if (cents > 0) deviationText = "+" + deviationText;
    deviationDisplay.textContent = `Desviación: ${deviationText}`;

    // Cambiar color según afinación
    const container = document.getElementById('note-display');
    if (Math.abs(cents) < 5) {
        container.style.borderColor = "#4caf50"; // Verde
        container.style.boxShadow = "0 0 20px #4caf50";
    } else {
        container.style.borderColor = ""; // Reset
        container.style.boxShadow = "";
    }
}
