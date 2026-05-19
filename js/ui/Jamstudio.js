// ========== JAMSTUDIO PRO - Guitar DAW Profesional ==========
// Implementación completa con arquitectura modular y cadena de señal profesional

import { AudioEngine } from '../core/AudioEngine.js';
import { SignalChain } from '../core/SignalChain.js';
import { AudioMath } from '../utils/AudioMath.js';
import { TimelineManager } from '../core/TimelineManager.js';

class Jamstudio {
    constructor() {
        // Motor de audio central
        this.audioEngine = null;

        // Gestor de línea de tiempo para edición basada en clips
        this.timelineManager = new TimelineManager();

        // Pistas
        this.tracks = [];
        this.nextTrackId = 1;

        // Estado de selección
        this.selectedClips = [];         // Array de { trackId, clipId }

        // Estado de reproducción
        this.isPlaying = false;
        this.isPaused = false;
        this.isRecording = false;
        this.currentTime = 0;
        this.startTime = 0;
        this.pauseTime = 0;
        this.animationId = null;

        // Grabación
        this.recordingStream = null;

        // Metrónomo
        this.metronomeEnabled = false;
        this.bpm = 120;
        this.metronomeInterval = null;
        this.metronomeGain = null;

        // Línea de tiempo
        // Píxeles por segundo
        this.pixelsPerSecond = 50;
        this.minZoom = 10;
        this.maxZoom = 200;
        this.isDraggingTimeline = false;
        this.wasPlayingBeforeDrag = false;

        // Actualización de medidores
        this.meterInterval = null;

        // Gestión de proyectos en la nube
        this.hasUnsavedChanges = false;
        this.currentProjectName = "Mi Proyecto";

        // Pilas de historia (Undo/Redo)
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistoryStackSize = 50;

        // Flags de estado
        this.hasPushedHistoryForDrag = false;
        this.isRestoringHistory = false;

        this.init();
    }

    async init() {
        try {
            // Inicializar motor de audio
            this.audioEngine = new AudioEngine(48000);
            await this.audioEngine.init();

            // Configurar metrónomo
            this.metronomeGain = this.audioEngine.createGain(0.3);
            this.metronomeGain.connect(this.audioEngine.audioContext.destination);

            // Configurar escuchadores de eventos de la interfaz (UI)
            this.setupEventListeners();

            // Inicializar línea de tiempo
            this.initializeTimeline();

            // Enumerar dispositivos de audio
            await this.enumerateAudioDevices();

            // Configurar listeners para cambios de dispositivos de audio
            document.getElementById('audioInputDevice')?.addEventListener('change', () => this.handleAudioInputChange());
            document.getElementById('audioOutputDevice')?.addEventListener('change', (e) => {
                if (this.audioEngine && this.audioEngine.context.setSinkId) {
                    this.audioEngine.context.setSinkId(e.target.value)
                        .then(() => console.log('Salida de audio cambiada:', e.target.value))
                        .catch(err => console.error('Error al cambiar salida de audio:', err));
                }
            });

            // Iniciar actualización de medidores
            this.updateMeters();

            // Posición inicial del cabezal de reproducción
            this.seekTo(0);

            console.log('JamStudio Pro initialized successfully');

            // Si es un proyecto nuevo (no hay pistas), añadir una por defecto
            if (this.tracks.length === 0) {
                this.addEmptyTrack();
            }

        } catch (error) {
            console.error('Error initializing JamStudio Pro:', error);
            showToast('Error al inicializar el sistema de audio. Por favor, recarga la página.', 'error');
        }
    }

    setupEventListeners() {
        // Controles de transporte
        document.getElementById('recordBtn')?.addEventListener('click', () => this.startRecording());
        document.getElementById('playBtn')?.addEventListener('click', () => this.play());
        document.getElementById('pauseBtn')?.addEventListener('click', () => this.pause());
        document.getElementById('stopBtn')?.addEventListener('click', () => this.stop());

        // Gestión de pistas
        document.getElementById('addTrackBtn')?.addEventListener('click', () => this.addEmptyTrack());
        document.getElementById('clearAllBtn')?.addEventListener('click', () => this.clearAllTracks());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportMix());

        // Controles maestros
        const masterVolume = document.getElementById('masterVolume');
        if (masterVolume) {
            masterVolume.addEventListener('input', (e) => {
                const value = e.target.value / 100;
                this.audioEngine.setMasterVolume(value);
                document.getElementById('masterVolumeValue').textContent = e.target.value + '%';
            });
        }

        // Metrónomo
        const metronomeToggle = document.getElementById('metronomeToggle');
        if (metronomeToggle) {
            metronomeToggle.addEventListener('change', (e) => {
                this.metronomeEnabled = e.target.checked;
                if (this.metronomeEnabled && this.isPlaying) {
                    this.startMetronome();
                } else {
                    this.stopMetronome();
                }
            });
        }

        // Entrada de BPM
        const bpmInput = document.getElementById('bpmInput');
        if (bpmInput) {
            bpmInput.addEventListener('change', (e) => {
                this.pushHistory(); // Guardar historia al CAMBIAR (no en cada paso del input)
                let value = parseInt(e.target.value);
                value = AudioMath.clamp(value, 40, 240);
                this.bpm = value;
                e.target.value = value;

                // Actualizar todos los retardos (delays) de las pistas
                this.tracks.forEach(track => {
                    if (track.signalChain) {
                        track.signalChain.delay.setBPM(this.bpm);
                    }
                });

                // Reiniciar metrónomo si está reproduciendo
                if (this.metronomeEnabled && this.isPlaying) {
                    this.stopMetronome();
                    this.startMetronome();
                }
            });
        }

        // Escuchador de redimensionamiento para actualizar los anchos de las formas de onda
        window.addEventListener('resize', () => {
            this.tracks.forEach(track => this.drawWaveform(track));
        });

        // Inicializar escuchadores globales de arrastre para clips
        this.setupGlobalDragListeners();

        // Escuchador de teclado global (Eliminar clips)
        document.addEventListener('keydown', (e) => {
            const workspace = document.getElementById('workspace-view');
            if (!workspace || workspace.style.display === 'none') return;

            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedClips.length > 0) {
                // No eliminar si el foco está en un input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                e.preventDefault();
                this.selectedClips.forEach(s => this.deleteClip(s.trackId, s.clipId));
                this.selectedClips = []; // Limpiar selección después de borrar
            }
        });

        // Arrastre de la barra de progreso (ProgressBar dragging)
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            let isDraggingProgress = false;

            const updateProgressPosition = (e) => {
                const rect = progressBar.getBoundingClientRect();
                const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                const percentage = clickX / rect.width;
                const maxDuration = Math.max(...this.tracks.map(t => t.audioBuffer?.duration || 0), 60);
                const newTime = percentage * maxDuration;
                this.seekTo(newTime);
            };

            progressBar.addEventListener('mousedown', (e) => {
                isDraggingProgress = true;
                updateProgressPosition(e);
            });

            window.addEventListener('mousemove', (e) => {
                if (isDraggingProgress) updateProgressPosition(e);
            });

            window.addEventListener('mouseup', () => {
                isDraggingProgress = false;
            });
        }

        // Zoom con la rueda del ratón
        const timelineSection = document.querySelector('.timeline-section');
        if (timelineSection) {
            timelineSection.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const zoomDelta = e.deltaY > 0 ? -5 : 5;
                    this.setZoom(this.pixelsPerSecond + zoomDelta);
                }
            }, { passive: false });
        }

        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            const workspace = document.getElementById('workspace-view');
            if (!workspace || workspace.style.display === 'none') return;

            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                if (this.isPlaying && !this.isPaused) {
                    if (this.isRecording) {
                        this.stop(); // En lugar de bloquear, paramos la grabación
                        return;
                    }
                    this.pause();
                } else {
                    this.play();
                }
            } else if (e.code === 'KeyR' && e.ctrlKey) {
                e.preventDefault();
                this.startRecording();
            } else if (e.code === 'KeyZ' && e.ctrlKey) {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            } else if (e.code === 'KeyY' && e.ctrlKey) {
                e.preventDefault();
                this.redo();
            }
        });

        // Selección de dispositivo de audio
        const inputDeviceSelect = document.getElementById('audioInputDevice');
        if (inputDeviceSelect) {
            inputDeviceSelect.addEventListener('change', (e) => {
                this.selectedInputDevice = e.target.value;
                console.log('Input device changed to:', e.target.value);
            });
        }

        const outputDeviceSelect = document.getElementById('audioOutputDevice');
        if (outputDeviceSelect) {
            outputDeviceSelect.addEventListener('change', async (e) => {
                this.selectedOutputDevice = e.target.value;
                console.log('Output device changed to:', e.target.value);
                // Nota: La API de Web Audio aún no soporta la selección de dispositivo de salida
                // Esto es un marcador de posición para una implementación futura
            });
        }

        // Escuchador de cambio de tema
        window.addEventListener('themeChanged', () => {
            console.log('Theme change detected in Jamstudio, redrawing waveforms...');
            this.tracks.forEach(track => this.drawWaveform(track));
        });
    }

    // ========== LÍNEA DE TIEMPO (TIMELINE) ==========

    getMaxDuration() {
        // Calcular la duración máxima de todos los clips en todas las pistas
        let maxDuration = 300; // Duración predeterminada aumentada a 5 minutos para mejor navegación
        this.tracks.forEach(track => {
            const clips = this.timelineManager.getClips(track.id);
            if (clips && clips.length > 0) {
                clips.forEach(clip => {
                    const clipEnd = clip.startTime + clip.duration;
                    if (clipEnd > maxDuration) {
                        maxDuration = clipEnd;
                    }
                });
            }
        });
        return maxDuration;
    }

    initializeTimeline() {
        const ruler = document.getElementById('timelineRuler');
        if (!ruler) return;

        ruler.innerHTML = '';

        const maxDuration = this.getMaxDuration();

        // Determinar el intervalo de marcadores basado en el zoom
        let markerInterval;
        if (this.pixelsPerSecond >= 100) markerInterval = 1;
        else if (this.pixelsPerSecond >= 50) markerInterval = 2;
        else if (this.pixelsPerSecond >= 25) markerInterval = 5;
        else markerInterval = 10;

        // Crear marcadores de tiempo
        const totalMarkers = Math.ceil(maxDuration / markerInterval);
        for (let i = 0; i <= totalMarkers; i++) {
            const time = i * markerInterval;
            if (time > maxDuration) break;

            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = `${time * this.pixelsPerSecond}px`;

            const minutes = Math.floor(time / 60);
            const seconds = time % 60;
            marker.textContent = minutes > 0
                ? `${minutes}:${String(seconds).padStart(2, '0')}`
                : `${time}s`;

            ruler.appendChild(marker);
        }

        ruler.style.width = `${maxDuration * this.pixelsPerSecond}px`;

        this.setupTimelineDragging();

        // Añadir escuchador de scroll para gestionar la visibilidad del cabezal de reproducción al desplazarse
        const tracksWrapper = document.getElementById('tracksWrapper');
        if (tracksWrapper) {
            tracksWrapper.addEventListener('scroll', () => {
                const time = (this.isPaused || !this.isPlaying) ? this.pauseTime : this.currentTime;
                this.updatePlayhead(time);
            });
        }
    }

    setupTimelineDragging() {
        const tracksWrapper = document.getElementById('tracksWrapper');
        if (!tracksWrapper) return;

        // Eliminar escuchadores antiguos
        if (this.timelineMouseDown) {
            tracksWrapper.removeEventListener('mousedown', this.timelineMouseDown);
            tracksWrapper.removeEventListener('wheel', this.timelineWheel);
            document.removeEventListener('mousemove', this.timelineMouseMove);
            document.removeEventListener('mouseup', this.timelineMouseUp);
        }

        this.timelineMouseDown = (e) => {
            if (this.isRecording) return;

            // Paneo (Desplazamiento) con el botón central (Botón 1)
            if (e.button === 1) {
                e.preventDefault();
                this.isPanning = true;
                this.panStartX = e.clientX;
                this.panScrollStart = tracksWrapper.scrollLeft;
                document.body.style.cursor = 'grabbing';
                return;
            }

            const target = e.target;

            // RESTRINGIR BÚSQUEDA (SEEKING) SOLO A LA REGLA O ESPACIO VACÍO (no sobre pistas)
            // Si se hace clic en una pista (canvas o contenedor), NO mover el cabezal de reproducción
            // Solo buscar si se hace clic en la regla
            const isRuler = target.closest('.timeline-ruler');
            const isPlayhead = target.id === 'playhead';

            if (isRuler || isPlayhead) {
                // Buscar solo con Clic Izquierdo
                if (e.button !== 0) return;

                // Detener el audio si se está reproduciendo para evitar el efecto "ardilla" durante el scrub
                if (this.isPlaying && !this.isPaused) {
                    this.pause();
                    this.wasPlayingBeforeDrag = true;
                } else {
                    this.wasPlayingBeforeDrag = false;
                }

                // Deseleccionar clips al hacer clic en la regla
                this.selectedClip = null;
                this.tracks.forEach(t => this.drawWaveform(t));

                this.isDraggingTimeline = true;
                document.body.style.cursor = 'e-resize';
                this.updatePlayheadPosition(e);
            }
        };

        this.timelineMouseMove = (e) => {
            if (this.isPanning) {
                const deltaX = e.clientX - this.panStartX;
                tracksWrapper.scrollLeft = this.panScrollStart - deltaX;
                return;
            }

            if (this.isDraggingTimeline) {
                this.updatePlayheadPosition(e);
            }
        };

        this.timelineMouseUp = (e) => {
            this.isDraggingTimeline = false;
            this.isPanning = false;
            document.body.style.cursor = '';

            if (this.scrollAnimationId) {
                cancelAnimationFrame(this.scrollAnimationId);
                this.scrollAnimationId = null;
            }

            // Reanudar la reproducción si estábamos reproduciendo antes del arrastre
            if (this.wasPlayingBeforeDrag) {
                this.play();
                this.wasPlayingBeforeDrag = false;
            }
        };

        // Funcionalidad de scroll con rueda del ratón (Shift + Wheel)
        this.timelineWheel = (e) => {
            if (e.shiftKey) {
                e.preventDefault();
                tracksWrapper.scrollLeft += e.deltaY;
            }
        };

        tracksWrapper.addEventListener('mousedown', this.timelineMouseDown);
        tracksWrapper.addEventListener('wheel', this.timelineWheel, { passive: false });
        document.addEventListener('mousemove', this.timelineMouseMove);
        document.addEventListener('mouseup', this.timelineMouseUp);
    }

    updatePlayheadPosition(e) {
        const tracksWrapper = document.getElementById('tracksWrapper');
        if (!tracksWrapper) return;

        const rect = tracksWrapper.getBoundingClientRect();

        // Calcular tiempo basado en el scroll + posición del ratón relativa al contenedor
        let relativeX = e.clientX - rect.left;

        // Limitar relativeX al área visible para fines de cálculo
        relativeX = Math.max(0, Math.min(relativeX, rect.width));

        const clickX = relativeX + tracksWrapper.scrollLeft;

        // Restar el ancho del espaciador si estamos en las filas de las pistas
        const spacer = document.querySelector('.track-controls-spacer');
        const spacerWidth = spacer ? spacer.offsetWidth : 280;

        const clickTime = Math.max(0, (clickX - spacerWidth) / this.pixelsPerSecond);

        // Sincronizar audio con posición visual al realizar búsqueda
        this.seekTo(clickTime);

        // Gestionar desplazamiento automático (Auto-scroll)
        this.handleAutoScroll(e.clientX, rect, tracksWrapper);
    }

    handleAutoScroll(mouseX, rect, container) {
        const edgeThreshold = 100; // Umbral de borde más amplio para mejor control
        const maxScrollSpeed = 30; // Velocidad de scroll máxima aumentada

        // Limpiar el intervalo de scroll existente si lo hay
        if (this.scrollAnimationId) {
            cancelAnimationFrame(this.scrollAnimationId);
            this.scrollAnimationId = null;
        }

        let scrollDelta = 0;

        // Comprobar borde izquierdo
        if (mouseX - rect.left < edgeThreshold) {
            // Velocidad proporcional a la cercanía al borde (más cerca = más rápido)
            const distance = Math.max(0, mouseX - rect.left);
            const intensity = 1 - (distance / edgeThreshold);
            scrollDelta = -maxScrollSpeed * intensity;
        }
        // Comprobar borde derecho
        else if (rect.right - mouseX < edgeThreshold) {
            const distance = Math.max(0, rect.right - mouseX);
            const intensity = 1 - (distance / edgeThreshold);
            scrollDelta = maxScrollSpeed * intensity;
        }

        // Si es necesario desplazarse, iniciar el bucle de animación
        if (scrollDelta !== 0) {
            const scrollLoop = () => {
                if (!this.isDraggingTimeline) {
                    cancelAnimationFrame(this.scrollAnimationId);
                    return;
                }

                container.scrollLeft += scrollDelta;

                // Actualizar la posición del cabezal de reproducción mientras nos desplazamos
                const currentRelativeX = mouseX - rect.left;
                const clampedRelativeX = Math.max(0, Math.min(currentRelativeX, rect.width));
                const newClickX = clampedRelativeX + container.scrollLeft;

                const spacer = document.querySelector('.track-controls-spacer');
                const spacerWidth = spacer ? spacer.offsetWidth : 280;

                const newClickTime = Math.max(0, (newClickX - spacerWidth) / this.pixelsPerSecond);
                this.seekTo(newClickTime);

                this.scrollAnimationId = requestAnimationFrame(scrollLoop);
            };
            this.scrollAnimationId = requestAnimationFrame(scrollLoop);
        }
    }

    setZoom(newPixelsPerSecond) {
        newPixelsPerSecond = AudioMath.clamp(newPixelsPerSecond, this.minZoom, this.maxZoom);
        if (newPixelsPerSecond === this.pixelsPerSecond) return;

        const timelineSection = document.querySelector('.timeline-section');
        if (!timelineSection) return;

        const currentScrollTime = timelineSection.scrollLeft / this.pixelsPerSecond;
        this.pixelsPerSecond = newPixelsPerSecond;

        this.initializeTimeline();

        // Redibujar todas las formas de onda
        this.tracks.forEach(track => {
            this.drawWaveform(track);
        });

        // Actualizar cabezal de reproducción
        const playhead = document.getElementById('playhead');
        if (playhead) {
            const time = this.isPaused || !this.isPlaying ? this.pauseTime
                : this.audioEngine.getCurrentTime() - this.startTime;
            playhead.style.left = `${time * this.pixelsPerSecond}px`;
        }

        timelineSection.scrollLeft = currentScrollTime * this.pixelsPerSecond;
        console.log('Zoom set to:', this.pixelsPerSecond, 'px/sec');
    }

    seekTo(time) {
        const maxDuration = this.getMaxDuration();
        // Permitir la búsqueda hasta la duración máxima actual o al menos 5 minutos
        const upperLimit = Math.max(maxDuration, 300);
        time = AudioMath.clamp(time, 0, upperLimit);

        if (this.isPlaying && !this.isPaused) {
            this.stop(false); // No resetear UI/Scroll
            this.pauseTime = time;
            this.isPaused = true;
            this.play();
        } else {
            this.pauseTime = time;
            this.isPaused = true;
            this.currentTime = time;

            const playhead = document.getElementById('playhead');
            if (playhead) {
                const spacer = document.querySelector('.track-controls-spacer');
                const spacerWidth = spacer ? spacer.offsetWidth : 280;
                const tracksWrapper = document.getElementById('tracksWrapper');
                const currentScroll = tracksWrapper ? tracksWrapper.scrollLeft : 0;

                const pos = spacerWidth + (time * this.pixelsPerSecond);
                const minPos = currentScroll + spacerWidth;

                // Limitar el cabezal de reproducción al borde izquierdo de la línea de tiempo visible
                playhead.style.display = 'block';
                playhead.style.left = `${Math.max(pos, minPos)}px`;
            }

            const progressFill = document.getElementById('progressFill');
            if (progressFill) {
                const percentage = (time / maxDuration) * 100;
                progressFill.style.width = `${Math.min(percentage, 100)}%`;
            }

            const currentTimeEl = document.getElementById('currentTime');
            if (currentTimeEl) {
                const minutes = Math.floor(time / 60);
                const seconds = Math.floor(time % 60);
                const tenths = Math.floor((time % 1) * 10);
                currentTimeEl.textContent =
                    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
            }
        }

        // Desplazamiento automático de la línea de tiempo (solo si no se está arrastrando manualmente)
        const tracksWrapper = document.getElementById('tracksWrapper');
        if (tracksWrapper && !this.isDraggingTimeline) {
            const spacer = document.querySelector('.track-controls-spacer');
            const spacerWidth = spacer ? spacer.offsetWidth : 280;
            const playheadPosition = spacerWidth + (time * this.pixelsPerSecond);
            const viewportWidth = tracksWrapper.clientWidth;
            const targetScroll = playheadPosition - (viewportWidth / 2);
            tracksWrapper.scrollLeft = Math.max(0, targetScroll);
        }
    }

    // ========== DISPOSITIVOS DE AUDIO ==========

    async enumerateAudioDevices() {
        try {
            // Solicitar permiso solo si no tenemos stream activo
            let tempStream = null;
            if (!this.recordingStream) {
                tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            const devices = await navigator.mediaDevices.enumerateDevices();

            if (tempStream) {
                tempStream.getTracks().forEach(track => track.stop());
            }

            const inputDeviceSelect = document.getElementById('audioInputDevice');
            const outputDeviceSelect = document.getElementById('audioOutputDevice');

            if (inputDeviceSelect) {
                const currentValue = inputDeviceSelect.value;
                inputDeviceSelect.innerHTML = '';

                devices.filter(device => device.kind === 'audioinput').forEach(device => {
                    // Evitar duplicar la opción 'default' si ya existe un dispositivo con ese ID
                    if (device.deviceId === 'default' && inputDeviceSelect.querySelector('option[value="default"]')) {
                        return;
                    }
                    
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || (device.deviceId === 'default' ? 'Predeterminado del sistema' : `Entrada ${inputDeviceSelect.options.length + 1}`);
                    inputDeviceSelect.appendChild(option);
                });

                if (currentValue) inputDeviceSelect.value = currentValue;
            }

            if (outputDeviceSelect) {
                const currentValue = outputDeviceSelect.value;
                outputDeviceSelect.innerHTML = '';

                devices.filter(device => device.kind === 'audiooutput').forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Salida ${outputDeviceSelect.options.length + 1}`;
                    outputDeviceSelect.appendChild(option);
                });

                if (currentValue) outputDeviceSelect.value = currentValue;
            }

        } catch (error) {
            console.error('Error enumerating devices:', error);
        }
    }

    async handleAudioInputChange() {
        console.log('Cambio de dispositivo de entrada detectado.');

        // Si hay una grabación en curso, no podemos cambiar de micro de golpe sin parar.
        // Pero para el monitoreo sí podemos reiniciarlo.

        // 1. Si el stream global existe, lo cerramos para forzar uno nuevo
        if (this.recordingStream) {
            this.recordingStream.getTracks().forEach(t => t.stop());
            this.recordingStream = null;
        }

        // 2. Reiniciar monitoreo en todas las pistas que lo tengan activo
        for (const track of this.tracks) {
            if (track.monitoring) {
                // Forzar apagado completo (limpieza de nodos)
                track.monitoring = false;
                if (track.monitorNode) {
                    track.monitorNode.disconnect();
                    track.monitorNode = null;
                }
                // Volver a encender (creará stream y nodos nuevos)
                await this.toggleTrackMonitoring(track.id);
            }
        }

        const inputName = document.getElementById('audioInputDevice')?.selectedOptions[0]?.text || 'Desconocido';
        showToast(`Micrófono cambiado a: ${inputName}`, 'success');
    }

    // ========== GRABACIÓN (RECORDING) ==========

    async startRecording() {
        // Asegurar que el contexto de audio esté en ejecución
        await this.audioEngine.resume();

        const armedTracks = this.tracks.filter(t => t.armed);

        if (armedTracks.length === 0) {
            showToast('No hay pistas armadas para grabar.', 'warning');
            return;
        }

        try {
            const inputDeviceId = document.getElementById('audioInputDevice')?.value || 'default';
            const constraints = {
                audio: {
                    deviceId: inputDeviceId !== 'default' ? { ideal: inputDeviceId } : undefined,
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                    latency: 0,
                    googEchoCancellation: false,
                    googAutoGainControl: false,
                    googNoiseSuppression: false,
                    googHighpassFilter: false,
                    googTypingNoiseDetection: false,
                    googNoiseReduction: false,
                    channelCount: 1,
                    sampleRate: 48000
                }
            };

            // REUTILIZAR STREAM: Si ya hay un stream abierto (por monitoreo), usarlo
            if (!this.recordingStream) {
                this.recordingStream = await navigator.mediaDevices.getUserMedia(constraints);
            }
            
            const stream = this.recordingStream;

            this.isRecording = true;

            // Detener el afinador si está corriendo para liberar el micro por completo
            if (window.stopTuner) {
                window.stopTuner();
            }

            // Iniciar la reproducción si no se está reproduciendo ya (para mover el cabezal)
            if (!this.isPlaying) {
                await this.play();
            }

            // CRITICAL: Capturar tiempo exacto de inicio de la grabación basándose en el motor de audio
            // No confiar solo en 'this.currentTime' que depende del ciclo de animación de la UI
            const recordingStartTime = this.isPlaying && !this.isPaused
                ? (this.audioEngine.getCurrentTime() - this.startTime)
                : this.pauseTime;

            for (const track of armedTracks) {
                track.recordedChunks = [];
                track.recordingStartTime = recordingStartTime;
                track.lastDrawTime = recordingStartTime; // Asegurar que el dibujo empiece en el punto exacto

                // Limpiar el canvas de la pista antes de empezar a dibujar la nueva grabación
                const canvas = document.getElementById(`waveform-${track.id}`);
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Si hay clips previos, redibujarlos (esto despeja las líneas "fantasma" de grabaciones fallidas)
                    this.drawWaveform(track);
                }

                track.mediaRecorder = new MediaRecorder(stream);

                // Configurar visualización en tiempo real (Meters/Waveform)
                if (track.analyserNode) {
                    track.recordingSource = this.audioEngine.createMediaStreamSource(stream);
                    track.recordingSource.connect(track.analyserNode);
                }

                track.mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        track.recordedChunks.push(e.data);
                    }
                };

                track.mediaRecorder.onstop = async () => {
                    // Limpiar fuente de visualización
                    if (track.recordingSource) {
                        track.recordingSource.disconnect();
                        track.recordingSource = null;
                    }

                    const blob = new Blob(track.recordedChunks, { type: 'audio/webm' });
                    const arrayBuffer = await blob.arrayBuffer();
                    const audioBuffer = await this.audioEngine.decodeAudioData(arrayBuffer);

                    // Crear clip
                    const clip = {
                        id: this.timelineManager.generateClipId(),
                        startTime: track.recordingStartTime,
                        duration: audioBuffer.duration,
                        audioBuffer: audioBuffer,
                        audioBlob: blob,
                        bufferOffset: 0
                    };

                    // Añadir a la línea de tiempo
                    this.timelineManager.addClip(track.id, clip);
                    this.drawWaveform(track);
                    console.log(`Clip created at ${clip.startTime}s`);
                };

                track.mediaRecorder.start();
            }

            document.getElementById('recordBtn')?.classList.add('recording');
            document.getElementById('recordingIndicator')?.classList.remove('hidden');

            // Deshabilitar Pausa durante la grabación (causaría desync)
            const pauseBtn = document.getElementById('pauseBtn');
            if (pauseBtn) {
                pauseBtn.disabled = true;
                pauseBtn.title = 'No se puede pausar durante la grabación';
            }

        } catch (error) {
            console.error('Error:', error);
            showToast('No se pudo acceder al micrófono.', 'error');
        }
    }

    stopRecording() {
        if (!this.isRecording) return;
        this.pushHistory();

        // Detener los grabadores de todas las pistas armadas
        const armedTracks = this.tracks.filter(t => t.armed);
        armedTracks.forEach(track => {
            if (track.mediaRecorder && track.mediaRecorder.state !== 'inactive') {
                track.mediaRecorder.stop();
            }
        });

        this.isRecording = false;

        // Limpiar el stream global SOLO si nadie más lo está usando para monitoreo
        const isAnyTrackMonitoring = this.tracks.some(t => t.monitoring);
        if (!isAnyTrackMonitoring && this.recordingStream) {
            this.recordingStream.getTracks().forEach(t => t.stop());
            this.recordingStream = null;
        }

        // Actualizar UI
        document.getElementById('recordBtn')?.classList.remove('recording');
        document.getElementById('recordingIndicator')?.classList.add('hidden');

        // Rehabilitar el botón de Pausa
        const pauseBtnStop = document.getElementById('pauseBtn');
        if (pauseBtnStop) {
            pauseBtnStop.disabled = false;
            pauseBtnStop.title = '';
        }

        console.log('Recording stopped');
    }

    // ========== REPRODUCCIÓN (PLAYBACK) ==========

    async play() {
        // Asegurar que el contexto de audio esté en ejecución (política de reproducción automática del navegador)
        await this.audioEngine.resume();

        if (this.isPlaying && !this.isPaused) return;

        console.log('Play called - isPaused:', this.isPaused, 'pauseTime:', this.pauseTime);

        const startOffset = this.isPaused ? this.pauseTime : 0;

        if (this.isPaused) {
            this.startTime = this.audioEngine.getCurrentTime() - this.pauseTime;
            this.isPaused = false;
        } else {
            this.startTime = this.audioEngine.getCurrentTime() - startOffset;
            this.currentTime = startOffset;
        }

        this.isPlaying = true;

        // Reproducir todas las pistas que no estén silenciadas
        const soloTracks = this.tracks.filter(t => t.solo);
        const tracksToPlay = soloTracks.length > 0 ? soloTracks : this.tracks.filter(t => !t.muted);

        tracksToPlay.forEach(track => {
            this.playTrack(track, startOffset);
        });

        // Iniciar metrónomo si está habilitado
        if (this.metronomeEnabled) {
            this.startMetronome();
        }

        // Actualizar UI
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        if (playBtn) playBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;

        // Iniciar animación del cabezal de reproducción
        this.updatePlayhead();

        console.log('Playback started from:', startOffset);
    }

    playTrack(track, globalStartTime = 0) {
        const clips = this.timelineManager.getClips(track.id);
        if (!clips || clips.length === 0) return;

        if (!track.sources) track.sources = [];

        // Conectar la cadena de señal al maestro UNA VEZ por sesión de reproducción
        // track.signalChain.connect(this.audioEngine.getDestination());

        // Asegurar que el nodo de ganancia esté conectado
        if (!track.gainNode) {
            track.gainNode = this.audioEngine.createGain(track.volume / 100);
            track.gainNode.connect(this.audioEngine.getDestination());
        }

        clips.forEach(clip => {
            if (!clip.audioBuffer) return;

            const clipEnd = clip.startTime + clip.duration;
            if (clipEnd <= globalStartTime) return;

            const source = this.audioEngine.createBufferSource(clip.audioBuffer);

            // Conectar al nodo de ganancia de la pista
            source.connect(track.gainNode);
            // source.connect(track.signalChain.input);

            const audioContextNow = this.audioEngine.getCurrentTime();
            const clipStartDelay = Math.max(0, clip.startTime - globalStartTime);
            const scheduleTime = audioContextNow + clipStartDelay;
            const clipOffset = Math.max(0, globalStartTime - clip.startTime);
            const playDuration = clip.duration - clipOffset;

            if (playDuration > 0) {
                source.start(scheduleTime, clipOffset + (clip.bufferOffset || 0), playDuration);
                track.sources.push(source);
            }
        });
    }

    pause() {
        if (!this.isPlaying || this.isPaused || this.isRecording) return;

        this.isPlaying = false;
        this.isPaused = true;
        this.pauseTime = this.audioEngine.getCurrentTime() - this.startTime;

        // Parar todas las fuentes de audio (buffers) en reproducción
        this.tracks.forEach(track => {
            if (track.sources) {
                track.sources.forEach(source => {
                    try {
                        source.stop();
                    } catch (e) {
                        // Ignorar errores de parada si la fuente ya terminó o no existía
                    }
                });
                track.sources = [];
            }

            // Desconectar efectos para silenciar colas de señal (colas de reverb/delay)
            // if (track.signalChain) {
            //    track.signalChain.disconnect();
            // }
            // El nodo de ganancia permanece conectado ya que es un control de volumen simple
        });

        // Parar metrónomo
        this.stopMetronome();

        // Actualizar interfaz (UI) de transporte
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        if (playBtn) playBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;

        // Parar animación del playhead
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        console.log('Playback paused at:', this.pauseTime);
    }

    stop(resetUI = true) {
        // Detener grabación si está activa
        if (this.isRecording) {
            this.stopRecording();
        }

        if (!this.isPlaying && !this.isPaused) return;

        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.pauseTime = 0;

        // Parar todas las pistas en activo
        this.tracks.forEach(track => {
            if (track.sources) {
                track.sources.forEach(source => {
                    try {
                        source.stop();
                    } catch (e) {
                        // Ignorar errores de parada al detener todo el motor
                    }
                });
                track.sources = [];
            }
        });

        // Parar metrónomo
        this.stopMetronome();

        // Limpiar stream de grabación si nadie está monitoreando
        const isAnyTrackMonitoring = this.tracks.some(t => t.monitoring);
        if (!isAnyTrackMonitoring && this.recordingStream) {
            this.recordingStream.getTracks().forEach(t => t.stop());
            this.recordingStream = null;
        }

        // Actualizar UI solo si se solicita
        if (resetUI) {
            const playBtn = document.getElementById('playBtn');
            const pauseBtn = document.getElementById('pauseBtn');
            const currentTimeEl = document.getElementById('currentTime');
            const playhead = document.getElementById('playhead');
            const progressFill = document.getElementById('progressFill');

            if (playBtn) playBtn.disabled = false;
            if (pauseBtn) pauseBtn.disabled = true;
            if (currentTimeEl) currentTimeEl.textContent = '00:00.0';
            if (playhead) {
                const spacer = document.querySelector('.track-controls-spacer');
                const spacerWidth = spacer ? spacer.offsetWidth : 280;
                playhead.style.left = `${spacerWidth}px`;
            }
            if (progressFill) progressFill.style.width = '0%';

            // Desplazar la línea de tiempo de vuelta al principio
            const tracksWrapper = document.getElementById('tracksWrapper');
            if (tracksWrapper) {
                tracksWrapper.scrollLeft = 0;
            }
        }

        // Parar animación del playhead al realizar stop completo
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        console.log('Playback stopped');
    }

    updatePlayhead() {
        if (!this.isPlaying || this.isPaused) return;

        const elapsed = this.audioEngine.getCurrentTime() - this.startTime;
        this.currentTime = elapsed;

        // Actualizar visualización del tiempo
        const currentTimeEl = document.getElementById('currentTime');
        if (currentTimeEl) {
            const minutes = Math.floor(elapsed / 60);
            const seconds = Math.floor(elapsed % 60);
            const tenths = Math.floor((elapsed % 1) * 10);
            currentTimeEl.textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
        }

        // Actualizar posición del cabezal de reproducción
        const playhead = document.getElementById('playhead');
        if (playhead) {
            const spacer = document.querySelector('.track-controls-spacer');
            const spacerWidth = spacer ? spacer.offsetWidth : 280;
            const tracksWrapper = document.getElementById('tracksWrapper');
            const currentScroll = tracksWrapper ? tracksWrapper.scrollLeft : 0;

            const pos = spacerWidth + (elapsed * this.pixelsPerSecond);
            const minPos = currentScroll + spacerWidth;

            // Limitar el cabezal de reproducción al borde izquierdo de la línea de tiempo visible
            playhead.style.display = 'block';
            playhead.style.left = `${Math.max(pos, minPos)}px`;

            // Corrección: Ajustar la altura para que coincida con todo el contenido desplazable
            if (tracksWrapper) {
                playhead.style.height = `${tracksWrapper.scrollHeight}px`;
            }
        }

        // Actualizar barra de progreso
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const maxDuration = this.getMaxDuration();
            const percentage = (elapsed / maxDuration) * 100;
            progressFill.style.width = `${Math.min(percentage, 100)}%`;
        }

        // Desplazamiento automático de la línea de tiempo durante la reproducción
        const tracksWrapper = document.getElementById('tracksWrapper');
        if (tracksWrapper && !this.isDraggingTimeline) {
            const spacer = document.querySelector('.track-controls-spacer');
            const spacerWidth = spacer ? spacer.offsetWidth : 280;
            const playheadPosition = spacerWidth + (elapsed * this.pixelsPerSecond);
            const viewportWidth = tracksWrapper.clientWidth;

            // Desplazar si el cabezal de reproducción se acerca al borde derecho o está fuera de pantalla
            const currentScroll = tracksWrapper.scrollLeft;
            const relativePosition = playheadPosition - currentScroll;

            // NUEVO: Lógica de scroll paginado utilizada para evitar tirones (stutter)
            // En lugar de empujar píxel a píxel, saltamos hacia adelante (cambio de página) al llegar al borde
            const threshold = viewportWidth * 0.9;
            if (relativePosition >= threshold) {
                // Desplazar hacia adelante el 90% del ancho del viewport para mantener el contexto
                tracksWrapper.scrollLeft += (viewportWidth * 0.9);
            }
        }

        // Dibujar visuales de grabación si se está grabando
        if (this.isRecording) {
            this.drawRecordingVisuals();
        }

        // Continuar animación con alta precisión
        this.animationId = requestAnimationFrame(() => this.updatePlayhead());
    }

    drawRecordingVisuals() {
        const armedTracks = this.tracks.filter(t => t.armed && t.analyserNode);

        armedTracks.forEach(track => {
            const canvas = document.getElementById(`waveform-${track.id}`);
            if (!canvas) return;

            // Asegurar que el canvas tenga las dimensiones correctas antes de dibujar
            // Esto es crítico en la primera grabación ya que el canvas puede no haber sido
            // inicializado por drawWaveform() todavía (no hay clips todavía)
            const maxDuration = this.getMaxDuration();
            const contentWidth = maxDuration * this.pixelsPerSecond;
            const containerWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 300;
            const SAFETY_MAX_WIDTH = 30000;
            const requiredWidth = Math.min(Math.max(contentWidth, containerWidth), SAFETY_MAX_WIDTH);

            if (canvas.width !== requiredWidth || canvas.height === 0) {
                canvas.width = requiredWidth;
                canvas.height = canvas.offsetHeight || canvas.parentElement?.clientHeight || 80;
            }

            const ctx = canvas.getContext('2d');
            const analyser = track.analyserNode;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);

            // Calcular posición
            const startX = track.lastDrawTime * this.pixelsPerSecond;
            const endX = this.currentTime * this.pixelsPerSecond;
            const width = endX - startX;

            // Calcular amplitud media para esta franja
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0; // 0..2
                const y = v - 1; // -1..1
                sum += Math.abs(y);
            }
            const average = sum / bufferLength;

            // Dibujar bloque de forma de onda roja
            const height = canvas.height;
            const y = height / 2;
            const barHeight = Math.max(2, average * height); // Altura mínima de 2px

            ctx.fillStyle = '#ff4444'; // Rojo para grabación
            ctx.fillRect(startX, y - barHeight / 2, width, barHeight);

            track.lastDrawTime = this.currentTime;
        });
    }

    // ========== GESTIÓN DE PISTAS (TRACK MANAGEMENT) ==========

    addEmptyTrack(preferredId = null) {
        if (!this.isRestoringHistory) this.pushHistory();
        this.hasUnsavedChanges = true;
        if (this.tracks.length >= 19) {
            showToast('Has alcanzado el límite máximo de 19 pistas', 'warning');
            return;
        }

        const trackId = preferredId || this.nextTrackId++;
        if (preferredId && preferredId >= this.nextTrackId) {
            this.nextTrackId = preferredId + 1;
        }
        const track = {
            id: trackId,
            name: `Track ${trackId}`,
            audioBuffer: null,
            audioBlob: null,
            source: null,
            // signalChain: new SignalChain(this.audioEngine.audioContext, this.audioEngine.irLoader), // Removed per user request
            gainNode: null, // Inicializado debajo
            volume: 80,
            pan: 0,
            muted: false,
            solo: false,
            armed: false,
            monitoring: false,
            monitorNode: null,
            analyserNode: null,
            inputDevice: 'default',
            outputDevice: 'master',
            mediaRecorder: null,
            recordedChunks: [],
            sources: [] // Array to hold active source nodes for clips
        };

        // Crear analizador para el medidor VU
        track.analyserNode = this.audioEngine.createAnalyser(256);

        // Volumen y Panorama por defecto (Gain y Pan)
        // track.signalChain.setVolume(track.volume / 100);
        // track.signalChain.setPan(track.pan / 100);

        // Crear cadena de audio: gainNode -> panNode -> destination
        track.gainNode = this.audioEngine.createGain(track.volume / 100);
        track.panNode = this.audioEngine.createPanner(track.pan / 100);
        track.gainNode.connect(track.panNode);
        track.panNode.connect(this.audioEngine.getDestination());

        // Aplicar preset predeterminado
        // track.signalChain.presetCleanGuitar(); // Disabled to prevent noise issues

        this.tracks.push(track);
        this.addTrackToUI(track);
        this.initializeTimeline();

        console.log('Empty track added:', trackId);
    }

    addTrackToUI(track) {
        // Crear contenedor de pista unificado
        const trackContainer = document.createElement('div');
        trackContainer.className = 'track-container';
        trackContainer.dataset.trackId = track.id;

        trackContainer.innerHTML = `
          <!-- Módulo de Controles de Pista (Menú) -->
          <div class="track-controls-module">
            <div class="vu-meter">
              <div class="vu-level"></div>
            </div>
            <div class="track-content">
              <div class="track-header">
            <span class="track-name">${track.name}</span>
            <div class="track-header-actions">
                <button class="track-delete" onclick="event.stopPropagation(); daw.deleteTrack(${track.id})" title="Eliminar Pista">✕</button>
            </div>
          </div>
              
          <!-- Mezclador en línea simplificado (Solo Volumen y Pan) -->
          <div class="track-mixer" id="mixer-${track.id}" style="display: none;">
            <div class="mixer-row">
                <label>Vol</label>
                <input type="range" min="0" max="100" value="${track.volume}" 
                       oninput="daw.setTrackVolume(${track.id}, this.value)">
                <span>${track.volume}%</span>
            </div>
            <div class="mixer-row">
                <label>Pan</label>
                <input type="range" min="-100" max="100" value="${track.pan}" 
                       oninput="daw.setTrackPan(${track.id}, this.value)">
                <span>${track.pan}</span>
            </div>
          </div>
            </div>
          </div>

          <!-- Módulo de Línea de Tiempo de Pista (Canvas) -->
          <div class="track-timeline-module">
            <canvas class="waveform-canvas" id="waveform-${track.id}"></canvas>
          </div>
        `;

        document.getElementById('unifiedTracksContainer')?.appendChild(trackContainer);

        // Hacer que el módulo de controles de pista completo sea clicable para selección
        const controlsModule = trackContainer.querySelector('.track-controls-module');
        if (controlsModule) {
            controlsModule.style.cursor = 'pointer';
            controlsModule.addEventListener('click', (e) => {
                // No activar si el clic es en el botón de eliminar o en el nombre de la pista
                if (!e.target.classList.contains('track-delete') &&
                    !e.target.classList.contains('track-name')) {
                    this.toggleMixer(track.id);
                }
            });
        }

        // Configurar interacción con clips (arrastrar/soltar)
        this.setupClipInteraction(track);





        // Configurar el comportamiento de renombrado del nombre de la pista
        const nameEl = trackContainer.querySelector('.track-name');
        if (nameEl) {
            nameEl.style.cursor = 'pointer';
            nameEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar que se active la selección de pista
                this.renameTrack(track.id, nameEl);
            });
        }
    }

    deleteTrack(trackId) {
        this.pushHistory();
        trackId = Number(trackId);
        const index = this.tracks.findIndex(t => t.id === trackId);
        if (index === -1) return;

        const track = this.tracks[index];

        // Si está reproduciendo, detener todo y restablecer
        if (this.isPlaying || this.isPaused) {
            this.stop(); // Parar audio antes de purga total de tracks
        }

        // Detener la pista si se está reproduciendo
        if (track.source) {
            track.source.stop();
        }

        // Cleanup signal chain
        if (track.signalChain) {
            track.signalChain.destroy();
        }

        // Eliminar de la lista interna del motor y de la interfaz
        this.tracks.splice(index, 1);

        // Eliminar elemento del DOM (UI)
        document.querySelector(`.track-container[data-track-id="${trackId}"]`)?.remove();

        console.log('Track deleted:', trackId);
    }

    toggleMixer(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        const trackContainer = document.querySelector(`.track-container[data-track-id="${trackId}"]`);
        const bottomPanel = document.getElementById('bottomMixerPanel');

        if (!trackContainer || !bottomPanel) return;

        // Comprobar si se hace clic en la pista ya seleccionada
        const isCurrentlySelected = bottomPanel.dataset.activeTrack == trackId;

        // Eliminar la selección de todas las pistas
        document.querySelectorAll('.track-container').forEach(tc => {
            tc.classList.remove('track-selected');
        });

        if (isCurrentlySelected) {
            // Deseleccionar: ocultar panel inferior
            bottomPanel.innerHTML = `
                <div class="mixer-panel-placeholder">
                    <span>⚙️ Selecciona una pista para ver sus controles</span>
                </div>
            `;
            bottomPanel.dataset.activeTrack = '';
        } else {
            // Seleccionar nueva pista: añadir resaltado visual y mostrar controles completos en la parte inferior
            trackContainer.classList.add('track-selected');

            // Construir el HTML de los controles completos para el panel inferior
            bottomPanel.innerHTML = `
                <div class="bottom-mixer-content">
                    <div class="bottom-mixer-title">
                        <strong>${track.name}</strong>
                        <button class="close-mixer-btn" onclick="daw.toggleMixer(${trackId})">✕</button>
                    </div>
                    <div class="bottom-mixer-controls">
                        <div class="bottom-control-group" style="display: flex; gap: 8px;">
                            <button class="btn arm-btn ${track.armed ? 'active' : ''}" 
                                    onclick="daw.toggleTrackArm(${trackId})" 
                                    title="Armar para grabar" style="display: flex; align-items: center; justify-content: center; min-width: 45px; height: 35px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><circle cx="12" cy="12" r="6"></circle></svg>
                            </button>
                            <button class="btn monitor-btn ${track.monitoring ? 'active' : ''}" 
                                    onclick="daw.toggleTrackMonitoring(${trackId})" 
                                    title="Monitoreo" style="display: flex; align-items: center; justify-content: center; min-width: 45px; height: 35px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
                            </button>
                            <button class="btn mute-btn ${track.muted ? 'active' : ''}" 
                                    onclick="daw.toggleMute(${trackId})" style="display: flex; align-items: center; justify-content: center; min-width: 45px; height: 35px; font-weight: bold;">M</button>
                            <button class="btn solo-btn ${track.solo ? 'active' : ''}" 
                                    onclick="daw.toggleSolo(${trackId})" style="display: flex; align-items: center; justify-content: center; min-width: 45px; height: 35px; font-weight: bold;">S</button>
                        </div>
                        <div class="bottom-control-group">
                            <button class="btn import-btn" 
                                    onclick="daw.importAudioToTrack(${trackId})" style="display: flex; align-items: center; justify-content: center; height: 35px; padding: 0 15px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; pointer-events: none;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                Importar
                            </button>
                        </div>
                        <div class="bottom-mixer-sliders">
                            <div class="mixer-slider-row">
                                <label>Vol</label>
                                <input type="range" min="0" max="100" value="${track.volume}" 
                                       oninput="daw.setTrackVolume(${trackId}, this.value)">
                                <span id="vol-display-${trackId}">${track.volume}%</span>
                            </div>
                            <div class="mixer-slider-row">
                                <label>Pan</label>
                                <input type="range" min="-100" max="100" value="${track.pan}" 
                                       oninput="daw.setTrackPan(${trackId}, this.value)">
                                <span id="pan-display-${trackId}">${track.pan}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            bottomPanel.dataset.activeTrack = trackId;
        }
    }

    toggleMute(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.muted = !track.muted;

        // Actualizar botón en el mezclador inferior (Bottom Mixer) si está activo para sincronizar UI
        const bottomBtn = document.querySelector('#bottomMixerPanel .bottom-mixer-controls .mute-btn');
        if (bottomBtn && document.getElementById('bottomMixerPanel').dataset.activeTrack == trackId) {
            bottomBtn.classList.toggle('active', track.muted);
        }

        // Actualizar el volumen de la cadena de señal
        if (track.signalChain) {
            track.signalChain.setVolume(track.muted ? 0 : track.volume / 100);
        }
    }

    toggleSolo(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.solo = !track.solo;

        // Actualizar estado de Solo en Bottom Mixer si aplica sincronización de UI
        const bottomBtn = document.querySelector('#bottomMixerPanel .bottom-mixer-controls .solo-btn');
        if (bottomBtn && document.getElementById('bottomMixerPanel').dataset.activeTrack == trackId) {
            bottomBtn.classList.toggle('active', track.solo);
        }

        // Si se está reproduciendo, reiniciar la reproducción
        if (this.isPlaying) {
            const currentTime = this.audioEngine.getCurrentTime() - this.startTime;
            this.stop(); // Parar audio antes de purga total de tracks
            this.pauseTime = currentTime;
            this.isPaused = true;
            this.play();
        }
    }

    setTrackVolume(trackId, value) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.volume = parseFloat(value);

        // Actualizar el nodo de ganancia
        if (track.gainNode) {
            track.gainNode.gain.value = track.volume / 100;
        }

        // Sincronizar con interfaz de mezcla en línea (Inline Mixer)
        const inlineInput = document.querySelector(`#mixer-${trackId} input[type="range"][oninput*="setTrackVolume"]`);
        const inlineDisplay = document.querySelector(`#mixer-${trackId} .mixer-row:nth-child(1) span`);
        if (inlineInput) inlineInput.value = track.volume;
        if (inlineDisplay) inlineDisplay.textContent = `${Math.round(track.volume)}%`;

        // Sincronizar con mezclador inferior (Bottom Mixer) si la pista está seleccionada
        if (document.getElementById('bottomMixerPanel').dataset.activeTrack == trackId) {
            const bottomInput = document.querySelector('#bottomMixerPanel .mixer-slider-row:nth-child(1) input');
            const bottomDisplay = document.getElementById(`vol-display-${trackId}`);
            if (bottomInput) bottomInput.value = track.volume;
            if (bottomDisplay) bottomDisplay.textContent = `${Math.round(track.volume)}%`;
        }
    }

    setTrackPan(trackId, value) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.pan = parseFloat(value);

        // Actualizar el nodo de panorama
        if (track.panNode) {
            track.panNode.pan.value = track.pan / 100;
        }

        const panText = track.pan === 0 ? 'C' : track.pan > 0 ? `R${Math.round(track.pan)}` : `L${Math.round(Math.abs(track.pan))}`;

        // Update Inline Mixer UI
        const inlineInput = document.querySelector(`#mixer-${trackId} input[type="range"][oninput*="setTrackPan"]`);
        const inlineDisplay = document.querySelector(`#mixer-${trackId} .mixer-row:nth-child(2) span`);
        if (inlineInput) inlineInput.value = track.pan;
        if (inlineDisplay) inlineDisplay.textContent = panText;

        // Update Bottom Mixer UI if active
        if (document.getElementById('bottomMixerPanel').dataset.activeTrack == trackId) {
            const bottomInput = document.querySelector('#bottomMixerPanel .mixer-slider-row:nth-child(2) input');
            const bottomDisplay = document.getElementById(`pan-display-${trackId}`);
            if (bottomInput) bottomInput.value = track.pan;
            if (bottomDisplay) bottomDisplay.textContent = panText;
        }
    }

    toggleTrackArm(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.armed = !track.armed;

        // Sincronizar botones de Bottom Mixer si esta es la pista activa
        const bottomBtn = document.querySelector('#bottomMixerPanel .bottom-mixer-controls .arm-btn');
        if (bottomBtn && document.getElementById('bottomMixerPanel').dataset.activeTrack == trackId) {
            bottomBtn.classList.toggle('active', track.armed);
        }

        console.log(`Track ${trackId} ${track.armed ? 'armed' : 'disarmed'} for recording`);
    }

    async toggleTrackMonitoring(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.monitoring = !track.monitoring;

        // Sincronizar botón de Bottom Mixer si es la activa
        const bottomBtn = document.querySelector('#bottomMixerPanel .bottom-mixer-controls .monitor-btn');
        if (bottomBtn && document.getElementById('bottomMixerPanel').dataset.activeTrack == trackId) {
            if (track.monitoring) bottomBtn.classList.add('active');
            else bottomBtn.classList.remove('active');
        }

        if (track.monitoring) {
            try {
                // REUTILIZAR STREAM GLOBAL si existe
                const inputDeviceId = document.getElementById('audioInputDevice')?.value || 'default';

                if (!this.recordingStream) {
                    this.recordingStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            deviceId: inputDeviceId !== 'default' ? { ideal: inputDeviceId } : undefined,
                            echoCancellation: false,
                            autoGainControl: false,
                            noiseSuppression: false,
                            latency: 0,
                            googEchoCancellation: false,
                            googAutoGainControl: false,
                            googNoiseSuppression: false,
                            googHighpassFilter: false,
                            googTypingNoiseDetection: false,
                            googNoiseReduction: false,
                            channelCount: 1,
                            sampleRate: 48000
                        }
                    });
                }
                const stream = this.recordingStream;
                track.monitoringStream = stream; // Guardar referencia para poder detenerlo luego

                // Crear nodo de fuente
                if (!track.monitorNode) {
                    track.monitorNode = this.audioEngine.createMediaStreamSource(stream);
                }

                // Conectar al analizador solo para visualización del medidor VU
                if (track.analyserNode) {
                    track.monitorNode.connect(track.analyserNode);
                }

                // Conectar a la cadena de audio de la pista para monitoreo en tiempo real
                if (track.gainNode) {
                    track.monitorNode.connect(track.gainNode);
                }

                console.log(`Monitoreo habilitado para la pista ${trackId} (Solo medidor VU - sin salida de audio)`);

            } catch (error) {
                console.error('Error enabling monitoring:', error);
                showToast('Error al activar el monitoreo. Verifica los permisos del micrófono.', 'error');
                track.monitoring = false;
                if (bottomBtn) bottomBtn.classList.remove('active');
            }
        } else {
            // Desconectar monitoreo
            if (track.monitorNode) {
                track.monitorNode.disconnect();
                track.monitorNode = null;
            }
            // DETENER EL STREAM si es privado de esta pista y no es el de grabación global
            if (track.monitoringStream && track.monitoringStream !== this.recordingStream) {
                track.monitoringStream.getTracks().forEach(t => t.stop());
            }
            track.monitoringStream = null;
            console.log(`Monitoring disabled for track ${trackId}`);
        }
    }


    setupGlobalDragListeners() {
        document.addEventListener('mousemove', (e) => {
            if (this.isDraggingClip && this.draggedClip) {
                // Comprobación de umbral de movimiento inicial (5px) para evitar clics accidentales como drag
                if (!this.hasMovedSignificantly) {
                    const dist = Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY);
                    if (dist < 5) return; // Movimiento insuficiente para iniciar arrastre visual
                    this.hasMovedSignificantly = true;
                }

                const deltaPx = e.clientX - this.dragStartX;
                const deltaTime = deltaPx / this.pixelsPerSecond;
                let newTime = this.dragStartObjTime + deltaTime;
                if (newTime < 0) newTime = 0; // No permitir clips antes del tiempo cero

                // Detectar pista bajo el puntero para cambio de pista (Track Swap)
                const unifiedContainer = document.getElementById('unifiedTracksContainer');
                const tracksWrapper = document.getElementById('tracksWrapper');
                const rect = unifiedContainer.getBoundingClientRect();
                const relativeY = e.clientY - rect.top + tracksWrapper.scrollTop;

                // Identificar contenedor de pista bajo el ratón para snapping vertical
                let targetTrackId = this.dragSourceTrackId;
                const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
                const trackContainer = elementUnderMouse?.closest('.track-container');
                if (trackContainer) {
                    targetTrackId = parseInt(trackContainer.dataset.trackId);
                }

                // --- LÓGICA DE SNAPPING (Ajuste) (Clip principal) ---
                const snapThresholdPx = 15; // Radio de ajuste en píxeles
                const snapThresholdTime = snapThresholdPx / this.pixelsPerSecond;
                let snappedTime = newTime;
                let minDistance = Infinity;

                // 1. Ajustar al cabezal de reproducción (Playhead)
                const playheadTime = (this.isPaused || !this.isPlaying) ? this.pauseTime : this.currentTime;
                const distToPlayhead = Math.abs(newTime - playheadTime);

                if (distToPlayhead < snapThresholdTime && distToPlayhead < minDistance) {
                    snappedTime = playheadTime;
                    minDistance = distToPlayhead;
                }

                // 2. Ajustar a TODOS los clips de TODAS las pistas (Ajuste entre pistas)
                this.tracks.forEach(track => {
                    const clips = this.timelineManager.getClips(track.id);
                    clips.forEach(clip => {
                        if (clip.id === this.draggedClip.id) return; // No ajustarse a sí mismo

                        // Ajustar al Inicio
                        const distToStart = Math.abs(newTime - clip.startTime);
                        if (distToStart < snapThresholdTime && distToStart < minDistance) {
                            snappedTime = clip.startTime;
                            minDistance = distToStart;
                        }

                        // Ajustar al Final
                        const clipEnd = clip.startTime + clip.duration;
                        const distToEnd = Math.abs(newTime - clipEnd);
                        if (distToEnd < snapThresholdTime && distToEnd < minDistance) {
                            snappedTime = clipEnd;
                            minDistance = distToEnd;
                        }
                    });
                });

                newTime = snappedTime;
                // ----------------------

                // Calcular Desplazamiento (Delta) basado en el Clip Maestro (el que se arrastra)
                const actualDeltaTime = newTime - this.dragStartObjTime;
                const trackDelta = targetTrackId - this.dragSourceTrackId;

                // Aplicar movimiento Delta a TODOS los clips de la actual selección (Multi-Move)
                if (this.dragSnapshot) {
                    this.dragSnapshot.forEach(snap => {
                        let updatedStartTime = snap.initialStartTime + actualDeltaTime;
                        if (updatedStartTime < 0) updatedStartTime = 0;

                        // Calcular la pista de destino para este clip específico
                        let updatedTrackId = snap.initialTrackId + trackDelta;

                        // Comprobar existencia de pista de destino para evitar "drop" al vacío o errores de ID
                        const trackExists = this.tracks.find(t => t.id === updatedTrackId);
                        if (!trackExists) {
                            updatedTrackId = snap.initialTrackId; // revertir cambio de pista si es inválido
                        }

                        // Aplicar al objeto de clip (para feedback visual)
                        if (snap.clipObj) {
                            snap.clipObj.tempStartTime = updatedStartTime;
                            snap.clipObj.tempTrackId = updatedTrackId;
                        }
                    });
                } else {
                    // Retrocompatibilidad para movimiento individual si el snapshot falla (Safety fallback)
                    this.draggedClip.tempStartTime = newTime;
                    this.draggedClip.tempTrackId = targetTrackId;
                }

                // Redibujar todas las pistas para mostrar el efecto "ghosting"
                this.tracks.forEach(t => this.drawWaveform(t));
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (this.isDraggingClip && this.draggedClip) {
                try {
                    const newTime = this.draggedClip.tempStartTime !== undefined ? this.draggedClip.tempStartTime : this.draggedClip.startTime;
                    // Lógica de Movimiento (Move Logic) al soltar el ratón (Drop)
                    // Ya sea que se cambie la pista o solo el tiempo, usamos el gestor para manejarlo (ordenación, seguridad)
                    if (this.dragSnapshot) {
                        this.dragSnapshot.forEach(snap => {
                            // 1. Resolver Posición Final
                            const finalTime = snap.clipObj.tempStartTime !== undefined ? snap.clipObj.tempStartTime : snap.initialStartTime;
                            const finalTrackId = snap.clipObj.tempTrackId !== undefined ? snap.clipObj.tempTrackId : snap.initialTrackId;

                            // 2. LIMPIEZA PREVIA: Eliminar propiedades temporales del objeto ANTES de que moveClip lo copie.
                            // Esto evita que duplicados hereden el estado de fantasmas (ghosts) de arrastre por referencia de objeto.
                            if (snap.clipObj) {
                                delete snap.clipObj.tempStartTime;
                                delete snap.clipObj.tempTrackId;
                            }

                            // 3. Mover
                            if (finalTime !== snap.initialStartTime || finalTrackId !== snap.initialTrackId) {
                                // Solo guardamos historia la primera vez que detectamos un cambio en este grupo de clips
                                if (!this.hasPushedHistoryForDrag) {
                                    this.pushHistory();
                                    this.hasPushedHistoryForDrag = true;
                                }
                                this.timelineManager.moveClip(snap.initialTrackId, snap.clipId, finalTime, finalTrackId);
                            }
                        });
                        this.dragSnapshot = null; // Limpiar snapshot después del procesamiento
                    } else {
                        // Fallback movimiento individual
                        const newTime = this.draggedClip.tempStartTime !== undefined ? this.draggedClip.tempStartTime : this.draggedClip.startTime;
                        const targetTrackId = this.draggedClip.tempTrackId || this.dragSourceTrackId;

                        // Limpieza previa
                        delete this.draggedClip.tempStartTime;
                        delete this.draggedClip.tempTrackId;

                        this.timelineManager.moveClip(this.dragSourceTrackId, this.draggedClip.id, newTime, targetTrackId);
                    }

                    // Reanudar la reproducción si se estaba reproduciendo antes del arrastre
                    if (this.wasPlayingBeforeDrag) {
                        this.play();
                        this.wasPlayingBeforeDrag = false;
                    }
                } catch (err) {
                    console.error('Error dropping clip:', err);
                } finally {
                    // Limpieza final - Asegurar que el estado "Drag" termina incluso si hay fallo interno
                    if (this.dragSnapshot) {
                        this.dragSnapshot.forEach(snap => {
                            if (snap.clipObj) {
                                delete snap.clipObj.tempStartTime;
                                delete snap.clipObj.tempTrackId;
                            }
                        });
                        this.dragSnapshot = null;
                    } else if (this.draggedClip) {
                        delete this.draggedClip.tempStartTime;
                        delete this.draggedClip.tempTrackId;
                    }

                    this.isDraggingClip = false;
                    this.draggedClip = null;
                    document.body.style.cursor = 'default';
                    this.tracks.forEach(t => this.drawWaveform(t)); // Redibujar todo el proyecto para limpiar ghosts y aplicar drop final
                }
            }
        });
    }

    importAudioToTrack(trackId) {
        this.hasUnsavedChanges = true;
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const arrayBuffer = await file.arrayBuffer();
                const audioBuffer = await this.audioEngine.decodeAudioData(arrayBuffer);

                // Crear clip
                const clip = {
                    id: this.timelineManager.generateClipId(),
                    startTime: this.currentTime,
                    duration: audioBuffer.duration,
                    audioBuffer: audioBuffer,
                    audioBlob: file,
                    bufferOffset: 0
                };

                this.timelineManager.addClip(track.id, clip);

                track.name = file.name.replace(/\.[^/.]+$/, '');

                const nameEl = document.querySelector(`.track-container[data-track-id="${trackId}"] .track-name`);
                if (nameEl) nameEl.textContent = track.name;

                this.drawWaveform(track);
                this.initializeTimeline();

                console.log(`Audio imported to track ${trackId}: `, file.name);

            } catch (error) {
                console.error('Error loading audio file:', error);
                showToast('Error al cargar el archivo de audio', 'error');
            }
        };

        input.click();
    }

    renameTrack(trackId, nameEl) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        const currentName = nameEl.textContent; // Obtener nombre actual antes de inyectar input de edición
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'track-name-input';

        const saveName = () => {
            const newName = input.value.trim() || `Pista ${trackId}`;
            if (newName !== currentName) {
                this.pushHistory();
                track.name = newName;
                nameEl.textContent = newName;
            }
            input.remove();
            nameEl.style.display = 'inline';
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveName();
            } else if (e.key === 'Escape') {
                input.remove();
                nameEl.style.display = 'inline';
            }
        });

        input.addEventListener('blur', saveName);

        nameEl.style.display = 'none';
        nameEl.parentNode.insertBefore(input, nameEl);
        input.focus();
        input.select();
    }

    clearAllTracks() {
        this.hasUnsavedChanges = true;
        showConfirm('¿Estás seguro de que quieres eliminar todas las pistas?', () => {
            this.stop(); // Parar audio antes de purga total de tracks

            // Limpiar todas las pistas
            this.tracks.forEach(track => {
                if (track.source) {
                    track.source.stop();
                }
                if (track.signalChain) {
                    track.signalChain.destroy();
                }
            });

            this.tracks = [];
            this.nextTrackId = 1;

            // Limpiar UI
            const unifiedTracksContainer = document.getElementById('unifiedTracksContainer');
            if (unifiedTracksContainer) unifiedTracksContainer.innerHTML = '';

            console.log('All tracks cleared');
            showToast("Proyecto vaciado", "info");
        });
    }

    drawWaveform(track) {
        const canvas = document.getElementById(`waveform-${track.id}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        // Obtener clips de esta pista
        let clips = this.timelineManager.getClips(track.id);

        // Filtrar clips que están siendo arrastrados A otra pista (no deberían aparecer aquí)
        clips = clips.filter(c => c.tempTrackId === undefined || c.tempTrackId === track.id);

        // Añadir clips que están siendo arrastrados DESDE otra pista A esta pista
        this.tracks.forEach(otherTrack => {
            if (otherTrack.id !== track.id) {
                const otherClips = this.timelineManager.getClips(otherTrack.id);
                const incomingClips = otherClips.filter(c => c.tempTrackId === track.id);
                clips = clips.concat(incomingClips);
            }
        });

        const maxDuration = this.getMaxDuration();
        const contentWidth = maxDuration * this.pixelsPerSecond;
        const containerWidth = canvas.parentElement.clientWidth;

        // Límite Crítico: Los motores de renderizado de los navegadores (punto de quiebre en ~32k px)
        // Limitamos a 30,000px para prevenir fallos de UI (pantalla en blanco) y picos de memoria latentes.
        const SAFETY_MAX_WIDTH = 30000;
        canvas.width = Math.min(Math.max(contentWidth, containerWidth), SAFETY_MAX_WIDTH);

        canvas.height = canvas.offsetHeight;

        // Limpiar el canvas para dejar que se vea el fondo CSS (grisáceo)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        clips.forEach(clip => {
            // Usar posición temporal si se está arrastrando, de lo contrario la posición real
            const startTime = clip.tempStartTime !== undefined ? clip.tempStartTime : clip.startTime;

            const startX = startTime * this.pixelsPerSecond;
            const width = clip.duration * this.pixelsPerSecond;

            // Dibujar con una ligera transparencia si se está arrastrando
            if (clip.tempStartTime !== undefined) {
                ctx.globalAlpha = 0.7;
            }

            this.drawClipWaveform(ctx, clip, startX, width, canvas.height);

            ctx.globalAlpha = 1.0;
        });
    }

    getThemeColor() {
        const body = document.body;
        if (body.classList.contains('natural')) return '#10D96A'; // Verde vibrante
        if (body.classList.contains('galactic')) return '#1E90FF'; // Azul vibrante
        if (body.classList.contains('retro')) return '#D81B60';    // Rosa retro sofisticado
        if (body.classList.contains('vintage')) return '#F1C40F';  // Dorado vibrante
        if (body.classList.contains('redblack')) return '#E81F2B'; // Rojo vibrante
        return '#FF9F1C'; // JamVault Naranja Vibrante (color por defecto)
    }

    drawClipWaveform(ctx, clip, x, width, height) {
        if (!clip.audioBuffer) return;

        const cornerRadius = 6; // Radio de bordes redondeados suave para mejor ergonomía visual (Modern rounded clips)

        // Función de ayuda para dibujar un rectángulo redondeado
        const drawRoundedRect = (x, y, width, height, radius) => {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.arcTo(x + width, y, x + width, y + radius, radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
            ctx.lineTo(x + radius, y + height);
            ctx.arcTo(x, y + height, x, y + height - radius, radius);
            ctx.lineTo(x, y + radius);
            ctx.arcTo(x, y, x + radius, y, radius);
            ctx.closePath();
        };

        // Dibujar el fondo del clip con esquinas redondeadas
        ctx.save();
        drawRoundedRect(x, 0, width, height, cornerRadius);
        ctx.clip();
        ctx.fillStyle = '#0A090F';
        ctx.fillRect(x, 0, width, height);
        ctx.restore();

        // Dibujar el borde de selección si está seleccionado
        if (this.selectedClips.some(s => s.clipId === clip.id)) {
            ctx.strokeStyle = this.getThemeColor(); // Usar color de tema dinámico
            ctx.lineWidth = 3;
            drawRoundedRect(x, 0, width, height, cornerRadius);
            ctx.stroke();
        } else {
            // Borde normal de visibilidad (high contrast white/glass effect boundary)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            drawRoundedRect(x, 0, width, height, cornerRadius);
            ctx.stroke();
        }

        const data = clip.audioBuffer.getChannelData(0);
        const sampleRate = clip.audioBuffer.sampleRate;
        const startSample = Math.floor((clip.bufferOffset || 0) * sampleRate);
        const durationSamples = Math.floor(clip.duration * sampleRate);
        const endSample = Math.min(startSample + durationSamples, data.length);

        const segmentLength = endSample - startSample;
        const step = Math.ceil(segmentLength / width);
        const amp = height / 2;

        ctx.fillStyle = this.getThemeColor();
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;

            for (let j = 0; j < step; j++) {
                const sampleIdx = startSample + (i * step) + j;
                if (sampleIdx >= endSample) break;

                const datum = data[sampleIdx];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }

            // Asegurar que min/max se actualizaron realmente si el paso es muy pequeño
            if (min > max) { min = 0; max = 0; }

            ctx.fillRect(x + i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
        }
    }

    // ========== VU METERS ==========

    updateMeters() {
        this.meterInterval = requestAnimationFrame(() => this.updateMeters());

        this.tracks.forEach(track => {
            if (!track.analyserNode) return;

            const bufferLength = track.analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            track.analyserNode.getByteFrequencyData(dataArray);

            // Calcular volumen medio
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const volume = Math.min(100, (average / 50) * 100);

            // Update UI
            const meterEl = document.querySelector(`.track-container[data-track-id="${track.id}"] .vu-level`);
            if (meterEl) {
                meterEl.style.height = `${volume}%`;

                // Gradiente de color según pico de señal (VU Meter scale: Green -> Yellow -> Red)
                if (volume > 90) {
                    meterEl.style.backgroundColor = '#e74c3c'; // Red
                } else if (volume > 70) {
                    meterEl.style.backgroundColor = '#f1c40f'; // Yellow
                } else {
                    meterEl.style.backgroundColor = '#2ecc71'; // Verde (Nivel óptimo)
                }
            }
        });
    }

    // ========== METRONOME ==========

    startMetronome() {
        if (this.metronomeInterval) {
            this.stopMetronome();
        }

        const intervalMs = (60 / this.bpm) * 1000;

        // Play first click immediately
        this.playMetronomeClick();

        // Then play subsequent clicks
        this.metronomeInterval = setInterval(() => {
            this.playMetronomeClick();
        }, intervalMs);

        console.log('Metronome started at', this.bpm, 'BPM');
    }

    stopMetronome() {
        if (this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            this.metronomeInterval = null;
            console.log('Metronome stopped');
        }
    }

    playMetronomeClick() {
        const clickDuration = 0.05; // 50ms click
        const now = this.audioEngine.getCurrentTime();

        // Create oscillator for click sound
        const oscillator = this.audioEngine.createOscillator('sine', 1000);
        const clickGain = this.audioEngine.createGain(0);

        oscillator.connect(clickGain);
        clickGain.connect(this.metronomeGain);

        // Quick attack and decay
        clickGain.gain.setValueAtTime(0.5, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + clickDuration);

        oscillator.start(now);
        oscillator.stop(now + clickDuration);
    }

    // ========== EXPORT ==========

    async exportMix() {
        if (this.tracks.length === 0) { // No exportar si no hay audio detectado en el motor DAW
            showToast('No hay pistas para exportar', 'warning');
            return;
        }

        // 1. Mostrar Diálogo de Exportación (Download Mix Settings)
        showExportModal(async (fileName, format) => {
            try {
                showToast('Renderizando mezcla...', 'info');

                // 2. Calcular Tiempo Total basándose en clips reales para el OfflineAudioContext
                const totalDuration = this.timelineManager.getTotalDuration();
                if (totalDuration <= 0) {
                    showToast('El proyecto está vacío', 'warning');
                    return;
                }

                // 3. Crear Entorno de Renderizado Offline (Alta Calidad / Non-Real-Time Rendering)
                const offlineContext = new OfflineAudioContext(2, Math.ceil(totalDuration * 44100), 44100);

                // 4. Inyectar Ganancia Maestra en el entorno offline (Apply Master Volume during mixdown)
                const masterGain = offlineContext.createGain();
                masterGain.gain.value = this.audioEngine.getMasterVolume();
                masterGain.connect(offlineContext.destination);

                // 5. Filtrar señales a exportar (ignorar Muted, priorizar Solos - Export Logic)
                const soloTracks = this.tracks.filter(t => t.solo);
                const tracksToExport = soloTracks.length > 0 ? soloTracks : this.tracks.filter(t => !t.muted);

                // 6. Programar (Schedule) todos los buffers de audio en el OfflineAudioContext
                tracksToExport.forEach(track => {
                    const clips = this.timelineManager.getClips(track.id);
                    clips.forEach(clip => {
                        if (clip.audioBuffer) {
                            const source = offlineContext.createBufferSource();
                            source.buffer = clip.audioBuffer;

                            const trackGain = offlineContext.createGain();
                            trackGain.gain.value = track.volume / 100;

                            const trackPan = offlineContext.createStereoPanner();
                            trackPan.pan.value = track.pan / 100;

                            // Configuración de procesado de señal para Exportación (Mixdown Signal Chain)
                            source.connect(trackGain);
                            trackGain.connect(trackPan);
                            trackPan.connect(masterGain);

                            // Programar al tiempo exacto: source.start(inicio, desfase_buffer, duracion)
                            source.start(clip.startTime, clip.bufferOffset || 0, clip.duration);
                        }
                    });
                });

                // 7. Renderizar (Mixdown Execution) - Proceso asíncrono asíncrono de CPU
                const renderedBuffer = await offlineContext.startRendering();

                // 8. Codificar Buffer resultante y disparar Descarga (Encode & Download)
                if (format === 'wav') {
                    const wav = this.audioBufferToWav(renderedBuffer);
                    this.downloadBlob(new Blob([wav], { type: 'audio/wav' }), `${fileName}.wav`);
                } else {
                    // Exportación comprimida (OGG/WebM) mediante truco de MediaRecorder a tiempo real (Online Compression workaround)
                    this.exportCompressed(renderedBuffer, fileName, format);
                }

                showToast(`¡Mezcla "${fileName}" exportada!`, 'success');

            } catch (error) {
                console.error('Error exporting mix:', error);
                showToast('Error al exportar el mix', 'error');
            }
        });
    }

    downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    async exportCompressed(audioBuffer, fileName, format) {
        // Reproducción a alta velocidad mediante destino de stream para capturar como OGG (Codec workaround)
        const streamDest = this.audioEngine.context.createMediaStreamDestination();
        const source = this.audioEngine.context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(streamDest);

        const mimeType = format === 'ogg' ? 'audio/ogg; codecs=opus' : 'audio/webm; codecs=opus';
        const recorder = new MediaRecorder(streamDest.stream, { mimeType });
        const chunks = [];

        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            this.downloadBlob(blob, `${fileName}.${format}`);
        };

        recorder.start();
        source.start(0);

        // We have to wait for the whole thing because MediaRecorder is real-time
        // Inform user
        showToast(`Comprimiendo... Este proceso tardará la duración íntegra del audio (${Math.ceil(audioBuffer.duration)}s) al usar captura en tiempo real`, 'info', 5000);

        source.onended = () => recorder.stop();
    }

    audioBufferToWav(buffer) {
        const length = buffer.length * buffer.numberOfChannels * 2 + 44;
        const arrayBuffer = new ArrayBuffer(length);
        const view = new DataView(arrayBuffer);
        const channels = [];
        let offset = 0;
        let pos = 0;

        // Escribir cabecera WAV estándar (PCM Wave Header Builder)
        const setUint16 = (data) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };
        const setUint32 = (data) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        // "RIFF" chunk descriptor
        setUint32(0x46464952); // Descriptor RIFF ("RIFF" en hexadecimal)
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // Identificador ("WAVE" en hexadecimal)

        // "fmt " sub-chunk
        setUint32(0x20746d66); // "fmt "
        setUint32(16); // subchunk1size
        setUint16(1); // audio format (1 = PCM)
        setUint16(buffer.numberOfChannels);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // byte rate
        setUint16(buffer.numberOfChannels * 2); // block align
        setUint16(16); // bits per sample

        // "data" sub-chunk
        setUint32(0x61746164); // "data"
        setUint32(length - pos - 4); // subchunk2size

        // Escribir datos intercalados (Interleave audio data) para PCM estéreo
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        while (pos < length) {
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return arrayBuffer;
    }

    // ========== CLIP INTERACTION ==========

    setupClipInteraction(track) {
        // Al empezar a interactuar seriamente, asegurar que el flag de historia del drag está limpio
        const onDragStart = () => {
            this.hasPushedHistoryForDrag = false;
        };

        const canvas = document.getElementById(`waveform-${track.id}`);
        if (!canvas) return;

        // Efecto hover para cambio de cursor contextualmente (UI feedback)
        canvas.addEventListener('mousemove', (e) => {
            if (this.isDraggingClip) return; // No cambiar cursor durante arrastre activo

            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const timeAtHover = clickX / this.pixelsPerSecond;

            const clips = this.timelineManager.getClips(track.id);
            const hoveredClip = clips.find(c => timeAtHover >= c.startTime && timeAtHover <= c.startTime + c.duration);

            if (hoveredClip) {
                canvas.style.cursor = 'grab';
            } else {
                canvas.style.cursor = 'default';
            }
        });

        // Mouse Down: Select & Start Drag
        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only Left Click

            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const timeAtClick = clickX / this.pixelsPerSecond;

            // Buscar clip bajo el puntero (en esta pista)
            const clips = this.timelineManager.getClips(track.id);
            const clickedClip = clips.find(c => timeAtClick >= c.startTime && timeAtClick <= c.startTime + c.duration);

            if (clickedClip) {
                e.preventDefault();
                e.stopPropagation(); // Prevent timeline seeking/deselection

                // Lógica de selección de clips (Clip selection logic)
                if (e.shiftKey) {
                    const existingIndex = this.selectedClips.findIndex(s => s.clipId === clickedClip.id);
                    if (existingIndex !== -1) {
                        this.selectedClips.splice(existingIndex, 1);
                    } else {
                        this.selectedClips.push({ trackId: track.id, clipId: clickedClip.id });
                    }
                } else {
                    // Selección estándar (un solo clip):
                    // Si el clip ya está seleccionado, NO deseleccionamos otros inmediatamente (permite arrastre grupal de golpe).
                    // Solo reseteamos si clicamos un clip fuera de la actual selección grupal.
                    const isAlreadySelected = this.selectedClips.some(s => s.clipId === clickedClip.id);
                    if (!isAlreadySelected) {
                        this.selectedClips = [{ trackId: track.id, clipId: clickedClip.id }];
                    }
                }

                this.tracks.forEach(t => this.drawWaveform(t)); // Redibujar para mostrar visualmente selección de pistas/clips

                // Init Dragging
                this.isDraggingClip = true;
                onDragStart(); // Resetear flag de historia para este nuevo drag
                this.draggedClip = clickedClip;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY; // Almacenar Y de inicio para umbral vertical (Drag Threshold)
                this.hasMovedSignificantly = false; // Bandera de umbral de arrastre (Threshold check)
                this.dragStartObjTime = clickedClip.startTime;
                this.dragSourceTrackId = track.id;

                // SNAPSHOT para ARRASTRE MÚLTIPLE: Almacena estado inicial de TODOS los seleccionados (Group Drag state)
                this.dragSnapshot = this.selectedClips.map(sel => {
                    const tId = sel.trackId;
                    const cId = sel.clipId;
                    // Localizar objeto de clip real para manipular durante el preview de arrastre
                    const clipObj = this.timelineManager.getClips(tId).find(c => c.id === cId);
                    return {
                        clipId: cId,
                        initialTrackId: tId,
                        initialStartTime: clipObj ? clipObj.startTime : 0,
                        clipObj: clipObj // Referencia para actualizaciones rápidas reactivas en el DOM
                    };
                });

                // Pausa automática al arrastrar para facilitar sincronización sonora tras soltar (Auto-pause feature)
                if (this.isPlaying) {
                    this.pause();
                    this.wasPlayingBeforeDrag = true;
                } else {
                    this.wasPlayingBeforeDrag = false;
                }

                document.body.style.cursor = 'grabbing';
                canvas.style.cursor = 'grabbing';
            }
        });

        // Context Menu (Right Click)
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const timeAtClick = clickX / this.pixelsPerSecond;

            const clips = this.timelineManager.getClips(track.id);
            const clickedClip = clips.find(c => timeAtClick >= c.startTime && timeAtClick <= c.startTime + c.duration);

            if (clickedClip) {
                this.showClipContextMenu(track, clickedClip, e.clientX, e.clientY);
            }
        });
    }

    showClipContextMenu(track, clip, x, y) {
        // Mostrar Menú Contextual para clips (Clip Context Menu UI)
        // Eliminar menús previos si existen (Purge old context menus)
        const existingMenu = document.getElementById('clip-context-menu');
        if (existingMenu) existingMenu.remove();

        // Create menu
        const menu = document.createElement('div');
        menu.id = 'clip-context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.backgroundColor = '#1a1a1a';
        menu.style.border = '1px solid rgba(255,255,255,0.1)';
        menu.style.borderRadius = '8px';
        menu.style.padding = '0.5rem';
        menu.style.zIndex = '20000';
        menu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';

        menu.innerHTML = `
            <div style="color: rgba(255,255,255,0.5); margin-bottom: 0.8rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Opciones de Clip</div>
            <button class="btn" style="width: 100%; text-align: left; margin-bottom: 4px;" onclick="daw.deleteClip(${track.id}, '${clip.id}')">🗑️ Eliminar</button>
            <button class="btn" style="width: 100%; text-align: left;" onclick="daw.splitClipAtPlayhead(${track.id}, '${clip.id}')">✂️ Dividir en Playhead</button>
`;

        document.body.appendChild(menu);

        // Cerrar menú al hacer clic fuera (Auto-close on backdrop/outside click)
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) { // Si se clica fuera del área de opciones...
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 100);
    }

    // ========== CLIP EDITING ==========

    deleteClip(trackId, clipId) {
        this.pushHistory();
        trackId = Number(trackId);
        this.timelineManager.removeClip(trackId, clipId);
        const track = this.tracks.find(t => t.id === trackId);
        if (track) this.drawWaveform(track);
        const menu = document.getElementById('clip-context-menu');
        if (menu) menu.remove();
    }

    splitClipAtPlayhead(trackId, clipId) {
        this.pushHistory();
        trackId = Number(trackId);
        // Usar pauseTime si está pausado/detenido para que coincida exactamente con el cabezal visual
        const splitTime = (this.isPaused || !this.isPlaying) ? this.pauseTime : this.currentTime;

        this.timelineManager.splitClip(trackId, clipId, splitTime);
        const track = this.tracks.find(t => t.id === trackId);
        if (track) this.drawWaveform(track);
        const menu = document.getElementById('clip-context-menu');
        if (menu) menu.remove();
    }

    /**
     * Serializa el proyecto a JSON incluyendo el audio codificado en Base64.
     * Es async porque la lectura de Blobs es asíncrona.
     */
    async serializeProject() {
        const blobToBase64 = (blob) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result); // data:type;base64,xxxx
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const serializedTracks = await Promise.all(this.tracks.map(async t => {
            const clips = this.timelineManager.getClips(t.id) || [];
            const serializedClips = await Promise.all(clips.map(async c => {
                let audioData = null;
                let mimeType = 'audio/wav';
                if (c.audioBlob) {
                    try {
                        audioData = await blobToBase64(c.audioBlob);
                        mimeType = c.audioBlob.type || 'audio/wav';
                    } catch (e) {
                        console.warn('No se pudo serializar el audio del clip:', e);
                    }
                }
                return {
                    id: c.id,
                    startTime: c.startTime,
                    duration: c.duration,
                    bufferOffset: c.bufferOffset || 0,
                    audioData,   // data URL en Base64
                    mimeType
                };
            }));
            return {
                id: t.id,
                name: t.name,
                volume: t.volume,
                pan: t.pan,
                muted: t.muted,
                solo: t.solo,
                clips: serializedClips
            };
        }));

        return {
            version: 2,
            bpm: this.bpm,
            pixelsPerSecond: this.pixelsPerSecond,
            tracks: serializedTracks
        };
    }

    /**
     * Carga datos de proyecto desde un objeto JSON serializado.
     * Reconstruye pistas y decodifica el audio desde Base64.
     */
    async loadProjectData(data) {
        if (!data) return;
        // Limpiar estado actual
        this.tracks = [];
        this.nextTrackId = 1;
        const container = document.getElementById('unifiedTracksContainer');
        if (container) container.innerHTML = '';

        // Restaurar BPM
        if (data.bpm) {
            this.bpm = data.bpm;
            const bpmInput = document.getElementById('bpmInput');
            if (bpmInput) bpmInput.value = data.bpm;
        }

        if (!Array.isArray(data.tracks)) {
            this.hasUnsavedChanges = false;
            return;
        }

        const base64ToBlob = async (dataUrl, mimeType) => {
            const res = await fetch(dataUrl);
            return res.blob();
        };

        showToast('Cargando proyecto...', 'info', 3000);

        for (const t of data.tracks) {
            this.addEmptyTrack();
            const track = this.tracks[this.tracks.length - 1];
            if (!track) continue;

            // Restaurar nombre
            if (t.name) {
                track.name = t.name;
                const nameEl = document.querySelector(`.track-container[data-track-id="${track.id}"] .track-name`);
                if (nameEl) nameEl.textContent = t.name;
            }

            // Restaurar volumen y pan
            if (t.volume !== undefined) {
                track.volume = t.volume;
                this.setTrackVolume(track.id, t.volume);
            }

            // Restaurar clips con audio
            if (Array.isArray(t.clips)) {
                for (const c of t.clips) {
                    try {
                        let audioBuffer = null;
                        let audioBlob = null;

                        if (c.audioData) {
                            audioBlob = await base64ToBlob(c.audioData, c.mimeType || 'audio/wav');
                            const arrayBuffer = await audioBlob.arrayBuffer();
                            audioBuffer = await this.audioEngine.decodeAudioData(arrayBuffer);
                        }

                        if (audioBuffer) {
                            const clip = {
                                id: c.id || this.timelineManager.generateClipId(),
                                startTime: c.startTime || 0,
                                duration: audioBuffer.duration,
                                audioBuffer,
                                audioBlob,
                                bufferOffset: c.bufferOffset || 0
                            };
                            this.timelineManager.addClip(track.id, clip);
                        }
                    } catch (e) {
                        console.error('Error restaurando clip de audio:', e);
                    }
                }
                this.drawWaveform(track);
            }
        }

        this.initializeTimeline();
        this.hasUnsavedChanges = false;
        showToast('¡Proyecto cargado correctamente!', 'success');
    }

    // ========== SISTEMA DE HISTORIA (UNDO/REDO) ==========

    pushHistory() {
        if (this.isRestoringHistory) return;
        console.log('Capturando snapshot para historia...');
        // Snapshot ligero preservando referencias a AudioBuffers
        const snapshot = {
            bpm: this.bpm,
            tracks: this.tracks.map(t => ({
                id: t.id,
                name: t.name,
                volume: t.volume,
                pan: t.pan,
                muted: t.muted,
                solo: t.solo,
                monitoring: t.monitoring,
                clips: this.timelineManager.getClips(Number(t.id)).map(c => ({ ...c }))
            }))
        };

        this.undoStack.push(snapshot);

        if (this.undoStack.length > this.maxHistoryStackSize) {
            this.undoStack.shift();
        }

        this.redoStack = [];
        this.hasUnsavedChanges = true;
    }

    async undo() {
        if (this.undoStack.length === 0) {
            showToast('No hay más para deshacer', 'info');
            return;
        }

        this.isRestoringHistory = true;
        try {
            const currentSnapshot = {
                bpm: this.bpm,
                tracks: this.tracks.map(t => ({
                    id: t.id,
                    name: t.name,
                    volume: t.volume,
                    pan: t.pan,
                    muted: t.muted,
                    solo: t.solo,
                    monitoring: t.monitoring,
                    clips: this.timelineManager.getClips(t.id).map(c => ({ ...c }))
                }))
            };
            this.redoStack.push(currentSnapshot);

            const previousState = this.undoStack.pop();
            await this.applySnapshot(previousState);
            showToast('Deshacer', 'info', 1000);
        } finally {
            this.isRestoringHistory = false;
        }
    }

    async redo() {
        if (this.redoStack.length === 0) {
            showToast('No hay más para rehacer', 'info');
            return;
        }

        this.isRestoringHistory = true;
        try {
            const currentSnapshot = {
                bpm: this.bpm,
                tracks: this.tracks.map(t => ({
                    id: t.id,
                    name: t.name,
                    volume: t.volume,
                    pan: t.pan,
                    muted: t.muted,
                    solo: t.solo,
                    monitoring: t.monitoring,
                    clips: this.timelineManager.getClips(t.id).map(c => ({ ...c }))
                }))
            };
            this.undoStack.push(currentSnapshot);

            const nextState = this.redoStack.pop();
            await this.applySnapshot(nextState);
            showToast('Rehacer', 'info', 1000);
        } finally {
            this.isRestoringHistory = false;
        }
    }

    async applySnapshot(data) {
        if (!data) return;

        if (this.isPlaying) this.stop();

        // 1. Limpiar pistas actuales (DOM y nodos)
        this.tracks.forEach(track => {
            if (track.gainNode) track.gainNode.disconnect();
            if (track.analyserNode) track.analyserNode.disconnect();
            if (track.monitorNode) track.monitorNode.disconnect();
            if (track.recordingSource) track.recordingSource.disconnect();
            if (track.signalChain) track.signalChain.disconnect();
        });

        this.tracks = [];
        this.timelineManager.clips.clear();
        const container = document.getElementById('unifiedTracksContainer');
        if (container) container.innerHTML = '';

        // 2. Restaurar BPM
        this.bpm = data.bpm;
        const bpmInput = document.getElementById('bpmInput');
        if (bpmInput) bpmInput.value = data.bpm;

        // Resetear nextTrackId para evitar que crezca infinitamente
        let maxTrackId = 0;

        // 3. Recrear pistas
        for (const t of data.tracks) {
            maxTrackId = Math.max(maxTrackId, t.id);
            // Aseguramos que pasamos el ID original
            this.addEmptyTrack(t.id);
            const track = this.tracks[this.tracks.length - 1];

            track.name = t.name;
            const nameEl = document.querySelector(`.track-container[data-track-id="${track.id}"] .track-name`);
            if (nameEl) nameEl.textContent = t.name;

            track.volume = t.volume;
            this.setTrackVolume(track.id, t.volume);

            track.pan = t.pan;
            // signalChain está desactivado, usar panNode directamente
            if (track.panNode) {
                this.setTrackPan(track.id, t.pan);
            }

            track.muted = t.muted;
            if (track.muted) {
                const muteBtn = document.querySelector(`.track-container[data-track-id="${track.id}"] .mute-btn`);
                muteBtn?.classList.add('active');
                track.gainNode.gain.value = 0;
            }

            // RESTAURAR MONITORIZACION
            track.monitoring = t.monitoring;
            if (track.monitoring) {
                this.toggleTrackMonitoring(track.id);
            }

            if (Array.isArray(t.clips)) {
                t.clips.forEach(c => {
                    this.timelineManager.addClip(Number(track.id), { ...c });
                });
            }

            this.drawWaveform(track);
        }

        // Asegurar que el contador de IDs es coherente con las pistas restauradas
        this.nextTrackId = maxTrackId + 1;
    }

}

// Inicializar al cargar la página
// Aplazar la inicialización hasta que se haga clic en "Nuevo Proyecto" en la Landing Page
window.initializeJamStudio = async (projectData) => {
    // Permitir reinicialización al cargar un proyecto distinto
    if (window.dawInstance) {
        // Limpiar instancia previa
        window.dawInstance = null;
        window.daw = null;
        window._jamstudioInstance = null;
    }
    console.log('🚀 Launching JamStudio Pro...');
    window.dawInstance = new Jamstudio();
    // Exponer para acceso heredado (legacy) y para el controlador de vista
    window.daw = window.dawInstance;
    window._jamstudioInstance = window.dawInstance;

    // Si se pasaron datos de proyecto, cargarlos tras la inicialización del motor
    if (projectData) {
        setTimeout(() => {
            if (window.dawInstance && window.dawInstance.loadProjectData) {
                window.dawInstance.loadProjectData(projectData);
            }
        }, 800);
    }

    // GESTOR DE INTERACCIÓN GLOBAL: Reanudar audio + Deselección Global
    document.body.addEventListener('click', async (e) => {
        // Reanudar AudioContext
        if (window.daw && window.daw.audioEngine) {
            await window.daw.audioEngine.resume();
        }

        // DESELECCIÓN GLOBAL: Si se hace clic fuera del área de la "pista" (canvases/regla), limpiar selección
        const isClipArea = e.target.closest('.waveform-canvas');
        const isRuler = e.target.closest('.timeline-ruler');
        const isTransport = e.target.closest('.daw-transport');
        const isContextMenu = e.target.closest('#clip-context-menu');
        const isButton = e.target.closest('button') || e.target.closest('.btn'); // Excluir botones

        if (!isClipArea && !isRuler && !isTransport && !isContextMenu && !isButton) {
            if (window.daw && window.daw.selectedClips.length > 0) {
                window.daw.selectedClips = [];
                window.daw.tracks.forEach(t => window.daw.drawWaveform(t));
                console.log('Deselección global activada (clic fuera de pista/botones)');
            }
        }
    });

};

export { Jamstudio };
