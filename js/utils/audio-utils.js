/**
 * Utilitaires pour la Web Audio API
 */

let audioContext = null;

/**
 * Obtient ou crée le contexte audio
 * @returns {AudioContext} Contexte audio
 */
export function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Crée un buffer audio à partir d'un tableau de samples
 * @param {Float32Array} samples - Échantillons audio
 * @param {number} sampleRate - Taux d'échantillonnage
 * @param {number} channels - Nombre de canaux
 * @returns {AudioBuffer} Buffer audio
 */
export function createAudioBuffer(samples, sampleRate, channels = 1) {
    const ctx = getAudioContext();
    const buffer = ctx.createBuffer(channels, samples.length, sampleRate);

    for (let channel = 0; channel < channels; channel++) {
        const channelData = buffer.getChannelData(channel);
        channelData.set(samples);
    }

    return buffer;
}

/**
 * Joue un buffer audio
 * @param {AudioBuffer} buffer - Buffer audio
 * @param {number} volume - Volume (0-1)
 * @returns {AudioBufferSourceNode} Source audio
 */
export function playBuffer(buffer, volume = 1.0) {
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start();
    return source;
}

/**
 * Crée et joue une onde sinusoïdale
 * @param {number} frequency - Fréquence en Hz
 * @param {number} duration - Durée en secondes
 * @param {number} volume - Volume (0-1)
 * @returns {OscillatorNode} Oscillateur
 */
export function playTone(frequency, duration, volume = 0.3) {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gainNode.gain.value = volume;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);

    return oscillator;
}

/**
 * Crée un buffer stéréo avec panoramique
 * @param {Float32Array} samples - Échantillons audio
 * @param {number} sampleRate - Taux d'échantillonnage
 * @param {number} pan - Panoramique (-1 = gauche, 0 = centre, 1 = droite)
 * @returns {AudioBuffer} Buffer audio stéréo
 */
export function createStereoPannedBuffer(samples, sampleRate, pan = 0) {
    const ctx = getAudioContext();
    const buffer = ctx.createBuffer(2, samples.length, sampleRate);

    // Conversion pan en gains pour gauche et droite
    const leftGain = pan <= 0 ? 1 : 1 - pan;
    const rightGain = pan >= 0 ? 1 : 1 + pan;

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);

    for (let i = 0; i < samples.length; i++) {
        leftChannel[i] = samples[i] * leftGain;
        rightChannel[i] = samples[i] * rightGain;
    }

    return buffer;
}

/**
 * Arrête toutes les sources audio actives
 * @param {Array<AudioNode>} sources - Tableau de sources audio
 */
export function stopAllSources(sources) {
    sources.forEach(source => {
        try {
            if (source.stop) {
                source.stop();
            }
        } catch (e) {
            // Source déjà arrêtée
        }
    });
    sources.length = 0;
}

/**
 * Formate un nombre de Hz en chaîne lisible
 * @param {number} frequency - Fréquence en Hz
 * @returns {string} Fréquence formatée
 */
export function formatFrequency(frequency) {
    if (frequency >= 1000) {
        return (frequency / 1000).toFixed(1) + ' kHz';
    }
    return Math.round(frequency) + ' Hz';
}

/**
 * Formate un débit en chaîne lisible
 * @param {number} bitrate - Débit en bits par seconde
 * @returns {string} Débit formaté
 */
export function formatBitrate(bitrate) {
    const kbps = bitrate / 1000;
    if (kbps >= 1000) {
        return (kbps / 1000).toFixed(2) + ' Mbps';
    }
    return Math.round(kbps) + ' kbps';
}

/**
 * Formate une taille de fichier en chaîne lisible
 * @param {number} megabytes - Taille en mégaoctets
 * @returns {string} Taille formatée
 */
export function formatFileSize(megabytes) {
    if (megabytes >= 1024) {
        return (megabytes / 1024).toFixed(2) + ' GB';
    }
    return megabytes.toFixed(1) + ' MB';
}

/**
 * Calcule le pourcentage d'économie
 * @param {number} original - Taille originale
 * @param {number} compressed - Taille compressée
 * @returns {number} Pourcentage d'économie
 */
export function calculateSavings(original, compressed) {
    return ((original - compressed) / original) * 100;
}
