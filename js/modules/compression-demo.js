/**
 * Module de démonstration de la compression audio
 */

import { calculateBitrate, bitrateToFileSize } from '../utils/math-utils.js';
import { formatFileSize, calculateSavings } from '../utils/audio-utils.js';

export class CompressionDemo {
    constructor() {
        this.durationSlider = document.getElementById('audio-duration');
        this.durationValue = document.getElementById('duration-value');
        this.formatSelect = document.getElementById('compression-format');

        this.fileSizeDisplay = document.getElementById('file-size');
        this.compressionRatioDisplay = document.getElementById('compression-ratio');
        this.spaceSavedDisplay = document.getElementById('space-saved');

        this.init();
    }

    init() {
        this.updateCalculations();

        this.durationSlider.addEventListener('input', () => {
            this.durationValue.textContent = this.durationSlider.value;
            this.updateCalculations();
        });

        this.formatSelect.addEventListener('change', () => {
            this.updateCalculations();
        });
    }

    getFormatBitrate(format) {
        const formats = {
            'wav': { bitrate: 1411200, type: 'uncompressed' },
            'flac': { bitrate: 1411200 * 0.5, type: 'lossless' }, // ~50% compression
            'mp3-320': { bitrate: 320000, type: 'lossy' },
            'mp3-192': { bitrate: 192000, type: 'lossy' },
            'mp3-128': { bitrate: 128000, type: 'lossy' },
            'aac-256': { bitrate: 256000, type: 'lossy' },
            'aac-128': { bitrate: 128000, type: 'lossy' },
            'opus-128': { bitrate: 128000, type: 'lossy' }
        };

        return formats[format] || formats['wav'];
    }

    updateCalculations() {
        const duration = parseInt(this.durationSlider.value);
        const format = this.formatSelect.value;
        const formatInfo = this.getFormatBitrate(format);

        // Calcul de la taille non compressée (WAV 44.1kHz/16bit/stéréo)
        const wavBitrate = 1411200;
        const wavSize = bitrateToFileSize(wavBitrate, duration);

        // Calcul de la taille du format sélectionné
        const formatSize = bitrateToFileSize(formatInfo.bitrate, duration);

        // Affichage de la taille
        this.fileSizeDisplay.textContent = formatFileSize(formatSize);

        // Taux de compression
        if (format === 'wav') {
            this.compressionRatioDisplay.textContent = '-';
            this.spaceSavedDisplay.textContent = '-';
        } else {
            const ratio = wavSize / formatSize;
            this.compressionRatioDisplay.textContent = ratio.toFixed(2) + ':1';

            const savings = calculateSavings(wavSize, formatSize);
            this.spaceSavedDisplay.textContent = savings.toFixed(1) + '%';
        }
    }

    destroy() {
        // Pas de ressources à nettoyer
    }
}

export class BitrateCalculator {
    constructor() {
        this.sampleRateSelect = document.getElementById('bitrate-sample-rate');
        this.bitDepthSelect = document.getElementById('bitrate-bit-depth');
        this.channelsSelect = document.getElementById('bitrate-channels');

        this.bitrateDisplay = document.getElementById('calculated-bitrate');
        this.sizePerMinuteDisplay = document.getElementById('size-per-minute');
        this.sizePerHourDisplay = document.getElementById('size-per-hour');

        this.init();
    }

    init() {
        this.updateCalculations();

        this.sampleRateSelect.addEventListener('change', () => this.updateCalculations());
        this.bitDepthSelect.addEventListener('change', () => this.updateCalculations());
        this.channelsSelect.addEventListener('change', () => this.updateCalculations());
    }

    updateCalculations() {
        const sampleRate = parseInt(this.sampleRateSelect.value);
        const bitDepth = parseInt(this.bitDepthSelect.value);
        const channels = parseInt(this.channelsSelect.value);

        // Calcul du débit
        const bitrate = calculateBitrate(sampleRate, bitDepth, channels);

        // Affichage du débit
        const kbps = bitrate / 1000;
        if (kbps >= 1000) {
            this.bitrateDisplay.textContent = (kbps / 1000).toFixed(2) + ' Mbps';
        } else {
            this.bitrateDisplay.textContent = Math.round(kbps) + ' kbps';
        }

        // Taille par minute
        const sizePerMinute = bitrateToFileSize(bitrate, 1);
        this.sizePerMinuteDisplay.textContent = formatFileSize(sizePerMinute);

        // Taille par heure
        const sizePerHour = bitrateToFileSize(bitrate, 60);
        this.sizePerHourDisplay.textContent = formatFileSize(sizePerHour);
    }

    destroy() {
        // Pas de ressources à nettoyer
    }
}
