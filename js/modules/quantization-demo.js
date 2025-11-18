/**
 * Module de démonstration de la quantification
 */

import { AudioVisualizer } from './visualizer.js';
import { generateSineWave, quantize, calculateSNR, calculateDynamicRange } from '../utils/math-utils.js';
import { createAudioBuffer, playBuffer, stopAllSources } from '../utils/audio-utils.js';

export class QuantizationDemo {
    constructor() {
        this.canvas = document.getElementById('quantization-canvas');
        this.visualizer = new AudioVisualizer(this.canvas);

        this.bitDepthSlider = document.getElementById('bit-depth');
        this.bitDepthValue = document.getElementById('bit-depth-value');

        this.playButton = document.getElementById('play-quantization');
        this.stopButton = document.getElementById('stop-quantization');

        this.quantLevelsDisplay = document.getElementById('quant-levels');
        this.snrDisplay = document.getElementById('snr-value');
        this.dynamicRangeDisplay = document.getElementById('dynamic-range');

        this.activeSources = [];

        this.init();
    }

    init() {
        this.updateVisualization();
        this.updateStats();

        this.bitDepthSlider.addEventListener('input', () => {
            this.bitDepthValue.textContent = this.bitDepthSlider.value;
            this.updateVisualization();
            this.updateStats();
        });

        this.playButton.addEventListener('click', () => this.playComparison());
        this.stopButton.addEventListener('click', () => this.stopAudio());
    }

    updateVisualization() {
        const bitDepth = parseInt(this.bitDepthSlider.value);

        // Génère un signal original
        const sampleRate = 48000;
        const duration = 0.02; // 20ms pour visualisation
        const frequency = 440; // La standard
        const originalSignal = generateSineWave(frequency, sampleRate, duration, 0.8);

        // Applique la quantification
        const quantizedSignal = quantize(originalSignal, bitDepth);

        // Visualisation
        this.visualizer.clear();
        this.visualizer.drawQuantizationLevels(bitDepth);
        this.visualizer.drawGrid();

        const colors = this.visualizer.getThemeColors();

        // Dessine le signal original (ligne fine)
        this.visualizer.drawWaveform(originalSignal, colors.signal, 1);

        // Dessine le signal quantifié (ligne épaisse)
        this.visualizer.drawWaveform(quantizedSignal, colors.sample, 3);

        // Légende
        this.visualizer.drawLegend([
            { label: 'Signal original', color: colors.signal },
            { label: `Quantifié ${bitDepth} bits`, color: colors.sample }
        ], 'topright');

        // Titre
        this.visualizer.drawText(
            `Quantification : ${bitDepth} bits (${Math.pow(2, bitDepth)} niveaux)`,
            10,
            10,
            { font: 'bold 16px Arial' }
        );
    }

    updateStats() {
        const bitDepth = parseInt(this.bitDepthSlider.value);

        // Nombre de niveaux
        const levels = Math.pow(2, bitDepth);
        this.quantLevelsDisplay.textContent = levels.toLocaleString();

        // SNR
        const snr = calculateSNR(bitDepth);
        this.snrDisplay.textContent = snr.toFixed(2) + ' dB';

        // Plage dynamique
        const dynamicRange = calculateDynamicRange(bitDepth);
        this.dynamicRangeDisplay.textContent = dynamicRange.toFixed(0) + ' dB';
    }

    async playComparison() {
        this.stopAudio();

        const bitDepth = parseInt(this.bitDepthSlider.value);
        const sampleRate = 44100;
        const duration = 1.5;
        const frequency = 440;

        // Signal original (16 bits pour référence)
        const originalSignal = generateSineWave(frequency, sampleRate, duration, 0.3);

        // Signal quantifié
        const quantizedSignal = quantize(originalSignal, bitDepth);

        // Joue d'abord l'original
        const originalBuffer = createAudioBuffer(originalSignal, sampleRate);
        const source1 = playBuffer(originalBuffer, 0.3);
        this.activeSources.push(source1);

        // Puis joue le quantifié après une pause
        setTimeout(() => {
            const quantizedBuffer = createAudioBuffer(quantizedSignal, sampleRate);
            const source2 = playBuffer(quantizedBuffer, 0.3);
            this.activeSources.push(source2);

            // Nettoie après
            setTimeout(() => {
                this.activeSources = this.activeSources.filter(s => s !== source2);
            }, duration * 1000 + 100);
        }, duration * 1000 + 300);

        // Nettoie la première source
        setTimeout(() => {
            this.activeSources = this.activeSources.filter(s => s !== source1);
        }, duration * 1000 + 100);
    }

    stopAudio() {
        stopAllSources(this.activeSources);
    }

    destroy() {
        this.stopAudio();
        this.visualizer.stopAnimation();
    }
}
