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
        showToast("No se pudo acceder al micrófono. Por favor, verifica los permisos.", "error");
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

const needle = document.getElementById('gauge-needle');
const container = document.getElementById('note-display');
const lowIndicator = document.getElementById('indicator-low');
const highIndicator = document.getElementById('indicator-high');

// Para suavizado de la aguja
let lastCents = 0;
const smoothing = 0.2; // Factor de interpolación (0-1)

function displayNote(note, cents, frequency) {
    const noteName = noteStrings[note % 12];
    noteDisplay.textContent = noteName;
    freqDisplay.textContent = `Frecuencia: ${frequency.toFixed(1)} Hz`;

    // Suavizado de la desviación para la aguja
    lastCents = lastCents + (cents - lastCents) * smoothing;
    
    // Calcular posición de la aguja (-50 a +50 cents -> 0% a 100%)
    // La aguja está centrada al 50%.
    const position = 50 + (lastCents); 
    const clampedPosition = Math.max(0, Math.min(100, position));
    needle.style.left = `${clampedPosition}%`;

    // Activar indicadores de dirección
    lowIndicator.classList.toggle('active', cents < -5);
    highIndicator.classList.toggle('active', cents > 5);

    let deviationText = Math.abs(cents) + " cents";
    if (cents > 0) deviationText = "+" + deviationText;
    else if (cents < 0) deviationText = "-" + deviationText;
    deviationDisplay.textContent = `Desviación: ${deviationText}`;

    // Cambiar color y brillo según afinación
    if (Math.abs(cents) < 5) {
        container.style.borderColor = "#4caf50"; // Verde
        container.style.backgroundColor = "rgba(76, 175, 80, 0.2)"; // Fondo verde sutil
        container.style.boxShadow = "0 0 40px rgba(76, 175, 80, 0.6), inset 0 0 20px rgba(76, 175, 80, 0.3)";
        needle.style.backgroundColor = "#4caf50";
        needle.style.boxShadow = "0 0 15px #4caf50";
        lowIndicator.classList.remove('active');
        highIndicator.classList.remove('active');
    } else if (Math.abs(cents) < 15) {
        container.style.borderColor = "#ffeb3b"; // Amarillo
        container.style.backgroundColor = "rgba(255, 235, 59, 0.1)"; 
        container.style.boxShadow = "0 0 20px rgba(255, 235, 59, 0.4)";
        needle.style.backgroundColor = "#ffeb3b";
        needle.style.boxShadow = "0 0 10px #ffeb3b";
    } else {
        container.style.borderColor = ""; // Reset a tema original
        container.style.backgroundColor = "";
        container.style.boxShadow = "";
        needle.style.backgroundColor = ""; // Reset a tema original
        needle.style.boxShadow = "";
    }
}
