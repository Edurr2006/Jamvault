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

        // Resize listener to update waveform widths
        window.addEventListener('resize', () => {
            this.tracks.forEach(track => this.drawWaveform(track));
        });

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

        // Theme change listener
        window.addEventListener('themeChanged', () => {
            console.log('Theme change detected in Jamstudio, redrawing waveforms...');
            this.tracks.forEach(track => this.drawWaveform(track));
        });
    }

    // ========== TIMELINE ==========

    getMaxDuration() {
        // Calculate max duration from all clips across all tracks
        let maxDuration = 300; // Expanded default to 5 minutes for better navigation
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

        // Add scroll listener to handle playhead visibility when scrolling
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

        // Remove old listeners
        if (this.timelineMouseDown) {
            tracksWrapper.removeEventListener('mousedown', this.timelineMouseDown);
            tracksWrapper.removeEventListener('wheel', this.timelineWheel);
            document.removeEventListener('mousemove', this.timelineMouseMove);
            document.removeEventListener('mouseup', this.timelineMouseUp);
        }

        this.timelineMouseDown = (e) => {
            // Middle-button Panning (Button 1)
            if (e.button === 1) {
                e.preventDefault();
                this.isPanning = true;
                this.panStartX = e.clientX;
                this.panScrollStart = tracksWrapper.scrollLeft;
                document.body.style.cursor = 'grabbing';
                return;
            }

            // Expanded interactive area: Ruler, Tracks, Playhead, or the Background Container itself
            const target = e.target;
            const isInteractiveArea = target.closest('.timeline-ruler') ||
                target.closest('.unified-tracks-container') ||
                target.id === 'playhead' ||
                target.id === 'tracksWrapper'; // Capture clicks on the main container background

            if (isInteractiveArea) {
                // Seek only on Left Click
                if (e.button !== 0) return;

                // Ignore if clicking specifically on track controls
                if (target.closest('.track-controls-module')) return;

                // ALWAYS deselect when clicking on timeline/ruler empty space
                // (If it were a clip click, propagation would have stopped in setupClipInteraction)
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
        };

        // Add Wheel functionality for scrolling
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

        // Calculate time based on current scroll + mouse position relative to container
        let relativeX = e.clientX - rect.left;

        // Clamp relativeX to visible area for calculation purposes
        relativeX = Math.max(0, Math.min(relativeX, rect.width));

        const clickX = relativeX + tracksWrapper.scrollLeft;

        // Subtract spacer width if we are in the track rows
        const spacer = document.querySelector('.track-controls-spacer');
        const spacerWidth = spacer ? spacer.offsetWidth : 280;

        const clickTime = Math.max(0, (clickX - spacerWidth) / this.pixelsPerSecond);

        // Use seekTo to properly sync audio playback with visual position
        this.seekTo(clickTime);

        // Handle Auto-scroll
        this.handleAutoScroll(e.clientX, rect, tracksWrapper);
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

        // Redraw all waveforms
        this.tracks.forEach(track => {
            this.drawWaveform(track);
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
        // Allow seeking up to the current max duration or at least 5 minutes
        const upperLimit = Math.max(maxDuration, 300);
        time = AudioMath.clamp(time, 0, upperLimit);

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
            if (playhead) {
                const spacer = document.querySelector('.track-controls-spacer');
                const spacerWidth = spacer ? spacer.offsetWidth : 280;
                const tracksWrapper = document.getElementById('tracksWrapper');
                const currentScroll = tracksWrapper ? tracksWrapper.scrollLeft : 0;

                const pos = spacerWidth + (time * this.pixelsPerSecond);
                const minPos = currentScroll + spacerWidth;

                // Clamp playhead to the left edge of the visible timeline
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

        // Auto-scroll timeline (only if not dragging manually)
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
            if (playhead) {
                const spacer = document.querySelector('.track-controls-spacer');
                const spacerWidth = spacer ? spacer.offsetWidth : 280;
                playhead.style.left = `${spacerWidth}px`;
            }
            if (progressFill) progressFill.style.width = '0%';

            // Scroll timeline back to the beginning
            const tracksWrapper = document.getElementById('tracksWrapper');
            if (tracksWrapper) {
                tracksWrapper.scrollLeft = 0;
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
            const spacer = document.querySelector('.track-controls-spacer');
            const spacerWidth = spacer ? spacer.offsetWidth : 280;
            const tracksWrapper = document.getElementById('tracksWrapper');
            const currentScroll = tracksWrapper ? tracksWrapper.scrollLeft : 0;

            const pos = spacerWidth + (elapsed * this.pixelsPerSecond);
            const minPos = currentScroll + spacerWidth;

            // Clamp playhead to the left edge of the visible timeline
            playhead.style.display = 'block';
            playhead.style.left = `${Math.max(pos, minPos)}px`;

            // Fix: Set height to match full scrollable content
            if (tracksWrapper) {
                playhead.style.height = `${tracksWrapper.scrollHeight}px`;
            }
        }

        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const maxDuration = this.getMaxDuration();
            const percentage = (elapsed / maxDuration) * 100;
            progressFill.style.width = `${Math.min(percentage, 100)}%`;
        }

        // Auto-scroll timeline during playback
        const tracksWrapper = document.getElementById('tracksWrapper');
        if (tracksWrapper && !this.isDraggingTimeline) {
            const spacer = document.querySelector('.track-controls-spacer');
            const spacerWidth = spacer ? spacer.offsetWidth : 280;
            const playheadPosition = spacerWidth + (elapsed * this.pixelsPerSecond);
            const viewportWidth = tracksWrapper.clientWidth;

            // Scroll if playhead is getting close to the right edge or is off-screen
            const currentScroll = tracksWrapper.scrollLeft;
            const relativePosition = playheadPosition - currentScroll;

            // NEW: Smooth continuous scroll logic.
            // If playhead touches the right edge (100%), scroll is increased.
            const threshold = viewportWidth * 0.95;
            if (relativePosition >= threshold) {
                // Shift the scroll to follow the playhead exactly at the edge
                tracksWrapper.scrollLeft += (relativePosition - threshold);
            }
        }

        // Draw recording visuals if recording
        if (this.isRecording) {
            this.drawRecordingVisuals();
        }

        // Continue animation with high precision
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
        if (this.tracks.length >= 19) {
            alert('Has alcanzado el límite máximo de 19 pistas.');
            return;
        }

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
        // Create unified track container
        const trackContainer = document.createElement('div');
        trackContainer.className = 'track-container';
        trackContainer.dataset.trackId = track.id;

        trackContainer.innerHTML = `
          <!-- Track Controls Module (Menu) -->
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
              
          <!-- Simplified Inline Mixer (Volume & Pan Only) -->
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

          <!-- Track Timeline Module (Canvas) -->
          <div class="track-timeline-module">
            <canvas class="waveform-canvas" id="waveform-${track.id}"></canvas>
          </div>
        `;

        document.getElementById('unifiedTracksContainer')?.appendChild(trackContainer);

        // Make entire track controls module clickeable for selection
        const controlsModule = trackContainer.querySelector('.track-controls-module');
        if (controlsModule) {
            controlsModule.style.cursor = 'pointer';
            controlsModule.addEventListener('click', (e) => {
                // Don't trigger if clicking on delete button or track name
                if (!e.target.classList.contains('track-delete') &&
                    !e.target.classList.contains('track-name')) {
                    this.toggleMixer(track.id);
                }
            });
        }

        // Setup clip interaction
        this.setupClipInteraction(track);

        // Setup track name renaming behavior
        const nameEl = trackContainer.querySelector('.track-name');
        if (nameEl) {
            nameEl.style.cursor = 'pointer';
            nameEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering track selection
                this.renameTrack(track.id, nameEl);
            });
        }
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
        document.querySelector(`.track-container[data-track-id="${trackId}"]`)?.remove();

        console.log('Track deleted:', trackId);
    }

    toggleMixer(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        const trackContainer = document.querySelector(`.track-container[data-track-id="${trackId}"]`);
        const bottomPanel = document.getElementById('bottomMixerPanel');

        if (!trackContainer || !bottomPanel) return;

        // Check if clicking on already selected track
        const isCurrentlySelected = bottomPanel.dataset.activeTrack == trackId;

        // Remove selection from all tracks
        document.querySelectorAll('.track-container').forEach(tc => {
            tc.classList.remove('track-selected');
        });

        if (isCurrentlySelected) {
            // Deselect: hide bottom panel
            bottomPanel.innerHTML = `
                <div class="mixer-panel-placeholder">
                    <span>⚙️ Selecciona una pista para ver sus controles</span>
                </div>
            `;
            bottomPanel.dataset.activeTrack = '';
        } else {
            // Select new track: add visual highlight and show full controls in bottom
            trackContainer.classList.add('track-selected');

            // Build full controls HTML for bottom panel
            bottomPanel.innerHTML = `
                <div class="bottom-mixer-content">
                    <div class="bottom-mixer-title">
                        <strong>${track.name}</strong>
                        <button class="close-mixer-btn" onclick="daw.toggleMixer(${trackId})">✕</button>
                    </div>
                    <div class="bottom-mixer-controls">
                        <div class="bottom-control-group">
                            <button class="btn arm-btn ${track.armed ? 'active' : ''}" 
                                    onclick="daw.toggleTrackArm(${trackId})" 
                                    title="Armar para grabar">⏺️</button>
                            <button class="btn monitor-btn ${track.monitoring ? 'active' : ''}" 
                                    onclick="daw.toggleTrackMonitoring(${trackId})" 
                                    title="Monitoreo">🎧</button>
                            <button class="btn mute-btn ${track.muted ? 'active' : ''}" 
                                    onclick="daw.toggleMute(${trackId})">M</button>
                            <button class="btn solo-btn ${track.solo ? 'active' : ''}" 
                                    onclick="daw.toggleSolo(${trackId})">S</button>
                        </div>
                        <div class="bottom-control-group">
                            <button class="btn import-btn" 
                                    onclick="daw.importAudioToTrack(${trackId})">📂 Importar</button>
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

        // Update button in Bottom Mixer Panel if active
        const bottomBtn = document.querySelector('#bottomMixerPanel .bottom-mixer-controls .mute-btn');
        if (bottomBtn && document.getElementById('bottomMixerPanel').dataset.activeTrack == trackId) {
            bottomBtn.classList.toggle('active', track.muted);
        }

        // Update signal chain volume
        if (track.signalChain) {
            track.signalChain.setVolume(track.muted ? 0 : track.volume / 100);
        }
    }

    toggleSolo(trackId) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.solo = !track.solo;

        // Update button in Bottom Mixer Panel if active
        const bottomBtn = document.querySelector('#bottomMixerPanel .bottom-mixer-controls .solo-btn');
        if (bottomBtn && document.getElementById('bottomMixerPanel').dataset.activeTrack == trackId) {
            bottomBtn.classList.toggle('active', track.solo);
        }

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

        // Update Inline Mixer UI
        const inlineInput = document.querySelector(`#mixer-${trackId} input[type="range"][oninput*="setTrackVolume"]`);
        const inlineDisplay = document.querySelector(`#mixer-${trackId} .mixer-row:nth-child(1) span`);
        if (inlineInput) inlineInput.value = track.volume;
        if (inlineDisplay) inlineDisplay.textContent = `${Math.round(track.volume)}%`;

        // Update Bottom Mixer UI if active
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

        // Update the pan node
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

        // Update button in Bottom Mixer Panel if active
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

        // Update button in Bottom Mixer Panel if active
        const bottomBtn = document.querySelector('#bottomMixerPanel .bottom-mixer-controls .monitor-btn');
        if (bottomBtn && document.getElementById('bottomMixerPanel').dataset.activeTrack == trackId) {
            if (track.monitoring) bottomBtn.classList.add('active');
            else bottomBtn.classList.remove('active');
        }

        if (track.monitoring) {
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
                if (bottomBtn) bottomBtn.classList.remove('active');
            }
        } else {
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

                const nameEl = document.querySelector(`.track-container[data-track-id="${trackId}"] .track-name`);
                if (nameEl) nameEl.textContent = track.name;

                this.drawWaveform(track);
                this.initializeTimeline();

                console.log(`Audio imported to track ${trackId}: `, file.name);

            } catch (error) {
                console.error('Error loading audio file:', error);
                alert('Error al cargar el archivo de audio.');
            }
        };

        input.click();
    }

    renameTrack(trackId, nameEl) {
        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        const currentName = nameEl.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'track-name-input';

        const saveName = () => {
            const newName = input.value.trim() || `Track ${trackId}`;
            track.name = newName;
            nameEl.textContent = newName;
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
        const unifiedTracksContainer = document.getElementById('unifiedTracksContainer');
        if (unifiedTracksContainer) unifiedTracksContainer.innerHTML = '';

        console.log('All tracks cleared');
    }

    drawWaveform(track) {
        const canvas = document.getElementById(`waveform-${track.id}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        // Get clips for this track
        let clips = this.timelineManager.getClips(track.id);

        // Filter out clips that are being dragged TO another track (they shouldn't appear here)
        clips = clips.filter(c => c.tempTrackId === undefined || c.tempTrackId === track.id);

        // Add clips that are being dragged FROM another track TO this track
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

        // Safety Limit: Browsers stop rendering canvases above ~32k pixels.
        // We cap it at 30,000px to avoid the "white screen" and performance lag.
        const SAFETY_MAX_WIDTH = 30000;
        canvas.width = Math.min(Math.max(contentWidth, containerWidth), SAFETY_MAX_WIDTH);

        canvas.height = canvas.offsetHeight;

        // Clear canvas to let CSS background show through (grayish)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        clips.forEach(clip => {
            // Use temporary position if dragging, otherwise actual position
            const startTime = clip.tempStartTime !== undefined ? clip.tempStartTime : clip.startTime;

            const startX = startTime * this.pixelsPerSecond;
            const width = clip.duration * this.pixelsPerSecond;

            // Draw with slight transparency if dragging
            if (clip.tempStartTime !== undefined) {
                ctx.globalAlpha = 0.7;
            }

            this.drawClipWaveform(ctx, clip, startX, width, canvas.height);

            ctx.globalAlpha = 1.0;
        });
    }

    getThemeColor() {
        const body = document.body;
        if (body.classList.contains('natural')) return '#27AE60'; // Verde esmeralda
        if (body.classList.contains('galactic')) return '#2980B9'; // Azul belice
        if (body.classList.contains('retro')) return '#D81B60';    // Rosa retro sofisticado
        if (body.classList.contains('vintage')) return '#B7950B';  // Dorado ocre
        if (body.classList.contains('redblack')) return '#C0392B'; // Rojo carmesí
        return '#F39C12'; // JamVault Naranja (color por defecto)
    }

    drawClipWaveform(ctx, clip, x, width, height) {
        if (!clip.audioBuffer) return;

        const cornerRadius = 6; // Rounded corner radius (increased for better visibility)

        // Helper function to draw rounded rectangle
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

        // Draw clip background with rounded corners
        ctx.save();
        drawRoundedRect(x, 0, width, height, cornerRadius);
        ctx.clip();
        ctx.fillStyle = '#0A090F';
        ctx.fillRect(x, 0, width, height);
        ctx.restore();

        // Draw selection border if selected
        if (this.selectedClip && this.selectedClip.id === clip.id) {
            ctx.strokeStyle = '#FFD700'; // Gold color
            ctx.lineWidth = 3;
            drawRoundedRect(x, 0, width, height, cornerRadius);
            ctx.stroke();
        } else {
            // Draw normal border for visibility (white/gray with increased opacity and width)
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

            // Ensure min/max were actually updated if step is very small
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

            // Calculate average volume
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
            a.download = `JamVault - Export - ${Date.now()}.wav`;
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
        const canvas = document.getElementById(`waveform - ${track.id} `);
        if (!canvas) return;

        // Context menu (Right click)
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const clip = this.timelineManager.getClipAtPosition(track.id, x, this.pixelsPerSecond);

            if (clip) {
                this.selectedClip = clip;
                this.tracks.forEach(t => this.drawWaveform(t));
                this.showClipContextMenu(track, clip, e.clientX, e.clientY);
            } else {
                this.selectedClip = null;
                this.tracks.forEach(t => this.drawWaveform(t));
            }
        });

        // Dragging logic
        let isDragging = false;
        let dragStartX = 0;
        let initialClipStartTime = 0;
        let draggedClip = null;
        let initialTrackId = null;
        let animationFrameId = null;

        // Hover effect (cursor: grab)
        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) return; // Handled by window mousemove

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const clip = this.timelineManager.getClipAtPosition(track.id, x, this.pixelsPerSecond);

            if (clip) {
                canvas.style.cursor = 'grab';
            } else {
                canvas.style.cursor = 'e-resize';
            }
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left click

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const clip = this.timelineManager.getClipAtPosition(track.id, x, this.pixelsPerSecond);

            if (clip) {
                isDragging = true;
                dragStartX = e.clientX;
                initialClipStartTime = clip.startTime;
                draggedClip = clip;
                initialTrackId = track.id;

                // PERSISTENT SELECTION: Update state and redraw all to show yellow border everywhere
                this.selectedClip = clip;
                this.tracks.forEach(t => this.drawWaveform(t));

                // Visual feedback
                document.body.style.cursor = 'grabbing';
                canvas.style.cursor = 'grabbing';

                // Auto-pause if playing
                if (this.isPlaying) {
                    this.pause();
                }

                // Disable timeline dragging while dragging clip
                this.isDraggingTimeline = false;
                e.stopPropagation(); // VERY IMPORTANT: Stop propagation to prevent timeline seek on top of clip
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || !draggedClip) return;

            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                // Calculate new time
                const deltaX = e.clientX - dragStartX;
                const deltaTime = deltaX / this.pixelsPerSecond;
                let newStartTime = Math.max(0, initialClipStartTime + deltaTime);

                // Calculate target track
                // Find which track row the mouse is over
                const trackRows = document.querySelectorAll('.track-container');
                let targetTrackId = initialTrackId;

                trackRows.forEach(row => {
                    const rect = row.getBoundingClientRect();
                    if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                        targetTrackId = parseInt(row.dataset.trackId);
                    }
                });

                // --- SNAPPING LOGIC ---
                const snapThresholdPx = 15; // Snap radius in pixels
                const snapThresholdTime = snapThresholdPx / this.pixelsPerSecond;
                let snappedTime = newStartTime;
                let minDistance = Infinity;

                // 1. Snap to Playhead
                const playheadTime = (this.isPaused || !this.isPlaying) ? this.pauseTime : this.currentTime;
                const distToPlayhead = Math.abs(newStartTime - playheadTime);

                if (distToPlayhead < snapThresholdTime && distToPlayhead < minDistance) {
                    snappedTime = playheadTime;
                    minDistance = distToPlayhead;
                }

                // 2. Snap to ALL clips across ALL tracks (Cross-track snapping)
                this.tracks.forEach(track => {
                    const clips = this.timelineManager.getClips(track.id);
                    clips.forEach(clip => {
                        if (clip.id === draggedClip.id) return; // Don't snap to self

                        // Snap to Start
                        const distToStart = Math.abs(newStartTime - clip.startTime);
                        if (distToStart < snapThresholdTime && distToStart < minDistance) {
                            snappedTime = clip.startTime;
                            minDistance = distToStart;
                        }

                        // Snap to End
                        const clipEnd = clip.startTime + clip.duration;
                        const distToEnd = Math.abs(newStartTime - clipEnd);
                        if (distToEnd < snapThresholdTime && distToEnd < minDistance) {
                            snappedTime = clipEnd;
                            minDistance = distToEnd;
                        }
                    });
                });

                newStartTime = snappedTime;
                // ----------------------

                // Visual feedback
                document.body.style.cursor = 'grabbing';

                // Store temporary state for redraw
                draggedClip.tempNewStartTime = newStartTime; // Legacy prop, keeping for safety
                draggedClip.tempStartTime = newStartTime;    // New prop for drawWaveform
                draggedClip.tempTrackId = targetTrackId;

                // Redraw ALL tracks
                this.tracks.forEach(t => this.drawWaveform(t));
            });
        });

        window.addEventListener('mouseup', (e) => {
            if (!isDragging || !draggedClip) return;

            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            // Only move if position or track actually changed
            if (draggedClip.tempStartTime !== undefined &&
                (draggedClip.tempStartTime !== draggedClip.startTime ||
                    draggedClip.tempTrackId !== initialTrackId)) {

                // Finalize move
                this.timelineManager.moveClip(
                    initialTrackId,
                    draggedClip.id,
                    draggedClip.tempStartTime,
                    draggedClip.tempTrackId
                );
            }

            // Reset state
            isDragging = false;
            if (draggedClip) {
                draggedClip.tempStartTime = undefined;
                draggedClip.tempTrackId = undefined;
            }
            draggedClip = null;
            initialTrackId = null;
            document.body.style.cursor = 'default';
            canvas.style.cursor = 'grab'; // Reset to grab if still over canvas

            // Redraw
            this.tracks.forEach(t => this.drawWaveform(t));
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

        // Close menu on click outside
        setTimeout(() => {
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }, 100);
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
        // Use pauseTime if paused/stopped to match visual playhead exactly
        const splitTime = (this.isPaused || !this.isPlaying) ? this.pauseTime : this.currentTime;

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

    // GLOBAL INTERACTION HANDLER: Resume audio + Global Deselection
    document.body.addEventListener('click', async (e) => {
        // Resume AudioContext
        if (daw.audioEngine) {
            await daw.audioEngine.resume();
        }

        // GLOBAL DESELECTION: If clicking outside the "pista" area (canvases/ruler), clear selection
        const isClipArea = e.target.closest('.waveform-canvas');
        const isRuler = e.target.closest('.timeline-ruler');
        const isTransport = e.target.closest('.daw-transport');
        const isContextMenu = e.target.closest('#clip-context-menu');

        if (!isClipArea && !isRuler && !isTransport && !isContextMenu) {
            if (daw.selectedClip) {
                daw.selectedClip = null;
                daw.tracks.forEach(t => daw.drawWaveform(t));
                console.log('Global deselection triggered (clicked outside pista)');
            }
        }
    });
});

export { Jamstudio };
