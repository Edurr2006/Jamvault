// ========== IMPULSE RESPONSE LOADER ==========
// Load and manage cabinet impulse responses

export class IRLoader {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.irCache = new Map();
    }

    // Load IR from URL
    async loadIR(url, name = null) {
        // Check cache first
        const cacheName = name || url;
        if (this.irCache.has(cacheName)) {
            console.log(`IR "${cacheName}" loaded from cache`);
            return this.irCache.get(cacheName);
        }

        try {
            console.log(`Loading IR from: ${url}`);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Validate IR
            if (!this.validateIR(audioBuffer)) {
                throw new Error('Invalid IR file');
            }

            // Cache the IR
            this.irCache.set(cacheName, audioBuffer);

            console.log(`IR "${cacheName}" loaded successfully:`, {
                duration: audioBuffer.duration,
                sampleRate: audioBuffer.sampleRate,
                channels: audioBuffer.numberOfChannels
            });

            return audioBuffer;

        } catch (error) {
            console.error('Error loading IR:', error);
            throw error;
        }
    }

    // Load IR from file input
    async loadIRFromFile(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            if (!this.validateIR(audioBuffer)) {
                throw new Error('Invalid IR file');
            }

            // Cache with filename
            this.irCache.set(file.name, audioBuffer);

            console.log(`IR "${file.name}" loaded from file:`, {
                duration: audioBuffer.duration,
                sampleRate: audioBuffer.sampleRate,
                channels: audioBuffer.numberOfChannels
            });

            return audioBuffer;

        } catch (error) {
            console.error('Error loading IR from file:', error);
            throw error;
        }
    }

    // Validate IR format
    validateIR(audioBuffer) {
        if (!audioBuffer) return false;

        // Check duration (IRs are typically 0.1s to 10s)
        if (audioBuffer.duration < 0.01 || audioBuffer.duration > 20) {
            console.warn('IR duration outside typical range:', audioBuffer.duration);
        }

        // Check channels (mono or stereo)
        if (audioBuffer.numberOfChannels > 2) {
            console.warn('IR has more than 2 channels:', audioBuffer.numberOfChannels);
        }

        return true;
    }

    // Get cached IR
    getIR(name) {
        return this.irCache.get(name);
    }

    // Check if IR is cached
    hasIR(name) {
        return this.irCache.has(name);
    }

    // Clear cache
    clearCache() {
        this.irCache.clear();
        console.log('IR cache cleared');
    }

    // Get all cached IR names
    getCachedIRNames() {
        return Array.from(this.irCache.keys());
    }

    // Generate simple synthetic IR (for testing/fallback)
    generateSyntheticIR(type = 'room', duration = 1.0) {
        const sampleRate = this.audioContext.sampleRate;
        const length = Math.floor(duration * sampleRate);
        const buffer = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);

            switch (type) {
                case 'room':
                    // Small room - short decay
                    for (let i = 0; i < length; i++) {
                        const decay = Math.exp(-i / (sampleRate * 0.2));
                        data[i] = (Math.random() * 2 - 1) * decay * 0.3;
                    }
                    break;

                case 'hall':
                    // Large hall - long decay
                    for (let i = 0; i < length; i++) {
                        const decay = Math.exp(-i / (sampleRate * 0.8));
                        data[i] = (Math.random() * 2 - 1) * decay * 0.5;
                    }
                    break;

                case 'plate':
                    // Plate reverb - bright, dense
                    for (let i = 0; i < length; i++) {
                        const decay = Math.exp(-i / (sampleRate * 0.4));
                        const brightness = 1 + Math.sin(i / 100) * 0.3;
                        data[i] = (Math.random() * 2 - 1) * decay * brightness * 0.4;
                    }
                    break;

                case 'spring':
                    // Spring reverb - boingy, metallic
                    for (let i = 0; i < length; i++) {
                        const decay = Math.exp(-i / (sampleRate * 0.15));
                        const spring = Math.sin(i / 50) * Math.sin(i / 200);
                        data[i] = (Math.random() * 2 - 1) * decay * (1 + spring) * 0.3;
                    }
                    break;

                default:
                    // Simple exponential decay
                    for (let i = 0; i < length; i++) {
                        const decay = Math.exp(-i / (sampleRate * 0.3));
                        data[i] = (Math.random() * 2 - 1) * decay * 0.3;
                    }
            }
        }

        const name = `synthetic_${type}`;
        this.irCache.set(name, buffer);
        console.log(`Generated synthetic IR: ${name}`);

        return buffer;
    }
}
