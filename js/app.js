/**
 * Lab Audio - Version Optimisée et Allégée
 */

class AudioLab {
    constructor() {
        this.audioContext = null;
        this.currentSource = null;
        this.animationFrame = null;
        this.activeSection = 'playground';
        this.pendingDraws = new Set();
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
            this.refreshActiveVisualization();
        });

        // Initialiser les sections
        this.initPlayground();
        this.initSamplingLab();
        this.initQuantizationLab();
        this.initAliasingLab();
        this.initChannelsLab();
        this.initCalculators();
        this.initFormatsComparison();

        this.showSection('playground');
    }

    showSection(id) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
        this.activeSection = id;
        this.stopAudio();
        this.refreshActiveVisualization();
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

    // OPTIMISATION: Ne redessiner que la section active
    refreshActiveVisualization() {
        if (this.activeSection === 'playground' && this.playgroundState) {
            this.drawPlaygroundWave(this.playgroundState);
        } else if (this.activeSection === 'sampling' && this.samplingState) {
            this.drawSamplingWave(this.samplingState);
        } else if (this.activeSection === 'quantization' && this.quantizationState) {
            this.drawQuantizationWave(this.quantizationState);
        } else if (this.activeSection === 'aliasing' && this.aliasingState) {
            this.drawAliasingWave(this.aliasingState);
        } else if (this.activeSection === 'channels' && this.channelsState) {
            this.drawChannelsVisualization(this.channelsState);
        } else if (this.activeSection === 'formats' && this.formatsState) {
            this.drawFormatsComparison(this.formatsState);
        }
    }

    // OPTIMISATION: Throttling avec requestAnimationFrame
    scheduleDraw(drawFn) {
        if (this.pendingDraws.has(drawFn.name)) return;

        this.pendingDraws.add(drawFn.name);
        requestAnimationFrame(() => {
            drawFn.call(this);
            this.pendingDraws.delete(drawFn.name);
        });
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
                this.scheduleDraw(() => this.drawPlaygroundWave(this.playgroundState));
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
                this.scheduleDraw(() => this.drawPlaygroundWave(this.playgroundState));
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
                this.scheduleDraw(() => this.drawPlaygroundWave(this.playgroundState));
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

        // Grille simplifiée
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

        // OPTIMISATION: Réduire les samples de 1000 → 300
        const cycles = 3;
        const samples = 300;
        const points = [];
        const twoPi = 2 * Math.PI;

        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * cycles * twoPi;
            points.push(Math.sin(t + state.freq / 100));
        }

        // Dessiner onde continue
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const pointsLength = points.length;
        for (let i = 0; i < pointsLength; i++) {
            const x = (i / pointsLength) * width;
            const y = height / 2 - (points[i] * height * 0.4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Points d'échantillonnage (limiter à 100 max)
        const samplesPerCycle = state.sr / state.freq;
        const totalSamplePoints = Math.min(Math.floor(cycles * samplesPerCycle), 100);
        const nyquist = state.sr / 2;

        ctx.fillStyle = state.freq > nyquist ? colors.danger : colors.sample;
        for (let i = 0; i < totalSamplePoints; i++) {
            const ratio = i / totalSamplePoints;
            const idx = Math.floor(ratio * pointsLength);
            if (idx < pointsLength) {
                const x = (idx / pointsLength) * width;
                const y = height / 2 - (points[idx] * height * 0.4);

                ctx.beginPath();
                ctx.arc(x, y, 5, 0, twoPi);
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
                this.scheduleDraw(() => this.drawSamplingWave(this.samplingState));
            });
        }

        const srSlider = document.getElementById('samp-rate');
        const srVal = document.getElementById('samp-rate-val');
        if (srSlider) {
            srSlider.addEventListener('input', () => {
                this.samplingState.sampleRate = parseInt(srSlider.value);
                srVal.textContent = this.samplingState.sampleRate;
                this.scheduleDraw(() => this.drawSamplingWave(this.samplingState));
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

        // OPTIMISATION: Réduire de 2000 → 400 samples
        const highResSamples = 400;
        const signalPoints = [];
        const twoPi = 2 * Math.PI;
        const factor = 0.05 * state.signalFreq / highResSamples;

        for (let i = 0; i < highResSamples; i++) {
            signalPoints.push(Math.sin(twoPi * i * factor));
        }

        // Signal original (semi-transparent pour voir le signal reconstruit par-dessus)
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        const pointsLength = signalPoints.length;
        for (let i = 0; i < pointsLength; i++) {
            const x = (i / pointsLength) * width;
            const y = height / 2 - (signalPoints[i] * height * 0.4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Points échantillonnés (limiter à 50 max)
        const numSamples = Math.min(Math.floor(state.sampleRate * 0.05), 50);
        const sampleColor = state.signalFreq > nyquist ? colors.danger : colors.success;

        // Collecter les points échantillonnés
        const samplePoints = [];
        for (let i = 0; i < numSamples; i++) {
            const ratio = i / numSamples;
            const idx = Math.floor(ratio * pointsLength);
            if (idx < pointsLength) {
                const x = (idx / pointsLength) * width;
                const y = signalPoints[idx];
                samplePoints.push({ x, y });
            }
        }

        // Calculer la fréquence perçue en cas d'aliasing
        let perceivedFreq = state.signalFreq;
        let isAliasing = false;
        if (state.signalFreq > nyquist) {
            isAliasing = true;
            // Calculer la fréquence aliasée (repliement spectral)
            const k = Math.floor(state.signalFreq / state.sampleRate);
            const remainder = state.signalFreq % state.sampleRate;
            perceivedFreq = k % 2 === 0 ? remainder : state.sampleRate - remainder;
        }

        // Si aliasing: dessiner le signal aliasé (ce que le système "entend" réellement)
        if (isAliasing) {
            ctx.strokeStyle = colors.danger;
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();

            const aliasFactor = 0.05 * perceivedFreq / highResSamples;
            for (let i = 0; i < highResSamples; i++) {
                const x = (i / highResSamples) * width;
                const aliasedValue = Math.sin(twoPi * i * aliasFactor);
                const y = height / 2 - (aliasedValue * height * 0.4);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // NOUVEAU: Dessiner le signal "reconstruit" en reliant les points échantillonnés
        // C'est ce que l'ordinateur "pense" être le signal
        if (samplePoints.length > 1) {
            ctx.strokeStyle = state.signalFreq > nyquist ? colors.danger : colors.success;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.beginPath();
            for (let i = 0; i < samplePoints.length; i++) {
                const x = samplePoints[i].x;
                const y = height / 2 - (samplePoints[i].y * height * 0.4);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Dessiner les points d'échantillonnage et lignes verticales
        ctx.strokeStyle = sampleColor;
        ctx.fillStyle = sampleColor;
        ctx.lineWidth = 2;

        for (let i = 0; i < samplePoints.length; i++) {
            const x = samplePoints[i].x;
            const y = height / 2 - (samplePoints[i].y * height * 0.4);

            // Ligne verticale
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(x, height / 2);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Point
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, twoPi);
            ctx.fill();
        }

        // Légende
        ctx.fillStyle = colors.text;
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';

        let legendY = height - 100;

        // Signal original
        ctx.fillStyle = colors.signal;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(20, legendY, 15, 3);
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.text;
        ctx.fillText(`Signal original (${state.signalFreq} Hz)`, 40, legendY + 3);
        legendY += 20;

        // Si aliasing: montrer le signal aliasé
        if (isAliasing) {
            ctx.strokeStyle = colors.danger;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(20, legendY);
            ctx.lineTo(35, legendY);
            ctx.stroke();
            ctx.fillStyle = colors.text;
            ctx.fillText(`Signal perçu/aliasé (${perceivedFreq.toFixed(0)} Hz) - Perte de fidélité!`, 40, legendY + 3);
            legendY += 20;
        }

        // Signal reconstruit
        const reconstructedColor = state.signalFreq > nyquist ? colors.danger : colors.success;
        ctx.strokeStyle = reconstructedColor;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(20, legendY);
        ctx.lineTo(35, legendY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = colors.text;
        ctx.fillText('Points échantillonnés reliés', 40, legendY + 3);
        legendY += 20;

        // Points d'échantillonnage
        ctx.fillStyle = reconstructedColor;
        ctx.beginPath();
        ctx.arc(27, legendY, 5, 0, twoPi);
        ctx.fill();
        ctx.fillStyle = colors.text;
        ctx.fillText('Points d\'échantillonnage', 40, legendY + 3);

        // Infos en haut
        ctx.textAlign = 'left';
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
            ctx.textAlign = 'right';
            ctx.fillText('⚠️ SOUS-ÉCHANTILLONNAGE !', width - 20, 40);
            ctx.font = '16px Arial';
            ctx.fillText(`Fréquence originale: ${state.signalFreq} Hz`, width - 20, 70);
            ctx.fillText(`→ Perçue comme: ${perceivedFreq.toFixed(0)} Hz`, width - 20, 95);
            ctx.fillText('Perte de fidélité des aigus!', width - 20, 120);
            status.textContent = '✗ ALIASING';
            status.className = 'status-error';
        } else {
            ctx.fillStyle = colors.success;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'right';
            ctx.fillText('✓ Échantillonnage correct', width - 20, 40);
            ctx.font = '16px Arial';
            ctx.fillText('Le signal reconstruit est fidèle', width - 20, 70);
            ctx.fillText('Fréquence préservée', width - 20, 95);
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
                this.scheduleDraw(() => this.drawQuantizationWave(this.quantizationState));
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
                this.scheduleDraw(() => this.drawQuantizationWave(this.quantizationState));
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

        // Niveaux de quantification (limiter l'affichage)
        const levels = Math.pow(2, state.bits);
        const maxLevelsToShow = Math.min(levels, 64);

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);
        for (let i = 0; i <= maxLevelsToShow; i++) {
            const y = (i / maxLevelsToShow) * height;
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

        // OPTIMISATION: Réduire de 1000 → 300 samples
        const samples = 300;
        const signalPoints = [];
        const twoPi = 2 * Math.PI;

        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * 4 * twoPi;
            signalPoints.push(Math.sin(t));
        }

        // Signal original (lisse)
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        const pointsLength = signalPoints.length;
        for (let i = 0; i < pointsLength; i++) {
            const x = (i / pointsLength) * width;
            const y = height / 2 - (signalPoints[i] * height * 0.45);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Signal quantifié (en escalier)
        const levelsDivisor = levels / 2;
        const quantizedPoints = signalPoints.map(val => {
            const level = Math.round((val + 1) * levelsDivisor);
            return (level / levelsDivisor) - 1;
        });

        ctx.strokeStyle = colors.quantized;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < pointsLength; i++) {
            const x = (i / pointsLength) * width;
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
                this.scheduleDraw(() => this.drawAliasingWave(this.aliasingState));
            });
        }

        const srSlider = document.getElementById('alias-sample-rate');
        const srVal = document.getElementById('alias-sr-val');
        if (srSlider) {
            srSlider.addEventListener('input', () => {
                this.aliasingState.sampleRate = parseInt(srSlider.value);
                srVal.textContent = this.aliasingState.sampleRate;
                this.scheduleDraw(() => this.drawAliasingWave(this.aliasingState));
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

        // OPTIMISATION: Réduire de 2000 → 400 samples
        const highResSamples = 400;
        const realSignal = [];
        const twoPi = 2 * Math.PI;
        const factor = 0.05 * state.inputFreq / highResSamples;

        for (let i = 0; i < highResSamples; i++) {
            realSignal.push(Math.sin(twoPi * i * factor));
        }

        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        const signalLength = realSignal.length;
        for (let i = 0; i < signalLength; i++) {
            const x = (i / signalLength) * width;
            const y = height / 2 - (realSignal[i] * height * 0.4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Points échantillonnés (limiter à 40 max)
        const numSamples = Math.min(Math.floor(state.sampleRate * 0.05), 40);
        ctx.fillStyle = state.inputFreq > nyquist ? colors.danger : colors.success;

        for (let i = 0; i < numSamples; i++) {
            const ratio = i / numSamples;
            const idx = Math.floor(ratio * signalLength);
            if (idx < signalLength) {
                const x = (idx / signalLength) * width;
                const y = height / 2 - (realSignal[idx] * height * 0.4);

                ctx.beginPath();
                ctx.arc(x, y, 6, 0, twoPi);
                ctx.fill();
            }
        }

        // Si aliasing, montrer signal perçu
        if (state.inputFreq > nyquist) {
            const perceivedFreq = this.calculateAliasingFreq(state.inputFreq, state.sampleRate);
            const perceivedSignal = [];
            const perceivedFactor = 0.05 * perceivedFreq / highResSamples;

            for (let i = 0; i < highResSamples; i++) {
                perceivedSignal.push(Math.sin(twoPi * i * perceivedFactor));
            }

            ctx.strokeStyle = colors.danger;
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            for (let i = 0; i < signalLength; i++) {
                const x = (i / signalLength) * width;
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
            ctx.fillText(`Réel: ${state.inputFreq} Hz`, width / 2 - 100, 70);
            ctx.fillText(`Perçu: ${perceivedFreq} Hz`, width / 2 - 100, 95);

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

        return (foldCount % 2 === 0) ? remainder : nyquist - remainder;
    }

    // ===== CHANNELS LAB =====
    initChannelsLab() {
        this.channelsState = {
            mode: 'stereo',
            pan: 0,
            width: 100,
            freq: 440,
            phase: 0
        };

        const canvas = document.getElementById('channels-canvas');
        if (canvas) {
            canvas.width = 900;
            canvas.height = 500;
        }

        // Mode
        const modeSelect = document.getElementById('chan-mode');
        if (modeSelect) {
            modeSelect.addEventListener('change', () => {
                this.channelsState.mode = modeSelect.value;
                this.updateChannelExplanation(this.channelsState);
                this.scheduleDraw(() => this.drawChannelsVisualization(this.channelsState));
            });
        }

        // Pan
        const panSlider = document.getElementById('chan-pan');
        const panVal = document.getElementById('chan-pan-val');
        if (panSlider) {
            panSlider.addEventListener('input', () => {
                this.channelsState.pan = parseInt(panSlider.value);
                panVal.textContent = this.channelsState.pan;
                this.scheduleDraw(() => this.drawChannelsVisualization(this.channelsState));
            });
        }

        // Width
        const widthSlider = document.getElementById('chan-width');
        const widthVal = document.getElementById('chan-width-val');
        if (widthSlider) {
            widthSlider.addEventListener('input', () => {
                this.channelsState.width = parseInt(widthSlider.value);
                widthVal.textContent = this.channelsState.width;
                this.scheduleDraw(() => this.drawChannelsVisualization(this.channelsState));
            });
        }

        // Frequency
        const freqSlider = document.getElementById('chan-freq');
        const freqVal = document.getElementById('chan-freq-val');
        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                this.channelsState.freq = parseInt(freqSlider.value);
                freqVal.textContent = this.channelsState.freq;
                this.scheduleDraw(() => this.drawChannelsVisualization(this.channelsState));
            });
        }

        // Phase
        const phaseSlider = document.getElementById('chan-phase');
        const phaseVal = document.getElementById('chan-phase-val');
        if (phaseSlider) {
            phaseSlider.addEventListener('input', () => {
                this.channelsState.phase = parseInt(phaseSlider.value);
                phaseVal.textContent = this.channelsState.phase;
                this.scheduleDraw(() => this.drawChannelsVisualization(this.channelsState));
            });
        }

        // Play/Stop
        document.getElementById('chan-play')?.addEventListener('click', () => {
            this.playStereoTone(this.channelsState);
        });

        document.getElementById('chan-stop')?.addEventListener('click', () => {
            this.stopAudio();
        });

        this.updateChannelExplanation(this.channelsState);
        this.drawChannelsVisualization(this.channelsState);
    }

    drawChannelsVisualization(state) {
        const canvas = document.getElementById('channels-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const colors = this.getThemeColors();
        const width = canvas.width;
        const height = canvas.height;

        // Fond
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // Calculer les niveaux L/R basés sur le pan (-100 à 100)
        const panNorm = state.pan / 100; // -1 à 1
        const leftGain = Math.cos((panNorm + 1) * Math.PI / 4);
        const rightGain = Math.sin((panNorm + 1) * Math.PI / 4);

        // Générer les signaux
        const samples = 300;
        const leftSignal = [];
        const rightSignal = [];
        const twoPi = 2 * Math.PI;
        const phaseRad = (state.phase / 180) * Math.PI;

        // Adapter le nombre de cycles selon la fréquence pour une meilleure visualisation
        const cycles = Math.max(2, Math.min(8, state.freq / 200));

        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * cycles * twoPi;
            let left, right;

            if (state.mode === 'mono') {
                // En mode mono, même signal sur les 2 canaux
                const mono = Math.sin(t);
                left = mono;
                right = mono;
            } else if (state.mode === 'mid-side') {
                // Mid-Side: largeur stéréo et phase contrôlent la séparation
                const mid = Math.sin(t);
                const side = Math.sin(t + phaseRad) * (state.width / 100);
                left = mid + side;
                right = mid - side;
            } else {
                // Stéréo: pan contrôle la répartition L/R, phase crée du déphasage
                const baseSignal = Math.sin(t);
                left = baseSignal * leftGain;
                right = Math.sin(t + phaseRad) * rightGain;

                // Appliquer la largeur stéréo aussi en mode stéréo
                const widthFactor = state.width / 100;
                const mid = (left + right) / 2;
                const side = (left - right) / 2;
                left = mid + side * widthFactor;
                right = mid - side * widthFactor;
            }

            leftSignal.push(left);
            rightSignal.push(right);
        }

        // Normaliser les signaux pour éviter l'overflow
        const maxAmplitude = Math.max(
            Math.max(...leftSignal.map(Math.abs)),
            Math.max(...rightSignal.map(Math.abs))
        );
        const normFactor = maxAmplitude > 1 ? 1 / maxAmplitude : 1;

        // Dessiner les 2 canaux
        const channelHeight = (height - 80) / 2;
        const channelY1 = 50;
        const channelY2 = channelY1 + channelHeight + 30;

        // Canal Gauche
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Canal Gauche (L)', 20, channelY1 - 10);

        // Grille canal gauche
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = channelY1 + (channelHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Ligne centrale gauche
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const leftMidY = channelY1 + channelHeight / 2;
        ctx.moveTo(0, leftMidY);
        ctx.lineTo(width, leftMidY);
        ctx.stroke();

        // Signal gauche
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < leftSignal.length; i++) {
            const x = (i / leftSignal.length) * width;
            const y = leftMidY - (leftSignal[i] * normFactor * channelHeight * 0.4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Canal Droit
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Canal Droit (R)', 20, channelY2 - 10);

        // Grille canal droit
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = channelY2 + (channelHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Ligne centrale droite
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const rightMidY = channelY2 + channelHeight / 2;
        ctx.moveTo(0, rightMidY);
        ctx.lineTo(width, rightMidY);
        ctx.stroke();

        // Signal droit
        ctx.strokeStyle = '#f85149';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < rightSignal.length; i++) {
            const x = (i / rightSignal.length) * width;
            const y = rightMidY - (rightSignal[i] * normFactor * channelHeight * 0.4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Calculer statistiques
        const leftPower = leftSignal.reduce((sum, v) => sum + v * v, 0) / leftSignal.length;
        const rightPower = rightSignal.reduce((sum, v) => sum + v * v, 0) / rightSignal.length;
        const leftLevel = Math.sqrt(leftPower) * 100;
        const rightLevel = Math.sqrt(rightPower) * 100;

        // Corrélation
        let correlation = 0;
        for (let i = 0; i < samples; i++) {
            correlation += leftSignal[i] * rightSignal[i];
        }
        correlation = (correlation / samples) * 100;

        // Économie mono vs stéréo
        const monoSaving = 50;

        // Mettre à jour les stats
        document.getElementById('chan-left-level').textContent = leftLevel.toFixed(0) + '%';
        document.getElementById('chan-right-level').textContent = rightLevel.toFixed(0) + '%';
        document.getElementById('chan-correlation').textContent = correlation.toFixed(0) + '%';
        document.getElementById('chan-mono-saving').textContent = monoSaving + '%';

        // Afficher les paramètres actifs sur le canvas
        ctx.fillStyle = colors.text;
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        const infoX = width - 20;
        let infoY = height - 80;

        ctx.fillText(`Mode: ${state.mode}`, infoX, infoY);
        infoY += 20;
        ctx.fillText(`Panoramique: ${state.pan > 0 ? 'D+' : state.pan < 0 ? 'G+' : 'C'}${Math.abs(state.pan)}`, infoX, infoY);
        infoY += 20;
        ctx.fillText(`Largeur: ${state.width}%`, infoX, infoY);
        infoY += 20;
        ctx.fillText(`Phase: ${state.phase}°`, infoX, infoY);
    }

    playStereoTone(state) {
        this.stopAudio();
        const ctx = this.getAudioContext();

        const osc = ctx.createOscillator();
        const merger = ctx.createChannelMerger(2);
        const gainL = ctx.createGain();
        const gainR = ctx.createGain();

        osc.frequency.value = state.freq;

        // Calculer les gains basés sur le pan
        const panNorm = state.pan / 100;
        const leftGain = Math.cos((panNorm + 1) * Math.PI / 4);
        const rightGain = Math.sin((panNorm + 1) * Math.PI / 4);

        gainL.gain.value = leftGain * 0.3;
        gainR.gain.value = rightGain * 0.3;

        osc.connect(gainL);
        osc.connect(gainR);
        gainL.connect(merger, 0, 0);
        gainR.connect(merger, 0, 1);
        merger.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 2);
        this.currentSource = osc;
    }

    updateChannelExplanation(state) {
        const explanations = {
            'stereo': 'La stéréo utilise 2 canaux indépendants. Le panoramique contrôle la position gauche/droite. La largeur contrôle la séparation stéréo. Le déphasage crée des effets spatiaux.',
            'mono': 'Le mode mono utilise un seul canal identique sur L et R. Économie de 50% sur la taille du fichier. Les paramètres pan/largeur/phase n\'ont pas d\'effet en mono.',
            'mid-side': 'Le codage Mid-Side sépare le signal central (Mid) des informations stéréo (Side). La largeur contrôle l\'intensité stéréo. Le déphasage modifie la spatialisation. Utilisé en mastering professionnel.'
        };

        const explanation = document.getElementById('chan-explanation');
        if (explanation) {
            explanation.textContent = explanations[state.mode] || explanations['stereo'];
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

    // ===== FORMATS COMPARISON =====
    initFormatsComparison() {
        this.formatsState = {
            duration: 3,
            quality: 'pro', // cd, pro, hires
            channels: 2
        };

        // Duration
        const durationSlider = document.getElementById('fmt-duration');
        const durationVal = document.getElementById('fmt-duration-val');
        if (durationSlider) {
            durationSlider.addEventListener('input', () => {
                this.formatsState.duration = parseInt(durationSlider.value);
                durationVal.textContent = this.formatsState.duration;
                this.updateFormatsDisplay();
            });
        }

        // Quick buttons for duration
        document.querySelectorAll('.btn-tiny[data-target="fmt-duration"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                durationSlider.value = val;
                this.formatsState.duration = val;
                durationVal.textContent = val;
                this.updateFormatsDisplay();
            });
        });

        // Quality preset
        const qualitySelect = document.getElementById('fmt-quality');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', () => {
                this.formatsState.quality = qualitySelect.value;
                this.updateFormatsDisplay();
            });
        }

        // Channels
        const channelsSelect = document.getElementById('fmt-ch');
        if (channelsSelect) {
            channelsSelect.addEventListener('change', () => {
                this.formatsState.channels = parseInt(channelsSelect.value);
                this.updateFormatsDisplay();
            });
        }

        this.updateFormatsDisplay();
    }

    getFormatDefinitions() {
        // Définitions complètes des formats audio
        return [
            {
                key: 'wav',
                name: 'WAV',
                fullName: 'Waveform Audio File',
                type: 'Lossless',
                compression: 'Aucune',
                quality: 5,
                color: '#0d6efd',
                usage: 'Production, mastering, archivage',
                bitrateCalculated: true // Calculé dynamiquement
            },
            {
                key: 'flac',
                name: 'FLAC',
                fullName: 'Free Lossless Audio Codec',
                type: 'Lossless',
                compression: '40-60%',
                quality: 5,
                color: '#198754',
                usage: 'Archivage, streaming Hi-Fi',
                compressionRatio: 0.5
            },
            {
                key: 'alac',
                name: 'ALAC',
                fullName: 'Apple Lossless Audio Codec',
                type: 'Lossless',
                compression: '40-60%',
                quality: 5,
                color: '#20c997',
                usage: 'Écosystème Apple, iTunes',
                compressionRatio: 0.55
            },
            {
                key: 'mp3_320',
                name: 'MP3 320k',
                fullName: 'MPEG-1 Audio Layer 3',
                type: 'Lossy',
                compression: '~90%',
                quality: 4,
                bitrate: 320000,
                color: '#fd7e14',
                usage: 'DJ, qualité maximale MP3'
            },
            {
                key: 'aac_256',
                name: 'AAC 256k',
                fullName: 'Advanced Audio Coding',
                type: 'Lossy',
                compression: '~92%',
                quality: 4,
                bitrate: 256000,
                color: '#9d4edd',
                usage: 'Streaming, YouTube, iTunes'
            },
            {
                key: 'mp3_192',
                name: 'MP3 192k',
                fullName: 'MPEG-1 Audio Layer 3',
                type: 'Lossy',
                compression: '~93%',
                quality: 3,
                bitrate: 192000,
                color: '#ffc107',
                usage: 'Streaming standard, podcasts'
            },
            {
                key: 'opus_128',
                name: 'Opus 128k',
                fullName: 'Opus Interactive Audio Codec',
                type: 'Lossy',
                compression: '~94%',
                quality: 4,
                bitrate: 128000,
                color: '#06d6a0',
                usage: 'Streaming moderne, VoIP, Discord'
            },
            {
                key: 'mp3_128',
                name: 'MP3 128k',
                fullName: 'MPEG-1 Audio Layer 3',
                type: 'Lossy',
                compression: '~95%',
                quality: 2,
                bitrate: 128000,
                color: '#dc3545',
                usage: 'Faible bande passante, ancien'
            }
        ];
    }

    getQualityPreset(quality) {
        const presets = {
            'cd': { sampleRate: 44100, bitDepth: 16, label: 'CD Quality' },
            'pro': { sampleRate: 48000, bitDepth: 24, label: 'Studio Pro' },
            'hires': { sampleRate: 96000, bitDepth: 24, label: 'Hi-Res Audio' }
        };
        return presets[quality] || presets['pro'];
    }

    updateFormatsDisplay() {
        const state = this.formatsState;
        const preset = this.getQualityPreset(state.quality);
        const formats = this.getFormatDefinitions();

        // Calculer la taille de chaque format
        const durationSec = state.duration * 60;
        const wavBitrate = preset.sampleRate * preset.bitDepth * state.channels;

        formats.forEach(fmt => {
            if (fmt.bitrateCalculated) {
                // WAV : calculé
                fmt.calculatedBitrate = wavBitrate;
            } else if (fmt.compressionRatio) {
                // Lossless compressé : basé sur WAV
                fmt.calculatedBitrate = wavBitrate * fmt.compressionRatio;
            } else {
                // Lossy : bitrate fixe
                fmt.calculatedBitrate = fmt.bitrate;
            }

            fmt.sizeMB = (fmt.calculatedBitrate * durationSec) / (8 * 1024 * 1024);
        });

        // Mettre à jour la visualisation par barres
        this.updateFormatsBars(formats, preset, state);

        // Mettre à jour le tableau
        this.updateFormatsTable(formats, preset, state);
    }

    updateFormatsBars(formats, preset, state) {
        const container = document.getElementById('formats-bars');
        if (!container) return;

        container.innerHTML = '';
        const maxSize = Math.max(...formats.map(f => f.sizeMB));

        formats.forEach(fmt => {
            const barItem = document.createElement('div');
            barItem.className = 'format-bar-item';

            const widthPercent = (fmt.sizeMB / maxSize) * 100;

            // Label avec badge
            const label = document.createElement('div');
            label.className = 'format-bar-label';
            label.innerHTML = `
                ${fmt.name}
                <span class="format-badge ${fmt.type.toLowerCase()}">${fmt.type}</span>
            `;

            // Wrapper + barre
            const wrapper = document.createElement('div');
            wrapper.className = 'format-bar-wrapper';

            const fill = document.createElement('div');
            fill.className = 'format-bar-fill';
            fill.style.width = widthPercent + '%';
            fill.style.background = fmt.color;

            const text = document.createElement('div');
            text.className = 'format-bar-text';
            text.textContent = fmt.sizeMB.toFixed(1) + ' MB';
            fill.appendChild(text);

            wrapper.appendChild(fill);

            // Économie par rapport au WAV
            const savings = document.createElement('div');
            savings.className = 'format-bar-savings';
            if (fmt.key !== 'wav') {
                const wavSize = formats[0].sizeMB;
                const savingsPercent = ((wavSize - fmt.sizeMB) / wavSize * 100);
                savings.textContent = `-${savingsPercent.toFixed(0)}%`;
                savings.style.color = 'var(--success-color)';
            } else {
                savings.textContent = '—';
                savings.style.color = 'var(--text-secondary)';
            }

            barItem.appendChild(label);
            barItem.appendChild(wrapper);
            barItem.appendChild(savings);
            container.appendChild(barItem);
        });
    }

    updateFormatsTable(formats, preset, state) {
        const tbody = document.getElementById('fmt-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        const wavSize = formats[0].sizeMB;

        formats.forEach(fmt => {
            const row = tbody.insertRow();

            // Format name
            const cellName = row.insertCell();
            cellName.innerHTML = `<span class="format-name">${fmt.name}</span><br><small style="color: var(--text-secondary)">${fmt.fullName}</small>`;

            // Type
            const cellType = row.insertCell();
            cellType.innerHTML = `<span class="format-badge ${fmt.type.toLowerCase()}">${fmt.type}</span>`;

            // Bitrate
            const cellBitrate = row.insertCell();
            const kbps = Math.round(fmt.calculatedBitrate / 1000);
            cellBitrate.textContent = kbps >= 1000 ? (kbps / 1000).toFixed(1) + ' Mbps' : kbps + ' kbps';

            // Size
            const cellSize = row.insertCell();
            cellSize.innerHTML = `<span class="format-size">${fmt.sizeMB.toFixed(2)} MB</span>`;

            // Compression
            const cellCompression = row.insertCell();
            if (fmt.key === 'wav') {
                cellCompression.textContent = '—';
            } else {
                const savingsPercent = ((wavSize - fmt.sizeMB) / wavSize * 100);
                cellCompression.innerHTML = `<span class="format-savings">${savingsPercent.toFixed(1)}%</span>`;
            }

            // Quality (stars)
            const cellQuality = row.insertCell();
            const stars = '★'.repeat(fmt.quality) + '☆'.repeat(5 - fmt.quality);
            cellQuality.textContent = stars;
            cellQuality.style.color = '#ffc107';

            // Usage
            const cellUsage = row.insertCell();
            cellUsage.innerHTML = `<span class="format-usage">${fmt.usage}</span>`;
        });
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
