/**
 * Lab Audio - Version Visuelle et Pédagogique
 */

class AudioLab {
    constructor() {
        this.audioContext = null;
        this.currentSource = null;
        this.animationFrame = null;
        this.init();
    }

    init() {
        console.log('AudioLab initialisé');

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Thème
        const toggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('audio-theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);

        toggle?.addEventListener('click', () => {
            const theme = document.body.getAttribute('data-theme');
            const newTheme = theme === 'light' ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('audio-theme', newTheme);
            this.refreshAllVisualizations();
        });

        // Initialiser les sections
        this.initPlayground();
        this.initSamplingLab();
        this.initQuantizationLab();
        this.initAliasingLab();
        this.initCalculators();

        this.showSection('playground');
    }

    showSection(id) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
        this.stopAudio();
    }

    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    stopAudio() {
        if (this.currentSource) {
            try { this.currentSource.stop(); } catch(e) {}
            this.currentSource = null;
        }
    }

    refreshAllVisualizations() {
        // Redessiner toutes les visualisations actives
        if (this.playgroundState) this.drawPlaygroundWave(this.playgroundState);
        if (this.samplingState) this.drawSamplingWave(this.samplingState);
        if (this.quantizationState) this.drawQuantizationWave(this.quantizationState);
        if (this.aliasingState) this.drawAliasingWave(this.aliasingState);
    }

    getThemeColors() {
        const theme = document.body.getAttribute('data-theme');
        if (theme === 'dark') {
            return {
                bg: '#161b22',
                grid: '#21262d',
                signal: '#58a6ff',
                sample: '#f85149',
                quantized: '#f79c4c',
                text: '#c9d1d9',
                warning: '#d29922',
                danger: '#f85149',
                success: '#3fb950'
            };
        } else {
            return {
                bg: '#ffffff',
                grid: '#e9ecef',
                signal: '#0d6efd',
                sample: '#dc3545',
                quantized: '#fd7e14',
                text: '#212529',
                warning: '#ffc107',
                danger: '#dc3545',
                success: '#198754'
            };
        }
    }

    // ===== PLAYGROUND =====
    initPlayground() {
        this.playgroundState = {
            freq: 440,
            vol: 30,
            sr: 44100,
            bits: 16,
            channels: 2
        };

        const canvas = document.getElementById('playground-canvas');
        if (canvas) {
            canvas.width = 1200;
            canvas.height = 300;
        }

        // Fréquence
        const freqSlider = document.getElementById('pg-frequency');
        const freqVal = document.getElementById('pg-freq-value');
        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                this.playgroundState.freq = parseInt(freqSlider.value);
                freqVal.textContent = this.playgroundState.freq;
                this.updatePlaygroundStats(this.playgroundState);
                this.drawPlaygroundWave(this.playgroundState);
            });
        }

        // Volume
        const volSlider = document.getElementById('pg-volume');
        const volVal = document.getElementById('pg-vol-value');
        if (volSlider) {
            volSlider.addEventListener('input', () => {
                this.playgroundState.vol = parseInt(volSlider.value);
                volVal.textContent = this.playgroundState.vol;
            });
        }

        // Sample Rate
        const srSlider = document.getElementById('pg-sample-rate');
        const srVal = document.getElementById('pg-sr-value');
        if (srSlider) {
            srSlider.addEventListener('input', () => {
                this.playgroundState.sr = parseInt(srSlider.value);
                srVal.textContent = this.playgroundState.sr;
                this.updatePlaygroundStats(this.playgroundState);
                this.drawPlaygroundWave(this.playgroundState);
            });
        }

        // Boutons rapides SR
        document.querySelectorAll('#pg-sample-rate + .quick-values .btn-tiny').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                srSlider.value = val;
                this.playgroundState.sr = val;
                srVal.textContent = val;
                this.updatePlaygroundStats(this.playgroundState);
                this.drawPlaygroundWave(this.playgroundState);
            });
        });

        // Bit Depth
        const bdSlider = document.getElementById('pg-bit-depth');
        const bdVal = document.getElementById('pg-bd-value');
        if (bdSlider) {
            bdSlider.addEventListener('input', () => {
                this.playgroundState.bits = parseInt(bdSlider.value);
                bdVal.textContent = this.playgroundState.bits;
                this.updatePlaygroundStats(this.playgroundState);
                this.drawPlaygroundWave(this.playgroundState);
            });
        }

        // Boutons rapides BD
        document.querySelectorAll('#pg-bit-depth + .quick-values .btn-tiny').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                bdSlider.value = val;
                this.playgroundState.bits = val;
                bdVal.textContent = val;
                this.updatePlaygroundStats(this.playgroundState);
                this.drawPlaygroundWave(this.playgroundState);
            });
        });

        // Channels
        const channels = document.getElementById('pg-channels');
        if (channels) {
            channels.addEventListener('change', () => {
                this.playgroundState.channels = parseInt(channels.value);
                this.updatePlaygroundStats(this.playgroundState);
            });
        }

        // Play/Stop
        document.getElementById('pg-play')?.addEventListener('click', () => {
            this.playTone(this.playgroundState.freq, this.playgroundState.vol / 100 * 0.3, 2);
        });

        document.getElementById('pg-stop')?.addEventListener('click', () => {
            this.stopAudio();
        });

        this.updatePlaygroundStats(this.playgroundState);
        this.drawPlaygroundWave(this.playgroundState);
    }

    drawPlaygroundWave(state) {
        const canvas = document.getElementById('playground-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const colors = this.getThemeColors();
        const width = canvas.width;
        const height = canvas.height;

        // Fond
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // Grille
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const y = (height / 10) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Ligne centrale
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Générer signal
        const cycles = 3;
        const samples = 1000;
        const points = [];
        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * cycles * 2 * Math.PI;
            const y = Math.sin(t + state.freq / 100);
            points.push(y);
        }

        // Dessiner onde continue
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const x = (i / points.length) * width;
            const y = height / 2 - (points[i] * height * 0.4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Points d'échantillonnage
        const samplesPerCycle = state.sr / state.freq;
        const totalSamplePoints = Math.floor(cycles * samplesPerCycle);
        const nyquist = state.sr / 2;

        ctx.fillStyle = state.freq > nyquist ? colors.danger : colors.sample;
        for (let i = 0; i < totalSamplePoints && i < 200; i++) {
            const ratio = i / totalSamplePoints;
            const idx = Math.floor(ratio * points.length);
            if (idx < points.length) {
                const x = (idx / points.length) * width;
                const y = height / 2 - (points[idx] * height * 0.4);

                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

        // Texte info
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`${state.freq} Hz @ ${this.formatFreq(state.sr)} / ${state.bits} bits`, 10, 25);

        // Warning si aliasing
        if (state.freq > nyquist) {
            ctx.fillStyle = colors.danger;
            ctx.font = 'bold 20px Arial';
            ctx.fillText('⚠️ ALIASING - Fréquence > Nyquist !', width - 350, 30);
        }
    }

    updatePlaygroundStats(state) {
        const nyquist = state.sr / 2;
        const levels = Math.pow(2, state.bits);
        const bitrate = state.sr * state.bits * state.channels;
        const snr = 6.02 * state.bits + 1.76;
        const sizeMB = (bitrate * 60) / (8 * 1024 * 1024);

        document.getElementById('pg-nyquist').textContent = this.formatFreq(nyquist);
        document.getElementById('pg-levels').textContent = levels.toLocaleString();
        document.getElementById('pg-bitrate').textContent = this.formatBitrate(bitrate);
        document.getElementById('pg-snr').textContent = snr.toFixed(1) + ' dB';
        document.getElementById('pg-size').textContent = sizeMB.toFixed(1) + ' MB';

        const warning = document.getElementById('pg-aliasing-warning');
        if (state.freq > nyquist) {
            warning.classList.add('danger');
            warning.querySelector('.stat-value').textContent = '⚠️ ALIASING';
        } else {
            warning.classList.remove('danger');
            warning.querySelector('.stat-value').textContent = '✓ OK';
        }
    }

    // ===== SAMPLING LAB =====
    initSamplingLab() {
        this.samplingState = {
            signalFreq: 1000,
            sampleRate: 8000
        };

        const canvas = document.getElementById('sampling-canvas');
        if (canvas) {
            canvas.width = 900;
            canvas.height = 500;
        }

        const freqSlider = document.getElementById('samp-signal-freq');
        const freqVal = document.getElementById('samp-freq-val');
        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                this.samplingState.signalFreq = parseInt(freqSlider.value);
                freqVal.textContent = this.samplingState.signalFreq;
                this.drawSamplingWave(this.samplingState);
            });
        }

        const srSlider = document.getElementById('samp-rate');
        const srVal = document.getElementById('samp-rate-val');
        if (srSlider) {
            srSlider.addEventListener('input', () => {
                this.samplingState.sampleRate = parseInt(srSlider.value);
                srVal.textContent = this.samplingState.sampleRate;
                this.drawSamplingWave(this.samplingState);
            });
        }

        document.getElementById('samp-play')?.addEventListener('click', () => {
            this.playTone(this.samplingState.signalFreq, 0.3, 2);
        });

        document.getElementById('samp-stop')?.addEventListener('click', () => {
            this.stopAudio();
        });

        this.drawSamplingWave(this.samplingState);
    }

    drawSamplingWave(state) {
        const canvas = document.getElementById('sampling-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const colors = this.getThemeColors();
        const width = canvas.width;
        const height = canvas.height;
        const nyquist = state.sampleRate / 2;

        // Fond
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // Grille
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const y = (height / 10) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Ligne centrale
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Signal continu
        const highResSamples = 2000;
        const signalPoints = [];
        for (let i = 0; i < highResSamples; i++) {
            const t = (i / highResSamples) * 0.05 * state.signalFreq;
            const y = Math.sin(2 * Math.PI * t);
            signalPoints.push(y);
        }

        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < signalPoints.length; i++) {
            const x = (i / signalPoints.length) * width;
            const y = height / 2 - (signalPoints[i] * height * 0.4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Points échantillonnés
        const numSamples = Math.floor(state.sampleRate * 0.05);
        const sampleColor = state.signalFreq > nyquist ? colors.danger : colors.sample;

        ctx.strokeStyle = sampleColor;
        ctx.fillStyle = sampleColor;
        ctx.lineWidth = 2;

        for (let i = 0; i < numSamples; i++) {
            const ratio = i / numSamples;
            const idx = Math.floor(ratio * signalPoints.length);
            if (idx < signalPoints.length) {
                const x = (idx / signalPoints.length) * width;
                const y = height / 2 - (signalPoints[idx] * height * 0.4);

                // Ligne verticale
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.moveTo(x, height / 2);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Point
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

        // Infos
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Signal: ${state.signalFreq} Hz`, 20, 40);
        ctx.fillText(`Sample Rate: ${this.formatFreq(state.sampleRate)}`, 20, 70);
        ctx.fillText(`Nyquist: ${this.formatFreq(nyquist)}`, 20, 100);

        // Status
        const status = document.getElementById('samp-status');
        const nyquistDisplay = document.getElementById('samp-nyquist');
        nyquistDisplay.textContent = this.formatFreq(nyquist);

        if (state.signalFreq > nyquist) {
            ctx.fillStyle = colors.danger;
            ctx.font = 'bold 24px Arial';
            ctx.fillText('⚠️ ALIASING DÉTECTÉ !', width - 300, 40);
            ctx.fillText('Signal trop rapide pour ce sample rate', width - 450, 70);
            status.textContent = '✗ ALIASING';
            status.className = 'status-error';
        } else {
            ctx.fillStyle = colors.success;
            ctx.font = 'bold 24px Arial';
            ctx.fillText('✓ Échantillonnage correct', width - 350, 40);
            status.textContent = '✓ OK';
            status.className = 'status-ok';
        }
    }

    // ===== QUANTIZATION LAB =====
    initQuantizationLab() {
        this.quantizationState = {
            bits: 8,
            freq: 440
        };

        const canvas = document.getElementById('quantization-canvas');
        if (canvas) {
            canvas.width = 900;
            canvas.height = 500;
        }

        const bitsSlider = document.getElementById('quant-bits');
        const bitsVal = document.getElementById('quant-bits-val');
        if (bitsSlider) {
            bitsSlider.addEventListener('input', () => {
                this.quantizationState.bits = parseInt(bitsSlider.value);
                bitsVal.textContent = this.quantizationState.bits;
                this.drawQuantizationWave(this.quantizationState);
            });
        }

        document.querySelectorAll('.btn-tiny[data-target="quant-bits"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                bitsSlider.value = val;
                this.quantizationState.bits = val;
                bitsVal.textContent = val;
                this.drawQuantizationWave(this.quantizationState);
            });
        });

        const freqSlider = document.getElementById('quant-freq');
        const freqVal = document.getElementById('quant-freq-val');
        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                this.quantizationState.freq = parseInt(freqSlider.value);
                freqVal.textContent = this.quantizationState.freq;
                this.drawQuantizationWave(this.quantizationState);
            });
        }

        document.getElementById('quant-compare')?.addEventListener('click', () => {
            this.playTone(this.quantizationState.freq, 0.3, 2);
        });

        document.getElementById('quant-stop')?.addEventListener('click', () => {
            this.stopAudio();
        });

        this.drawQuantizationWave(this.quantizationState);
    }

    drawQuantizationWave(state) {
        const canvas = document.getElementById('quantization-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const colors = this.getThemeColors();
        const width = canvas.width;
        const height = canvas.height;

        // Fond
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // Niveaux de quantification
        const levels = Math.pow(2, state.bits);
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);
        for (let i = 0; i <= levels; i++) {
            const y = (i / levels) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Grille principale
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const y = (height / 10) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Signal original (lisse)
        const samples = 1000;
        const signalPoints = [];
        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * 4 * 2 * Math.PI;
            const y = Math.sin(t);
            signalPoints.push(y);
        }

        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = 0; i < signalPoints.length; i++) {
            const x = (i / signalPoints.length) * width;
            const y = height / 2 - (signalPoints[i] * height * 0.45);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Signal quantifié (en escalier)
        const quantizedPoints = signalPoints.map(val => {
            const level = Math.round((val + 1) * (levels / 2));
            return (level / (levels / 2)) - 1;
        });

        ctx.strokeStyle = colors.quantized;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < quantizedPoints.length; i++) {
            const x = (i / quantizedPoints.length) * width;
            const y = height / 2 - (quantizedPoints[i] * height * 0.45);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Infos
        const snr = 6.02 * state.bits + 1.76;
        const range = 6 * state.bits;

        ctx.fillStyle = colors.text;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Résolution: ${state.bits} bits`, 20, 40);
        ctx.fillText(`Niveaux: ${levels.toLocaleString()}`, 20, 70);
        ctx.fillText(`SNR: ${snr.toFixed(1)} dB`, 20, 100);

        // Warning si faible résolution
        if (state.bits <= 4) {
            ctx.fillStyle = colors.danger;
            ctx.font = 'bold 24px Arial';
            ctx.fillText('⚠️ Résolution très faible !', width - 350, 40);
            ctx.fillText('Bruit de quantification audible', width - 370, 70);
        } else if (state.bits <= 8) {
            ctx.fillStyle = colors.warning;
            ctx.font = 'bold 24px Arial';
            ctx.fillText('⚠️ Résolution faible', width - 280, 40);
        } else {
            ctx.fillStyle = colors.success;
            ctx.font = 'bold 24px Arial';
            ctx.fillText('✓ Bonne résolution', width - 260, 40);
        }

        // Mise à jour stats
        document.getElementById('quant-levels').textContent = levels.toLocaleString();
        document.getElementById('quant-snr').textContent = snr.toFixed(2) + ' dB';
        document.getElementById('quant-range').textContent = range.toFixed(0) + ' dB';
    }

    // ===== ALIASING LAB =====
    initAliasingLab() {
        this.aliasingState = {
            inputFreq: 5000,
            sampleRate: 8000
        };

        const canvas = document.getElementById('aliasing-canvas');
        if (canvas) {
            canvas.width = 900;
            canvas.height = 500;
        }

        const freqSlider = document.getElementById('alias-input-freq');
        const freqVal = document.getElementById('alias-freq-val');
        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                this.aliasingState.inputFreq = parseInt(freqSlider.value);
                freqVal.textContent = this.aliasingState.inputFreq;
                this.drawAliasingWave(this.aliasingState);
            });
        }

        const srSlider = document.getElementById('alias-sample-rate');
        const srVal = document.getElementById('alias-sr-val');
        if (srSlider) {
            srSlider.addEventListener('input', () => {
                this.aliasingState.sampleRate = parseInt(srSlider.value);
                srVal.textContent = this.aliasingState.sampleRate;
                this.drawAliasingWave(this.aliasingState);
            });
        }

        document.getElementById('alias-play')?.addEventListener('click', () => {
            this.playTone(this.aliasingState.inputFreq, 0.3, 2);
        });

        document.getElementById('alias-stop')?.addEventListener('click', () => {
            this.stopAudio();
        });

        this.drawAliasingWave(this.aliasingState);
    }

    drawAliasingWave(state) {
        const canvas = document.getElementById('aliasing-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const colors = this.getThemeColors();
        const width = canvas.width;
        const height = canvas.height;
        const nyquist = state.sampleRate / 2;

        // Fond
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // Grille
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const y = (height / 10) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Ligne centrale
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Signal réel haute fréquence
        const highResSamples = 2000;
        const realSignal = [];
        for (let i = 0; i < highResSamples; i++) {
            const t = (i / highResSamples) * 0.05 * state.inputFreq;
            const y = Math.sin(2 * Math.PI * t);
            realSignal.push(y);
        }

        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        for (let i = 0; i < realSignal.length; i++) {
            const x = (i / realSignal.length) * width;
            const y = height / 2 - (realSignal[i] * height * 0.4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Points échantillonnés
        const numSamples = Math.floor(state.sampleRate * 0.05);
        ctx.fillStyle = state.inputFreq > nyquist ? colors.danger : colors.success;

        for (let i = 0; i < numSamples; i++) {
            const ratio = i / numSamples;
            const idx = Math.floor(ratio * realSignal.length);
            if (idx < realSignal.length) {
                const x = (idx / realSignal.length) * width;
                const y = height / 2 - (realSignal[idx] * height * 0.4);

                ctx.beginPath();
                ctx.arc(x, y, 6, 0, 2 * Math.PI);
                ctx.fill();
            }
        }

        // Si aliasing, montrer signal perçu
        if (state.inputFreq > nyquist) {
            // Calculer fréquence repliée
            const perceivedFreq = this.calculateAliasingFreq(state.inputFreq, state.sampleRate);
            const perceivedSignal = [];
            for (let i = 0; i < highResSamples; i++) {
                const t = (i / highResSamples) * 0.05 * perceivedFreq;
                const y = Math.sin(2 * Math.PI * t);
                perceivedSignal.push(y);
            }

            ctx.strokeStyle = colors.danger;
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            for (let i = 0; i < perceivedSignal.length; i++) {
                const x = (i / perceivedSignal.length) * width;
                const y = height / 2 - (perceivedSignal[i] * height * 0.4);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Warnings
            ctx.fillStyle = colors.danger;
            ctx.font = 'bold 24px Arial';
            ctx.fillText('⚠️ ALIASING !', width / 2 - 80, 40);
            ctx.font = '18px Arial';
            ctx.fillText(`Fréquence réelle: ${state.inputFreq} Hz`, width / 2 - 120, 70);
            ctx.fillText(`Fréquence perçue: ${perceivedFreq} Hz (ligne pointillés)`, width / 2 - 200, 95);

            document.getElementById('alias-perceived').textContent = this.formatFreq(perceivedFreq);
            const status = document.getElementById('alias-status');
            status.textContent = '⚠️ Aliasing détecté';
            status.className = 'status-error';
        } else {
            ctx.fillStyle = colors.success;
            ctx.font = 'bold 24px Arial';
            ctx.fillText('✓ Pas d\'aliasing', width / 2 - 100, 40);

            document.getElementById('alias-perceived').textContent = this.formatFreq(state.inputFreq);
            const status = document.getElementById('alias-status');
            status.textContent = '✓ Pas d\'aliasing';
            status.className = 'status-ok';
        }

        document.getElementById('alias-nyquist').textContent = this.formatFreq(nyquist);
    }

    calculateAliasingFreq(inputFreq, sampleRate) {
        const nyquist = sampleRate / 2;
        if (inputFreq <= nyquist) return inputFreq;

        const foldCount = Math.floor(inputFreq / nyquist);
        const remainder = inputFreq % nyquist;

        if (foldCount % 2 === 0) {
            return remainder;
        } else {
            return nyquist - remainder;
        }
    }

    playTone(freq, volume, duration) {
        this.stopAudio();
        const ctx = this.getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.value = freq;
        gain.gain.value = volume;

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
        this.currentSource = osc;
    }

    // ===== CALCULATORS =====
    initCalculators() {
        // Calculateur Débit
        const sr = document.getElementById('calc-sr');
        const bd = document.getElementById('calc-bd');
        const ch = document.getElementById('calc-ch');

        const updateBitrate = () => {
            const sampleRate = parseInt(sr?.value || 44100);
            const bitDepth = parseInt(bd?.value || 16);
            const channels = parseInt(ch?.value || 2);

            const bitrate = sampleRate * bitDepth * channels;
            const min1 = (bitrate * 60) / (8 * 1024 * 1024);
            const hour1 = min1 * 60;

            document.getElementById('calc-bitrate').textContent = this.formatBitrate(bitrate);
            document.getElementById('calc-1min').textContent = min1.toFixed(1) + ' MB';
            document.getElementById('calc-1h').textContent = hour1.toFixed(0) + ' MB';
        };

        sr?.addEventListener('change', updateBitrate);
        bd?.addEventListener('change', updateBitrate);
        ch?.addEventListener('change', updateBitrate);
        updateBitrate();

        // Calculateur Taille
        const durSlider = document.getElementById('calc-duration');
        const durVal = document.getElementById('calc-dur-val');
        const format = document.getElementById('calc-format');

        const formats = {
            'wav': 1411200,
            'flac': 705600,
            'mp3-320': 320000,
            'mp3-192': 192000,
            'mp3-128': 128000,
            'aac-256': 256000,
            'aac-128': 128000,
            'opus-128': 128000
        };

        const updateSize = () => {
            const duration = parseInt(durSlider?.value || 3);
            const fmt = format?.value || 'wav';
            durVal.textContent = duration;

            const wavSize = (formats.wav * duration * 60) / (8 * 1024 * 1024);
            const size = (formats[fmt] * duration * 60) / (8 * 1024 * 1024);

            document.getElementById('calc-size').textContent = size.toFixed(1) + ' MB';

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

        durSlider?.addEventListener('input', updateSize);
        format?.addEventListener('change', updateSize);
        updateSize();

        // Calculateur Nyquist
        const nyqSlider = document.getElementById('calc-nyq-freq');
        const nyqVal = document.getElementById('calc-nyq-freq-val');

        const updateNyquist = () => {
            const freq = parseInt(nyqSlider?.value || 20000);
            nyqVal.textContent = freq;

            const minSR = freq * 2;
            const standards = [8000, 16000, 22050, 44100, 48000, 96000, 192000];
            const recommended = standards.find(s => s >= minSR) || minSR;

            document.getElementById('calc-nyq-min').textContent = this.formatFreq(minSR);
            document.getElementById('calc-nyq-rec').textContent = this.formatFreq(recommended);
        };

        nyqSlider?.addEventListener('input', updateNyquist);
        updateNyquist();

        // Calculateur SNR
        const snrSlider = document.getElementById('calc-snr-bd');
        const snrVal = document.getElementById('calc-snr-bd-val');

        const updateSNR = () => {
            const bits = parseInt(snrSlider?.value || 16);
            snrVal.textContent = bits;

            const snr = 6.02 * bits + 1.76;
            const range = 6 * bits;
            const levels = Math.pow(2, bits);

            document.getElementById('calc-snr-result').textContent = snr.toFixed(2) + ' dB';
            document.getElementById('calc-snr-range').textContent = range.toFixed(0) + ' dB';
            document.getElementById('calc-snr-levels').textContent = levels.toLocaleString();
        };

        snrSlider?.addEventListener('input', updateSNR);
        updateSNR();
    }

    // ===== UTILS =====
    formatFreq(freq) {
        if (freq >= 1000) {
            return (freq / 1000).toFixed(1) + ' kHz';
        }
        return Math.round(freq) + ' Hz';
    }

    formatBitrate(bitrate) {
        const kbps = bitrate / 1000;
        if (kbps >= 1000) {
            return (kbps / 1000).toFixed(2) + ' Mbps';
        }
        return Math.round(kbps) + ' kbps';
    }
}

// Démarrage
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, starting AudioLab');
        new AudioLab();
    });
} else {
    console.log('DOM ready, starting AudioLab');
    new AudioLab();
}
