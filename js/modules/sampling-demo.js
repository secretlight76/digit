/**
 * Module de démonstration de l'échantillonnage
 */

import { AudioVisualizer } from './visualizer.js';
import { generateSineWave, downsample, nyquistFrequency } from '../utils/math-utils.js';
import { createAudioBuffer, playBuffer, playTone, stopAllSources, formatFrequency } from '../utils/audio-utils.js';

export class SamplingDemo {
    constructor() {
        this.canvas = document.getElementById('sampling-canvas');
        this.visualizer = new AudioVisualizer(this.canvas);

        this.signalFreqSlider = document.getElementById('signal-freq');
        this.signalFreqValue = document.getElementById('signal-freq-value');
        this.sampleRateSlider = document.getElementById('sample-rate');
        this.sampleRateValue = document.getElementById('sample-rate-value');

        this.playButton = document.getElementById('play-sampling');
        this.stopButton = document.getElementById('stop-sampling');

        this.samplesPerSecDisplay = document.getElementById('samples-per-sec');
        this.nyquistCheckDisplay = document.getElementById('nyquist-check');

        this.activeSources = [];

        this.init();
    }

    init() {
        this.updateVisualization();
        this.updateStats();

        this.signalFreqSlider.addEventListener('input', () => {
            this.signalFreqValue.textContent = this.signalFreqSlider.value;
            this.updateVisualization();
            this.updateStats();
        });

        this.sampleRateSlider.addEventListener('input', () => {
            this.sampleRateValue.textContent = this.sampleRateSlider.value;
            this.updateVisualization();
            this.updateStats();
        });

        this.playButton.addEventListener('click', () => this.playAudio());
        this.stopButton.addEventListener('click', () => this.stopAudio());
    }

    updateVisualization() {
        const signalFreq = parseFloat(this.signalFreqSlider.value);
        const sampleRate = parseFloat(this.sampleRateSlider.value);

        // Génère le signal original (haute résolution pour visualisation)
        const displaySampleRate = 48000;
        const duration = 0.05; // 50ms pour l'affichage
        const originalSignal = generateSineWave(signalFreq, displaySampleRate, duration);

        // Génère le signal échantillonné
        const sampledSignal = generateSineWave(signalFreq, sampleRate, duration);

        // Visualisation
        this.visualizer.clear();
        this.visualizer.drawGrid();

        // Dessine le signal original
        const colors = this.visualizer.getThemeColors();
        this.visualizer.drawWaveform(originalSignal, colors.signal, 2);

        // Calcule les indices des échantillons pour la visualisation
        const samplingRatio = displaySampleRate / sampleRate;
        const numSamples = Math.min(sampledSignal.length, 100); // Limite pour la clarté
        const sampleIndices = [];

        for (let i = 0; i < numSamples; i++) {
            const index = Math.round(i * samplingRatio);
            if (index < originalSignal.length) {
                sampleIndices.push(index);
            }
        }

        // Dessine les points d'échantillonnage
        this.visualizer.drawSampleLines(originalSignal, sampleIndices, colors.sample);
        this.visualizer.drawSamplePoints(originalSignal, sampleIndices, colors.sample, 5);

        // Légende
        this.visualizer.drawLegend([
            { label: 'Signal continu', color: colors.signal },
            { label: 'Échantillons', color: colors.sample }
        ], 'topright');

        // Titre
        this.visualizer.drawText(
            `Échantillonnage : ${formatFrequency(signalFreq)} à ${formatFrequency(sampleRate)}`,
            10,
            10,
            { font: 'bold 16px Arial' }
        );
    }

    updateStats() {
        const signalFreq = parseFloat(this.signalFreqSlider.value);
        const sampleRate = parseFloat(this.sampleRateSlider.value);

        // Échantillons par seconde
        this.samplesPerSecDisplay.textContent = sampleRate.toLocaleString();

        // Vérification de Nyquist
        const nyquist = nyquistFrequency(sampleRate);
        const respectsNyquist = signalFreq <= nyquist;

        if (respectsNyquist) {
            this.nyquistCheckDisplay.textContent = '✓ OK';
            this.nyquistCheckDisplay.style.color = 'var(--accent-success)';
        } else {
            this.nyquistCheckDisplay.textContent = '✗ ALIASING';
            this.nyquistCheckDisplay.style.color = 'var(--accent-danger)';
        }
    }

    playAudio() {
        this.stopAudio();

        const signalFreq = parseFloat(this.signalFreqSlider.value);
        const sampleRate = parseFloat(this.sampleRateSlider.value);

        // Génère le signal échantillonné
        const duration = 2.0; // 2 secondes
        const samples = generateSineWave(signalFreq, sampleRate, duration, 0.5);

        // Crée et joue le buffer
        const buffer = createAudioBuffer(samples, sampleRate);
        const source = playBuffer(buffer, 0.3);

        this.activeSources.push(source);

        // Nettoie la source après la lecture
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
