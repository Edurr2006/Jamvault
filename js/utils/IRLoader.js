// ========== CARGADOR DE RESPUESTAS AL IMPULSO (IR) ==========
// Carga y gestiona respuestas al impulso de recintos (cabinets)

export class IRLoader {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.irCache = new Map();
    }

    // Carga IR desde una URL
    async loadIR(url, name = null) {
        // Comprobar primero la caché
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

            // Validar IR
            if (!this.validateIR(audioBuffer)) {
                throw new Error('Invalid IR file');
            }

            // Cachear la IR
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

    // Carga IR desde un input de archivo
    async loadIRFromFile(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            if (!this.validateIR(audioBuffer)) {
                throw new Error('Invalid IR file');
            }

            // Cachear con el nombre del archivo
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

    // Valida el formato de la IR
    validateIR(audioBuffer) {
        if (!audioBuffer) return false;

        // Comprobar duración (las IR suelen ser de 0.1s a 10s)
        if (audioBuffer.duration < 0.01 || audioBuffer.duration > 20) {
            console.warn('IR duration outside typical range:', audioBuffer.duration);
        }

        // Comprobar canales (mono o estéreo)
        if (audioBuffer.numberOfChannels > 2) {
            console.warn('IR has more than 2 channels:', audioBuffer.numberOfChannels);
        }

        return true;
    }

    // Obtiene una IR de la caché
    getIR(name) {
        return this.irCache.get(name);
    }

    // Comprueba si una IR está en caché
    hasIR(name) {
        return this.irCache.has(name);
    }

    // Limpia la caché
    clearCache() {
        this.irCache.clear();
        console.log('IR cache cleared');
    }

    // Obtiene los nombres de todas las IR en caché
    getCachedIRNames() {
        return Array.from(this.irCache.keys());
    }

    // Genera una IR sintética simple (para pruebas/fallback)
    generateSyntheticIR(type = 'room', duration = 1.0) {
        const sampleRate = this.audioContext.sampleRate;
        const length = Math.floor(duration * sampleRate);
        const buffer = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);

            switch (type) {
                case 'room':
                    // Habitación pequeña - decaimiento corto
                    for (let i = 0; i < length; i++) {
                        const decay = Math.exp(-i / (sampleRate * 0.2));
                        data[i] = (Math.random() * 2 - 1) * decay * 0.3;
                    }
                    break;

                case 'hall':
                    // Sala grande - decaimiento largo
                    for (let i = 0; i < length; i++) {
                        const decay = Math.exp(-i / (sampleRate * 0.8));
                        data[i] = (Math.random() * 2 - 1) * decay * 0.5;
                    }
                    break;

                case 'plate':
                    // Reverb de placa - brillante, densa
                    for (let i = 0; i < length; i++) {
                        const decay = Math.exp(-i / (sampleRate * 0.4));
                        const brightness = 1 + Math.sin(i / 100) * 0.3;
                        data[i] = (Math.random() * 2 - 1) * decay * brightness * 0.4;
                    }
                    break;

                case 'spring':
                    // Reverb de muelles - metálica, elástica
                    for (let i = 0; i < length; i++) {
                        const decay = Math.exp(-i / (sampleRate * 0.15));
                        const spring = Math.sin(i / 50) * Math.sin(i / 200);
                        data[i] = (Math.random() * 2 - 1) * decay * (1 + spring) * 0.3;
                    }
                    break;

                default:
                    // Decaimiento exponencial simple
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
