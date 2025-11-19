/**
 * Lab Audio Numérique - Application Interactive
 */

import { AudioVisualizer } from './modules/visualizer.js';
import { generateSineWave, quantize, calculateSNR, calculateDynamicRange, nyquistFrequency, aliasingFrequency, calculateBitrate, bitrateToFileSize } from './utils/math-utils.js';
import { getAudioContext, createAudioBuffer, playBuffer, createStereoPannedBuffer, stopAllSources, formatFrequency, formatBitrate, formatFileSize } from './utils/audio-utils.js';

class AudioLabApp {
    constructor() {
        this.currentSection = 'playground';
        this.activeSources = [];
        this.visualizers = {};

        this.init();
    }

    init() {
        this.initNavigation();
        this.initTheme();

        // Initialiser tous les labs dès le départ pour éviter les canvas noirs
        this.initPlayground();
        this.initSamplingLab();
        this.initQuantizationLab();
        this.initAliasingLab();
        this.initCalculators();
        this.initChannelsLab();

        // Forcer un premier rendu de tous les canvas
        setTimeout(() => {
            this.refreshAllVisualizers();
        }, 100);

        this.showSection('playground');
    }

    refreshAllVisualizers() {
        // Playground
        if (this.visualizers.playground) {
            const state = { frequency: 440, sampleRate: 44100, bitDepth: 16 };
            this.updatePlaygroundViz(state);
        }
        // Autres visualiseurs se mettent à jour dans leurs propres init
    }

    // ==================== NAVIGATION ====================

    initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                this.showSection(sectionId);
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            this.currentSection = sectionId;
            this.stopAllAudio();
        }
    }

    stopAllAudio() {
        stopAllSources(this.activeSources);
    }

    // ==================== THÈME ====================

    initTheme() {
        const toggle = document.getElementById('theme-toggle');
        const saved = localStorage.getItem('audio-lab-theme') || 'light';
        document.body.setAttribute('data-theme', saved);

        toggle?.addEventListener('click', () => {
            const current = document.body.getAttribute('data-theme');
            const newTheme = current === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('audio-lab-theme', newTheme);
            this.refreshVisualizers();
        });
    }

    refreshVisualizers() {
        Object.values(this.visualizers).forEach(v => {
            if (v.updateVisualization) v.updateVisualization();
        });
    }

    // ==================== PLAYGROUND ====================

    initPlayground() {
        const state = {
            waveType: 'sine',
            frequency: 440,
            volume: 30,
            sampleRate: 44100,
            bitDepth: 16,
            channels: 2
        };

        // Wave type
        const waveType = document.getElementById('pg-wave-type');
        waveType?.addEventListener('change', () => {
            state.waveType = waveType.value;
            this.updatePlaygroundViz(state);
        });

        // Frequency
        const freqSlider = document.getElementById('pg-frequency');
        const freqValue = document.getElementById('pg-freq-value');
        freqSlider?.addEventListener('input', () => {
            state.frequency = parseInt(freqSlider.value);
            freqValue.textContent = state.frequency;
            this.updatePlaygroundViz(state);
            this.updatePlaygroundStats(state);
        });

        // Volume
        const volSlider = document.getElementById('pg-volume');
        const volValue = document.getElementById('pg-vol-value');
        volSlider?.addEventListener('input', () => {
            state.volume = parseInt(volSlider.value);
            volValue.textContent = state.volume;
        });

        // Sample Rate
        const srSlider = document.getElementById('pg-sample-rate');
        const srValue = document.getElementById('pg-sr-value');
        srSlider?.addEventListener('input', () => {
            state.sampleRate = parseInt(srSlider.value);
            srValue.textContent = state.sampleRate;
            this.updatePlaygroundViz(state);
            this.updatePlaygroundStats(state);
        });

        // Quick SR buttons
        document.querySelectorAll('#pg-sample-rate + .quick-values .btn-tiny').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                srSlider.value = val;
                state.sampleRate = val;
                srValue.textContent = val;
                this.updatePlaygroundViz(state);
                this.updatePlaygroundStats(state);
            });
        });

        // Bit Depth
        const bdSlider = document.getElementById('pg-bit-depth');
        const bdValue = document.getElementById('pg-bd-value');
        bdSlider?.addEventListener('input', () => {
            state.bitDepth = parseInt(bdSlider.value);
            bdValue.textContent = state.bitDepth;
            this.updatePlaygroundStats(state);
        });

        // Quick BD buttons
        document.querySelectorAll('#pg-bit-depth + .quick-values .btn-tiny').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                bdSlider.value = val;
                state.bitDepth = val;
                bdValue.textContent = val;
                this.updatePlaygroundStats(state);
            });
        });

        // Channels
        const channels = document.getElementById('pg-channels');
        channels?.addEventListener('change', () => {
            state.channels = parseInt(channels.value);
            this.updatePlaygroundStats(state);
        });

        // Play/Stop
        document.getElementById('pg-play')?.addEventListener('click', () => this.playPlayground(state));
        document.getElementById('pg-stop')?.addEventListener('click', () => this.stopAllAudio());

        // Init viz
        const canvas = document.getElementById('playground-canvas');
        if (canvas) {
            this.visualizers.playground = new AudioVisualizer(canvas);
            this.updatePlaygroundViz(state);
            this.updatePlaygroundStats(state);
        }
    }

    updatePlaygroundViz(state) {
        const viz = this.visualizers.playground;
        if (!viz) return;

        const duration = 0.05;
        const signal = generateSineWave(state.frequency, 48000, duration);
        const sampledSignal = generateSineWave(state.frequency, state.sampleRate, duration);

        viz.clear();
        viz.drawGrid();

        const colors = viz.getThemeColors();
        viz.drawWaveform(signal, colors.signal, 2);

        const samplingRatio = 48000 / state.sampleRate;
        const sampleIndices = [];
        for (let i = 0; i < Math.min(sampledSignal.length, 100); i++) {
            const index = Math.round(i * samplingRatio);
            if (index < signal.length) sampleIndices.push(index);
        }

        viz.drawSamplePoints(signal, sampleIndices, colors.sample, 5);
        viz.drawText(`${formatFrequency(state.frequency)} @ ${formatFrequency(state.sampleRate)} / ${state.bitDepth} bits`, 10, 10, { font: 'bold 16px Arial' });
    }

    updatePlaygroundStats(state) {
        const nyquist = nyquistFrequency(state.sampleRate);
        const levels = Math.pow(2, state.bitDepth);
        const bitrate = calculateBitrate(state.sampleRate, state.bitDepth, state.channels);
        const snr = calculateSNR(state.bitDepth);
        const size = bitrateToFileSize(bitrate, 1);

        document.getElementById('pg-nyquist').textContent = formatFrequency(nyquist);
        document.getElementById('pg-levels').textContent = levels.toLocaleString();
        document.getElementById('pg-bitrate').textContent = formatBitrate(bitrate);
        document.getElementById('pg-snr').textContent = snr.toFixed(1) + ' dB';
        document.getElementById('pg-size').textContent = formatFileSize(size);

        const warningBox = document.getElementById('pg-aliasing-warning');
        if (state.frequency > nyquist) {
            warningBox.classList.add('danger');
            warningBox.querySelector('.stat-value').textContent = '⚠️ ALIASING';
        } else {
            warningBox.classList.remove('danger');
            warningBox.querySelector('.stat-value').textContent = '✓ OK';
        }
    }

    playPlayground(state) {
        this.stopAllAudio();
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = state.waveType;
        osc.frequency.value = state.frequency;
        gain.gain.value = state.volume / 100 * 0.3;

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 2);
        this.activeSources.push(osc);
    }

    // ==================== SAMPLING LAB ====================

    initSamplingLab() {
        const state = { signalFreq: 1000, sampleRate: 8000 };

        const freqSlider = document.getElementById('samp-signal-freq');
        const freqVal = document.getElementById('samp-freq-val');
        freqSlider?.addEventListener('input', () => {
            state.signalFreq = parseInt(freqSlider.value);
            freqVal.textContent = state.signalFreq;
            this.updateSamplingViz(state);
        });

        const srSlider = document.getElementById('samp-rate');
        const srVal = document.getElementById('samp-rate-val');
        srSlider?.addEventListener('input', () => {
            state.sampleRate = parseInt(srSlider.value);
            srVal.textContent = state.sampleRate;
            this.updateSamplingViz(state);
        });

        document.getElementById('samp-play')?.addEventListener('click', () => this.playSampling(state));
        document.getElementById('samp-stop')?.addEventListener('click', () => this.stopAllAudio());

        const canvas = document.getElementById('sampling-canvas');
        if (canvas) {
            this.visualizers.sampling = new AudioVisualizer(canvas);
            this.updateSamplingViz(state);
        }
    }

    updateSamplingViz(state) {
        const viz = this.visualizers.sampling;
        if (!viz) return;

        const signal = generateSineWave(state.signalFreq, 48000, 0.05);
        const sampled = generateSineWave(state.signalFreq, state.sampleRate, 0.05);
        const nyquist = nyquistFrequency(state.sampleRate);

        viz.clear();
        viz.drawGrid();

        const colors = viz.getThemeColors();
        viz.drawWaveform(signal, colors.signal, 2);

        const ratio = 48000 / state.sampleRate;
        const indices = [];
        for (let i = 0; i < Math.min(sampled.length, 100); i++) {
            const idx = Math.round(i * ratio);
            if (idx < signal.length) indices.push(idx);
        }

        viz.drawSampleLines(signal, indices, colors.sample);
        viz.drawSamplePoints(signal, indices, colors.sample, 5);

        document.getElementById('samp-nyquist').textContent = formatFrequency(nyquist);
        const status = document.getElementById('samp-status');
        if (state.signalFreq <= nyquist) {
            status.textContent = '✓ OK';
            status.className = 'status-ok';
        } else {
            status.textContent = '✗ ALIASING';
            status.className = 'status-error';
        }
    }

    playSampling(state) {
        this.stopAllAudio();
        const samples = generateSineWave(state.signalFreq, state.sampleRate, 2, 0.5);
        const buffer = createAudioBuffer(samples, state.sampleRate);
        const source = playBuffer(buffer, 0.3);
        this.activeSources.push(source);
    }

    // ==================== QUANTIZATION LAB ====================

    initQuantizationLab() {
        const state = { bits: 8, freq: 440 };

        const bitsSlider = document.getElementById('quant-bits');
        const bitsVal = document.getElementById('quant-bits-val');
        bitsSlider?.addEventListener('input', () => {
            state.bits = parseInt(bitsSlider.value);
            bitsVal.textContent = state.bits;
            this.updateQuantViz(state);
        });

        document.querySelectorAll('.btn-tiny[data-target="quant-bits"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                bitsSlider.value = val;
                state.bits = val;
                bitsVal.textContent = val;
                this.updateQuantViz(state);
            });
        });

        const freqSlider = document.getElementById('quant-freq');
        const freqVal = document.getElementById('quant-freq-val');
        freqSlider?.addEventListener('input', () => {
            state.freq = parseInt(freqSlider.value);
            freqVal.textContent = state.freq;
            this.updateQuantViz(state);
        });

        document.getElementById('quant-compare')?.addEventListener('click', () => this.playQuant(state));
        document.getElementById('quant-stop')?.addEventListener('click', () => this.stopAllAudio());

        const canvas = document.getElementById('quantization-canvas');
        if (canvas) {
            this.visualizers.quantization = new AudioVisualizer(canvas);
            this.updateQuantViz(state);
        }
    }

    updateQuantViz(state) {
        const viz = this.visualizers.quantization;
        if (!viz) return;

        const original = generateSineWave(state.freq, 48000, 0.02, 0.8);
        const quantized = quantize(original, state.bits);

        viz.clear();
        viz.drawQuantizationLevels(state.bits);
        viz.drawGrid();

        const colors = viz.getThemeColors();
        viz.drawWaveform(original, colors.signal, 1);
        viz.drawWaveform(quantized, colors.sample, 3);

        const levels = Math.pow(2, state.bits);
        const snr = calculateSNR(state.bits);
        const range = calculateDynamicRange(state.bits);

        document.getElementById('quant-levels').textContent = levels.toLocaleString();
        document.getElementById('quant-snr').textContent = snr.toFixed(2) + ' dB';
        document.getElementById('quant-range').textContent = range.toFixed(0) + ' dB';
    }

    async playQuant(state) {
        this.stopAllAudio();
        const original = generateSineWave(state.freq, 44100, 1.5, 0.3);
        const quantized = quantize(original, state.bits);

        const buf1 = createAudioBuffer(original, 44100);
        const src1 = playBuffer(buf1, 0.3);
        this.activeSources.push(src1);

        setTimeout(() => {
            const buf2 = createAudioBuffer(quantized, 44100);
            const src2 = playBuffer(buf2, 0.3);
            this.activeSources.push(src2);
        }, 1800);
    }

    // ==================== ALIASING LAB ====================

    initAliasingLab() {
        const state = { inputFreq: 5000, sampleRate: 8000 };

        const freqSlider = document.getElementById('alias-input-freq');
        const freqVal = document.getElementById('alias-freq-val');
        freqSlider?.addEventListener('input', () => {
            state.inputFreq = parseInt(freqSlider.value);
            freqVal.textContent = state.inputFreq;
            this.updateAliasingViz(state);
        });

        const srSlider = document.getElementById('alias-sample-rate');
        const srVal = document.getElementById('alias-sr-val');
        srSlider?.addEventListener('input', () => {
            state.sampleRate = parseInt(srSlider.value);
            srVal.textContent = state.sampleRate;
            this.updateAliasingViz(state);
        });

        document.getElementById('alias-play')?.addEventListener('click', () => this.playAliasing(state));
        document.getElementById('alias-stop')?.addEventListener('click', () => this.stopAllAudio());

        const canvas = document.getElementById('aliasing-canvas');
        if (canvas) {
            this.visualizers.aliasing = new AudioVisualizer(canvas);
            this.updateAliasingViz(state);
        }
    }

    updateAliasingViz(state) {
        const viz = this.visualizers.aliasing;
        if (!viz) return;

        const signal = generateSineWave(state.inputFreq, 48000, 0.05);
        const sampled = generateSineWave(state.inputFreq, state.sampleRate, 0.05);
        const nyquist = nyquistFrequency(state.sampleRate);
        const perceived = aliasingFrequency(state.inputFreq, state.sampleRate);

        viz.clear();
        viz.drawGrid();

        const colors = viz.getThemeColors();
        viz.drawWaveform(signal, colors.signal, 2);

        const ratio = 48000 / state.sampleRate;
        const indices = [];
        for (let i = 0; i < Math.min(sampled.length, 50); i++) {
            const idx = Math.round(i * ratio);
            if (idx < signal.length) indices.push(idx);
        }

        viz.drawSamplePoints(signal, indices, colors.sample, 5);

        if (state.inputFreq > nyquist) {
            const perceivedSignal = generateSineWave(perceived, 48000, 0.05);
            const ctx = viz.ctx;
            ctx.setLineDash([10, 5]);
            viz.drawWaveform(perceivedSignal, colors.sample, 3);
            ctx.setLineDash([]);
        }

        document.getElementById('alias-nyquist').textContent = formatFrequency(nyquist);
        document.getElementById('alias-perceived').textContent = formatFrequency(perceived);

        const status = document.getElementById('alias-status');
        if (state.inputFreq > nyquist) {
            status.textContent = '⚠️ Aliasing détecté';
            status.className = 'status-error';
        } else {
            status.textContent = '✓ Pas d\'aliasing';
            status.className = 'status-ok';
        }
    }

    playAliasing(state) {
        this.stopAllAudio();
        const samples = generateSineWave(state.inputFreq, state.sampleRate, 2, 0.5);
        const buffer = createAudioBuffer(samples, state.sampleRate);
        const source = playBuffer(buffer, 0.3);
        this.activeSources.push(source);
    }

    // ==================== CALCULATORS ====================

    initCalculators() {
        this.initBitrateCalc();
        this.initFileSizeCalc();
        this.initNyquistCalc();
        this.initSNRCalc();
    }

    initBitrateCalc() {
        const sr = document.getElementById('calc-sr');
        const bd = document.getElementById('calc-bd');
        const ch = document.getElementById('calc-ch');

        const update = () => {
            const sampleRate = parseInt(sr?.value || 44100);
            const bitDepth = parseInt(bd?.value || 16);
            const channels = parseInt(ch?.value || 2);

            const bitrate = calculateBitrate(sampleRate, bitDepth, channels);
            const min1 = bitrateToFileSize(bitrate, 1);
            const hour1 = bitrateToFileSize(bitrate, 60);

            document.getElementById('calc-bitrate').textContent = formatBitrate(bitrate);
            document.getElementById('calc-1min').textContent = formatFileSize(min1);
            document.getElementById('calc-1h').textContent = formatFileSize(hour1);
        };

        sr?.addEventListener('change', update);
        bd?.addEventListener('change', update);
        ch?.addEventListener('change', update);
        update();
    }

    initFileSizeCalc() {
        const durSlider = document.getElementById('calc-duration');
        const durVal = document.getElementById('calc-dur-val');
        const format = document.getElementById('calc-format');

        const formats = {
            'wav': 1411200,
            'flac': 1411200 * 0.5,
            'mp3-320': 320000,
            'mp3-192': 192000,
            'mp3-128': 128000,
            'aac-256': 256000,
            'aac-128': 128000,
            'opus-128': 128000
        };

        const update = () => {
            const duration = parseInt(durSlider?.value || 3);
            const fmt = format?.value || 'wav';
            durVal.textContent = duration;

            const wavSize = bitrateToFileSize(formats.wav, duration);
            const size = bitrateToFileSize(formats[fmt], duration);

            document.getElementById('calc-size').textContent = formatFileSize(size);

            if (fmt === 'wav') {
                document.getElementById('calc-ratio').textContent = '-';
                document.getElementById('calc-savings').textContent = '-';
            } else {
                const ratio = wavSize / size;
                const savings = ((wavSize - size) / wavSize) * 100;
                document.getElementById('calc-ratio').textContent = ratio.toFixed(2) + ':1';
                document.getElementById('calc-savings').textContent = savings.toFixed(1) + '%';
            }
        };

        durSlider?.addEventListener('input', update);
        format?.addEventListener('change', update);
        update();
    }

    initNyquistCalc() {
        const freqSlider = document.getElementById('calc-nyq-freq');
        const freqVal = document.getElementById('calc-nyq-freq-val');

        const update = () => {
            const freq = parseInt(freqSlider?.value || 20000);
            freqVal.textContent = freq;

            const minSR = freq * 2;
            const standards = [8000, 16000, 22050, 44100, 48000, 96000, 192000];
            const recommended = standards.find(s => s >= minSR) || minSR;

            document.getElementById('calc-nyq-min').textContent = formatFrequency(minSR);
            document.getElementById('calc-nyq-rec').textContent = formatFrequency(recommended);
        };

        freqSlider?.addEventListener('input', update);
        update();
    }

    initSNRCalc() {
        const bdSlider = document.getElementById('calc-snr-bd');
        const bdVal = document.getElementById('calc-snr-bd-val');

        const update = () => {
            const bits = parseInt(bdSlider?.value || 16);
            bdVal.textContent = bits;

            const snr = calculateSNR(bits);
            const range = calculateDynamicRange(bits);
            const levels = Math.pow(2, bits);

            document.getElementById('calc-snr-result').textContent = snr.toFixed(2) + ' dB';
            document.getElementById('calc-snr-range').textContent = range.toFixed(0) + ' dB';
            document.getElementById('calc-snr-levels').textContent = levels.toLocaleString();
        };

        bdSlider?.addEventListener('input', update);
        update();
    }

    // ==================== CHANNELS LAB ====================

    initChannelsLab() {
        const state = { pan: 0, freq: 440 };

        const panSlider = document.getElementById('chan-pan');
        const panVal = document.getElementById('chan-pan-val');
        panSlider?.addEventListener('input', () => {
            state.pan = parseInt(panSlider.value);
            panVal.textContent = state.pan;
            this.updateChannelsViz(state);
        });

        const freqSlider = document.getElementById('chan-freq');
        const freqVal = document.getElementById('chan-freq-val');
        freqSlider?.addEventListener('input', () => {
            state.freq = parseInt(freqSlider.value);
            freqVal.textContent = state.freq;
        });

        document.getElementById('chan-play')?.addEventListener('click', () => this.playChannels(state));
        document.getElementById('chan-stop')?.addEventListener('click', () => this.stopAllAudio());

        const canvas = document.getElementById('channels-canvas');
        if (canvas) {
            this.visualizers.channels = new AudioVisualizer(canvas);
            this.updateChannelsViz(state);
        }
    }

    updateChannelsViz(state) {
        const viz = this.visualizers.channels;
        if (!viz) return;

        const pan = state.pan / 100;
        const leftGain = pan <= 0 ? 1 : 1 - pan;
        const rightGain = pan >= 0 ? 1 : 1 + pan;

        viz.clear();

        const colors = viz.getThemeColors();
        const ctx = viz.ctx;
        const w = viz.width;
        const h = viz.height;

        const speakerRadius = 60;
        const leftX = w * 0.25;
        const rightX = w * 0.75;
        const speakerY = h / 2;
        const listenerX = w / 2;
        const listenerY = h / 2;

        // Listener
        ctx.fillStyle = colors.text;
        ctx.beginPath();
        ctx.arc(listenerX, listenerY, 15, 0, 2 * Math.PI);
        ctx.fill();

        // Left speaker
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 4;
        ctx.globalAlpha = leftGain;
        ctx.beginPath();
        ctx.arc(leftX, speakerY, speakerRadius, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = colors.signal;
        ctx.beginPath();
        ctx.arc(leftX, speakerY, speakerRadius * leftGain, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Right speaker
        ctx.strokeStyle = colors.sample;
        ctx.lineWidth = 4;
        ctx.globalAlpha = rightGain;
        ctx.beginPath();
        ctx.arc(rightX, speakerY, speakerRadius, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = colors.sample;
        ctx.beginPath();
        ctx.arc(rightX, speakerY, speakerRadius * rightGain, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Update meters
        document.getElementById('chan-left-val').textContent = (leftGain * 100).toFixed(0) + '%';
        document.getElementById('chan-right-val').textContent = (rightGain * 100).toFixed(0) + '%';
        document.getElementById('chan-left-meter').style.width = (leftGain * 100) + '%';
        document.getElementById('chan-right-meter').style.width = (rightGain * 100) + '%';
    }

    playChannels(state) {
        this.stopAllAudio();
        const pan = state.pan / 100;
        const samples = generateSineWave(state.freq, 44100, 2, 0.5);
        const buffer = createStereoPannedBuffer(samples, 44100, pan);
        const source = playBuffer(buffer, 0.3);
        this.activeSources.push(source);
    }
}

// Init app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AudioLabApp());
} else {
    new AudioLabApp();
}
