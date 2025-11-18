/**
 * Module de démonstration de l'aliasing
 */

import { AudioVisualizer } from './visualizer.js';
import { generateSineWave, nyquistFrequency, aliasingFrequency } from '../utils/math-utils.js';
import { createAudioBuffer, playBuffer, playTone, stopAllSources, formatFrequency } from '../utils/audio-utils.js';

export class AliasingDemo {
    constructor() {
        this.canvas = document.getElementById('aliasing-canvas');
        this.visualizer = new AudioVisualizer(this.canvas);

        this.inputFreqSlider = document.getElementById('input-freq');
        this.inputFreqValue = document.getElementById('input-freq-value');
        this.sampleRateSlider = document.getElementById('aliasing-sample-rate');
        this.sampleRateValue = document.getElementById('aliasing-sample-rate-value');

        this.playButton = document.getElementById('play-aliasing');
        this.stopButton = document.getElementById('stop-aliasing');

        this.nyquistFreqDisplay = document.getElementById('nyquist-freq');
        this.aliasingStatusDisplay = document.getElementById('aliasing-status');
        this.perceivedFreqDisplay = document.getElementById('perceived-freq');

        this.activeSources = [];

        this.init();
    }

    init() {
        this.updateVisualization();
        this.updateStats();

        this.inputFreqSlider.addEventListener('input', () => {
            this.inputFreqValue.textContent = this.inputFreqSlider.value;
            this.updateVisualization();
            this.updateStats();
        });

        this.sampleRateSlider.addEventListener('input', () => {
            this.sampleRateValue.textContent = this.sampleRateSlider.value;
            this.updateVisualization();
            this.updateStats();
        });

        this.playButton.addEventListener('click', () => this.playAliasing());
        this.stopButton.addEventListener('click', () => this.stopAudio());
    }

    updateVisualization() {
        const inputFreq = parseFloat(this.inputFreqSlider.value);
        const sampleRate = parseFloat(this.sampleRateSlider.value);

        // Signal haute résolution pour visualisation
        const displaySampleRate = 48000;
        const duration = 0.05; // 50ms
        const originalSignal = generateSineWave(inputFreq, displaySampleRate, duration);

        // Signal échantillonné à la fréquence choisie
        const sampledSignal = generateSineWave(inputFreq, sampleRate, duration);

        // Visualisation
        this.visualizer.clear();
        this.visualizer.drawGrid();

        const colors = this.visualizer.getThemeColors();

        // Dessine le signal original
        this.visualizer.drawWaveform(originalSignal, colors.signal, 2);

        // Calcule et dessine les points d'échantillonnage
        const samplingRatio = displaySampleRate / sampleRate;
        const numSamples = Math.min(sampledSignal.length, 50);
        const sampleIndices = [];

        for (let i = 0; i < numSamples; i++) {
            const index = Math.round(i * samplingRatio);
            if (index < originalSignal.length) {
                sampleIndices.push(index);
            }
        }

        this.visualizer.drawSamplePoints(originalSignal, sampleIndices, colors.sample, 5);

        // Si aliasing, reconstruit le signal perçu
        const nyquist = nyquistFrequency(sampleRate);
        if (inputFreq > nyquist) {
            const perceivedFreq = aliasingFrequency(inputFreq, sampleRate);
            const perceivedSignal = generateSineWave(perceivedFreq, displaySampleRate, duration);

            // Dessine le signal perçu (aliasé) en pointillés
            const ctx = this.visualizer.ctx;
            ctx.setLineDash([10, 5]);
            this.visualizer.drawWaveform(perceivedSignal, colors.sample, 3);
            ctx.setLineDash([]);

            // Légende avec aliasing
            this.visualizer.drawLegend([
                { label: `Signal réel ${formatFrequency(inputFreq)}`, color: colors.signal },
                { label: 'Échantillons', color: colors.sample },
                { label: `Signal perçu ${formatFrequency(perceivedFreq)}`, color: colors.sample }
            ], 'topright');
        } else {
            // Légende sans aliasing
            this.visualizer.drawLegend([
                { label: `Signal ${formatFrequency(inputFreq)}`, color: colors.signal },
                { label: 'Échantillons', color: colors.sample }
            ], 'topright');
        }

        // Titre
        const nyquistStatus = inputFreq > nyquist ? 'ALIASING!' : 'OK';
        this.visualizer.drawText(
            `Aliasing : ${formatFrequency(inputFreq)} @ ${formatFrequency(sampleRate)} - ${nyquistStatus}`,
            10,
            10,
            { font: 'bold 16px Arial' }
        );
    }

    updateStats() {
        const inputFreq = parseFloat(this.inputFreqSlider.value);
        const sampleRate = parseFloat(this.sampleRateSlider.value);

        const nyquist = nyquistFrequency(sampleRate);
        const hasAliasing = inputFreq > nyquist;
        const perceivedFreq = aliasingFrequency(inputFreq, sampleRate);

        // Fréquence de Nyquist
        this.nyquistFreqDisplay.textContent = formatFrequency(nyquist);

        // État
        if (hasAliasing) {
            this.aliasingStatusDisplay.textContent = '⚠️ Aliasing détecté';
            this.aliasingStatusDisplay.style.color = 'var(--accent-danger)';
        } else {
            this.aliasingStatusDisplay.textContent = '✓ Pas d\'aliasing';
            this.aliasingStatusDisplay.style.color = 'var(--accent-success)';
        }

        // Fréquence perçue
        if (hasAliasing && perceivedFreq !== inputFreq) {
            this.perceivedFreqDisplay.textContent = formatFrequency(perceivedFreq);
            this.perceivedFreqDisplay.style.color = 'var(--accent-danger)';
        } else {
            this.perceivedFreqDisplay.textContent = formatFrequency(inputFreq);
            this.perceivedFreqDisplay.style.color = 'var(--accent-success)';
        }
    }

    playAliasing() {
        this.stopAudio();

        const inputFreq = parseFloat(this.inputFreqSlider.value);
        const sampleRate = parseFloat(this.sampleRateSlider.value);
        const duration = 2.0;

        // Génère le signal échantillonné
        const samples = generateSineWave(inputFreq, sampleRate, duration, 0.5);

        // Crée et joue le buffer
        const buffer = createAudioBuffer(samples, sampleRate);
        const source = playBuffer(buffer, 0.3);

        this.activeSources.push(source);

        // Nettoie après
        setTimeout(() => {
            const index = this.activeSources.indexOf(source);
            if (index > -1) {
                this.activeSources.splice(index, 1);
            }
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
