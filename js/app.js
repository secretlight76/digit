/**
 * Lab Audio - Version Optimisée et Allégée
 */
import * as Tone from 'tone';

class AudioLab {
    constructor() {
        this.synth = null;
        this.panner = null;
        this.noise = null;
        this.isPlaying = false;
        this.playgroundEffects = {}; // To hold effects for the playground
        this.animationFrame = null;
        this.activeSection = 'playground';
        this.pendingDraws = new Set();
        this.init();
    }

    init() {
        console.log('AudioLab initialisé');

        // Flag to track if audio has been initialized
        this.audioInitialized = false;

        // Resume AudioContext on user interaction (required by browser autoplay policy)
        const resumeAudioContext = () => {
            if (Tone.context.state === 'suspended') {
                Tone.context.resume().catch(err => console.log('AudioContext resume failed:', err));
            }
            // Initialize audio components after context is ready
            if (!this.audioInitialized) {
                this.initializeAudio();
            }
            // Remove listener after first interaction
            document.removeEventListener('click', resumeAudioContext);
            document.removeEventListener('touchstart', resumeAudioContext);
        };
        document.addEventListener('click', resumeAudioContext);
        document.addEventListener('touchstart', resumeAudioContext);

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

        // Initialiser les sections (sans audio)
        this.initPlayground();
        this.initSamplingLab();
        this.initQuantizationLab();
        this.initAliasingLab();
        this.initChannelsLab();
        this.initCalculators();
        this.initFormatsComparison();

        this.showSection('playground');
    }

    initializeAudio() {
        if (this.audioInitialized) return;
        this.audioInitialized = true;

        // Initialiser les composants audio du Playground
        this.masterVolume = new Tone.Volume(0).toDestination();
        this.playgroundEffects.lowpassFilter = new Tone.Filter(22050, "lowpass").connect(this.masterVolume);

        // Create a real quantizer using a custom Tone.Effect with proper bit depth math
        this.playgroundEffects.quantizer = this.createQuantizerEffect(16);
        this.playgroundEffects.quantizer.connect(this.playgroundEffects.lowpassFilter);

        // Le synth connected to quantizer
        this.synth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.3 },
            volume: 0
        });
        // Connect synth to the quantizer's input
        this.synth.connect(this.playgroundEffects.quantizer.input);

        // Store current bits for tracking changes
        this.currentBits = 16;
    }

    createQuantizerEffect(bits) {
        // Create a quantizer using ScriptProcessor for mathematically correct quantization
        // No gain compensation - shows the true effect of bit depth reduction

        const input = new Tone.Gain();
        const output = new Tone.Gain();

        const quantizerState = {
            bits: bits,
            processor: null
        };

        // Initialize processor when first needed
        const initProcessor = () => {
            if (quantizerState.processor) return;

            try {
                const ctx = Tone.getContext();
                let nativeContext = null;

                // Tone.js wraps the native AudioContext
                // In Tone.js 14.x, the native context is at ctx._context._nativeContext
                if (ctx._context && ctx._context._nativeContext &&
                    typeof ctx._context._nativeContext.createScriptProcessor === 'function') {
                    nativeContext = ctx._context._nativeContext;
                } else if (ctx.rawContext && typeof ctx.rawContext.createScriptProcessor === 'function') {
                    // Fallback for other Tone versions
                    nativeContext = ctx.rawContext;
                } else if (ctx._context && typeof ctx._context.createScriptProcessor === 'function') {
                    // Fallback if _nativeContext doesn't exist
                    nativeContext = ctx._context;
                }

                if (!nativeContext) {
                    console.warn('ScriptProcessor not available, audio will pass through unquantized');
                    // Fallback: connect input directly to output
                    input.disconnect();
                    input.connect(output);
                    return;
                }

                const processor = nativeContext.createScriptProcessor(4096, 1, 1);
                processor.onaudioprocess = (e) => {
                    const inp = e.inputBuffer.getChannelData(0);
                    const out = e.outputBuffer.getChannelData(0);
                    const bitsVal = quantizerState.bits;
                    const levels = Math.pow(2, bitsVal);
                    const step = 2 / (levels - 1);  // Correct quantization step

                    for (let i = 0; i < inp.length; i++) {
                        // Map sample from [-1, 1] to [0, levels-1] index space
                        const normalized = (inp[i] + 1) / step;
                        const levelIndex = Math.round(normalized);
                        const clampedIndex = Math.max(0, Math.min(levels - 1, levelIndex));
                        // Map back to [-1, 1] with proper level anchoring
                        out[i] = -1 + clampedIndex * step;
                    }
                };

                // Connect using the underlying Web Audio nodes
                // Tone.Gain nodes have _gainNode property that is the native GainNode
                input._gainNode.connect(processor);
                processor.connect(output._gainNode);
                quantizerState.processor = processor;
            } catch (err) {
                console.warn('ScriptProcessor initialization failed, audio will pass through unquantized:', err.message);
                // Fallback: connect input directly to output
                input.disconnect();
                input.connect(output);
            }
        };

        return {
            input: input,
            output: output,
            connect: function(dest) {
                initProcessor();
                return output.connect(dest);
            },
            setBits: function(newBits) {
                quantizerState.bits = newBits;
            },
            disconnect: function() {
                if (quantizerState.processor) {
                    quantizerState.processor.disconnect();
                    quantizerState.processor = null;
                }
                output.disconnect();
            },
            dispose: function() {
                this.disconnect();
            }
        };
    }

    generateQuantizationCurve(bits) {
        const length = 65536;
        const curve = new Float32Array(length);
        const levels = Math.pow(2, bits);
        const step = 2 / (levels - 1);

        for (let i = 0; i < length; i++) {
            // Map index to [-1, 1] range
            const x = (i / (length - 1)) * 2 - 1;

            // Quantize using proper level anchoring
            const normalized = (x + 1) / step;
            const levelIndex = Math.round(normalized);
            const clampedIndex = Math.max(0, Math.min(levels - 1, levelIndex));
            curve[i] = -1 + clampedIndex * step;
        }

        return curve;
    }

    // Système de redimensionnement responsive des canvas
    initResponsiveCanvas() {
        // Configuration des ratios pour chaque canvas
        // Adaptation dynamique min/max selon la taille d'écran
        const screenWidth = window.innerWidth;
        const minHeight = screenWidth < 480 ? 150 : screenWidth < 768 ? 180 : 200;
        const maxHeight = screenWidth < 480 ? 300 : screenWidth < 768 ? 400 : screenWidth < 1024 ? 500 : 600;

        this.canvasConfigs = {
            'playground-canvas-original': { ratio: 900 / 250, minHeight: minHeight * 0.4, maxHeight: maxHeight * 0.5 },
            'playground-canvas-processed': { ratio: 900 / 250, minHeight: minHeight * 0.4, maxHeight: maxHeight * 0.5 },
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
                    if (canvasId.startsWith('playground-canvas')) {
                        this.canvasConfigs[canvasId].minHeight = minHeight * 0.4;
                        this.canvasConfigs[canvasId].maxHeight = maxHeight * 0.5;
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
                'playground': ['playground-canvas-original', 'playground-canvas-processed'],
                'sampling': 'sampling-canvas',
                'quantization': 'quantization-canvas',
                'aliasing': 'aliasing-canvas',
                'channels': 'channels-canvas'
            };
            const canvasId = canvasMap[id];
            if (canvasId) {
                if (Array.isArray(canvasId)) {
                    canvasId.forEach(cid => this.resizeCanvas(cid));
                } else {
                    this.resizeCanvas(canvasId);
                }
            }
            this.refreshActiveVisualization();
        }, 50); // Petit délai pour que le CSS display prenne effet
    }

    getAudioContext() {
        return Tone.context;
    }

    stopAudio() {
        if (!this.isPlaying) return;
        
        if (this.activeSection === 'playground' && this.synth) {
            this.synth.triggerRelease();
        } else {
            // Fallback for other labs
            this.synth?.dispose();
            this.panner?.dispose();
            this.noise?.dispose();
            this.synth = null;
        }
        this.isPlaying = false;
    }

    // OPTIMISATION: Ne redessiner que la section active
    refreshActiveVisualization() {
        if (this.activeSection === 'playground' && this.playgroundState) {
            this.drawPlaygroundOriginalWave(this.playgroundState);
            this.drawPlaygroundProcessedWave(this.playgroundState);
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
    scheduleDraw(key, drawFn) {
        // Handle case where only drawFn is passed (key is optional)
        if (typeof key === 'function' && drawFn === undefined) {
            drawFn = key;
            key = `draw_${Date.now()}_${Math.random()}`;
        }

        if (!drawFn || typeof drawFn !== 'function') {
            console.warn('scheduleDraw called with invalid drawFn:', drawFn);
            return;
        }

        if (this.pendingDraws.has(key)) return;

        this.pendingDraws.add(key);
        requestAnimationFrame(() => {
            drawFn.call(this);
            this.pendingDraws.delete(key);
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
                this.scheduleDraw('pgOriginalWave', () => this.drawPlaygroundOriginalWave(this.playgroundState));
                this.scheduleDraw('pgProcessedWave', () => this.drawPlaygroundProcessedWave(this.playgroundState));
                // Mettre à jour le type d'onde sur le synth persistant
                if (this.synth) {
                    this.synth.oscillator.type = this.playgroundState.waveType;
                }
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
                this.scheduleDraw('pgOriginalWave', () => this.drawPlaygroundOriginalWave(this.playgroundState));
                this.scheduleDraw('pgProcessedWave', () => this.drawPlaygroundProcessedWave(this.playgroundState));
                if (this.isPlaying) {
                    // Appliquer l'aliasing en temps réel
                    const nyquist = this.playgroundState.sr / 2;
                    const targetFreq = this.playgroundState.freq > nyquist ? this.calculateAliasingFreq(this.playgroundState.freq, this.playgroundState.sr) : this.playgroundState.freq;
                    this.synth.frequency.rampTo(targetFreq, 0.05);
                }
            });
        }

        // Volume
        const volSlider = document.getElementById('pg-volume');
        const volVal = document.getElementById('pg-vol-value');
        if (volSlider) {
            volSlider.addEventListener('input', () => {
                this.playgroundState.vol = parseInt(volSlider.value);
                this.scheduleDraw('pgOriginalWave', () => this.drawPlaygroundOriginalWave(this.playgroundState));
                this.scheduleDraw('pgProcessedWave', () => this.drawPlaygroundProcessedWave(this.playgroundState));
                if (this.isPlaying && this.masterVolume) {
                    this.masterVolume.volume.rampTo(Tone.gainToDb(this.playgroundState.vol / 100), 0.05);
                }
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
                this.scheduleDraw('pgOriginalWaveSliderSR', () => this.drawPlaygroundOriginalWave(this.playgroundState));
                this.scheduleDraw(() => this.drawPlaygroundProcessedWave(this.playgroundState));

                // Mettre à jour l'effet audio en temps réel
                if (this.isPlaying) {
                    const nyquist = this.playgroundState.sr / 2;
                    this.playgroundEffects.lowpassFilter.frequency.rampTo(nyquist, 0.05);

                    // Mettre à jour la fréquence du synth si le statut d'aliasing change
                    const isAliasing = this.playgroundState.freq > nyquist;
                    const targetFreq = isAliasing ? this.calculateAliasingFreq(this.playgroundState.freq, this.playgroundState.sr) : this.playgroundState.freq;
                    this.synth.frequency.rampTo(targetFreq, 0.05);
                }
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
                this.scheduleDraw(() => this.drawPlaygroundOriginalWave(this.playgroundState));
                this.scheduleDraw(() => this.drawPlaygroundProcessedWave(this.playgroundState));
                if (this.isPlaying) {
                    const nyquist = this.playgroundState.sr / 2;
                    this.playgroundEffects.lowpassFilter.frequency.rampTo(nyquist, 0.05);

                    // Mettre à jour la fréquence du synth si le statut d'aliasing change
                    const isAliasing = this.playgroundState.freq > nyquist;
                    const targetFreq = isAliasing ? this.calculateAliasingFreq(this.playgroundState.freq, this.playgroundState.sr) : this.playgroundState.freq;
                    this.synth.frequency.rampTo(targetFreq, 0.05);
                }
            });
        });

        // Bit Depth
        const bdSlider = document.getElementById('pg-bit-depth');
        const bdVal = document.getElementById('pg-bd-value');
        if (bdSlider) {
            bdSlider.addEventListener('input', () => {
                this.playgroundState.bits = parseInt(bdSlider.value);
                this.scheduleDraw('pgOriginalWaveSliderBD', () => this.drawPlaygroundOriginalWave(this.playgroundState));
                this.scheduleDraw('pgProcessedWaveSliderBD', () => this.drawPlaygroundProcessedWave(this.playgroundState));

                if (this.isPlaying && this.playgroundEffects.quantizer) {
                    // Update bit depth in real time
                    this.playgroundEffects.quantizer.setBits(this.playgroundState.bits);
                }
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
                this.scheduleDraw('pgOriginalWaveQuickBD', () => this.drawPlaygroundOriginalWave(this.playgroundState));
                this.scheduleDraw('pgProcessedWaveQuickBD', () => this.drawPlaygroundProcessedWave(this.playgroundState));
                if (this.isPlaying && this.playgroundEffects.quantizer) {
                    this.playgroundEffects.quantizer.setBits(this.playgroundState.bits);
                }
            });
        });

        // Channels
        const channels = document.getElementById('pg-channels');
        if (channels) {
            channels.addEventListener('change', () => {
                this.playgroundState.channels = parseInt(channels.value);
                this.updatePlaygroundStats(this.playgroundState);
                this.scheduleDraw(() => this.drawPlaygroundOriginalWave(this.playgroundState));
                this.scheduleDraw(() => this.drawPlaygroundProcessedWave(this.playgroundState));
            });
        }

        // Play/Stop
        document.getElementById('pg-play')?.addEventListener('click', () => {
            if (!this.isPlaying) {
                this.playPlaygroundTone(this.playgroundState);
            }
        });

        document.getElementById('pg-stop')?.addEventListener('click', () => {
            this.stopAudio();
        });

        this.updatePlaygroundStats(this.playgroundState);
        this.drawPlaygroundOriginalWave(this.playgroundState);
        this.drawPlaygroundProcessedWave(this.playgroundState);
    }

    drawPlaygroundOriginalWave(state) {
        const canvas = document.getElementById('playground-canvas-original');
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

        // Texte info
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`${state.freq} Hz - ${state.waveType}`, 10, 25);
    }

    drawPlaygroundProcessedWave(state) {
        const canvas = document.getElementById('playground-canvas-processed');
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

        // Points d'échantillonnage (limiter à 150 max)
        const samplesPerCycle = state.sr / state.freq;
        const totalSamplePoints = Math.min(Math.floor(cycles * samplesPerCycle), 150); // Reverted to 150
        const nyquist = state.sr / 2;

        // Collecter les points échantillonnés avec quantification
        const sampledAndQuantizedPoints = [];
        const levels = Math.pow(2, state.bits);
        for (let i = 0; i < totalSamplePoints; i++) {
            const ratio = i / totalSamplePoints;
            const idx = Math.floor(ratio * points.length);
            if (idx < points.length) {
                let value = points[idx];
                // Appliquer la quantification
                const normalized = (value + 1) / 2; // Normaliser de [-1,1] à [0,1]
                const level = Math.round(normalized * (levels - 1)); // Niveau de 0 à (levels-1)
                value = (level / (levels - 1)) * 2 - 1; // Retour à [-1,1]
                sampledAndQuantizedPoints.push({
                    x: (idx / points.length) * width,
                    y: height / 2 - (value * height * amplitude),
                    value: value
                });
            }
        }


        // Ligne de reconstruction reliant les points échantillonnés
        ctx.strokeStyle = state.freq > nyquist ? colors.danger : colors.reconstruction;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        let firstPoint = true;
        for (const point of sampledAndQuantizedPoints) {
            if (firstPoint) {
                ctx.moveTo(point.x, point.y);
                firstPoint = false;
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Dessiner les points d'échantillonnage
        ctx.fillStyle = state.freq > nyquist ? colors.danger : colors.sample;
        const pointRadius = width < 600 ? 3 : 5; // Adapter la taille des points

        for (const point of sampledAndQuantizedPoints) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, pointRadius, 0, twoPi);
            ctx.fill();
        }

        // Texte info
        ctx.fillStyle = colors.text;
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`${this.formatFreq(state.sr)} / ${state.bits} bits`, 10, 25);

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

    playPlaygroundTone(state) {
        if (this.isPlaying) return;

        // Ensure audio is initialized before playing
        if (!this.audioInitialized) {
            this.initializeAudio();
        }

        this.isPlaying = true;

        // Ensure audio context is started by user gesture
        Tone.start();

        // Mettre à jour tous les paramètres audio avant de démarrer
        this.synth.oscillator.type = state.waveType;
        this.playgroundEffects.lowpassFilter.frequency.value = state.sr / 2;

        // Update bit depth quantizer
        this.playgroundEffects.quantizer.setBits(state.bits);

        this.masterVolume.volume.value = Tone.gainToDb(state.vol / 100);

        // Déterminer la fréquence à jouer (originale ou aliasée)
        const nyquist = state.sr / 2;
        const targetFreq = state.freq > nyquist ? this.calculateAliasingFreq(this.playgroundState.freq, this.playgroundState.sr) : this.playgroundState.freq;

        // Trigger the sound
        this.synth.triggerAttack(targetFreq, Tone.now(), 0.3);
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
                if (this.isPlaying && this.activeSection === 'sampling') {
                    this.playSamplingTone(this.samplingState);
                }
            });
        }

        const srSlider = document.getElementById('samp-rate');
        const srVal = document.getElementById('samp-rate-val');
        if (srSlider) {
            srSlider.addEventListener('input', () => {
                this.samplingState.sampleRate = parseInt(srSlider.value);
                srVal.textContent = this.samplingState.sampleRate;
                this.scheduleDraw(() => this.drawSamplingWave(this.samplingState));
                if (this.isPlaying && this.activeSection === 'sampling') {
                    this.playSamplingTone(this.samplingState);
                }
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
            if (!this.isPlaying) {
                this.playSamplingTone(this.samplingState);
            }
        });

        document.getElementById('samp-stop')?.addEventListener('click', () => {
            this.stopAudio();
        });

        this.drawSamplingWave(this.samplingState);
    }

    playSamplingTone(state) {
        // Ensure audio is initialized before playing
        if (!this.audioInitialized) {
            this.initializeAudio();
        }

        this.stopAudio(); // Stop any previous sound
        this.isPlaying = true;

        Tone.start();

        const nyquist = state.sampleRate / 2;
        let perceivedFreq = state.signalFreq;

        // If aliasing occurs, play the folded-back frequency
        if (state.signalFreq > nyquist) {
            perceivedFreq = this.calculateAliasingFreq(state.signalFreq, state.sampleRate);
        }

        this.playTone(perceivedFreq, 0.3); // Play indefinitely until stopped
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
                if (this.isPlaying && this.activeSection === 'quantization') {
                    this.playQuantizationTone(this.quantizationState);
                }
            });
        }

        document.querySelectorAll('.btn-tiny[data-target="quant-bits"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                bitsSlider.value = val;
                this.quantizationState.bits = val;
                bitsVal.textContent = val;
                this.drawQuantizationWave(this.quantizationState);
                // Add audio update logic for presets - MOVED INSIDE
                if (this.isPlaying && this.activeSection === 'quantization') {
                    this.stopAudio();
                    this.playQuantizationTone(this.quantizationState);
                }
            });
        });

        const freqSlider = document.getElementById('quant-freq');
        const freqVal = document.getElementById('quant-freq-val');
        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                this.quantizationState.freq = parseInt(freqSlider.value);
                freqVal.textContent = this.quantizationState.freq;
                this.scheduleDraw(() => this.drawQuantizationWave(this.quantizationState));
                if (this.synth) {
                    this.synth.frequency.rampTo(this.quantizationState.freq, 0.05);
                }
            });
        }

        document.getElementById('quant-compare')?.addEventListener('click', () => {
            if (!this.isPlaying) {
                this.playQuantizationTone(this.quantizationState);
            }
        });

        document.getElementById('quant-stop')?.addEventListener('click', () => {
            this.stopAudio();
        });

        this.drawQuantizationWave(this.quantizationState);
    }

    playQuantizationTone(state) {
        this.stopAudio(); // Stop any previous sound
        this.isPlaying = true;

        Tone.start();

        this.synth = new Tone.Synth().toDestination();
        this.synth.triggerAttack(state.freq, Tone.now(), 0.3);

        if (state.bits < 24) {
            const noiseLevel = 1 / Math.pow(2, state.bits);

            this.noise = new Tone.Noise("white").toDestination();
            this.noise.volume.value = Tone.gainToDb(noiseLevel * 10);
            this.noise.start();
        }
    }


    drawQuantizationWave(state) {
        const canvas = document.getElementById('quantization-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const colors = this.getThemeColors();
        const { width, height } = this.getCanvasDimensions(canvas);

        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        const levels = Math.pow(2, state.bits);

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 8; i++) {
            const y = (height / 8) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        const periodsToShow = 1.5;
        const samplesPerPeriod = 80;
        const totalSamples = Math.floor(periodsToShow * samplesPerPeriod);
        const twoPi = 2 * Math.PI;

        const signalPoints = [];
        for (let i = 0; i < totalSamples; i++) {
            const phase = (i / samplesPerPeriod) * twoPi;
            signalPoints.push(Math.sin(phase));
        }

        const amplitude = 0.42;

        if (state.bits <= 8) {
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([3, 3]);
            ctx.globalAlpha = 0.5;

            for (let i = 0; i < levels; i++) {
                const levelValue = (i / (levels - 1)) * 2 - 1;
                const y = height / 2 - (levelValue * height * amplitude);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

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

        const quantizedPoints = signalPoints.map(val => {
            const normalized = (val + 1) / 2;
            const level = Math.round(normalized * (levels - 1));
            return (level / (levels - 1)) * 2 - 1;
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

        const snr = 6.02 * state.bits + 1.76;
        const range = 6 * state.bits;

        const fontSize = Math.max(12, Math.min(16, width * 0.02));
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`${state.bits} bits → ${levels} niveaux`, 15, 25);
        ctx.fillText(`SNR: ${snr.toFixed(1)} dB`, 15, 25 + fontSize + 5);

        ctx.font = `${fontSize - 2}px Arial`;
        let legendY = height - 60;

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

        legendY += 20;
        ctx.strokeStyle = colors.quantized;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(15, legendY);
        ctx.lineTo(45, legendY);
        ctx.stroke();
        ctx.fillText('Signal quantifié (escalier)', 55, legendY + 4);

        if (state.bits <= 4) {
            ctx.fillStyle = colors.danger;
            ctx.font = `bold ${fontSize + 2}px Arial`;
            ctx.textAlign = 'right';
            ctx.fillText('⚠️ Résolution très faible !', width - 15, 30);
        }

        document.getElementById('quant-levels').textContent = levels.toLocaleString();
        document.getElementById('quant-snr').textContent = snr.toFixed(2) + ' dB';
        document.getElementById('quant-range').textContent = range.toFixed(0) + ' dB';
    }

    // ===== ALIASING LAB =====
    initAliasingLab() {
        this.aliasingState = {
            inputFreq: 5000,
            sampleRate: 8000,
            antiAliasingFilter: true
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

        const filterCheckbox = document.getElementById('alias-filter');
        if (filterCheckbox) {
            filterCheckbox.addEventListener('change', () => {
                this.aliasingState.antiAliasingFilter = filterCheckbox.checked;
                this.scheduleDraw(() => this.drawAliasingWave(this.aliasingState));
            });
        }

        document.getElementById('alias-play')?.addEventListener('click', () => {
            if (!this.isPlaying) {
                this.playSamplingTone(this.aliasingState);
            }
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

        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        const timeHeight = height * 0.5;
        const freqHeight = height * 0.5;
        const freqTop = timeHeight;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width, timeHeight);
        ctx.clip();

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = (timeHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, timeHeight / 2);
        ctx.lineTo(width, timeHeight / 2);
        ctx.stroke();

        const periodsToShow = 3.5;
        const samplesPerPeriod = 60;
        const totalTimeSamples = Math.floor(periodsToShow * samplesPerPeriod);
        const displayedSignal = [];

        for (let i = 0; i < totalTimeSamples; i++) {
            const phase = (i / samplesPerPeriod) * twoPi;
            displayedSignal.push(Math.sin(phase));
        }

        const isAliasing = state.inputFreq > nyquist;
        const isFiltered = state.antiAliasingFilter && isAliasing;

        ctx.strokeStyle = isFiltered ? colors.warning : colors.signal;
        ctx.lineWidth = 2;

        if (isFiltered) {
            ctx.setLineDash([5, 5]);
            ctx.globalAlpha = 0.4;
        }

        ctx.beginPath();
        for (let i = 0; i < displayedSignal.length; i++) {
            const x = (i / displayedSignal.length) * width;
            const y = timeHeight / 2 - (displayedSignal[i] * timeHeight * 0.35);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        if (isFiltered) {
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }

        const displayDuration = periodsToShow / state.inputFreq;
        const numSamplePoints = Math.floor(displayDuration * state.sampleRate);
        const maxSamplePoints = Math.min(numSamplePoints, 100);

        ctx.fillStyle = isAliasing ? colors.danger : colors.success;

        for (let i = 0; i < maxSamplePoints; i++) {
            const sampleTime = (i / state.sampleRate) / displayDuration;
            if (sampleTime > 1) break;

            const signalIdx = Math.floor(sampleTime * displayedSignal.length);
            if (signalIdx >= displayedSignal.length) continue;

            const x = (signalIdx / displayedSignal.length) * width;
            const y = timeHeight / 2 - (displayedSignal[signalIdx] * timeHeight * 0.35);

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, twoPi);
            ctx.fill();
        }

        const fontSize = Math.max(12, Math.min(14, width * 0.02));
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`Signal: ${state.inputFreq} Hz`, 15, 20);

        ctx.restore();

        ctx.save();

        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, freqTop);
        ctx.lineTo(width, freqTop);
        ctx.stroke();

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = freqTop + (freqHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const minFreqDisplay = 20;
        const maxFreqDisplay = 48000;
        const freqRange = maxFreqDisplay - minFreqDisplay;

        const peakHeight = freqHeight * 0.7;

        const freqToX = (freq) => {
            if (freq < minFreqDisplay || freq > maxFreqDisplay) return null;
            return ((freq - minFreqDisplay) / freqRange) * width;
        };

        const inputX = freqToX(state.inputFreq);
        if (inputX !== null && !isFiltered) {
            ctx.fillStyle = colors.signal;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(inputX - 8, freqTop + freqHeight - peakHeight, 16, peakHeight);
            ctx.globalAlpha = 1;

            ctx.fillStyle = colors.signal;
            ctx.font = `${fontSize - 1}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`${state.inputFreq.toFixed(0)} Hz`, inputX, freqTop + freqHeight - peakHeight - 5);
            ctx.fillText('(entrée)', inputX, freqTop + freqHeight - peakHeight - 18);
        }

        if (isAliasing && !state.antiAliasingFilter) {
            const aliases = this.calculateAllAliases(state.inputFreq, state.sampleRate, minFreqDisplay, maxFreqDisplay);

            const perceivedFreq = this.calculateAliasingFreq(state.inputFreq, state.sampleRate);
            const sortedAliases = aliases.sort((a, b) => {
                const distA = Math.abs(a - perceivedFreq);
                const distB = Math.abs(b - perceivedFreq);
                return distA - distB;
            });

            sortedAliases.forEach((aliasFreq, index) => {
                const aliasX = freqToX(aliasFreq);
                if (aliasX !== null && Math.abs(aliasX - (inputX || -1000)) > 20) {
                    const importance = Math.max(0.3, 1 - (index * 0.12));
                    const barHeight = peakHeight * 0.75 * importance;

                    if (index === 0) {
                        ctx.fillStyle = colors.danger;
                    } else if (index === 1) {
                        ctx.fillStyle = '#ff6b6b';
                    } else if (index === 2) {
                        ctx.fillStyle = '#ff8787';
                    } else {
                        ctx.fillStyle = '#ffa3a3';
                    }

                    ctx.globalAlpha = 0.8;
                    ctx.fillRect(aliasX - 7, freqTop + freqHeight - barHeight, 14, barHeight);
                    ctx.globalAlpha = 1;
                }
            });

            ctx.font = `${fontSize - 2}px Arial`;
            ctx.textAlign = 'center';

            const maxLabels = Math.min(4, sortedAliases.length);
            for (let i = 0; i < maxLabels; i++) {
                const aliasFreq = sortedAliases[i];
                const aliasX = freqToX(aliasFreq);
                if (aliasX !== null && Math.abs(aliasX - (inputX || -1000)) > 20) {
                    const importance = Math.max(0.3, 1 - (i * 0.12));
                    const barHeight = peakHeight * 0.75 * importance;

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

            ctx.fillStyle = colors.text;
            ctx.font = `${fontSize - 2}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillText(`${aliases.length} alias détectés`, 15, freqTop + 40);
        }

        if (isFiltered) {
            ctx.fillStyle = colors.success;
            ctx.font = `bold ${fontSize - 1}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('✓ Filtre Anti-Aliasing ACTIF : signal > Nyquist bloqué', width / 2, freqTop + freqHeight / 2);
            ctx.font = `${fontSize - 2}px Arial`;
            ctx.fillText('Désactiver le filtre pour voir les duplications de spectre', width / 2, freqTop + freqHeight / 2 + 20);
        }

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

            ctx.fillStyle = colors.warning;
            ctx.font = `${fontSize - 2}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillText(`Nyquist: ${this.formatFreq(nyquist)}`, nyquistX + 5, freqTop + 20);
        }

        const feX = freqToX(state.sampleRate);
        if (feX !== null) {
            ctx.strokeStyle = colors.reconstruction;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(feX, freqTop);
            ctx.lineTo(feX, freqTop + freqHeight);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = colors.reconstruction;
            ctx.font = `${fontSize - 2}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillText(`Fe: ${this.formatFreq(state.sampleRate)}`, feX + 5, freqTop + 38);
        }

        ctx.fillStyle = colors.text;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('Spectre Fréquentiel (20 Hz - 48 kHz)', 15, freqTop + 20);

        ctx.font = `${fontSize - 2}px Arial`;
        ctx.fillStyle = colors.text;
        ctx.textAlign = 'center';
        const freqMarkers = [20, 1000, 5000, 10000, 20000, 30000, 40000, 48000];
        for (const marker of freqMarkers) {
            const markerX = freqToX(marker);
            if (markerX !== null) {
                const label = marker >= 1000 ? (marker / 1000) + 'k' : marker + ' Hz';
                ctx.fillText(label, markerX, freqTop + freqHeight + 15);

                ctx.strokeStyle = colors.grid;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(markerX, freqTop + freqHeight - 5);
                ctx.lineTo(markerX, freqTop + freqHeight + 5);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

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
        const aliasSet = new Set();
        const nyquist = sampleRate / 2;

        if (inputFreq <= nyquist) {
            return [];
        }

        const extendedMax = maxFreq + sampleRate;
        for (let n = 0; n <= Math.ceil(extendedMax / sampleRate); n++) {
            const baseFreq = n * sampleRate;

            const freq1 = baseFreq + inputFreq;
            const freq2 = baseFreq - inputFreq;

            if (freq1 >= minFreq && freq1 <= maxFreq && freq1 !== inputFreq) {
                aliasSet.add(Math.round(freq1));
            }
            if (freq2 >= minFreq && freq2 <= maxFreq && freq2 > 0 && freq2 !== inputFreq) {
                aliasSet.add(Math.round(freq2));
            }
        }

        const perceivedAlias = this.calculateAliasingFreq(inputFreq, sampleRate);
        if (perceivedAlias >= minFreq && perceivedAlias <= maxFreq && perceivedAlias !== inputFreq) {
            aliasSet.add(Math.round(perceivedAlias));
        }

        const aliases = Array.from(aliasSet);

        console.log(`Fréquence ${inputFreq} Hz, SR ${sampleRate} Hz: ${aliases.length} alias trouvés`, aliases);

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

        const modeSelect = document.getElementById('chan-mode');
        if (modeSelect) {
            modeSelect.addEventListener('change', () => {
                this.channelsState.mode = modeSelect.value;
                this.updateChannelExplanation(this.channelsState);
                this.scheduleDraw(() => this.drawChannelsVisualization(this.channelsState));
                if (this.isPlaying && this.activeSection === 'channels') {
                    this.playStereoTone(this.channelsState);
                }
            });
        }

        const panSlider = document.getElementById('chan-pan');
        const panVal = document.getElementById('chan-pan-val');
        if (panSlider) {
            panSlider.addEventListener('input', () => {
                this.channelsState.pan = parseInt(panSlider.value);
                panVal.textContent = this.channelsState.pan;
                this.scheduleDraw(() => this.drawChannelsVisualization(this.channelsState));
                if (this.panner) {
                    this.panner.pan.rampTo(this.channelsState.pan / 100, 0.05);
                }
            });
        }

        const widthSlider = document.getElementById('chan-width');
        const widthVal = document.getElementById('chan-width-val');
        if (widthSlider) {
            widthSlider.addEventListener('input', () => {
                this.channelsState.width = parseInt(widthSlider.value);
                widthVal.textContent = this.channelsState.width;
                this.scheduleDraw(() => this.drawChannelsVisualization(this.channelsState));
                if (this.isPlaying && this.activeSection === 'channels') {
                    this.playStereoTone(this.channelsState);
                }
            });
        }

        const freqSlider = document.getElementById('chan-freq');
        const freqVal = document.getElementById('chan-freq-val');
        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                this.channelsState.freq = parseInt(freqSlider.value);
                freqVal.textContent = this.channelsState.freq;
                this.scheduleDraw(() => this.drawChannelsVisualization(this.channelsState));
                if (this.synth) {
                    this.synth.frequency.rampTo(this.channelsState.freq, 0.05);
                }
            });
        }

        const phaseSlider = document.getElementById('chan-phase');
        const phaseVal = document.getElementById('chan-phase-val');
        if (phaseSlider) {
            phaseSlider.addEventListener('input', () => {
                this.channelsState.phase = parseInt(phaseSlider.value);
                phaseVal.textContent = this.channelsState.phase;
                this.scheduleDraw(() => this.drawChannelsVisualization(this.channelsState));
                if (this.isPlaying && this.activeSection === 'channels') {
                    this.playStereoTone(this.channelsState);
                }
            });
        }

        document.getElementById('chan-play')?.addEventListener('click', () => {
            if (!this.isPlaying) {
                this.playStereoTone(this.channelsState);
            }
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

        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        const waveformWidth = width * 0.58;
        const goniometerWidth = width * 0.42;
        const goniometerLeft = waveformWidth;

        const panNorm = state.pan / 100;
        const leftGain = Math.cos((panNorm + 1) * Math.PI / 4);
        const rightGain = Math.sin((panNorm + 1) * Math.PI / 4);

        const samples = 300;
        const leftSignal = [];
        const rightSignal = [];
        const twoPi = 2 * Math.PI;
        const phaseRad = (state.phase / 180) * Math.PI;

        const cycles = Math.max(2, Math.min(8, state.freq / 200));

        for (let i = 0; i < samples; i++) {
            const t = (i / samples) * cycles * twoPi;
            let left, right;

            if (state.mode === 'mono') {
                const mono = Math.sin(t);
                left = mono;
                right = mono;
            } else if (state.mode === 'mid-side') {
                const mid = Math.sin(t);
                const side = Math.sin(t + phaseRad) * (state.width / 100);
                left = mid + side;
                right = mid - side;
            } else {
                const baseSignal = Math.sin(t);
                left = baseSignal * leftGain;
                right = Math.sin(t + phaseRad) * rightGain;

                const widthFactor = state.width / 100;
                const mid = (left + right) / 2;
                const side = (left - right) / 2;
                left = mid + side * widthFactor;
                right = mid - side * widthFactor;
            }

            leftSignal.push(left);
            rightSignal.push(right);
        }

        const maxAmplitude = Math.max(
            Math.max(...leftSignal.map(Math.abs)),
            Math.max(...rightSignal.map(Math.abs))
        );
        const normFactor = maxAmplitude > 0.001 ? 1 / maxAmplitude : 1;

        const topMargin = height * 0.06;
        const channelGap = height * 0.06;
        const bottomMargin = height * 0.06;

        const availableHeight = height - topMargin - bottomMargin - channelGap;
        const channelHeight = availableHeight / 2;

        const ch1Top = topMargin;
        const ch1Bottom = ch1Top + channelHeight;
        const ch1Center = (ch1Top + ch1Bottom) / 2;
        const ch1Height = channelHeight;

        const ch2Top = ch1Bottom + channelGap;
        const ch2Bottom = ch2Top + channelHeight;
        const ch2Center = (ch2Top + ch2Bottom) / 2;
        const ch2Height = channelHeight;

        const signalAmplitude = channelHeight * 0.35;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, waveformWidth, height);
        ctx.clip();

        ctx.fillStyle = colors.text;
        const fontSize = Math.max(12, Math.min(14, height * 0.025));
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('Canal Gauche (L)', waveformWidth * 0.02, ch1Top - fontSize * 0.5);

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = ch1Top + (ch1Height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(waveformWidth, y);
            ctx.stroke();
        }

        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, ch1Center);
        ctx.lineTo(waveformWidth, ch1Center);
        ctx.stroke();

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

        ctx.fillStyle = colors.text;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText('Canal Droit (R)', waveformWidth * 0.02, ch2Top - fontSize * 0.5);

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = ch2Top + (ch2Height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(waveformWidth, y);
            ctx.stroke();
        }

        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, ch2Center);
        ctx.lineTo(waveformWidth, ch2Center);
        ctx.stroke();

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

        ctx.save();

        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(goniometerLeft, 0);
        ctx.lineTo(goniometerLeft, height);
        ctx.stroke();

        const gonoX = goniometerLeft + goniometerWidth / 2;
        const gonoY = height / 2;
        const gonoRadius = Math.min(goniometerWidth, height) * 0.4;

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;

        for (let i = 1; i <= 3; i++) {
            ctx.beginPath();
            ctx.arc(gonoX, gonoY, (gonoRadius / 3) * i, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(gonoX - gonoRadius, gonoY);
        ctx.lineTo(gonoX + gonoRadius, gonoY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gonoX, gonoY - gonoRadius);
        ctx.lineTo(gonoX, gonoY + gonoRadius);
        ctx.stroke();
        ctx.setLineDash([]);

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

        const gonoSampleStep = Math.max(1, Math.floor(leftSignal.length / 100));

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();

        for (let i = 0; i < leftSignal.length; i += gonoSampleStep) {
            const L = leftSignal[i] * normFactor;
            const R = rightSignal[i] * normFactor;
            const Mid = (L + R) / 2;
            const Side = (L - R) / 2;
            const x = gonoX - Side * gonoRadius;
            const y = gonoY - Mid * gonoRadius;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

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

        const leftPower = leftSignal.reduce((sum, v) => sum + v * v, 0) / leftSignal.length;
        const rightPower = rightSignal.reduce((sum, v) => sum + v * v, 0) / rightSignal.length;
        const leftLevel = Math.sqrt(leftPower) * 100;
        const rightLevel = Math.sqrt(rightPower) * 100;

        let correlation = 0;
        for (let i = 0; i < samples; i++) {
            correlation += leftSignal[i] * rightSignal[i];
        }
        correlation = (correlation / samples) * 100;

        const monoSaving = 50;

        document.getElementById('chan-left-level').textContent = leftLevel.toFixed(0) + '%';
        document.getElementById('chan-right-level').textContent = rightLevel.toFixed(0) + '%';
        document.getElementById('chan-correlation').textContent = correlation.toFixed(0) + '%';
        document.getElementById('chan-mono-saving').textContent = monoSaving + '%';

        ctx.fillStyle = colors.text;
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`Mode: ${state.mode} | Pan: ${state.pan} | Largeur: ${state.width}% | Phase: ${state.phase}°`, width - 10, 490);
    }

    playStereoTone(state) {
        this.stopAudio();
        this.isPlaying = true;

        Tone.start();

        const midSideEffect = new Tone.MidSideEffect();
        midSideEffect.mid.gain.value = 1;
        midSideEffect.side.gain.value = state.width / 100;

        this.panner = new Tone.Panner(state.pan / 100).connect(midSideEffect);

        this.synth = new Tone.Synth({
            oscillator: {
                type: 'sine',
                phase: state.phase
            }
        }).connect(this.panner);

        midSideEffect.toDestination();

        if (state.mode === 'mono') {
            this.synth.disconnect(this.panner);
            this.synth.toDestination();
            this.synth.triggerAttack(state.freq, Tone.now(), 0.3);
        } else {
            this.synth.triggerAttack(state.freq, Tone.now(), 0.3);
        }
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

    playTone(freq, volume) {
        // Ensure audio is initialized before playing
        if (!this.audioInitialized) {
            this.initializeAudio();
        }

        this.stopAudio();
        this.isPlaying = true;

        Tone.start();

        this.synth = new Tone.Synth({
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.3 }
        }).toDestination();

        this.synth.triggerAttack(freq, Tone.now(), volume);
    }

    // ===== CALCULATORS =====
    initCalculators() {
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
            quality: 'pro',
            channels: 2
        };

        const durationSlider = document.getElementById('fmt-duration');
        const durationVal = document.getElementById('fmt-duration-val');
        if (durationSlider) {
            durationSlider.addEventListener('input', () => {
                this.formatsState.duration = parseInt(durationSlider.value);
                durationVal.textContent = this.formatsState.duration;
                this.updateFormatsDisplay();
            });
        }

        document.querySelectorAll('.btn-tiny[data-target="fmt-duration"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                durationSlider.value = val;
                this.formatsState.duration = val;
                durationVal.textContent = val;
                this.updateFormatsDisplay();
            });
        });

        const qualitySelect = document.getElementById('fmt-quality');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', () => {
                this.formatsState.quality = qualitySelect.value;
                this.updateFormatsDisplay();
            });
        }

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
                bitrateCalculated: true
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

        const durationSec = state.duration * 60;
        const wavBitrate = preset.sampleRate * preset.bitDepth * state.channels;

        formats.forEach(fmt => {
            if (fmt.bitrateCalculated) {
                fmt.calculatedBitrate = wavBitrate;
            } else if (fmt.compressionRatio) {
                fmt.calculatedBitrate = wavBitrate * fmt.compressionRatio;
            } else {
                fmt.calculatedBitrate = fmt.bitrate;
            }

            fmt.sizeMB = (fmt.calculatedBitrate * durationSec) / (8 * 1024 * 1024);
        });

        this.updateFormatsBars(formats, preset, state);

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

            const label = document.createElement('div');
            label.className = 'format-bar-label';
            label.innerHTML = `
                ${fmt.name}
                <span class="format-badge ${fmt.type.toLowerCase()}">${fmt.type}</span>
            `;

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

            const cellName = row.insertCell();
            cellName.innerHTML = `<span class="format-name">${fmt.name}</span><br><small style="color: var(--text-secondary)">${fmt.fullName}</small>`;

            const cellType = row.insertCell();
            cellType.innerHTML = `<span class="format-badge ${fmt.type.toLowerCase()}">${fmt.type}</span>`;

            const cellBitrate = row.insertCell();
            const kbps = Math.round(fmt.calculatedBitrate / 1000);
            cellBitrate.textContent = kbps >= 1000 ? (kbps / 1000).toFixed(1) + ' Mbps' : kbps + ' kbps';

            const cellSize = row.insertCell();
            cellSize.innerHTML = `<span class="format-size">${fmt.sizeMB.toFixed(2)} MB</span>`;

            const cellCompression = row.insertCell();
            if (fmt.key === 'wav') {
                cellCompression.textContent = '—';
            } else {
                const savingsPercent = ((wavSize - fmt.sizeMB) / wavSize * 100);
                cellCompression.innerHTML = `<span class="format-savings">${savingsPercent.toFixed(1)}%</span>`;
            }

            const cellQuality = row.insertCell();
            const stars = '★'.repeat(fmt.quality) + '☆'.repeat(5 - fmt.quality);
            cellQuality.textContent = stars;
            cellQuality.style.color = '#ffc107';

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