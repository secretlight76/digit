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

        // Initialiser le système de redimensionnement responsive
        this.initResponsiveCanvas();

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

    // Système de redimensionnement responsive des canvas
    initResponsiveCanvas() {
        // Configuration des ratios pour chaque canvas
        // Adaptation dynamique min/max selon la taille d'écran
        const screenWidth = window.innerWidth;
        const minHeight = screenWidth < 480 ? 150 : screenWidth < 768 ? 180 : 200;
        const maxHeight = screenWidth < 480 ? 300 : screenWidth < 768 ? 400 : screenWidth < 1024 ? 500 : 600;

        this.canvasConfigs = {
            'playground-canvas': { ratio: 1200 / 300, minHeight: minHeight * 0.9, maxHeight: maxHeight * 1.1 },
            'sampling-canvas': { ratio: 900 / 500, minHeight: minHeight, maxHeight: maxHeight },
            'quantization-canvas': { ratio: 900 / 500, minHeight: minHeight, maxHeight: maxHeight },
            'aliasing-canvas': { ratio: 900 / 500, minHeight: minHeight, maxHeight: maxHeight },
            'channels-canvas': { ratio: 900 / 500, minHeight: minHeight, maxHeight: maxHeight }
        };

        // Redimensionner tous les canvas
        this.resizeAllCanvas();

        // Écouter les changements de taille de fenêtre
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Recalculer les limites min/max selon la nouvelle taille d'écran
                const screenWidth = window.innerWidth;
                const minHeight = screenWidth < 480 ? 150 : screenWidth < 768 ? 180 : 200;
                const maxHeight = screenWidth < 480 ? 300 : screenWidth < 768 ? 400 : screenWidth < 1024 ? 500 : 600;

                // Mettre à jour les configs
                Object.keys(this.canvasConfigs).forEach(canvasId => {
                    if (canvasId === 'playground-canvas') {
                        this.canvasConfigs[canvasId].minHeight = minHeight * 0.9;
                        this.canvasConfigs[canvasId].maxHeight = maxHeight * 1.1;
                    } else {
                        this.canvasConfigs[canvasId].minHeight = minHeight;
                        this.canvasConfigs[canvasId].maxHeight = maxHeight;
                    }
                });

                this.resizeAllCanvas();
                this.refreshActiveVisualization();
            }, 150);
        });
    }

    resizeAllCanvas() {
        Object.keys(this.canvasConfigs).forEach(canvasId => {
            this.resizeCanvas(canvasId);
        });
    }

    resizeCanvas(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const config = this.canvasConfigs[canvasId];
        const container = canvas.parentElement;

        // Obtenir le device pixel ratio pour les écrans haute résolution (Retina, etc.)
        const dpr = window.devicePixelRatio || 1;

        // Obtenir la largeur du conteneur (en tenant compte du padding)
        const containerStyle = window.getComputedStyle(container);
        const paddingX = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
        let availableWidth = container.clientWidth - paddingX;

        // Si le container est caché (display: none), clientWidth sera 0
        // Dans ce cas, utiliser une largeur par défaut ou la largeur du conteneur parent
        if (availableWidth <= 0) {
            // Remonter jusqu'à trouver un élément visible
            let parent = container.parentElement;
            while (parent && parent.clientWidth <= 0) {
                parent = parent.parentElement;
            }
            if (parent && parent.clientWidth > 0) {
                const parentStyle = window.getComputedStyle(parent);
                const parentPaddingX = parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
                availableWidth = parent.clientWidth - parentPaddingX - paddingX - 100; // Marge de sécurité
            } else {
                // Fallback: utiliser une largeur par défaut basée sur le viewport
                availableWidth = Math.min(window.innerWidth * 0.8, 1200);
            }
        }

        // Calculer la hauteur basée sur le ratio
        let height = availableWidth / config.ratio;

        // Appliquer les limites min/max
        height = Math.max(config.minHeight, Math.min(config.maxHeight, height));

        // Stocker les dimensions logiques AVANT de changer les dimensions du canvas
        canvas.logicalWidth = availableWidth;
        canvas.logicalHeight = height;
        canvas.dpr = dpr; // Stocker le DPR pour référence

        // Définir les dimensions CSS (taille d'affichage)
        canvas.style.width = availableWidth + 'px';
        canvas.style.height = height + 'px';

        // Définir les dimensions internes du canvas (résolution réelle × DPR pour netteté)
        // IMPORTANT : Changer width/height réinitialise automatiquement le contexte
        canvas.width = Math.floor(availableWidth * dpr);
        canvas.height = Math.floor(height * dpr);

        // Scaler le contexte pour compenser le DPR (après le reset automatique)
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
    }

    // Helper pour obtenir les dimensions logiques d'un canvas
    getCanvasDimensions(canvas) {
        // Utiliser les dimensions logiques si disponibles, sinon fallback sur les dimensions physiques
        if (canvas.logicalWidth && canvas.logicalHeight) {
            return {
                width: canvas.logicalWidth,
                height: canvas.logicalHeight
            };
        }
        // Fallback : retourner les dimensions réelles (sans DPR)
        return {
            width: canvas.clientWidth || canvas.width,
            height: canvas.clientHeight || canvas.height
        };
    }

    // DFT simplifiée pour visualisation spectrale
    computeDFT(signal, maxFreq) {
        const N = signal.length;
        const spectrum = [];
        const twoPi = 2 * Math.PI;

        // Ne calculer que les fréquences jusqu'à maxFreq
        const numFreqs = Math.min(N / 2, maxFreq);

        for (let k = 0; k < numFreqs; k++) {
            let real = 0;
            let imag = 0;

            for (let n = 0; n < N; n++) {
                const angle = (twoPi * k * n) / N;
                real += signal[n] * Math.cos(angle);
                imag -= signal[n] * Math.sin(angle);
            }

            // Magnitude (amplitude)
            const magnitude = Math.sqrt(real * real + imag * imag) / N;
            spectrum.push(magnitude);
        }

        return spectrum;
    }

    showSection(id) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
        this.activeSection = id;
        this.stopAudio();

        // Redimensionner le canvas de la section active (car il était peut-être caché avant)
        setTimeout(() => {
            const canvasMap = {
                'playground': 'playground-canvas',
                'sampling': 'sampling-canvas',
                'quantization': 'quantization-canvas',
                'aliasing': 'aliasing-canvas',
                'channels': 'channels-canvas'
            };
            const canvasId = canvasMap[id];
            if (canvasId) {
                this.resizeCanvas(canvasId);
            }
            this.refreshActiveVisualization();
        }, 50); // Petit délai pour que le CSS display prenne effet
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
                reconstruction: '#a855f7',
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
                reconstruction: '#8b5cf6',
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
            waveType: 'sine',
            freq: 440,
            vol: 30,
            sr: 44100,
            bits: 16,
            channels: 2
        };

        // Type d'onde
        const waveTypeSelect = document.getElementById('pg-wave-type');
        if (waveTypeSelect) {
            waveTypeSelect.addEventListener('change', () => {
                this.playgroundState.waveType = waveTypeSelect.value;
                this.scheduleDraw(() => this.drawPlaygroundWave(this.playgroundState));
            });
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
                this.scheduleDraw(() => this.drawPlaygroundWave(this.playgroundState));
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
        const { width, height } = this.getCanvasDimensions(canvas);

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

        // Générateur de forme d'onde - fonction helper
        const generateWaveform = (type, phase) => {
            switch (type) {
                case 'sine':
                    return Math.sin(phase);
                case 'square':
                    return phase % (2 * Math.PI) < Math.PI ? 1 : -1;
                case 'sawtooth':
                    return 2 * ((phase / (2 * Math.PI)) % 1) - 1;
                case 'triangle':
                    const t = (phase / (2 * Math.PI)) % 1;
                    return t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
                default:
                    return Math.sin(phase);
            }
        };

        // Nombre de cycles adaptatif selon la fréquence
        let cycles;
        if (state.freq < 200) cycles = 2;
        else if (state.freq < 500) cycles = 3;
        else if (state.freq < 1000) cycles = 4;
        else if (state.freq < 2000) cycles = 6;
        else if (state.freq < 3000) cycles = 8;
        else cycles = 10;

        const samples = 400;
        const points = [];
        const twoPi = 2 * Math.PI;

        // Générer le signal avec le type d'onde sélectionné
        for (let i = 0; i < samples; i++) {
            const phase = (i / samples) * cycles * twoPi;
            points.push(generateWaveform(state.waveType, phase));
        }

        // Amplitude basée sur le volume (0-100%)
        const amplitude = (state.vol / 100) * 0.4;

        // Dessiner onde continue
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const pointsLength = points.length;
        for (let i = 0; i < pointsLength; i++) {
            const x = (i / pointsLength) * width;
            const y = height / 2 - (points[i] * height * amplitude);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Points d'échantillonnage (limiter à 150 max)
        const samplesPerCycle = state.sr / state.freq;
        const totalSamplePoints = Math.min(Math.floor(cycles * samplesPerCycle), 150);
        const nyquist = state.sr / 2;

        // Ligne de reconstruction reliant les points échantillonnés
        ctx.strokeStyle = state.freq > nyquist ? colors.danger : colors.reconstruction;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        let firstPoint = true;
        for (let i = 0; i < totalSamplePoints; i++) {
            const ratio = i / totalSamplePoints;
            const idx = Math.floor(ratio * pointsLength);
            if (idx < pointsLength) {
                const x = (idx / pointsLength) * width;
                const y = height / 2 - (points[idx] * height * amplitude);
                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Dessiner les points d'échantillonnage
        ctx.fillStyle = state.freq > nyquist ? colors.danger : colors.sample;
        const pointRadius = width < 600 ? 3 : 5; // Adapter la taille des points

        for (let i = 0; i < totalSamplePoints; i++) {
            const ratio = i / totalSamplePoints;
            const idx = Math.floor(ratio * pointsLength);
            if (idx < pointsLength) {
                const x = (idx / pointsLength) * width;
                const y = height / 2 - (points[idx] * height * amplitude);

                ctx.beginPath();
                ctx.arc(x, y, pointRadius, 0, twoPi);
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
            sampleRate: 8000,
            sampleCount: 50
        };

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

        const countSlider = document.getElementById('samp-count');
        const countVal = document.getElementById('samp-count-val');
        if (countSlider) {
            countSlider.addEventListener('input', () => {
                this.samplingState.sampleCount = parseInt(countSlider.value);
                countVal.textContent = this.samplingState.sampleCount;
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
        const { width, height } = this.getCanvasDimensions(canvas);
        const nyquist = state.sampleRate / 2;
        const twoPi = 2 * Math.PI;

        // Fond
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // Grille simplifiée
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 8; i++) {
            const y = (height / 8) * i;
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

        // Afficher seulement 3-5 périodes du signal (zoom)
        const periodsToShow = state.signalFreq < 500 ? 3 : state.signalFreq < 2000 ? 4 : 5;
        const samplesPerPeriod = 50; // Points par période pour une courbe lisse
        const totalSamples = periodsToShow * samplesPerPeriod;

        // Générer le signal original (haute résolution)
        const signalPoints = [];
        for (let i = 0; i < totalSamples; i++) {
            const phase = (i / samplesPerPeriod) * twoPi;
            signalPoints.push(Math.sin(phase));
        }

        // Dessiner le signal original (ligne continue bleue)
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < signalPoints.length; i++) {
            const x = (i / signalPoints.length) * width;
            const y = height / 2 - (signalPoints[i] * height * 0.35);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Calculer le nombre d'échantillons réels selon le sample rate
        const duration = periodsToShow / state.signalFreq; // Durée en secondes
        const realSamples = Math.floor(duration * state.sampleRate);
        const numSamples = Math.min(realSamples, state.sampleCount);

        // Collecter les points échantillonnés
        const samplePoints = [];
        for (let i = 0; i < numSamples; i++) {
            const t = (i / (numSamples - 1)) * periodsToShow;
            const phase = t * twoPi;
            const value = Math.sin(phase);
            const x = (t / periodsToShow) * width;
            const y = height / 2 - (value * height * 0.35);
            samplePoints.push({ x, y, value });
        }

        // Lignes verticales depuis les points d'échantillonnage (en pointillés discrets)
        ctx.strokeStyle = colors.grid;
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        samplePoints.forEach(pt => {
            ctx.beginPath();
            ctx.moveTo(pt.x, 0);
            ctx.lineTo(pt.x, height);
            ctx.stroke();
        });
        ctx.setLineDash([]);

        // Signal reconstruit (ligne reliant les points échantillonnés)
        const isAliasing = state.signalFreq > nyquist;
        ctx.strokeStyle = isAliasing ? colors.danger : colors.success;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        samplePoints.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Points d'échantillonnage (gros points)
        ctx.fillStyle = isAliasing ? colors.danger : colors.success;
        samplePoints.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 6, 0, twoPi);
            ctx.fill();
        });

        // Textes informatifs
        ctx.fillStyle = colors.text;
        const fontSize = Math.max(12, Math.min(16, width * 0.02));
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`${state.signalFreq} Hz @ ${this.formatFreq(state.sampleRate)}`, 15, 25);
        ctx.fillText(`${numSamples} échantillons sur ${periodsToShow} période${periodsToShow > 1 ? 's' : ''}`, 15, 25 + fontSize + 5);

        // Légende simplifiée
        ctx.font = `${fontSize - 2}px Arial`;
        let legendY = height - 60;

        // Signal original (bleu)
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, legendY);
        ctx.lineTo(45, legendY);
        ctx.stroke();
        ctx.fillStyle = colors.text;
        ctx.fillText('Signal original', 55, legendY + 4);

        // Signal reconstruit (vert ou rouge)
        legendY += 20;
        ctx.strokeStyle = isAliasing ? colors.danger : colors.success;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(15, legendY);
        ctx.lineTo(45, legendY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillText('Reconstruit' + (isAliasing ? ' (aliasing!)' : ''), 55, legendY + 4);

        // Message d'avertissement si aliasing
        if (isAliasing) {
            ctx.fillStyle = colors.danger;
            ctx.font = `bold ${fontSize + 2}px Arial`;
            ctx.textAlign = 'right';
            ctx.fillText('⚠️ SOUS-ÉCHANTILLONNAGE !', width - 15, 30);
        }

        // Mise à jour du statut dans l'interface
        const status = document.getElementById('samp-status');
        const nyquistDisplay = document.getElementById('samp-nyquist');
        if (nyquistDisplay) nyquistDisplay.textContent = this.formatFreq(nyquist);
        if (status) {
            if (isAliasing) {
                status.textContent = '✗ ALIASING';
                status.className = 'status-error';
            } else {
                status.textContent = '✓ OK';
                status.className = 'status-ok';
            }
        }
    }

    // ===== QUANTIZATION LAB =====
    initQuantizationLab() {
        this.quantizationState = {
            bits: 8,
            freq: 440
        };

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
        const { width, height } = this.getCanvasDimensions(canvas);

        // Fond
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        const levels = Math.pow(2, state.bits);

        // Grille principale simplifiée
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 8; i++) {
            const y = (height / 8) * i;
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

        // Zoomer sur 1-2 périodes pour mieux voir l'effet
        const periodsToShow = 1.5;
        const samplesPerPeriod = 80;
        const totalSamples = Math.floor(periodsToShow * samplesPerPeriod);
        const twoPi = 2 * Math.PI;

        // Générer signal haute résolution
        const signalPoints = [];
        for (let i = 0; i < totalSamples; i++) {
            const phase = (i / samplesPerPeriod) * twoPi;
            signalPoints.push(Math.sin(phase));
        }

        // Dessiner les niveaux de quantification (lignes horizontales)
        // Afficher seulement pour les faibles résolutions (< 8 bits) où c'est utile
        const amplitude = 0.42;

        if (state.bits <= 8) {
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([3, 3]);
            ctx.globalAlpha = 0.5;

            for (let i = 0; i < levels; i++) {
                const levelValue = (i / (levels - 1)) * 2 - 1; // De -1 à +1
                const y = height / 2 - (levelValue * height * amplitude);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

        // Signal original (lisse, semi-transparent)
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        for (let i = 0; i < signalPoints.length; i++) {
            const x = (i / signalPoints.length) * width;
            const y = height / 2 - (signalPoints[i] * height * amplitude);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Signal quantifié (en escalier, bien visible)
        const levelsDivisor = levels / 2;
        const quantizedPoints = signalPoints.map(val => {
            const level = Math.round((val + 1) * levelsDivisor);
            return (level / levelsDivisor) - 1;
        });

        ctx.strokeStyle = colors.quantized;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < quantizedPoints.length; i++) {
            const x = (i / quantizedPoints.length) * width;
            const y = height / 2 - (quantizedPoints[i] * height * amplitude);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Infos et légende
        const snr = 6.02 * state.bits + 1.76;
        const range = 6 * state.bits;

        const fontSize = Math.max(12, Math.min(16, width * 0.02));
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`${state.bits} bits → ${levels} niveaux`, 15, 25);
        ctx.fillText(`SNR: ${snr.toFixed(1)} dB`, 15, 25 + fontSize + 5);

        // Légende
        ctx.font = `${fontSize - 2}px Arial`;
        let legendY = height - 60;

        // Signal original
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(15, legendY);
        ctx.lineTo(45, legendY);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.text;
        ctx.fillText('Signal original', 55, legendY + 4);

        // Signal quantifié
        legendY += 20;
        ctx.strokeStyle = colors.quantized;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(15, legendY);
        ctx.lineTo(45, legendY);
        ctx.stroke();
        ctx.fillText('Signal quantifié (escalier)', 55, legendY + 4);

        // Warning si très faible résolution
        if (state.bits <= 4) {
            ctx.fillStyle = colors.danger;
            ctx.font = `bold ${fontSize + 2}px Arial`;
            ctx.textAlign = 'right';
            ctx.fillText('⚠️ Résolution très faible !', width - 15, 30);
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
        const { width, height } = this.getCanvasDimensions(canvas);
        const nyquist = state.sampleRate / 2;
        const twoPi = 2 * Math.PI;

        // Fond
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // Diviser le canvas en deux parties
        const timeHeight = height * 0.5; // 50% pour signal temporel
        const freqHeight = height * 0.5; // 50% pour spectre FFT
        const freqTop = timeHeight;

        // === PARTIE 1: SIGNAL TEMPOREL ===
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width, timeHeight);
        ctx.clip();

        // Grille temporelle
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = (timeHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Ligne centrale
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, timeHeight / 2);
        ctx.lineTo(width, timeHeight / 2);
        ctx.stroke();

        // Signal temporel : afficher la fréquence d'entrée réelle (toujours 3-4 périodes)
        const periodsToShow = 3.5;
        const samplesPerPeriod = 60;
        const totalTimeSamples = Math.floor(periodsToShow * samplesPerPeriod);
        const displayedSignal = [];

        for (let i = 0; i < totalTimeSamples; i++) {
            const phase = (i / samplesPerPeriod) * twoPi;
            displayedSignal.push(Math.sin(phase));
        }

        // Dessiner le signal continu
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < displayedSignal.length; i++) {
            const x = (i / displayedSignal.length) * width;
            const y = timeHeight / 2 - (displayedSignal[i] * timeHeight * 0.35);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Calculer combien d'échantillons on aurait sur cette durée
        const displayDuration = periodsToShow / state.inputFreq; // Durée en secondes
        const numSamplePoints = Math.floor(displayDuration * state.sampleRate);
        const maxSamplePoints = Math.min(numSamplePoints, 100); // Limiter à 100 points

        // Dessiner les points d'échantillonnage sur le signal
        ctx.fillStyle = state.inputFreq > nyquist ? colors.danger : colors.success;

        for (let i = 0; i < maxSamplePoints; i++) {
            const sampleTime = (i / state.sampleRate) / displayDuration; // Position relative 0-1
            if (sampleTime > 1) break;

            const signalIdx = Math.floor(sampleTime * displayedSignal.length);
            if (signalIdx >= displayedSignal.length) continue;

            const x = (signalIdx / displayedSignal.length) * width;
            const y = timeHeight / 2 - (displayedSignal[signalIdx] * timeHeight * 0.35);

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, twoPi);
            ctx.fill();
        }

        // Titre
        const fontSize = Math.max(12, Math.min(14, width * 0.02));
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`Signal: ${state.inputFreq} Hz`, 15, 20);

        ctx.restore();

        // === PARTIE 2: SPECTRE FFT ===
        ctx.save();

        // Ligne de séparation
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, freqTop);
        ctx.lineTo(width, freqTop);
        ctx.stroke();

        // Grille fréquentielle
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = freqTop + (freqHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Zoom fixe : 20 Hz à 30000 Hz (indépendant du sample rate)
        const minFreqDisplay = 20;
        const maxFreqDisplay = 30000;
        const freqRange = maxFreqDisplay - minFreqDisplay;

        const isAliasing = state.inputFreq > nyquist;
        const peakHeight = freqHeight * 0.7;

        // Fonction helper pour convertir fréquence en position X
        const freqToX = (freq) => {
            if (freq < minFreqDisplay || freq > maxFreqDisplay) return null;
            return ((freq - minFreqDisplay) / freqRange) * width;
        };

        // 1. Dessiner la fréquence d'entrée (toujours en bleu, toujours au même endroit)
        const inputX = freqToX(state.inputFreq);
        if (inputX !== null) {
            ctx.fillStyle = colors.signal;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(inputX - 8, freqTop + freqHeight - peakHeight, 16, peakHeight);
            ctx.globalAlpha = 1;

            // Label fréquence d'entrée
            ctx.fillStyle = colors.signal;
            ctx.font = `${fontSize - 1}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`${state.inputFreq.toFixed(0)} Hz`, inputX, freqTop + freqHeight - peakHeight - 5);
            ctx.fillText('(entrée)', inputX, freqTop + freqHeight - peakHeight - 18);
        }

        // 2. Calculer et dessiner TOUS les alias visibles dans la gamme 20-30000 Hz
        if (isAliasing) {
            const aliases = this.calculateAllAliases(state.inputFreq, state.sampleRate, minFreqDisplay, maxFreqDisplay);

            // Trier les alias par distance à la fréquence perçue (les plus importants d'abord)
            const perceivedFreq = this.calculateAliasingFreq(state.inputFreq, state.sampleRate);
            const sortedAliases = aliases.sort((a, b) => {
                const distA = Math.abs(a - perceivedFreq);
                const distB = Math.abs(b - perceivedFreq);
                return distA - distB;
            });

            // Dessiner tous les alias avec des hauteurs décroissantes
            sortedAliases.forEach((aliasFreq, index) => {
                const aliasX = freqToX(aliasFreq);
                if (aliasX !== null && Math.abs(aliasX - (inputX || -1000)) > 20) {
                    // Hauteur et opacité décroissantes selon l'importance
                    const importance = Math.max(0.3, 1 - (index * 0.12));
                    const barHeight = peakHeight * 0.75 * importance;

                    // Nuances de rouge pour les alias
                    if (index === 0) {
                        ctx.fillStyle = colors.danger; // Rouge vif pour l'alias principal
                    } else if (index === 1) {
                        ctx.fillStyle = '#ff6b6b'; // Rouge moyen
                    } else if (index === 2) {
                        ctx.fillStyle = '#ff8787'; // Rouge clair
                    } else {
                        ctx.fillStyle = '#ffa3a3'; // Rouge très clair
                    }

                    ctx.globalAlpha = 0.8;
                    ctx.fillRect(aliasX - 7, freqTop + freqHeight - barHeight, 14, barHeight);
                    ctx.globalAlpha = 1;
                }
            });

            // Labels pour les 4 premiers alias les plus importants
            ctx.font = `${fontSize - 2}px Arial`;
            ctx.textAlign = 'center';

            const maxLabels = Math.min(4, sortedAliases.length);
            for (let i = 0; i < maxLabels; i++) {
                const aliasFreq = sortedAliases[i];
                const aliasX = freqToX(aliasFreq);
                if (aliasX !== null && Math.abs(aliasX - (inputX || -1000)) > 20) {
                    const importance = Math.max(0.3, 1 - (i * 0.12));
                    const barHeight = peakHeight * 0.75 * importance;

                    // Couleur du label selon l'importance
                    if (i === 0) {
                        ctx.fillStyle = colors.danger;
                    } else if (i === 1) {
                        ctx.fillStyle = '#ff6b6b';
                    } else if (i === 2) {
                        ctx.fillStyle = '#ff8787';
                    } else {
                        ctx.fillStyle = '#ffa3a3';
                    }

                    ctx.fillText(`${aliasFreq.toFixed(0)} Hz`, aliasX, freqTop + freqHeight - barHeight - 5);
                    if (i === 0) {
                        ctx.fillText('(principal)', aliasX, freqTop + freqHeight - barHeight - 18);
                    } else {
                        ctx.fillText(`(alias ${i+1})`, aliasX, freqTop + freqHeight - barHeight - 18);
                    }
                }
            }

            // Afficher le nombre total d'alias détectés
            ctx.fillStyle = colors.text;
            ctx.font = `${fontSize - 2}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillText(`${aliases.length} alias détectés`, 15, freqTop + 40);
        }

        // 3. Ligne de Nyquist (si visible dans la gamme)
        const nyquistX = freqToX(nyquist);
        if (nyquistX !== null) {
            ctx.strokeStyle = colors.warning;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(nyquistX, freqTop);
            ctx.lineTo(nyquistX, freqTop + freqHeight);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label Nyquist
            ctx.fillStyle = colors.warning;
            ctx.font = `${fontSize - 2}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillText(`Nyquist: ${this.formatFreq(nyquist)}`, nyquistX + 5, freqTop + 20);
        }

        // Labels axes
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('Spectre Fréquentiel (20 Hz - 30 kHz)', 15, freqTop + 20);

        // Échelle fréquentielle
        ctx.font = `${fontSize - 2}px Arial`;
        ctx.fillStyle = colors.text;
        ctx.textAlign = 'center';
        const freqMarkers = [100, 1000, 5000, 10000, 20000];
        for (const marker of freqMarkers) {
            const markerX = freqToX(marker);
            if (markerX !== null) {
                ctx.fillText(`${marker >= 1000 ? (marker / 1000) + 'k' : marker}`, markerX, freqTop + freqHeight + 15);
            }
        }

        // Message d'avertissement
        ctx.textAlign = 'right';
        if (isAliasing) {
            const perceivedFreq = this.calculateAliasingFreq(state.inputFreq, state.sampleRate);
            ctx.fillStyle = colors.danger;
            ctx.font = `bold ${fontSize + 1}px Arial`;
            ctx.fillText(`⚠️ ALIASING: ${state.inputFreq} Hz → ${perceivedFreq.toFixed(0)} Hz`, width - 15, freqTop + 20);

            document.getElementById('alias-perceived').textContent = this.formatFreq(perceivedFreq);
            const status = document.getElementById('alias-status');
            status.textContent = '⚠️ Aliasing détecté';
            status.className = 'status-error';
        } else {
            ctx.fillStyle = colors.success;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillText('✓ Pas d\'aliasing', width - 15, freqTop + 20);

            document.getElementById('alias-perceived').textContent = this.formatFreq(state.inputFreq);
            const status = document.getElementById('alias-status');
            status.textContent = '✓ Pas d\'aliasing';
            status.className = 'status-ok';
        }

        ctx.restore();
        document.getElementById('alias-nyquist').textContent = this.formatFreq(nyquist);
    }

    // Calculer tous les alias d'un signal dans une gamme de fréquences donnée
    calculateAllAliases(inputFreq, sampleRate, minFreq, maxFreq) {
        const aliasSet = new Set(); // Utiliser Set pour éviter doublons
        const nyquist = sampleRate / 2;

        // Si pas d'aliasing, retourner tableau vide
        if (inputFreq <= nyquist) {
            return [];
        }

        // Méthode 1: Repliement autour des multiples du sample rate
        // Un signal à f génère des composantes à |n*sr ± f| où n = 1, 2, 3...
        for (let n = 1; n <= 20; n++) {
            // Repliement par le bas : n*sr - f
            const alias1 = n * sampleRate - inputFreq;
            // Repliement par le haut : n*sr + f
            const alias2 = n * sampleRate + inputFreq;

            // Ramener dans la bande 0-Nyquist
            const foldedAlias1 = this.calculateAliasingFreq(alias1, sampleRate);
            const foldedAlias2 = this.calculateAliasingFreq(alias2, sampleRate);

            // Ajouter si dans la gamme visible
            if (foldedAlias1 >= minFreq && foldedAlias1 <= maxFreq) {
                aliasSet.add(Math.round(foldedAlias1));
            }
            if (foldedAlias2 >= minFreq && foldedAlias2 <= maxFreq) {
                aliasSet.add(Math.round(foldedAlias2));
            }
        }

        // Méthode 2: Repliement direct - balayer toutes les copies spectrales
        // Pour une fréquence f > Nyquist, elle apparaît aussi à:
        // f mod (2*Nyquist) si dans [0, Nyquist]
        // 2*Nyquist - (f mod (2*Nyquist)) si dans [Nyquist, 2*Nyquist]
        let currentFreq = inputFreq;
        for (let i = 0; i < 30; i++) {
            currentFreq = currentFreq - sampleRate;
            if (currentFreq < 0) break;

            const folded = this.calculateAliasingFreq(currentFreq, sampleRate);
            if (folded >= minFreq && folded <= maxFreq) {
                aliasSet.add(Math.round(folded));
            }
        }

        // Convertir Set en Array et filtrer la fréquence d'entrée si elle est dans la gamme
        const aliases = Array.from(aliasSet).filter(freq =>
            Math.abs(freq - inputFreq) > 50 // Exclure fréquence originale et très proches
        );

        return aliases;
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
        const { width, height } = this.getCanvasDimensions(canvas);

        // Fond
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // Diviser le canvas en deux parties
        const waveformWidth = width * 0.58;  // 58% pour formes d'ondes
        const goniometerWidth = width * 0.42;  // 42% pour goniomètre
        const goniometerLeft = waveformWidth;

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

        // Normaliser les signaux
        const maxAmplitude = Math.max(
            Math.max(...leftSignal.map(Math.abs)),
            Math.max(...rightSignal.map(Math.abs))
        );
        const normFactor = maxAmplitude > 0.001 ? 1 / maxAmplitude : 1;

        // Layout responsive - Calculs proportionnels basés sur la hauteur du canvas
        // Marges et espacements en pourcentages
        const topMargin = height * 0.06;       // 6% du haut pour marge
        const channelGap = height * 0.06;      // 6% d'écart entre les canaux
        const bottomMargin = height * 0.06;    // 6% du bas pour marge

        // Hauteur disponible pour les deux canaux
        const availableHeight = height - topMargin - bottomMargin - channelGap;
        const channelHeight = availableHeight / 2;

        // Canal Gauche (haut)
        const ch1Top = topMargin;
        const ch1Bottom = ch1Top + channelHeight;
        const ch1Center = (ch1Top + ch1Bottom) / 2;
        const ch1Height = channelHeight;

        // Canal Droit (bas)
        const ch2Top = ch1Bottom + channelGap;
        const ch2Bottom = ch2Top + channelHeight;
        const ch2Center = (ch2Top + ch2Bottom) / 2;
        const ch2Height = channelHeight;

        // Amplitude du signal : 35% de la hauteur du canal (avec marge de sécurité)
        const signalAmplitude = channelHeight * 0.35;

        // === PARTIE 1: FORMES D'ONDES (GAUCHE) ===
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, waveformWidth, height);
        ctx.clip();

        // ===== CANAL GAUCHE =====
        ctx.fillStyle = colors.text;
        const fontSize = Math.max(12, Math.min(14, height * 0.025));
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('Canal Gauche (L)', waveformWidth * 0.02, ch1Top - fontSize * 0.5);

        // Grille
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = ch1Top + (ch1Height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(waveformWidth, y);
            ctx.stroke();
        }

        // Ligne centrale
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, ch1Center);
        ctx.lineTo(waveformWidth, ch1Center);
        ctx.stroke();

        // Signal gauche
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < leftSignal.length; i++) {
            const x = (i / leftSignal.length) * waveformWidth;
            const y = ch1Center - (leftSignal[i] * normFactor * signalAmplitude);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // ===== CANAL DROIT =====
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText('Canal Droit (R)', waveformWidth * 0.02, ch2Top - fontSize * 0.5);

        // Grille
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = ch2Top + (ch2Height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(waveformWidth, y);
            ctx.stroke();
        }

        // Ligne centrale
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, ch2Center);
        ctx.lineTo(waveformWidth, ch2Center);
        ctx.stroke();

        // Signal droit
        ctx.strokeStyle = '#f85149';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < rightSignal.length; i++) {
            const x = (i / rightSignal.length) * waveformWidth;
            const y = ch2Center - (rightSignal[i] * normFactor * signalAmplitude);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.restore();

        // === PARTIE 2: GONIOMÈTRE (DROITE) ===
        ctx.save();

        // Ligne de séparation verticale
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(goniometerLeft, 0);
        ctx.lineTo(goniometerLeft, height);
        ctx.stroke();

        // Centre du goniomètre
        const gonoX = goniometerLeft + goniometerWidth / 2;
        const gonoY = height / 2;
        const gonoRadius = Math.min(goniometerWidth, height) * 0.4;

        // Grille circulaire du goniomètre
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;

        // Cercles concentriques
        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(gonoX, gonoY, (gonoRadius / 3) * i, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Axes X et Y
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        // Axe horizontal (Side)
        ctx.beginPath();
        ctx.moveTo(gonoX - gonoRadius, gonoY);
        ctx.lineTo(gonoX + gonoRadius, gonoY);
        ctx.stroke();
        // Axe vertical (Mid)
        ctx.beginPath();
        ctx.moveTo(gonoX, gonoY - gonoRadius);
        ctx.lineTo(gonoX, gonoY + gonoRadius);
        ctx.stroke();
        ctx.setLineDash([]);

        // Diagonales (références stéréo)
        ctx.strokeStyle = colors.grid;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(gonoX - gonoRadius * 0.7, gonoY - gonoRadius * 0.7);
        ctx.lineTo(gonoX + gonoRadius * 0.7, gonoY + gonoRadius * 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gonoX - gonoRadius * 0.7, gonoY + gonoRadius * 0.7);
        ctx.lineTo(gonoX + gonoRadius * 0.7, gonoY - gonoRadius * 0.7);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Dessiner le tracé Lissajous (Mid vs Side)
        // Sous-échantillonner pour de meilleures performances
        const gonoSampleStep = Math.max(1, Math.floor(leftSignal.length / 100));

        // Tracer la courbe
        ctx.strokeStyle = '#a855f7'; // Violet
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();

        for (let i = 0; i < leftSignal.length; i += gonoSampleStep) {
            const L = leftSignal[i] * normFactor;
            const R = rightSignal[i] * normFactor;
            // Calculer Mid (L+R) et Side (L-R)
            const Mid = (L + R) / 2;
            const Side = (L - R) / 2;
            // X = Side (horizontal), Y = Mid (vertical)
            // Quand L=R (mono), Side=0 donc ligne verticale au centre
            // Inverser signe X : quand on panoramise à droite (R>L), on va à droite
            const x = gonoX - Side * gonoRadius;
            const y = gonoY - Mid * gonoRadius; // Inverser Y pour affichage correct

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Labels
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Goniomètre (M/S)', gonoX, 20);

        ctx.font = `${fontSize - 2}px Arial`;
        ctx.fillText('-S', gonoX - gonoRadius - 12, gonoY + 5);
        ctx.fillText('+S', gonoX + gonoRadius + 12, gonoY + 5);
        ctx.fillText('+M', gonoX, gonoY - gonoRadius - 5);
        ctx.fillText('-M', gonoX, gonoY + gonoRadius + 15);

        ctx.restore();

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

        // Paramètres en bas à droite (zone y=475-500)
        ctx.fillStyle = colors.text;
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`Mode: ${state.mode} | Pan: ${state.pan} | Largeur: ${state.width}% | Phase: ${state.phase}°`, width - 10, 490);
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
