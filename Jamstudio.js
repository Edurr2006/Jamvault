// ========== JAMSTUDIO DAW - Web Audio API Implementation ==========

class JamStudioDAW {
    constructor() {
        this.audioContext = null;
        this.tracks = [];
        this.isPlaying = false;
        this.isPaused = false;
        this.isRecording = false;
        this.currentTime = 0;
        this.startTime = 0;
        this.pauseTime = 0;
        this.seekTime = 0;
        this.animationId = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.masterGain = null;
        this.metronomeEnabled = false;
        this.bpm = 120;
        this.nextTrackId = 1;
        this.metronomeInterval = null;
        this.metronomeGain = null;
        this.pixelsPerSecond = 50; // Zoom level: pixels per second of audio
        this.minZoom = 10; // Minimum zoom (10px/sec)
        this.maxZoom = 200; // Maximum zoom (200px/sec)
        this.isDraggingTimeline = false; // Track timeline dragging state

        this.init();
    }

    async init() {
        // Initialize Audio Context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.value = 0.8;

        // Setup metronome gain
        this.metronomeGain = this.audioContext.createGain();
        this.metronomeGain.connect(this.audioContext.destination);
        this.metronomeGain.gain.value = 0.3;

        // Setup UI event listeners
        this.setupEventListeners();

        // Initialize timeline
        this.initializeTimeline();

        console.log('JamStudio DAW initialized');
    }

    setupEventListeners() {
        // Transport controls
        document.getElementById('recordBtn').addEventListener('click', () => this.startRecording());
        document.getElementById('playBtn').addEventListener('click', () => this.play());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());

        // Track management
        document.getElementById('addTrackBtn').addEventListener('click', () => this.addEmptyTrack());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllTracks());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportMix());

        // Master controls
        document.getElementById('masterVolume').addEventListener('input', (e) => {
            const value = e.target.value / 100;
            this.masterGain.gain.value = value;
            document.getElementById('masterVolumeValue').textContent = e.target.value + '%';
        });

        // Metronome
        document.getElementById('metronomeToggle').addEventListener('change', (e) => {
            this.metronomeEnabled = e.target.checked;
            if (this.metronomeEnabled && this.isPlaying) {
                this.startMetronome();
            } else {
                this.stopMetronome();
            }
        });

        // BPM Input
        const bpmInput = document.getElementById('bpmInput');
        bpmInput.addEventListener('input', (e) => {
            let value = parseInt(e.target.value);
            if (value < 40) value = 40;
            if (value > 240) value = 240;
            this.bpm = value;
            e.target.value = value;

            // Restart metronome if playing
            if (this.metronomeEnabled && this.isPlaying) {
                this.stopMetronome();
                this.startMetronome();
            }
        });

        // Progress bar - draggable
        const progressBar = document.getElementById('progressBar');
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
            if (isDraggingProgress) {
                updateProgressPosition(e);
            }
        });

        window.addEventListener('mouseup', () => {
            isDraggingProgress = false;
        });

        // Zoom with mouse wheel on timeline
        const timelineSection = document.querySelector('.timeline-section');
        timelineSection.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const zoomDelta = e.deltaY > 0 ? -5 : 5; // Zoom out or in
                this.setZoom(this.pixelsPerSecond + zoomDelta);
            }
        }, { passive: false });

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
        ruler.innerHTML = '';

        // Calculate maximum duration from all tracks (minimum 60 seconds)
        const maxDuration = Math.max(...this.tracks.map(t => t.audioBuffer?.duration || 0), 60);

        // Determine marker interval based on zoom level
        let markerInterval;
        if (this.pixelsPerSecond >= 100) {
            markerInterval = 1; // Every 1 second when zoomed in
        } else if (this.pixelsPerSecond >= 50) {
            markerInterval = 2; // Every 2 seconds at medium zoom
        } else if (this.pixelsPerSecond >= 25) {
            markerInterval = 5; // Every 5 seconds
        } else {
            markerInterval = 10; // Every 10 seconds when zoomed out
        }

        // Create time markers
        const totalMarkers = Math.ceil(maxDuration / markerInterval);
        for (let i = 0; i <= totalMarkers; i++) {
            const time = i * markerInterval;
            if (time > maxDuration) break;

            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = `${time * this.pixelsPerSecond}px`;

            // Format time display
            const minutes = Math.floor(time / 60);
            const seconds = time % 60;
            if (minutes > 0) {
                marker.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
            } else {
                marker.textContent = `${time}s`;
            }

            ruler.appendChild(marker);
        }

        // Set ruler width to accommodate all content
        ruler.style.width = `${maxDuration * this.pixelsPerSecond}px`;

        // Setup draggable playhead logic
        this.setupTimelineDragging(maxDuration);
    }

    setupTimelineDragging(maxDuration) {
        const timelineSection = document.querySelector('.timeline-section');

        // Remove old event listeners if they exist
        if (this.timelineMouseDown) {
            timelineSection.removeEventListener('mousedown', this.timelineMouseDown);
        }
        if (this.timelineMouseMove) {
            document.removeEventListener('mousemove', this.timelineMouseMove);
        }
        if (this.timelineMouseUp) {
            document.removeEventListener('mouseup', this.timelineMouseUp);
        }

        // Create bound event handlers
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

        // Add event listeners
        timelineSection.addEventListener('mousedown', this.timelineMouseDown);
        document.addEventListener('mousemove', this.timelineMouseMove);
        document.addEventListener('mouseup', this.timelineMouseUp);
    }

    updatePlayheadPosition(e, maxDuration) {
        const timelineSection = document.querySelector('.timeline-section');
        const rect = timelineSection.getBoundingClientRect();

        // Calculate exact position including scroll
        const clickX = e.clientX - rect.left + timelineSection.scrollLeft;
        const clickTime = Math.max(0, clickX / this.pixelsPerSecond);

        // Update playhead state
        this.pauseTime = clickTime;
        this.isPaused = true;
        this.currentTime = clickTime;

        // Position playhead exactly at click position
        const playhead = document.getElementById('playhead');
        playhead.style.left = `${clickX}px`;

        // Update progress bar
        const percentage = (clickTime / maxDuration) * 100;
        document.getElementById('progressFill').style.width = `${Math.min(percentage, 100)}%`;

        // Update time display
        const minutes = Math.floor(clickTime / 60);
        const seconds = Math.floor(clickTime % 60);
        const tenths = Math.floor((clickTime % 1) * 10);
        document.getElementById('currentTime').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;

        // Auto-scroll when dragging near edges
        const edgeThreshold = 50;
        const scrollSpeed = 15;

        if (e.clientX - rect.left < edgeThreshold && timelineSection.scrollLeft > 0) {
            timelineSection.scrollLeft -= scrollSpeed;
        } else if (rect.right - e.clientX < edgeThreshold) {
            timelineSection.scrollLeft += scrollSpeed;
        }
    }

    setZoom(newPixelsPerSecond) {
        // Clamp zoom level
        newPixelsPerSecond = Math.max(this.minZoom, Math.min(this.maxZoom, newPixelsPerSecond));

        if (newPixelsPerSecond === this.pixelsPerSecond) return;

        // Store current scroll position as a time value
        const timelineSection = document.querySelector('.timeline-section');
        const currentScrollTime = timelineSection.scrollLeft / this.pixelsPerSecond;

        // Update zoom level
        this.pixelsPerSecond = newPixelsPerSecond;

        // Redraw timeline ruler
        this.initializeTimeline();

        // Redraw all waveforms
        this.tracks.forEach(track => {
            if (track.audioBuffer) {
                this.drawWaveform(track);
            }
        });

        // Update playhead position
        if (this.isPaused || !this.isPlaying) {
            document.getElementById('playhead').style.left = `${this.pauseTime * this.pixelsPerSecond}px`;
        } else {
            const elapsed = this.audioContext.currentTime - this.startTime;
            document.getElementById('playhead').style.left = `${elapsed * this.pixelsPerSecond}px`;
        }

        // Restore scroll position (maintain the same time in view)
        timelineSection.scrollLeft = currentScrollTime * this.pixelsPerSecond;

        console.log('Zoom set to:', this.pixelsPerSecond, 'px/sec');
    }

    seekTo(time) {
        // Clamp time to valid range
        const maxDuration = Math.max(...this.tracks.map(t => t.audioBuffer?.duration || 0), 60);
        time = Math.max(0, Math.min(time, maxDuration));

        this.seekTime = time;

        // If playing, restart from new position
        if (this.isPlaying && !this.isPaused) {
            this.stop();
            this.pauseTime = time;
            this.isPaused = true;
            this.play();
        } else {
            // Just update the playhead position and mark as paused at this position
            this.pauseTime = time;
            this.isPaused = true; // Mark as paused so play() will resume from this position
            this.currentTime = time;
            document.getElementById('playhead').style.left = `${time * this.pixelsPerSecond}px`;

            // Update progress bar
            const percentage = (time / maxDuration) * 100;
            document.getElementById('progressFill').style.width = `${Math.min(percentage, 100)}%`;

            // Update time display
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            const tenths = Math.floor((time % 1) * 10);
            document.getElementById('currentTime').textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
        }

        // Auto-scroll timeline to the seeked position
        const timelineSection = document.querySelector('.timeline-section');
        const playheadPosition = time * this.pixelsPerSecond;
        const viewportWidth = timelineSection.clientWidth;

        // Center the playhead in the viewport
        const targetScroll = playheadPosition - (viewportWidth / 2);
        timelineSection.scrollLeft = Math.max(0, targetScroll);

        console.log('Seeked to:', time, '- isPaused:', this.isPaused);
    }

    async startRecording() {
        // Check if any tracks are armed
        const armedTracks = this.tracks.filter(t => t.armed);

        if (armedTracks.length === 0) {
            alert('No hay pistas armadas para grabar. Por favor, arma al menos una pista primero.');
            return;
        }

        // Check if any armed tracks have existing audio
        const tracksWithAudio = armedTracks.filter(t => t.audioBuffer !== null);
        if (tracksWithAudio.length > 0) {
            const trackNames = tracksWithAudio.map(t => t.name).join(', ');
            const confirmed = confirm(
                `Las siguientes pistas tienen audio que será sobrescrito:\n${trackNames}\n\n¿Deseas continuar?`
            );
            if (!confirmed) {
                return;
            }
        }

        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            this.isRecording = true;

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
                    track.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

                    // Update UI
                    this.drawWaveform(track);

                    console.log('Recording completed for track', track.id);
                };

                track.mediaRecorder.start();
                console.log('Recording started for track', track.id);
            }

            // Stop all tracks on the stream when recording stops
            this.recordingStream = stream;

            // Update UI
            document.getElementById('recordBtn').classList.add('recording');
            document.getElementById('recordingIndicator').classList.remove('hidden');

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
        document.getElementById('recordBtn').classList.remove('recording');
        document.getElementById('recordingIndicator').classList.add('hidden');

        console.log('Recording stopped');
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

        <div class="mixer-row">
            <label>In</label>
            <select onchange="daw.setTrackInput(${track.id}, this.value)">
                <option value="default" ${track.inputDevice === 'default' ? 'selected' : ''}>Default Input</option>
            </select>
        </div>
        <div class="mixer-row">
            <label>Out</label>
            <select onchange="daw.setTrackOutput(${track.id}, this.value)">
                <option value="master" ${track.outputDevice === 'master' ? 'selected' : ''}>Master</option>
            </select>
        </div>

        <!-- Effects Section -->
        <div class="effects-section">
            <h4>Efectos</h4>
            
            <!-- Distortion -->
            <div class="effect-control">
                <label>Distortion</label>
                <input type="checkbox" ${track.effects.distortion.enabled ? 'checked' : ''}
                       onchange="daw.toggleTrackEffect(${track.id}, 'distortion', this.checked)">
                <input type="range" min="0" max="1" step="0.01" value="${track.effects.distortion.drive}"
                       title="Drive"
                       oninput="daw.setTrackEffectParam(${track.id}, 'distortion', 'drive', this.value)">
            </div>

            <!-- Reverb -->
            <div class="effect-control">
                <label>Reverb</label>
                <input type="checkbox" ${track.effects.reverb.enabled ? 'checked' : ''}
                       onchange="daw.toggleTrackEffect(${track.id}, 'reverb', this.checked)">
                <input type="range" min="0.1" max="10" step="0.1" value="${track.effects.reverb.decay}"
                       title="Decay"
                       oninput="daw.setTrackEffectParam(${track.id}, 'reverb', 'decay', this.value)">
            </div>

            <!-- Delay -->
            <div class="effect-control">
                <label>Delay</label>
                <input type="checkbox" ${track.effects.delay.enabled ? 'checked' : ''}
                       onchange="daw.toggleTrackEffect(${track.id}, 'delay', this.checked)">
                <input type="range" min="0" max="1" step="0.01" value="${track.effects.delay.feedback}"
                       title="Feedback"
                       oninput="daw.setTrackEffectParam(${track.id}, 'delay', 'feedback', this.value)">
            </div>

            <!-- Chorus -->
            <div class="effect-control">
                <label>Chorus</label>
                <input type="checkbox" ${track.effects.chorus.enabled ? 'checked' : ''}
                       onchange="daw.toggleTrackEffect(${track.id}, 'chorus', this.checked)">
                <input type="range" min="0" max="1" step="0.01" value="${track.effects.chorus.depth}"
                       title="Depth"
                       oninput="daw.setTrackEffectParam(${track.id}, 'chorus', 'depth', this.value)">
            </div>
        </div>
      </div>
      </div>`; // Close track-content and track-item
        document.getElementById('trackListContainer').appendChild(trackItem);

        // Add to timeline (center panel)
        const trackRow = document.createElement('div');
        trackRow.className = 'track-row';
        trackRow.dataset.trackId = track.id;
        trackRow.innerHTML = `<canvas class="waveform-canvas" id="waveform-${track.id}"></canvas>`;
        document.getElementById('tracksContainer').appendChild(trackRow);

        // Refresh timeline to accommodate new track duration
        this.initializeTimeline();
    }

    toggleMixer(trackId) {
        const mixerDiv = document.getElementById(`mixer-${trackId}`);
        const trackItem = document.querySelector(`.track-item[data-track-id="${trackId}"]`);
        const trackRow = document.querySelector(`.track-row[data-track-id="${trackId}"]`);

        if (mixerDiv.style.display === 'none') {
            mixerDiv.style.display = 'block';
            trackItem.classList.add('expanded');
            // Sync height
            setTimeout(() => {
                trackRow.style.height = `${trackItem.offsetHeight}px`;
                this.drawWaveform(this.tracks.find(t => t.id === trackId)); // Redraw waveform to fit new height
            }, 0);
        } else {
            mixerDiv.style.display = 'none';
            trackItem.classList.remove('expanded');
            // Sync height
            setTimeout(() => {
                trackRow.style.height = `${trackItem.offsetHeight}px`;
                this.drawWaveform(this.tracks.find(t => t.id === trackId));
            }, 0);
        }
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

    play() {
        // If already playing and not paused, do nothing
        if (this.isPlaying && !this.isPaused) return;

        console.log('Play called - isPaused:', this.isPaused, 'pauseTime:', this.pauseTime);

        const startOffset = this.isPaused ? this.pauseTime : 0;

        if (this.isPaused) {
            // Resume from pause
            this.startTime = this.audioContext.currentTime - this.pauseTime;
            this.isPaused = false;
            console.log('Resuming from pause at:', this.pauseTime);
        } else {
            // Start from beginning or seek position
            this.startTime = this.audioContext.currentTime - startOffset;
            this.currentTime = startOffset;
            console.log('Starting from beginning');
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
        document.getElementById('playBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;

        // Start playhead animation
        this.updatePlayhead();

        console.log('Playback started from:', startOffset);
    }

    playTrack(track, offset = 0) {
        const source = this.audioContext.createBufferSource();
        source.buffer = track.audioBuffer;

        // Create gain node for volume
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = track.volume / 100;

        // Create pan node
        const panNode = this.audioContext.createStereoPanner();
        panNode.pan.value = track.pan / 100;

        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(this.masterGain);

        // Store references
        track.source = source;
        track.gainNode = gainNode;
        track.panNode = panNode;

        // Start playback from offset
        const duration = track.audioBuffer.duration - offset;
        if (duration > 0) {
            source.start(0, offset, duration);
        }

        // Handle end of playback
        source.onended = () => {
            if (this.isPlaying) {
                this.stop();
            }
        };
    }

    pause() {
        if (!this.isPlaying || this.isPaused) return;

        this.isPlaying = false;
        this.isPaused = true;
        this.pauseTime = this.audioContext.currentTime - this.startTime;

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
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;

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
                track.source.stop();
                track.source = null;
            }
        });

        // Stop metronome
        this.stopMetronome();

        // Update UI
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('currentTime').textContent = '00:00.0';

        // Reset playhead and progress bar
        document.getElementById('playhead').style.left = '0px';
        document.getElementById('progressFill').style.width = '0%';

        // Stop playhead animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        console.log('Playback stopped');
    }

    updatePlayhead() {
        if (!this.isPlaying || this.isPaused) return;

        const elapsed = this.audioContext.currentTime - this.startTime;
        this.currentTime = elapsed;

        // Update time display
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        const tenths = Math.floor((elapsed % 1) * 10);
        document.getElementById('currentTime').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;

        // Update playhead position
        const playhead = document.getElementById('playhead');
        playhead.style.left = `${elapsed * this.pixelsPerSecond}px`;

        // Update progress bar
        const maxDuration = Math.max(...this.tracks.map(t => t.audioBuffer?.duration || 0), 60);
        const percentage = (elapsed / maxDuration) * 100;
        document.getElementById('progressFill').style.width = `${Math.min(percentage, 100)}%`;

        // Continue animation
        this.animationId = requestAnimationFrame(() => this.updatePlayhead());
    }

    toggleMute(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.muted = !track.muted;

        // Update UI
        const btn = document.querySelector(`.track-item[data-track-id="${trackId}"] .mute-btn`);
        btn.classList.toggle('active');

        // Update gain if playing
        if (track.gainNode) {
            track.gainNode.gain.value = track.muted ? 0 : track.volume / 100;
        }
    }

    toggleSolo(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.solo = !track.solo;

        // Update UI
        const btn = document.querySelector(`.track-item[data-track-id="${trackId}"] .solo-btn`);
        btn.classList.toggle('active');

        // If playing, restart playback with new solo state
        if (this.isPlaying) {
            const currentTime = this.audioContext.currentTime - this.startTime;
            this.stop();
            this.pauseTime = currentTime;
            this.isPaused = true;
            this.play();
        }
    }

    setTrackVolume(trackId, value) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.volume = parseInt(value);

        // Update all volume displays for this track
        document.querySelectorAll(`[data-track-id="${trackId}"] .track-volume span:last-child, 
                               [data-track-id="${trackId}"] .mixer-value`).forEach(el => {
            el.textContent = value + '%';
        });

        // Update gain if playing
        if (track.gainNode && !track.muted) {
            track.gainNode.gain.value = value / 100;
        }
    }

    setTrackPan(trackId, value) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.pan = parseInt(value);

        // Update pan if playing
        if (track.panNode) {
            track.panNode.pan.value = value / 100;
        }
    }

    setTrackInput(trackId, deviceId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;
        track.inputDevice = deviceId;
        console.log(`Track ${trackId} input set to ${deviceId}`);
    }

    setTrackOutput(trackId, deviceId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;
        track.outputDevice = deviceId;
        console.log(`Track ${trackId} output set to ${deviceId}`);
    }

    toggleTrackArm(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.armed = !track.armed;

        // Update UI
        const btn = document.querySelector(`.track-item[data-track-id="${trackId}"] .arm-btn`);
        if (track.armed) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }

        console.log(`Track ${trackId} ${track.armed ? 'armed' : 'disarmed'} for recording`);
    }

    initializeTrackEffects(track) {
        // Create Tone.js effects
        track.effectsChain.distortionNode = new Tone.Distortion(0.4).toDestination();
        track.effectsChain.reverbNode = new Tone.Reverb(1.5).toDestination();
        track.effectsChain.delayNode = new Tone.FeedbackDelay("8n", 0.5).toDestination();
        track.effectsChain.chorusNode = new Tone.Chorus(4, 2.5, 0.5).toDestination();

        // Disconnect initially (we'll route manually)
        track.effectsChain.distortionNode.disconnect();
        track.effectsChain.reverbNode.disconnect();
        track.effectsChain.delayNode.disconnect();
        track.effectsChain.chorusNode.disconnect();
    }

    toggleTrackEffect(trackId, effectName, enabled) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.effects[effectName].enabled = enabled;
        this.connectTrackEffects(track);

        console.log(`Effect ${effectName} ${enabled ? 'enabled' : 'disabled'} for track ${trackId}`);
    }

    setTrackEffectParam(trackId, effectName, param, value) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        // Update state
        track.effects[effectName][param] = parseFloat(value);

        // Update Tone.js node
        const nodeName = `${effectName}Node`;
        const node = track.effectsChain[nodeName];

        if (node) {
            if (param === 'wet') {
                node.wet.value = parseFloat(value);
            } else if (param === 'drive') { // Distortion
                node.distortion = parseFloat(value);
            } else if (param === 'decay') { // Reverb
                node.decay = parseFloat(value);
            } else if (param === 'time') { // Delay
                node.delayTime.value = parseFloat(value);
            } else if (param === 'feedback') { // Delay
                node.feedback.value = parseFloat(value);
            } else if (param === 'depth') { // Chorus
                node.depth = parseFloat(value);
            } else if (param === 'frequency') { // Chorus
                node.frequency.value = parseFloat(value);
            }
        }
    }

    connectTrackEffects(track) {
        if (!track.source) return;

        // Disconnect everything first
        track.source.disconnect();

        // Disconnect all effects
        Object.values(track.effectsChain).forEach(node => {
            if (node) node.disconnect();
        });

        // Build chain: Source -> [Effects] -> Gain -> Pan -> Master
        let currentNode = track.source;

        // Distortion
        if (track.effects.distortion.enabled && track.effectsChain.distortionNode) {
            currentNode.connect(track.effectsChain.distortionNode);
            currentNode = track.effectsChain.distortionNode;
        }

        // Reverb
        if (track.effects.reverb.enabled && track.effectsChain.reverbNode) {
            currentNode.connect(track.effectsChain.reverbNode);
            currentNode = track.effectsChain.reverbNode;
        }

        // Delay
        if (track.effects.delay.enabled && track.effectsChain.delayNode) {
            currentNode.connect(track.effectsChain.delayNode);
            currentNode = track.effectsChain.delayNode;
        }

        // Chorus
        if (track.effects.chorus.enabled && track.effectsChain.chorusNode) {
            currentNode.connect(track.effectsChain.chorusNode);
            currentNode = track.effectsChain.chorusNode;
        }

        // Connect to track gain/pan
        if (track.gainNode) {
            currentNode.connect(track.gainNode);
            // Gain -> Pan -> Master is already set up in playTrack/addTrackToUI logic usually, 
            // but we need to ensure the chain continues.
            // In playTrack, we usually do source.connect(gainNode).
            // Here we inserted effects in between.
        }
    }

    deleteTrack(trackId) {
        const index = this.tracks.findIndex(t => t.id === trackId);
        if (index === -1) return;

        // Stop track if playing
        const track = this.tracks[index];
        if (track.source) {
            track.source.stop();
        }

        // Remove from array
        this.tracks.splice(index, 1);

        // Remove from UI
        document.querySelector(`.track-item[data-track-id="${trackId}"]`)?.remove();
        document.querySelector(`.track-row[data-track-id="${trackId}"]`)?.remove();
        document.querySelector(`.mixer-channel[data-track-id="${trackId}"]`)?.remove();

        console.log('Track deleted:', trackId);
    }

    addEmptyTrack() {
        const trackId = this.nextTrackId++;
        const track = {
            id: trackId,
            name: `Track ${trackId}`,
            audioBuffer: null,
            audioBlob: null,
            source: null,
            gainNode: null,
            panNode: null,
            volume: 80,
            pan: 0,
            muted: false,
            solo: false,
            startTime: 0,
            armed: false,
            monitoring: false, // NEW: Monitoring state
            monitorNode: null, // NEW: Source node for monitoring
            analyserNode: null, // NEW: Analyser for VU meter
            inputDevice: 'default',
            outputDevice: 'master',
            mediaRecorder: null,
            recordedChunks: [],
            effects: {
                distortion: { enabled: false, wet: 0, drive: 0.4 },
                reverb: { enabled: false, wet: 0, decay: 1.5 },
                delay: { enabled: false, wet: 0, time: 0.25, feedback: 0.5 },
                chorus: { enabled: false, wet: 0, depth: 0.5, frequency: 2.5 }
            },
            effectsChain: {
                distortionNode: null,
                reverbNode: null,
                delayNode: null,
                chorusNode: null
            }
        };

        // Create AnalyserNode
        track.analyserNode = this.audioContext.createAnalyser();
        track.analyserNode.fftSize = 256;

        this.tracks.push(track);
        this.initializeTrackEffects(track);
        this.addTrackToUI(track);
        this.drawWaveform(track);

        // Start meter update loop if not already running
        if (!this.meterInterval) {
            this.updateMeters();
        }

        console.log('Empty track added:', trackId);
    }

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

            // Map to 0-100%
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

    async toggleTrackMonitoring(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.monitoring = !track.monitoring;

        // Update UI
        const btn = document.querySelector(`.track-item[data-track-id="${trackId}"] .monitor-btn`);
        if (track.monitoring) {
            btn.classList.add('active');

            try {
                // Get microphone stream if not already available
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

                // Create source node for monitoring
                if (!track.monitorNode) {
                    track.monitorNode = this.audioContext.createMediaStreamSource(stream);
                }

                // Connect to Analyser (for VU meter)
                if (track.analyserNode) {
                    track.monitorNode.connect(track.analyserNode);
                }

                // Connect to effects chain
                // We treat the monitor node as the source for the effects chain temporarily
                // Note: This might conflict if we are playing back recorded audio at the same time.
                // For a simple DAW, usually monitoring is for input.

                // Disconnect existing source if any (e.g. playback)
                if (track.source) {
                    track.source.disconnect();
                }

                // Connect monitor node to effects chain
                // We need to manually route it because connectTrackEffects expects track.source
                // Let's temporarily set track.source to monitorNode for the routing logic to work, 
                // or better, manually route here to avoid state confusion.

                // Actually, let's use a dedicated method or just manual routing here.
                // Re-using connectTrackEffects is risky if it relies on track.source being the buffer source.

                // Let's route: monitorNode -> effects -> gain -> pan -> master
                let currentNode = track.monitorNode;

                // Apply effects (same logic as connectTrackEffects but with monitorNode)
                if (track.effects.distortion.enabled && track.effectsChain.distortionNode) {
                    currentNode.connect(track.effectsChain.distortionNode);
                    currentNode = track.effectsChain.distortionNode;
                }
                if (track.effects.reverb.enabled && track.effectsChain.reverbNode) {
                    currentNode.connect(track.effectsChain.reverbNode);
                    currentNode = track.effectsChain.reverbNode;
                }
                if (track.effects.delay.enabled && track.effectsChain.delayNode) {
                    currentNode.connect(track.effectsChain.delayNode);
                    currentNode = track.effectsChain.delayNode;
                }
                if (track.effects.chorus.enabled && track.effectsChain.chorusNode) {
                    currentNode.connect(track.effectsChain.chorusNode);
                    currentNode = track.effectsChain.chorusNode;
                }

                // Connect to track gain
                if (track.gainNode) {
                    currentNode.connect(track.gainNode);
                }

                console.log(`Monitoring enabled for track ${trackId}`);

            } catch (error) {
                console.error('Error enabling monitoring:', error);
                alert('Error al activar el monitoreo. Verifica los permisos del micrófono.');
                track.monitoring = false;
                btn.classList.remove('active');
            }

        } else {
            btn.classList.remove('active');

            // Disconnect monitoring
            if (track.monitorNode) {
                track.monitorNode.disconnect();
                track.monitorNode = null;
            }

            // If we were recording, we might want to keep the stream open, 
            // but for now let's just disconnect the node.

            console.log(`Monitoring disabled for track ${trackId}`);
        }
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
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

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

        // Clear all tracks
        this.tracks.forEach(track => {
            if (track.source) {
                track.source.stop();
            }
        });

        this.tracks = [];
        this.nextTrackId = 1;

        // Clear UI
        document.getElementById('trackListContainer').innerHTML = '';
        document.getElementById('tracksContainer').innerHTML = '';
        // document.getElementById('mixerContainer').innerHTML = ''; // Mixer is now per-track

        console.log('All tracks cleared');
    }

    async exportMix() {
        if (this.tracks.length === 0) {
            alert('No hay pistas para exportar.');
            return;
        }

        try {
            // Create offline context for rendering
            const maxDuration = Math.max(...this.tracks.map(t => t.audioBuffer?.duration || 0));
            const offlineContext = new OfflineAudioContext(
                2, // stereo
                maxDuration * this.audioContext.sampleRate,
                this.audioContext.sampleRate
            );

            // Create master gain
            const masterGain = offlineContext.createGain();
            masterGain.gain.value = this.masterGain.gain.value;
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
            a.download = `jamstudio-mix-${Date.now()}.wav`;
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

    // Metronome methods
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
        const now = this.audioContext.currentTime;

        // Create oscillator for click sound
        const oscillator = this.audioContext.createOscillator();
        const clickGain = this.audioContext.createGain();

        oscillator.connect(clickGain);
        clickGain.connect(this.metronomeGain);

        // High-pitched click (like a woodblock)
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';

        // Quick attack and decay for percussive sound
        clickGain.gain.setValueAtTime(0.5, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + clickDuration);

        oscillator.start(now);
        oscillator.stop(now + clickDuration);
    }

    // Tone.js Effects Integration
    initEffects() {
        this.effects = {
            distortion: new Tone.Distortion(0.4).toDestination(),
            reverb: new Tone.Reverb(1.5).toDestination(),
            delay: new Tone.FeedbackDelay("8n", 0.5).toDestination(),
            chorus: new Tone.Chorus(4, 2.5, 0.5).toDestination()
        };

        // Mic input
        this.mic = new Tone.UserMedia();

        // Chain: Mic -> Distortion -> Chorus -> Delay -> Reverb -> Master
        // We'll use a disconnect/connect strategy or Tone.Chain

        // Initial state: all bypassed
        // For simplicity in this demo, we'll connect mic to all effects in parallel or series based on toggles
        // Better approach: Mic -> Effect1 -> Effect2 ... -> Destination

        this.mic.connect(Tone.Destination); // Direct signal (Dry)
    }

    setupEffectsUI() {
        const sidebar = document.getElementById('effectsSidebar');
        const openBtn = document.getElementById('openEffectsBtn');
        const closeBtn = document.getElementById('closeEffectsBtn');

        if (openBtn) openBtn.onclick = () => sidebar.classList.add('open');
        if (closeBtn) closeBtn.onclick = () => sidebar.classList.remove('open');

        // Toggle Effects
        this.setupEffectToggle('distortion', this.effects.distortion);
        this.setupEffectToggle('reverb', this.effects.reverb);
        this.setupEffectToggle('delay', this.effects.delay);
        this.setupEffectToggle('chorus', this.effects.chorus);

        // Parameters
        const bindParam = (id, target, prop) => {
            const el = document.getElementById(id);
            if (el) el.oninput = (e) => target[prop] = e.target.value;
        };

        bindParam('distortionDrive', this.effects.distortion, 'distortion');

        const reverbDecay = document.getElementById('reverbDecay');
        if (reverbDecay) reverbDecay.oninput = (e) => this.effects.reverb.decay = e.target.value;

        const reverbMix = document.getElementById('reverbMix');
        if (reverbMix) reverbMix.oninput = (e) => this.effects.reverb.wet.value = e.target.value;

        const delayTime = document.getElementById('delayTime');
        if (delayTime) delayTime.oninput = (e) => this.effects.delay.delayTime.value = e.target.value;

        const delayFeedback = document.getElementById('delayFeedback');
        if (delayFeedback) delayFeedback.oninput = (e) => this.effects.delay.feedback.value = e.target.value;

        const chorusDepth = document.getElementById('chorusDepth');
        if (chorusDepth) chorusDepth.oninput = (e) => this.effects.chorus.depth = e.target.value;
    }

    setupEffectToggle(name, effect) {
        const toggle = document.getElementById(`${name}Toggle`);
        if (!toggle) return;

        // Initially disconnect
        effect.disconnect();

        toggle.onchange = async (e) => {
            if (e.target.checked) {
                // Ensure mic is open
                if (this.mic.state !== 'started') {
                    await this.mic.open();
                    console.log('Mic opened for effects');
                }

                // Connect Mic -> Effect -> Destination
                this.mic.connect(effect);
                console.log(`${name} enabled`);
            } else {
                this.mic.disconnect(effect);
                console.log(`${name} disabled`);
            }
        };
    }
}


// Initialize DAW when page loads
let daw;
window.addEventListener('DOMContentLoaded', () => {
    daw = new JamStudioDAW();

    // Initialize Tone.js context on first user interaction to avoid warnings
    document.body.addEventListener('click', async () => {
        if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
            await Tone.start();
        }
    }, { once: true });

    // Init effects after a slight delay or on interaction (only if effects sidebar exists)
    setTimeout(() => {
        if (typeof Tone !== 'undefined' && document.getElementById('effectsSidebar')) {
            daw.initEffects();
            daw.setupEffectsUI();
        }
    }, 100);
});
