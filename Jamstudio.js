// ========== JAMSTUDIO PRO - Professional Guitar DAW ==========
// Complete implementation with modular architecture and professional signal chain

import { AudioEngine } from './AudioEngine.js';
import { SignalChain } from './SignalChain.js';
import { AudioMath } from './utils/AudioMath.js';
import { TimelineManager } from './TimelineManager.js';

class Jamstudio {
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

            // Enumerate audio devices
            await this.enumerateAudioDevices();

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

        // Audio device selection
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
                // Note: Web Audio API doesn't support output device selection yet
                // This is a placeholder for future implementation
            });
        }
    }

    // ========== TIMELINE ==========

    getMaxDuration() {
        // Calculate max duration from all clips across all tracks
        let maxDuration = 60; // Default minimum
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

        this.setupTimelineDragging();
    }

    setupTimelineDragging() {
        const timelineSection = document.querySelector('.timeline-section');
        if (!timelineSection) return;

        // Remove old listeners
        if (this.timelineMouseDown) {
            timelineSection.removeEventListener('mousedown', this.timelineMouseDown);
            document.removeEventListener('mousemove', this.timelineMouseMove);
            document.removeEventListener('mouseup', this.timelineMouseUp);
        }

        this.timelineMouseDown = (e) => {
            // Allow dragging on the ruler or the playhead itself
            if (e.target.closest('.timeline-ruler') || e.target.id === 'playhead') {
                this.isDraggingTimeline = true;
                this.updatePlayheadPosition(e);
            }
        };

        this.timelineMouseMove = (e) => {
            if (this.isDraggingTimeline) {
                this.updatePlayheadPosition(e);
            }
        };

        this.timelineMouseUp = () => {
            this.isDraggingTimeline = false;
            if (this.scrollAnimationId) {
                cancelAnimationFrame(this.scrollAnimationId);
                this.scrollAnimationId = null;
            }
        };

        timelineSection.addEventListener('mousedown', this.timelineMouseDown);
        document.addEventListener('mousemove', this.timelineMouseMove);
        document.addEventListener('mouseup', this.timelineMouseUp);
    }

    updatePlayheadPosition(e) {
        const timelineSection = document.querySelector('.timeline-section');
        if (!timelineSection) return;

        const rect = timelineSection.getBoundingClientRect();

        // Calculate time based on current scroll + mouse position relative to container
        // We use e.clientX directly to handle dragging even if mouse goes outside container
        let relativeX = e.clientX - rect.left;

        // Clamp relativeX to visible area for calculation purposes
        relativeX = Math.max(0, Math.min(relativeX, rect.width));

        const clickX = relativeX + timelineSection.scrollLeft;
        const clickTime = Math.max(0, clickX / this.pixelsPerSecond);

        // Use seekTo to properly sync audio playback with visual position
        this.seekTo(clickTime);

        // Handle Auto-scroll
        this.handleAutoScroll(e.clientX, rect, timelineSection);
    }

    handleAutoScroll(mouseX, rect, container) {
        const edgeThreshold = 100; // Larger threshold for better control
        const maxScrollSpeed = 30; // Faster max speed

        // Clear existing scroll interval if any
        if (this.scrollAnimationId) {
            cancelAnimationFrame(this.scrollAnimationId);
            this.scrollAnimationId = null;
        }

        let scrollDelta = 0;

        // Check left edge
        if (mouseX - rect.left < edgeThreshold) {
            // Calculate speed based on distance (closer to edge = faster)
            const distance = Math.max(0, mouseX - rect.left);
            const intensity = 1 - (distance / edgeThreshold);
            scrollDelta = -maxScrollSpeed * intensity;
        }
        // Check right edge
        else if (rect.right - mouseX < edgeThreshold) {
            const distance = Math.max(0, rect.right - mouseX);
            const intensity = 1 - (distance / edgeThreshold);
            scrollDelta = maxScrollSpeed * intensity;
        }

        // If scrolling is needed, start animation loop
        if (scrollDelta !== 0) {
            const scrollLoop = () => {
                if (!this.isDraggingTimeline) {
                    cancelAnimationFrame(this.scrollAnimationId);
                    return;
                }

                container.scrollLeft += scrollDelta;

                // Update playhead position as we scroll
                // We need to recalculate time because scrollLeft changed
                const currentRelativeX = mouseX - rect.left;
                const clampedRelativeX = Math.max(0, Math.min(currentRelativeX, rect.width));
                const newClickX = clampedRelativeX + container.scrollLeft;
                const newClickTime = Math.max(0, newClickX / this.pixelsPerSecond);
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
        const maxDuration = this.getMaxDuration();
        time = AudioMath.clamp(time, 0, maxDuration);

        if (this.isPlaying && !this.isPaused) {
            this.stop(false); // Don't reset UI/Scroll
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

        // Auto-scroll timeline (only if not dragging manually)
        const timelineSection = document.querySelector('.timeline-section');
        if (timelineSection && !this.isDraggingTimeline) {
            const playheadPosition = time * this.pixelsPerSecond;
            const viewportWidth = timelineSection.clientWidth;
            const targetScroll = playheadPosition - (viewportWidth / 2);
            timelineSection.scrollLeft = Math.max(0, targetScroll);
        }
    }

    // ========== AUDIO DEVICES ==========

    async enumerateAudioDevices() {
        try {
            // Request permission first
            await navigator.mediaDevices.getUserMedia({ audio: true });

            // Enumerate devices
            const devices = await navigator.mediaDevices.enumerateDevices();

            const inputDeviceSelect = document.getElementById('audioInputDevice');
            const outputDeviceSelect = document.getElementById('audioOutputDevice');

            if (inputDeviceSelect) {
                // Clear existing options except default
                inputDeviceSelect.innerHTML = '<option value="default">Default</option>';

                // Add audio input devices
                devices.filter(device => device.kind === 'audioinput').forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Microphone ${inputDeviceSelect.options.length}`;
                    inputDeviceSelect.appendChild(option);
                });
            }

            if (outputDeviceSelect) {
                // Clear existing options except default
                outputDeviceSelect.innerHTML = '<option value="default">Default</option>';

                // Add audio output devices
                devices.filter(device => device.kind === 'audiooutput').forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Speaker ${outputDeviceSelect.options.length}`;
                    outputDeviceSelect.appendChild(option);
                });
            }

            console.log('Audio devices enumerated:', devices.length);

        } catch (error) {
            console.warn('Could not enumerate audio devices:', error);
        }
    }

    // ========== RECORDING ==========

    async startRecording() {
        // Ensure audio context is running
        await this.audioEngine.resume();

        const armedTracks = this.tracks.filter(t => t.armed);

        if (armedTracks.length === 0) {
            alert('No hay pistas armadas para grabar.');
            return;
        }

        try {
            // Build constraints with selected device
            const constraints = {
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                    latency: 0
                }
            };

            // Use selected input device if available
            if (this.selectedInputDevice && this.selectedInputDevice !== 'default') {
                constraints.audio.deviceId = { exact: this.selectedInputDevice };
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            this.isRecording = true;
            this.recordingStream = stream;

            // Start playback if not already playing (to move playhead)
            if (!this.isPlaying) {
                this.play();
            }

            // CRITICAL: Capture playhead position
            const recordingStartTime = this.currentTime;

            for (const track of armedTracks) {
                track.recordedChunks = [];
                track.recordingStartTime = recordingStartTime;
                track.mediaRecorder = new MediaRecorder(stream);

                // Setup real-time visualization
                if (track.analyserNode) {
                    track.recordingSource = this.audioEngine.createMediaStreamSource(stream);
                    track.recordingSource.connect(track.analyserNode);
                    track.lastDrawTime = this.currentTime;
                }

                track.mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        track.recordedChunks.push(e.data);
                    }
                };

                track.mediaRecorder.onstop = async () => {
                    // Cleanup visualization source
                    if (track.recordingSource) {
                        track.recordingSource.disconnect();
                        track.recordingSource = null;
                    }

                    const blob = new Blob(track.recordedChunks, { type: 'audio/webm' });
                    const arrayBuffer = await blob.arrayBuffer();
                    const audioBuffer = await this.audioEngine.decodeAudioData(arrayBuffer);

                    // Create clip
                    const clip = {
                        id: this.timelineManager.generateClipId(),
                        startTime: track.recordingStartTime,
                        duration: audioBuffer.duration,
                        audioBuffer: audioBuffer,
                        audioBlob: blob,
                        bufferOffset: 0
                    };

                    // Add to timeline
                    this.timelineManager.addClip(track.id, clip);
                    this.drawWaveform(track);
                    console.log(`Clip created at ${clip.startTime}s`);
                };

                track.mediaRecorder.start();
            }

            document.getElementById('recordBtn')?.classList.add('recording');
            document.getElementById('recordingIndicator')?.classList.remove('hidden');

        } catch (error) {
            console.error('Error:', error);
            alert('No se pudo acceder al micrófono.');
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

    async play() {
        // Ensure audio context is running (browser autoplay policy)
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

        // Play all non-muted tracks
        const soloTracks = this.tracks.filter(t => t.solo);
        const tracksToPlay = soloTracks.length > 0 ? soloTracks : this.tracks.filter(t => !t.muted);

        tracksToPlay.forEach(track => {
            this.playTrack(track, startOffset);
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

    playTrack(track, globalStartTime = 0) {
        const clips = this.timelineManager.getClips(track.id);
        if (!clips || clips.length === 0) return;

        if (!track.sources) track.sources = [];

        // Connect signal chain to master ONCE per playback session
        // track.signalChain.connect(this.audioEngine.getDestination());

        // Ensure gain node is connected
        if (!track.gainNode) {
            track.gainNode = this.audioEngine.createGain(track.volume / 100);
            track.gainNode.connect(this.audioEngine.getDestination());
        }

        clips.forEach(clip => {
            if (!clip.audioBuffer) return;

            const clipEnd = clip.startTime + clip.duration;
            if (clipEnd <= globalStartTime) return;

            const source = this.audioEngine.createBufferSource(clip.audioBuffer);

            // Connect to track gain node
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
        if (!this.isPlaying || this.isPaused) return;

        this.isPlaying = false;
        this.isPaused = true;
        this.pauseTime = this.audioEngine.getCurrentTime() - this.startTime;

        // Stop all playing tracks
        // Stop all playing tracks
        this.tracks.forEach(track => {
            if (track.sources) {
                track.sources.forEach(source => {
                    try {
                        source.stop();
                    } catch (e) {
                        // Ignore
                    }
                });
                track.sources = [];
            }

            // Disconnect signal chain to silence effects/tails
            // if (track.signalChain) {
            //    track.signalChain.disconnect();
            // }
            // Gain node stays connected as it is simple volume control
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

    stop(resetUI = true) {
        // Stop recording if active
        if (this.isRecording) {
            this.stopRecording();
        }

        if (!this.isPlaying && !this.isPaused) return;

        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
        this.pauseTime = 0;

        // Stop all playing tracks
        this.tracks.forEach(track => {
            if (track.sources) {
                track.sources.forEach(source => {
                    try {
                        source.stop();
                    } catch (e) {
                        // Ignore
                    }
                });
                track.sources = [];
            }
        });

        // Stop metronome
        this.stopMetronome();

        // Update UI only if requested
        if (resetUI) {
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

            // Scroll timeline back to the beginning
            const timelineSection = document.querySelector('.timeline-section');
            if (timelineSection) {
                timelineSection.scrollLeft = 0;
            }
        }

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
            const maxDuration = this.getMaxDuration();
            const percentage = (elapsed / maxDuration) * 100;
            progressFill.style.width = `${Math.min(percentage, 100)}%`;
        }

        // Auto-scroll timeline during playback
        const timelineSection = document.querySelector('.timeline-section');
        if (timelineSection && !this.isDraggingTimeline) {
            const playheadPosition = elapsed * this.pixelsPerSecond;
            const viewportWidth = timelineSection.clientWidth;

            // Scroll if playhead is getting close to the right edge or is off-screen
            // We keep it centered or at least visible
            const currentScroll = timelineSection.scrollLeft;
            const relativePosition = playheadPosition - currentScroll;

            // If playhead moves past 75% of the screen, scroll to center it
            if (relativePosition > viewportWidth * 0.75) {
                const targetScroll = playheadPosition - (viewportWidth / 2);
                timelineSection.scrollLeft = Math.max(0, targetScroll);
            }
        }

        // Draw recording visuals if recording
        if (this.isRecording) {
            this.drawRecordingVisuals();
        }

        // Continue animation
        this.animationId = requestAnimationFrame(() => this.updatePlayhead());
    }

    drawRecordingVisuals() {
        const armedTracks = this.tracks.filter(t => t.armed && t.analyserNode);

        armedTracks.forEach(track => {
            const canvas = document.getElementById(`waveform-${track.id}`);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const analyser = track.analyserNode;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);

            // Calculate position
            const startX = track.lastDrawTime * this.pixelsPerSecond;
            const endX = this.currentTime * this.pixelsPerSecond;
            const width = endX - startX;

            if (width < 1) return; // Don't draw if too small

            // Calculate average amplitude for this slice
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0; // 0..2
                const y = v - 1; // -1..1
                sum += Math.abs(y);
            }
            const average = sum / bufferLength;

            // Draw red waveform block
            const height = canvas.height;
            const amp = height / 2;
            const y = height / 2;
            const barHeight = Math.max(2, average * height); // Minimum 2px height

            ctx.fillStyle = '#ff4444'; // Red for recording
            ctx.fillRect(startX, y - barHeight / 2, width, barHeight);

            track.lastDrawTime = this.currentTime;
        });
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
            source: null,
            // signalChain: new SignalChain(this.audioEngine.audioContext, this.audioEngine.irLoader), // Removed per user request
            gainNode: null, // Initialized below
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
            outputDevice: 'master',
            mediaRecorder: null,
            recordedChunks: [],
            sources: [] // Array to hold active source nodes for clips
        };

        // Create analyser for VU meter
        track.analyserNode = this.audioEngine.createAnalyser(256);

        // Set default volume and pan
        // track.signalChain.setVolume(track.volume / 100);
        // track.signalChain.setPan(track.pan / 100);

        // Create audio chain: gainNode -> panNode -> destination
        track.gainNode = this.audioEngine.createGain(track.volume / 100);
        track.panNode = this.audioEngine.createPanner(track.pan / 100);
        track.gainNode.connect(track.panNode);
        track.panNode.connect(this.audioEngine.getDestination());

        // Apply default preset
        // track.signalChain.presetCleanGuitar(); // Disabled to prevent noise issues

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

        // Setup clip interaction
        this.setupClipInteraction(track);
    }

    deleteTrack(trackId) {
        const index = this.tracks.findIndex(t => t.id === trackId);
        if (index === -1) return;

        const track = this.tracks[index];

        // If playing, stop everything and reset
        if (this.isPlaying || this.isPaused) {
            this.stop();
        }

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

    setTrackVolume(trackId, value) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.volume = parseFloat(value);

        // Update the gain node
        if (track.gainNode) {
            track.gainNode.gain.value = track.volume / 100;
        }

        // Update UI display
        const volumeDisplay = document.querySelector(`#mixer-${trackId} .mixer-row:nth-child(1) span`);
        if (volumeDisplay) {
            volumeDisplay.textContent = `${Math.round(track.volume)}%`;
        }
    }

    setTrackPan(trackId, value) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.pan = parseFloat(value);

        // Update the pan node (it's always initialized now)
        if (track.panNode) {
            track.panNode.pan.value = track.pan / 100;
        }

        // Update UI display
        const panDisplay = document.querySelector(`#mixer-${trackId} .mixer-row:nth-child(2) span`);
        if (panDisplay) {
            const panText = track.pan === 0 ? 'C' : track.pan > 0 ? `R${Math.round(track.pan)}` : `L${Math.round(Math.abs(track.pan))}`;
            panDisplay.textContent = panText;
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

                // Connect to analyser for VU meter visualization only
                if (track.analyserNode) {
                    track.monitorNode.connect(track.analyserNode);
                }

                // IMPORTANT: Lines below are commented to prevent feedback loop
                // If you want to hear yourself, use headphones and uncomment these lines:
                // track.monitorNode.connect(track.signalChain.input);
                // track.signalChain.connect(this.audioEngine.getDestination());

                console.log(`Monitoring enabled for track ${trackId} (VU meter only - no audio output)`);

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

                // Create clip
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
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const clips = this.timelineManager.getClips(track.id);

        const maxDuration = this.timelineManager.getTotalDuration() || 60;
        canvas.width = maxDuration * this.pixelsPerSecond;
        canvas.height = canvas.offsetHeight;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        clips.forEach(clip => {
            const startX = clip.startTime * this.pixelsPerSecond;
            const width = clip.duration * this.pixelsPerSecond;
            this.drawClipWaveform(ctx, clip, startX, width, canvas.height);
        });
    }

    getThemeColor() {
        const body = document.body;
        if (body.classList.contains('natural')) return '#8FB996';
        if (body.classList.contains('galactic')) return '#00B4D8';
        if (body.classList.contains('retro')) return '#FFD460';
        if (body.classList.contains('vintage')) return '#A6C48A';
        if (body.classList.contains('redblack')) return '#C74B50';
        return '#FF8906';
    }

    drawClipWaveform(ctx, clip, x, width, height) {
        if (!clip.audioBuffer) return;

        const data = clip.audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.fillStyle = this.getThemeColor();
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;

            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }

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

    // ========== CLIP INTERACTION ==========

    setupClipInteraction(track) {
        const canvas = document.getElementById(`waveform-${track.id}`);
        if (!canvas) return;

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent default browser context menu

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;

            const clip = this.timelineManager.getClipAtPosition(track.id, x, this.pixelsPerSecond);

            if (clip) {
                // Select clip
                this.timelineManager.selectClip(track.id, clip.id);
                this.highlightSelectedClip(track, clip);

                // Show clip menu
                this.showClipContextMenu(track, clip, e.clientX, e.clientY);
            } else {
                this.timelineManager.deselectClip();
            }
        });
    }

    showClipContextMenu(track, clip, x, y) {
        // Remove existing menu
        const existingMenu = document.getElementById('clip-context-menu');
        if (existingMenu) existingMenu.remove();

        // Create menu
        const menu = document.createElement('div');
        menu.id = 'clip-context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.backgroundColor = '#333';
        menu.style.border = '1px solid #666';
        menu.style.borderRadius = '4px';
        menu.style.padding = '0.5rem';
        menu.style.zIndex = '10000';

        menu.innerHTML = `
            <div style="color: white; margin-bottom: 0.5rem; font-weight: bold;">Clip: ${clip.id.substr(0, 8)}...</div>
            <button class="btn" onclick="daw.deleteClip(${track.id}, '${clip.id}')">Eliminar</button>
            <button class="btn" onclick="daw.splitClipAtPlayhead(${track.id}, '${clip.id}')">Dividir</button>
        `;

        document.body.appendChild(menu);

        // Close menu on click outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    highlightSelectedClip(track, clip) {
        // Redraw waveform with highlight
        this.drawWaveform(track);

        const canvas = document.getElementById(`waveform-${track.id}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const startX = clip.startTime * this.pixelsPerSecond;
        const width = clip.duration * this.pixelsPerSecond;

        // Draw highlight border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(startX, 0, width, canvas.height);
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

    // ========== CLIP INTERACTION ==========

    setupClipInteraction(track) {
        const canvas = document.getElementById(`waveform-${track.id}`);
        if (!canvas) return;

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent default browser context menu

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;

            const clip = this.timelineManager.getClipAtPosition(track.id, x, this.pixelsPerSecond);

            if (clip) {
                // Select clip
                this.timelineManager.selectClip(track.id, clip.id);
                this.highlightSelectedClip(track, clip);

                // Show clip menu
                this.showClipContextMenu(track, clip, e.clientX, e.clientY);
            } else {
                this.timelineManager.deselectClip();
            }
        });
    }

    showClipContextMenu(track, clip, x, y) {
        // Remove existing menu
        const existingMenu = document.getElementById('clip-context-menu');
        if (existingMenu) existingMenu.remove();

        // Create menu
        const menu = document.createElement('div');
        menu.id = 'clip-context-menu';
        menu.style.position = 'fixed';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.backgroundColor = '#333';
        menu.style.border = '1px solid #666';
        menu.style.borderRadius = '4px';
        menu.style.padding = '0.5rem';
        menu.style.zIndex = '10000';

        menu.innerHTML = `
            <div style="color: white; margin-bottom: 0.5rem; font-weight: bold;">Clip: ${clip.id.substr(0, 8)}...</div>
            <button class="btn" onclick="daw.deleteClip(${track.id}, '${clip.id}')">Eliminar</button>
            <button class="btn" onclick="daw.splitClipAtPlayhead(${track.id}, '${clip.id}')">Dividir</button>
        `;

        document.body.appendChild(menu);

        // Close menu on click outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    highlightSelectedClip(track, clip) {
        // Redraw waveform with highlight
        this.drawWaveform(track);

        const canvas = document.getElementById(`waveform-${track.id}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const startX = clip.startTime * this.pixelsPerSecond;
        const width = clip.duration * this.pixelsPerSecond;

        // Draw highlight border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(startX, 0, width, canvas.height);
    }

    // ========== CLIP EDITING ==========

    deleteClip(trackId, clipId) {
        this.timelineManager.removeClip(trackId, clipId);
        const track = this.tracks.find(t => t.id === trackId);
        if (track) this.drawWaveform(track);
        const menu = document.getElementById('clip-context-menu');
        if (menu) menu.remove();
    }

    splitClipAtPlayhead(trackId, clipId) {
        const splitTime = this.currentTime;
        this.timelineManager.splitClip(trackId, clipId, splitTime);
        const track = this.tracks.find(t => t.id === trackId);
        if (track) this.drawWaveform(track);
        const menu = document.getElementById('clip-context-menu');
        if (menu) menu.remove();
    }
}

// Initialize on page load
let daw;
window.addEventListener('DOMContentLoaded', async () => {
    daw = new Jamstudio();

    // Make daw globally available for HTML onclick handlers
    window.daw = daw;

    // Resume audio context on first user interaction
    document.body.addEventListener('click', async () => {
        if (daw.audioEngine) {
            await daw.audioEngine.resume();
        }
    }, { once: true });
});




export { Jamstudio };
