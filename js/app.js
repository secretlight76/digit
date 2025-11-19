/**
 * Lab Audio - Version Simple et Fonctionnelle
 */

class AudioLab {
    constructor() {
        this.audioContext = null;
        this.currentSource = null;
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
        toggle?.addEventListener('click', () => {
            const theme = document.body.getAttribute('data-theme');
            document.body.setAttribute('data-theme', theme === 'light' ? 'dark' : 'light');
        });

        // Playground
        this.initPlayground();
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

    // ===== PLAYGROUND =====
    initPlayground() {
        const state = {
            freq: 440,
            vol: 30,
            sr: 44100,
            bits: 16
        };

        // Fréquence
        const freqSlider = document.getElementById('pg-frequency');
        const freqVal = document.getElementById('pg-freq-value');
        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                state.freq = parseInt(freqSlider.value);
                freqVal.textContent = state.freq;
                this.updatePlaygroundStats(state);
            });
        }

        // Volume
        const volSlider = document.getElementById('pg-volume');
        const volVal = document.getElementById('pg-vol-value');
        if (volSlider) {
            volSlider.addEventListener('input', () => {
                state.vol = parseInt(volSlider.value);
                volVal.textContent = state.vol;
            });
        }

        // Sample Rate
        const srSlider = document.getElementById('pg-sample-rate');
        const srVal = document.getElementById('pg-sr-value');
        if (srSlider) {
            srSlider.addEventListener('input', () => {
                state.sr = parseInt(srSlider.value);
                srVal.textContent = state.sr;
                this.updatePlaygroundStats(state);
            });
        }

        // Boutons rapides SR
        document.querySelectorAll('#pg-sample-rate + .quick-values .btn-tiny').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                srSlider.value = val;
                state.sr = val;
                srVal.textContent = val;
                this.updatePlaygroundStats(state);
            });
        });

        // Bit Depth
        const bdSlider = document.getElementById('pg-bit-depth');
        const bdVal = document.getElementById('pg-bd-value');
        if (bdSlider) {
            bdSlider.addEventListener('input', () => {
                state.bits = parseInt(bdSlider.value);
                bdVal.textContent = state.bits;
                this.updatePlaygroundStats(state);
            });
        }

        // Boutons rapides BD
        document.querySelectorAll('#pg-bit-depth + .quick-values .btn-tiny').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-value'));
                bdSlider.value = val;
                state.bits = val;
                bdVal.textContent = val;
                this.updatePlaygroundStats(state);
            });
        });

        // Play
        document.getElementById('pg-play')?.addEventListener('click', () => {
            this.playTone(state.freq, state.vol / 100 * 0.3, 2);
        });

        // Stop
        document.getElementById('pg-stop')?.addEventListener('click', () => {
            this.stopAudio();
        });

        this.updatePlaygroundStats(state);
    }

    updatePlaygroundStats(state) {
        const nyquist = state.sr / 2;
        const levels = Math.pow(2, state.bits);
        const bitrate = state.sr * state.bits * 2; // stéréo
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
