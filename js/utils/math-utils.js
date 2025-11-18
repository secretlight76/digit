/**
 * Utilitaires mathématiques pour le traitement audio
 */

/**
 * Génère une onde sinusoïdale
 * @param {number} frequency - Fréquence en Hz
 * @param {number} sampleRate - Taux d'échantillonnage
 * @param {number} duration - Durée en secondes
 * @param {number} amplitude - Amplitude (0-1)
 * @returns {Float32Array} Tableau des échantillons
 */
export function generateSineWave(frequency, sampleRate, duration, amplitude = 1.0) {
    const samples = Math.floor(sampleRate * duration);
    const wave = new Float32Array(samples);
    const angularFrequency = 2 * Math.PI * frequency;

    for (let i = 0; i < samples; i++) {
        const time = i / sampleRate;
        wave[i] = amplitude * Math.sin(angularFrequency * time);
    }

    return wave;
}

/**
 * Applique la quantification à un signal
 * @param {Float32Array} signal - Signal d'entrée
 * @param {number} bitDepth - Résolution en bits
 * @returns {Float32Array} Signal quantifié
 */
export function quantize(signal, bitDepth) {
    const levels = Math.pow(2, bitDepth);
    const step = 2.0 / levels; // Plage de -1 à +1
    const quantized = new Float32Array(signal.length);

    for (let i = 0; i < signal.length; i++) {
        // Quantification
        const level = Math.round((signal[i] + 1) / step);
        quantized[i] = (level * step) - 1;
        // Clamping pour éviter les dépassements
        quantized[i] = Math.max(-1, Math.min(1, quantized[i]));
    }

    return quantized;
}

/**
 * Sous-échantillonne un signal
 * @param {Float32Array} signal - Signal d'entrée
 * @param {number} originalRate - Taux d'échantillonnage original
 * @param {number} targetRate - Taux d'échantillonnage cible
 * @returns {Float32Array} Signal sous-échantillonné
 */
export function downsample(signal, originalRate, targetRate) {
    if (targetRate >= originalRate) {
        return signal;
    }

    const ratio = originalRate / targetRate;
    const outputLength = Math.floor(signal.length / ratio);
    const downsampled = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
        const index = Math.floor(i * ratio);
        downsampled[i] = signal[index];
    }

    return downsampled;
}

/**
 * Calcule le SNR (Signal-to-Noise Ratio) théorique
 * @param {number} bitDepth - Résolution en bits
 * @returns {number} SNR en dB
 */
export function calculateSNR(bitDepth) {
    return 6.02 * bitDepth + 1.76;
}

/**
 * Calcule la plage dynamique
 * @param {number} bitDepth - Résolution en bits
 * @returns {number} Plage dynamique en dB
 */
export function calculateDynamicRange(bitDepth) {
    return 6 * bitDepth;
}

/**
 * Calcule la fréquence de Nyquist
 * @param {number} sampleRate - Fréquence d'échantillonnage
 * @returns {number} Fréquence de Nyquist
 */
export function nyquistFrequency(sampleRate) {
    return sampleRate / 2;
}

/**
 * Calcule la fréquence d'aliasing
 * @param {number} inputFreq - Fréquence d'entrée
 * @param {number} sampleRate - Fréquence d'échantillonnage
 * @returns {number} Fréquence d'aliasing perçue
 */
export function aliasingFrequency(inputFreq, sampleRate) {
    const nyquist = nyquistFrequency(sampleRate);

    if (inputFreq <= nyquist) {
        return inputFreq; // Pas d'aliasing
    }

    // Calcul du repliement spectral
    const foldCount = Math.floor(inputFreq / nyquist);
    const remainder = inputFreq % nyquist;

    if (foldCount % 2 === 0) {
        return remainder;
    } else {
        return nyquist - remainder;
    }
}

/**
 * Calcule le débit binaire
 * @param {number} sampleRate - Fréquence d'échantillonnage
 * @param {number} bitDepth - Résolution en bits
 * @param {number} channels - Nombre de canaux
 * @returns {number} Débit en bits par seconde
 */
export function calculateBitrate(sampleRate, bitDepth, channels) {
    return sampleRate * bitDepth * channels;
}

/**
 * Convertit un débit en taille de fichier
 * @param {number} bitrate - Débit en bits par seconde
 * @param {number} durationMinutes - Durée en minutes
 * @returns {number} Taille en mégaoctets
 */
export function bitrateToFileSize(bitrate, durationMinutes) {
    const bits = bitrate * durationMinutes * 60;
    const bytes = bits / 8;
    const megabytes = bytes / (1024 * 1024);
    return megabytes;
}

/**
 * Applique un fondu
 * @param {Float32Array} signal - Signal d'entrée
 * @param {number} fadeSamples - Nombre d'échantillons pour le fondu
 * @param {boolean} fadeIn - true pour fade in, false pour fade out
 * @returns {Float32Array} Signal avec fondu
 */
export function applyFade(signal, fadeSamples, fadeIn = true) {
    const faded = new Float32Array(signal);

    for (let i = 0; i < fadeSamples && i < signal.length; i++) {
        const factor = i / fadeSamples;
        const index = fadeIn ? i : signal.length - 1 - i;
        faded[index] *= fadeIn ? factor : (1 - factor);
    }

    return faded;
}

/**
 * Normalise un signal
 * @param {Float32Array} signal - Signal d'entrée
 * @param {number} targetPeak - Pic cible (0-1)
 * @returns {Float32Array} Signal normalisé
 */
export function normalize(signal, targetPeak = 1.0) {
    let maxAbsValue = 0;
    for (let i = 0; i < signal.length; i++) {
        maxAbsValue = Math.max(maxAbsValue, Math.abs(signal[i]));
    }

    if (maxAbsValue === 0) return signal;

    const normalized = new Float32Array(signal.length);
    const factor = targetPeak / maxAbsValue;

    for (let i = 0; i < signal.length; i++) {
        normalized[i] = signal[i] * factor;
    }

    return normalized;
}

/**
 * Mélange deux signaux
 * @param {Float32Array} signal1 - Premier signal
 * @param {Float32Array} signal2 - Deuxième signal
 * @param {number} mix - Facteur de mélange (0 = signal1, 1 = signal2)
 * @returns {Float32Array} Signal mélangé
 */
export function mixSignals(signal1, signal2, mix = 0.5) {
    const length = Math.max(signal1.length, signal2.length);
    const mixed = new Float32Array(length);

    for (let i = 0; i < length; i++) {
        const s1 = i < signal1.length ? signal1[i] : 0;
        const s2 = i < signal2.length ? signal2[i] : 0;
        mixed[i] = s1 * (1 - mix) + s2 * mix;
    }

    return mixed;
}
