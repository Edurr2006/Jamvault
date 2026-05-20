const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

let audioContext = null;
let analyser = null;
let mediaStream = null;
let isTunerRunning = false;
let rafId = null;

// Filtro de suavizado (mediana de las últimas N lecturas) para estabilidad
let frequencyBuffer = [];
const BUFFER_SIZE = 7;
let silentFrames = 0;

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
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
                googEchoCancellation: false,
                googAutoGainControl: false,
                googNoiseSuppression: false,
                googHighpassFilter: false,
                latency: 0
            }
        });
        mediaStream = stream; // Guardar referencia global

        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        
        // Filtro de paso bajo (Lowpass) para limpiar armónicos agudos que confunden el tono fundamental de las cuerdas graves
        const lowpass = audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 600; // Cortar armónicos por encima de 600Hz (las notas de guitarra están por debajo)

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 4096; // Aumentado a 4096 para duplicar la precisión y la ventana temporal en cuerdas graves
        
        mediaStreamSource.connect(lowpass);
        lowpass.connect(analyser);

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

    frequencyBuffer = [];
    silentFrames = 0;

    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
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

    // Filtrar frecuencias válidas de la afinación estándar (50Hz - 1500Hz)
    if (frequency !== -1 && frequency >= 50 && frequency <= 1500) {
        silentFrames = 0;
        
        // Agregar lectura al buffer de suavizado
        frequencyBuffer.push(frequency);
        if (frequencyBuffer.length > BUFFER_SIZE) {
            frequencyBuffer.shift();
        }

        // Obtener la mediana para filtrar picos/ruido loco instantáneo
        const sorted = [...frequencyBuffer].sort((a, b) => a - b);
        const medianFrequency = sorted[Math.floor(sorted.length / 2)];

        const note = getNote(medianFrequency);
        const cents = getCents(medianFrequency, note);

        displayNote(note, cents, medianFrequency);
    } else {
        silentFrames++;
        // Si hay silencio por más de ~250ms (15 frames a 60fps), limpiar
        if (silentFrames > 15) {
            frequencyBuffer = [];
            noteDisplay.textContent = "--";
            freqDisplay.textContent = "Frecuencia: -- Hz";
            deviationDisplay.textContent = "Desviación: -- cents";
            
            if (needle) needle.style.left = "50%";
            if (lowIndicator) lowIndicator.classList.remove('active');
            if (highIndicator) highIndicator.classList.remove('active');
            if (container) {
                container.style.borderColor = "";
                container.style.backgroundColor = "";
                container.style.boxShadow = "";
            }
            if (needle) {
                needle.style.backgroundColor = "";
                needle.style.boxShadow = "";
            }
        }
    }

    rafId = requestAnimationFrame(updatePitch);
}

function autoCorrelate(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
        const val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    if (rms < 0.005) { // Señal muy débil / silencio
        return -1;
    }

    // Encontrar el pico absoluto para umbral adaptativo
    let maxPeak = 0;
    for (let i = 0; i < SIZE; i++) {
        const absVal = Math.abs(buf[i]);
        if (absVal > maxPeak) maxPeak = absVal;
    }

    // Umbral relativo del 15% del pico (súper preciso y adaptativo al volumen)
    const thres = maxPeak * 0.15;
    let r1 = 0;
    let r2 = SIZE - 1;
    for (let i = 0; i < SIZE / 2; i++) {
        if (Math.abs(buf[i]) > thres) {
            r1 = i;
            break;
        }
    }
    for (let i = 1; i < SIZE / 2; i++) {
        if (Math.abs(buf[SIZE - i]) > thres) {
            r2 = SIZE - i;
            break;
        }
    }

    // Asegurar tamaño mínimo para la autocorrelación
    if (r2 - r1 > 64) {
        buf = buf.slice(r1, r2);
    }
    
    const size = buf.length;
    const c = new Float32Array(size);
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size - i; j++) {
            c[i] = c[i] + buf[j] * buf[j + i];
        }
    }

    // Encontrar primer valle
    let d = 0;
    while (d < size - 1 && c[d] > c[d + 1]) {
        d++;
    }
    
    // Encontrar el pico local dominante después del primer valle
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < size; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    
    let T0 = maxpos;

    // Interpolación parabólica de precisión extrema (sub-sample)
    if (T0 > 0 && T0 < size - 1) {
        const x1 = c[T0 - 1];
        const x2 = c[T0];
        const x3 = c[T0 + 1];
        const a = (x1 + x3 - 2 * x2) / 2;
        const b = (x3 - x1) / 2;
        if (a) {
            T0 = T0 - b / (2 * a);
        }
    }

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
