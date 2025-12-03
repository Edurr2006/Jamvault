// ========== JAMSTUDIO PRO - Professional Guitar DAW ==========
// Complete implementation with modular architecture and professional signal chain

import { AudioEngine } from './AudioEngine.js';
import { SignalChain } from './SignalChain.js';
import { AudioMath } from './utils/AudioMath.js';
import { TimelineManager } from './TimelineManager.js';

class JamStudioPro {
    constructor() {
        // Core audio engine
        this.audioEngine = null;

        // Timeline manager for clip-based editing
        this.timelineManager = new TimelineManager();

        // Tracks
        this.tracks = [];
        this.nextTrackId = 1;

        // Playback state
        this.isPlaying = false;
        this.isPaused = false;
        this.isRecording = false;
        this.currentTime = 0;
        this.startTime = 0;
        this.pauseTime = 0;
        this.animationId = null;

        // Recording
        this.recordingStream = null;

        // Metronome
        this.metronomeEnabled = false;
        this.bpm = 120;
        this.metronomeInterval = null;
        this.metronomeGain = null;

        // Timeline
        this.pixelsPerSecond = 50;
        this.minZoom = 10;
        this.maxZoom = 200;
        this.isDraggingTimeline = false;

        // Meter update
        this.meterInterval = null;

        this.init();
    }

    async init() {
        try {
            // Initialize audio engine
            this.audioEngine = new AudioEngine(48000);
            await this.audioEngine.init();

            // Setup metronome
            this.metronomeGain = this.audioEngine.createGain(0.3);
            this.metronomeGain.connect(this.audioEngine.audioContext.destination);

            // Setup UI event listeners
            this.setupEventListeners();

            // Initialize timeline
            this.initializeTimeline();

            // Start meter updates
            this.updateMeters();

            console.log('JamStudio Pro initialized successfully');

        } catch (error) {
            console.error('Error initializing JamStudio Pro:', error);
            alert('Error al inicializar el sistema de audio. Por favor, recarga la página.');
        }
    }

    setupEventListeners() {
        // Transport controls
        document.getElementById('recordBtn')?.addEventListener('click', () => this.startRecording());
        document.getElementById('playBtn')?.addEventListener('click', () => this.play());
        document.getElementById('pauseBtn')?.addEventListener('click', () => this.pause());
        document.getElementById('stopBtn')?.addEventListener('click', () => this.stop());

        // Track management
        document.getElementById('addTrackBtn')?.addEventListener('click', () => this.addEmptyTrack());
        document.getElementById('clearAllBtn')?.addEventListener('click', () => this.clearAllTracks());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportMix());

        // Master controls
        const masterVolume = document.getElementById('masterVolume');
        if (masterVolume) {
            masterVolume.addEventListener('input', (e) => {
                const value = e.target.value / 100;
                this.audioEngine.setMasterVolume(value);
                document.getElementById('masterVolumeValue').textContent = e.target.value + '%';
            });
        }

        // Metronome
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

        // BPM Input
        const bpmInput = document.getElementById('bpmInput');
        if (bpmInput) {
            bpmInput.addEventListener('input', (e) => {
                let value = parseInt(e.target.value);
                value = AudioMath.clamp(value, 40, 240);
                this.bpm = value;
                e.target.value = value;

                // Update all track delays
                this.tracks.forEach(track => {
                    if (track.signalChain) {
                        track.signalChain.delay.setBPM(this.bpm);
                    }
                });

                // Restart metronome if playing
                if (this.metronomeEnabled && this.isPlaying) {
                    this.stopMetronome();
                    this.startMetronome();
                }
            });
        }

        // Progress bar dragging
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

        // Zoom with mouse wheel
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

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                if (this.isPlaying && !this.isPaused) {
                    this.pause();
                } else {
                    this.play();
                }
            } else if (e.code === 'KeyR' && e.ctrlKey) {
                e.preventDefault();
                this.startRecording();
            }
        });
    }

    initializeTimeline() {
        const ruler = document.getElementById('timelineRuler');
        if (!ruler) return;

        ruler.innerHTML = '';

        const maxDuration = Math.max(...this.tracks.map(t => t.audioBuffer?.duration || 0), 60);

        // Determine marker interval based on zoom
        let markerInterval;
        if (this.pixelsPerSecond >= 100) markerInterval = 1;
        else if (this.pixelsPerSecond >= 50) markerInterval = 2;
        else if (this.pixelsPerSecond >= 25) markerInterval = 5;
        else markerInterval = 10;

        // Create time markers
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

        this.setupTimelineDragging(maxDuration);
    }

    setupTimelineDragging(maxDuration) {
        const timelineSection = document.querySelector('.timeline-section');
        if (!timelineSection) return;

        // Remove old listeners
        if (this.timelineMouseDown) {
            timelineSection.removeEventListener('mousedown', this.timelineMouseDown);
            document.removeEventListener('mousemove', this.timelineMouseMove);
            document.removeEventListener('mouseup', this.timelineMouseUp);
        }

        this.timelineMouseDown = (e) => {
            if (e.target.closest('.track-row') || e.target.closest('.timeline-ruler')) {
                this.isDraggingTimeline = true;
                this.updatePlayheadPosition(e, maxDuration);
            }
        };

        this.timelineMouseMove = (e) => {
            if (this.isDraggingTimeline) {
                this.updatePlayheadPosition(e, maxDuration);
            }
        };

        this.timelineMouseUp = () => {
            this.isDraggingTimeline = false;
        };

        timelineSection.addEventListener('mousedown', this.timelineMouseDown);
        document.addEventListener('mousemove', this.timelineMouseMove);
        document.addEventListener('mouseup', this.timelineMouseUp);
    }

    updatePlayheadPosition(e, maxDuration) {
        const timelineSection = document.querySelector('.timeline-section');
        if (!timelineSection) return;

        const rect = timelineSection.getBoundingClientRect();
        const clickX = e.clientX - rect.left + timelineSection.scrollLeft;
        const clickTime = Math.max(0, clickX / this.pixelsPerSecond);

        this.pauseTime = clickTime;
        this.isPaused = true;
        this.currentTime = clickTime;

        const playhead = document.getElementById('playhead');
        if (playhead) playhead.style.left = `${clickX}px`;

        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const percentage = (clickTime / maxDuration) * 100;
            progressFill.style.width = `${Math.min(percentage, 100)}%`;
        }

        const currentTimeEl = document.getElementById('currentTime');
        if (currentTimeEl) {
            const minutes = Math.floor(clickTime / 60);
            const seconds = Math.floor(clickTime % 60);
            const tenths = Math.floor((clickTime % 1) * 10);
            currentTimeEl.textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
        }

        // Auto-scroll
        const edgeThreshold = 50;
        const scrollSpeed = 15;
        if (e.clientX - rect.left < edgeThreshold && timelineSection.scrollLeft > 0) {
            timelineSection.scrollLeft -= scrollSpeed;
        } else if (rect.right - e.clientX < edgeThreshold) {
            timelineSection.scrollLeft += scrollSpeed;
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

        // Redraw all waveforms
        this.tracks.forEach(track => {
            if (track.audioBuffer) this.drawWaveform(track);
        });

        // Update playhead
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
        const maxDuration = Math.max(...this.tracks.map(t => t.audioBuffer?.duration || 0), 60);
        time = AudioMath.clamp(time, 0, maxDuration);

        if (this.isPlaying && !this.isPaused) {
            this.stop();
            this.pauseTime = time;
            this.isPaused = true;
            this.play();
        } else {
            this.pauseTime = time;
            this.isPaused = true;
            this.currentTime = time;

            const playhead = document.getElementById('playhead');
            if (playhead) playhead.style.left = `${time * this.pixelsPerSecond}px`;

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

        // Auto-scroll timeline
        const timelineSection = document.querySelector('.timeline-section');
        if (timelineSection) {
            const playheadPosition = time * this.pixelsPerSecond;
            const viewportWidth = timelineSection.clientWidth;
            const targetScroll = playheadPosition - (viewportWidth / 2);
            timelineSection.scrollLeft = Math.max(0, targetScroll);
        }
    }

    // ========== RECORDING ==========

    async startRecording() {
        // Check if any tracks are armed
        const armedTracks = this.tracks.filter(t => t.armed);

        if (armedTracks.length === 0) {
            alert('No hay pistas armadas para grabar. Por favor, arma al menos una pista primero.');
            return;
        }

        // Check if armed tracks have existing audio
        const tracksWithAudio = armedTracks.filter(t => t.audioBuffer !== null);
        if (tracksWithAudio.length > 0) {
            const trackNames = tracksWithAudio.map(t => t.name).join(', ');
            const confirmed = confirm(
                `Las siguientes pistas tienen audio que será sobrescrito:\n${trackNames}\n\n¿Deseas continuar?`
            );
            if (!confirmed) return;
        }

        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                    latency: 0
                }
            });

            this.isRecording = true;
            this.recordingStream = stream;

            // Setup recording for each armed track
            for (const track of armedTracks) {
                track.recordedChunks = [];
                track.mediaRecorder = new MediaRecorder(stream);

                track.mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        track.recordedChunks.push(e.data);
                    }
                };

                track.mediaRecorder.onstop = async () => {
                    const blob = new Blob(track.recordedChunks, { type: 'audio/webm' });
                    track.audioBlob = blob;

                    // Convert blob to AudioBuffer
                    const arrayBuffer = await blob.arrayBuffer();
                    track.audioBuffer = await this.audioEngine.decodeAudioData(arrayBuffer);

                    // Update UI
                    this.drawWaveform(track);
                    console.log('Recording completed for track', track.id);
                };

                track.mediaRecorder.start();
                console.log('Recording started for track', track.id);
            }

            // Update UI
            document.getElementById('recordBtn')?.classList.add('recording');
            document.getElementById('recordingIndicator')?.classList.remove('hidden');

        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('No se pudo acceder al micrófono. Por favor, concede permisos.');
        }
    }

    stopRecording() {
        if (!this.isRecording) return;

        // Stop all armed tracks' recorders
        const armedTracks = this.tracks.filter(t => t.armed);
        armedTracks.forEach(track => {
            if (track.mediaRecorder && track.mediaRecorder.state !== 'inactive') {
                track.mediaRecorder.stop();
            }
        });

        // Stop the recording stream
        if (this.recordingStream) {
            this.recordingStream.getTracks().forEach(t => t.stop());
            this.recordingStream = null;
        }

        this.isRecording = false;

        // Update UI
        document.getElementById('recordBtn')?.classList.remove('recording');
        document.getElementById('recordingIndicator')?.classList.add('hidden');

        console.log('Recording stopped');
    }

    // ========== PLAYBACK ==========

    play() {
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

        // Play all non-muted tracks
        const soloTracks = this.tracks.filter(t => t.solo);
        const tracksToPlay = soloTracks.length > 0 ? soloTracks : this.tracks.filter(t => !t.muted);

        tracksToPlay.forEach(track => {
            if (track.audioBuffer) {
                this.playTrack(track, startOffset);
            }
        });

        // Start metronome if enabled
        if (this.metronomeEnabled) {
            this.startMetronome();
        }

        // Update UI
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        if (playBtn) playBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = false;

        // Start playhead animation
        this.updatePlayhead();

        console.log('Playback started from:', startOffset);
    }

    playTrack(track, offset = 0) {
        const source = this.audioEngine.createBufferSource(track.audioBuffer);

        // Connect through signal chain
        source.connect(track.signalChain.input);
        track.signalChain.connect(this.audioEngine.getDestination());

        // Store reference
        track.source = source;

        // Start playback from offset
        const duration = track.audioBuffer.duration - offset;
        if (duration > 0) {
            source.start(0, offset, duration);
        }

        // Handle end of playback
        source.onended = () => {
            if (this.isPlaying) {
                // Check if all tracks have finished
                const stillPlaying = this.tracks.some(t => t.source && t.source.context.state === 'running');
                if (!stillPlaying) {
                    this.stop();
                }
            }
        };
    }

    pause() {
        if (!this.isPlaying || this.isPaused) return;

        this.isPlaying = false;
        this.isPaused = true;
        this.pauseTime = this.audioEngine.getCurrentTime() - this.startTime;

        // Stop all playing tracks
        this.tracks.forEach(track => {
            if (track.source) {
                track.source.stop();
                track.source = null;
            }
        });

        // Stop metronome
        this.stopMetronome();

        // Update UI
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        if (playBtn) playBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;

        // Stop playhead animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        console.log('Playback paused at:', this.pauseTime);
    }

    stop() {
        if (!this.isPlaying && !this.isPaused) return;

        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.pauseTime = 0;

        // Stop all playing tracks
        this.tracks.forEach(track => {
            if (track.source) {
                try {
                    track.source.stop();
                } catch (e) {
                    // Ignore if already stopped
                }
                track.source = null;
            }
        });

        // Stop metronome
        this.stopMetronome();

        // Update UI
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const currentTimeEl = document.getElementById('currentTime');
        const playhead = document.getElementById('playhead');
        const progressFill = document.getElementById('progressFill');

        if (playBtn) playBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;
        if (currentTimeEl) currentTimeEl.textContent = '00:00.0';
        if (playhead) playhead.style.left = '0px';
        if (progressFill) progressFill.style.width = '0%';

        // Stop playhead animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        console.log('Playback stopped');
    }

    updatePlayhead() {
        if (!this.isPlaying || this.isPaused) return;

        const elapsed = this.audioEngine.getCurrentTime() - this.startTime;
        this.currentTime = elapsed;

        // Update time display
        const currentTimeEl = document.getElementById('currentTime');
        if (currentTimeEl) {
            const minutes = Math.floor(elapsed / 60);
            const seconds = Math.floor(elapsed % 60);
            const tenths = Math.floor((elapsed % 1) * 10);
            currentTimeEl.textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
        }

        // Update playhead position
        const playhead = document.getElementById('playhead');
        if (playhead) {
            playhead.style.left = `${elapsed * this.pixelsPerSecond}px`;
        }

        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const maxDuration = Math.max(...this.tracks.map(t => t.audioBuffer?.duration || 0), 60);
            const percentage = (elapsed / maxDuration) * 100;
            progressFill.style.width = `${Math.min(percentage, 100)}%`;
        }

        // Continue animation
        this.animationId = requestAnimationFrame(() => this.updatePlayhead());
    }

    // ========== TRACK MANAGEMENT ==========

    addEmptyTrack() {
        const trackId = this.nextTrackId++;
        const track = {
            id: trackId,
            name: `Track ${trackId}`,
            audioBuffer: null,
            audioBlob: null,
            source: null,
            signalChain: new SignalChain(this.audioEngine.audioContext, this.audioEngine.irLoader),
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
            recordedChunks: []
        };

        // Create analyser for VU meter
        track.analyserNode = this.audioEngine.createAnalyser(256);

        // Set default volume and pan
        track.signalChain.setVolume(track.volume / 100);
        track.signalChain.setPan(track.pan / 100);

        // Apply default preset
        track.signalChain.presetCleanGuitar();

        this.tracks.push(track);
        this.addTrackToUI(track);
        this.initializeTimeline();

        console.log('Empty track added:', trackId);
    }

    addTrackToUI(track) {
        // Add to track list (left panel)
        const trackItem = document.createElement('div');
        trackItem.className = 'track-item';
        trackItem.dataset.trackId = track.id;
        trackItem.innerHTML = `
      <div class="vu-meter">
        <div class="vu-level"></div>
      </div>
      <div class="track-content" style="flex: 1;">
      <div class="track-header">
        <span class="track-name">${track.name}</span>
        <div class="track-header-actions">
            <button class="btn mixer-toggle-btn" onclick="daw.toggleMixer(${track.id})" title="Abrir Mezclador">🎚️</button>
            <button class="track-delete" onclick="daw.deleteTrack(${track.id})">✕</button>
        </div>
      </div>
      <div class="track-controls">
        <button class="btn arm-btn" onclick="daw.toggleTrackArm(${track.id})" title="Armar para grabar">⏺️</button>
        <button class="btn monitor-btn" onclick="daw.toggleTrackMonitoring(${track.id})" title="Monitoreo en tiempo real">🎧</button>
        <button class="btn mute-btn" onclick="daw.toggleMute(${track.id})">Mute</button>
        <button class="btn solo-btn" onclick="daw.toggleSolo(${track.id})">Solo</button>
        <button class="btn import-btn" onclick="daw.importAudioToTrack(${track.id})" title="Importar Audio">📂</button>
      </div>
      
      <!-- Embedded Mixer Controls (Hidden by default) -->
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
        
        <h4>Presets</h4>
        <button class="btn" onclick="daw.applyPreset(${track.id}, 'clean')">Clean</button>
        <button class="btn" onclick="daw.applyPreset(${track.id}, 'rock')">Rock</button>
        <button class="btn" onclick="daw.applyPreset(${track.id}, 'metal')">Metal</button>
        <button class="btn" onclick="daw.applyPreset(${track.id}, 'lead')">Lead</button>
      </div>
      </div>`;

        document.getElementById('trackListContainer')?.appendChild(trackItem);

        // Add to timeline (center panel)
        const trackRow = document.createElement('div');
        trackRow.className = 'track-row';
        trackRow.dataset.trackId = track.id;
        trackRow.innerHTML = `<canvas class="waveform-canvas" id="waveform-${track.id}"></canvas>`;
        document.getElementById('tracksContainer')?.appendChild(trackRow);
    }

    deleteTrack(trackId) {
        const index = this.tracks.findIndex(t => t.id === trackId);
        if (index === -1) return;

        const track = this.tracks[index];

        // Stop track if playing
        if (track.source) {
            track.source.stop();
        }

        // Cleanup signal chain
        if (track.signalChain) {
            track.signalChain.destroy();
        }

        // Remove from array
        this.tracks.splice(index, 1);

        // Remove from UI
        document.querySelector(`.track-item[data-track-id="${trackId}"]`)?.remove();
        document.querySelector(`.track-row[data-track-id="${trackId}"]`)?.remove();

        console.log('Track deleted:', trackId);
    }

    toggleMixer(trackId) {
        const mixerDiv = document.getElementById(`mixer-${trackId}`);
        const trackItem = document.querySelector(`.track-item[data-track-id="${trackId}"]`);
        const trackRow = document.querySelector(`.track-row[data-track-id="${trackId}"]`);

        if (!mixerDiv) return;

        if (mixerDiv.style.display === 'none') {
            mixerDiv.style.display = 'block';
            trackItem?.classList.add('expanded');
            setTimeout(() => {
                if (trackRow) trackRow.style.height = `${trackItem.offsetHeight}px`;
                const track = this.tracks.find(t => t.id === trackId);
                if (track) this.drawWaveform(track);
            }, 0);
        } else {
            mixerDiv.style.display = 'none';
            trackItem?.classList.remove('expanded');
            setTimeout(() => {
                if (trackRow) trackRow.style.height = `${trackItem.offsetHeight}px`;
                const track = this.tracks.find(t => t.id === trackId);
                if (track) this.drawWaveform(track);
            }, 0);
        }
    }

    toggleMute(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.muted = !track.muted;

        const btn = document.querySelector(`.track-item[data-track-id="${trackId}"] .mute-btn`);
        btn?.classList.toggle('active');

        // Update signal chain volume
        if (track.signalChain) {
            track.signalChain.setVolume(track.muted ? 0 : track.volume / 100);
        }
    }

    toggleSolo(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.solo = !track.solo;

        const btn = document.querySelector(`.track-item[data-track-id="${trackId}"] .solo-btn`);
        btn?.classList.toggle('active');

        // If playing, restart playback
        if (this.isPlaying) {
            const currentTime = this.audioEngine.getCurrentTime() - this.startTime;
            this.stop();
            this.pauseTime = currentTime;
            this.isPaused = true;
            this.play();
        }
    }

    toggleTrackArm(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.armed = !track.armed;

        const btn = document.querySelector(`.track-item[data-track-id="${trackId}"] .arm-btn`);
        if (track.armed) {
            btn?.classList.add('active');
        } else {
            btn?.classList.remove('active');
        }

        console.log(`Track ${trackId} ${track.armed ? 'armed' : 'disarmed'} for recording`);
    }

    async toggleTrackMonitoring(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.monitoring = !track.monitoring;

        const btn = document.querySelector(`.track-item[data-track-id="${trackId}"] .monitor-btn`);

        if (track.monitoring) {
            btn?.classList.add('active');

            try {
                // Get microphone stream
                let stream = this.recordingStream;
                if (!stream) {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            deviceId: track.inputDevice !== 'default' ? { exact: track.inputDevice } : undefined,
                            echoCancellation: false,
                            autoGainControl: false,
                            noiseSuppression: false,
                            latency: 0
                        }
                    });
                }

                // Create source node
                if (!track.monitorNode) {
                    track.monitorNode = this.audioEngine.createMediaStreamSource(stream);
                }

                // Connect to analyser
                if (track.analyserNode) {
                    track.monitorNode.connect(track.analyserNode);
                }

                // Connect to signal chain for monitoring
                track.monitorNode.connect(track.signalChain.input);
                track.signalChain.connect(this.audioEngine.getDestination());

                console.log(`Monitoring enabled for track ${trackId}`);

            } catch (error) {
                console.error('Error enabling monitoring:', error);
                alert('Error al activar el monitoreo. Verifica los permisos del micrófono.');
                track.monitoring = false;
                btn?.classList.remove('active');
            }
        } else {
            btn?.classList.remove('active');

            // Disconnect monitoring
            if (track.monitorNode) {
                track.monitorNode.disconnect();
                track.monitorNode = null;
            }

            console.log(`Monitoring disabled for track ${trackId}`);
        }
    }

    setTrackVolume(trackId, value) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.volume = parseInt(value);

        // Update UI
        const span = document.querySelector(`#mixer-${trackId} .mixer-row:first-child span`);
        if (span) span.textContent = value + '%';

        // Update signal chain
        if (track.signalChain && !track.muted) {
            track.signalChain.setVolume(value / 100);
        }
    }

    setTrackPan(trackId, value) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.pan = parseInt(value);

        // Update UI
        const span = document.querySelector(`#mixer-${trackId} .mixer-row:nth-child(2) span`);
        if (span) span.textContent = value;

        // Update signal chain
        if (track.signalChain) {
            track.signalChain.setPan(value / 100);
        }
    }

    applyPreset(trackId, presetName) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track || !track.signalChain) return;

        switch (presetName) {
            case 'clean':
                track.signalChain.presetCleanGuitar();
                break;
            case 'rock':
                track.signalChain.presetRockGuitar();
                break;
            case 'metal':
                track.signalChain.presetMetalGuitar();
                break;
            case 'lead':
                track.signalChain.presetLeadGuitar();
                break;
        }

        console.log(`Applied ${presetName} preset to track ${trackId}`);
    }

    importAudioToTrack(trackId) {
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

                track.audioBuffer = audioBuffer;
                track.audioBlob = file;
                track.name = file.name.replace(/\.[^/.]+$/, '');

                const nameEl = document.querySelector(`.track-item[data-track-id="${trackId}"] .track-name`);
                if (nameEl) nameEl.textContent = track.name;

                this.drawWaveform(track);
                this.initializeTimeline();

                console.log(`Audio imported to track ${trackId}:`, file.name);

            } catch (error) {
                console.error('Error loading audio file:', error);
                alert('Error al cargar el archivo de audio.');
            }
        };

        input.click();
    }

    clearAllTracks() {
        if (!confirm('¿Estás seguro de que quieres eliminar todas las pistas?')) return;

        this.stop();

        // Cleanup all tracks
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

        // Clear UI
        const trackListContainer = document.getElementById('trackListContainer');
        const tracksContainer = document.getElementById('tracksContainer');
        if (trackListContainer) trackListContainer.innerHTML = '';
        if (tracksContainer) tracksContainer.innerHTML = '';

        console.log('All tracks cleared');
    }

    drawWaveform(track) {
        const canvas = document.getElementById(`waveform-${track.id}`);
        if (!canvas || !track.audioBuffer) return;

        const ctx = canvas.getContext('2d');

        // Set canvas width based on audio duration
        const duration = track.audioBuffer.duration;
        const width = canvas.width = duration * this.pixelsPerSecond;
        const height = canvas.height = canvas.offsetHeight;

        const data = track.audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);

        // Get theme color
        const themeColor = this.getThemeColor();
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let i = 0; i < width; i++) {
            const min = Math.min(...data.slice(i * step, (i + 1) * step));
            const max = Math.max(...data.slice(i * step, (i + 1) * step));
            ctx.moveTo(i, (1 + min) * amp);
            ctx.lineTo(i, (1 + max) * amp);
        }
        ctx.stroke();
    }

    getThemeColor() {
        const body = document.body;
        if (body.classList.contains('JamVault')) return '#FF8906';
        if (body.classList.contains('natural')) return '#8FB996';
        if (body.classList.contains('galactic')) return '#00B4D8';
        if (body.classList.contains('retro')) return '#FFD460';
        if (body.classList.contains('vintage')) return '#A6C48A';
        if (body.classList.contains('redblack')) return '#C74B50';
        return '#FF8906';
    }

    // ========== VU METERS ==========

    updateMeters() {
        this.meterInterval = requestAnimationFrame(() => this.updateMeters());

        this.tracks.forEach(track => {
            if (!track.analyserNode) return;

            const bufferLength = track.analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            track.analyserNode.getByteFrequencyData(dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const volume = Math.min(100, (average / 50) * 100);

            // Update UI
            const meterEl = document.querySelector(`.track-item[data-track-id="${track.id}"] .vu-level`);
            if (meterEl) {
                meterEl.style.height = `${volume}%`;

                // Color change based on level
                if (volume > 90) {
                    meterEl.style.backgroundColor = '#e74c3c'; // Red
                } else if (volume > 70) {
                    meterEl.style.backgroundColor = '#f1c40f'; // Yellow
                } else {
                    meterEl.style.backgroundColor = '#2ecc71'; // Green
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
        if (this.tracks.length === 0) {
            alert('No hay pistas para exportar.');
            return;
        }

        try {
            // Create offline context for rendering
            const maxDuration = Math.max(...this.tracks.map(t => t.audioBuffer?.duration || 0));
            const offlineContext = this.audioEngine.createOfflineContext(maxDuration, 2);

            // Create master gain
            const masterGain = offlineContext.createGain();
            masterGain.gain.value = this.audioEngine.getMasterVolume();
            masterGain.connect(offlineContext.destination);

            // Add all non-muted tracks
            const soloTracks = this.tracks.filter(t => t.solo);
            const tracksToExport = soloTracks.length > 0 ? soloTracks : this.tracks.filter(t => !t.muted);

            tracksToExport.forEach(track => {
                if (track.audioBuffer) {
                    const source = offlineContext.createBufferSource();
                    source.buffer = track.audioBuffer;

                    const gainNode = offlineContext.createGain();
                    gainNode.gain.value = track.volume / 100;

                    const panNode = offlineContext.createStereoPanner();
                    panNode.pan.value = track.pan / 100;

                    source.connect(gainNode);
                    gainNode.connect(panNode);
                    panNode.connect(masterGain);

                    source.start(0);
                }
            });

            // Render
            const renderedBuffer = await offlineContext.startRendering();

            // Convert to WAV
            const wav = this.audioBufferToWav(renderedBuffer);
            const blob = new Blob([wav], { type: 'audio/wav' });

            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `JamVault-Export-${Date.now()}.wav`;
            a.click();
            URL.revokeObjectURL(url);

            console.log('Mix exported successfully');
            alert('Mix exportado correctamente!');

        } catch (error) {
            console.error('Error exporting mix:', error);
            alert('Error al exportar el mix.');
        }
    }

    audioBufferToWav(buffer) {
        const length = buffer.length * buffer.numberOfChannels * 2 + 44;
        const arrayBuffer = new ArrayBuffer(length);
        const view = new DataView(arrayBuffer);
        const channels = [];
        let offset = 0;
        let pos = 0;

        // Write WAV header
        const setUint16 = (data) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };
        const setUint32 = (data) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        // "RIFF" chunk descriptor
        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"

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

        // Write interleaved data
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
}

// Initialize on page load
let daw;
window.addEventListener('DOMContentLoaded', async () => {
    daw = new JamStudioPro();

    // Make daw globally available for HTML onclick handlers
    window.daw = daw;

    // Resume audio context on first user interaction
    document.body.addEventListener('click', async () => {
        if (daw.audioEngine) {
            await daw.audioEngine.resume();
        }
    }, { once: true });
});

export { JamStudioPro };
