/**
 * Application principale - Outil pédagogique de numérisation audio
 */

import { AudioVisualizer } from './modules/visualizer.js';
import { SamplingDemo } from './modules/sampling-demo.js';
import { QuantizationDemo } from './modules/quantization-demo.js';
import { AliasingDemo } from './modules/aliasing-demo.js';
import { CompressionDemo, BitrateCalculator } from './modules/compression-demo.js';
import { ChannelsDemo } from './modules/channels-demo.js';
import { generateSineWave } from './utils/math-utils.js';

class AudioEducationApp {
    constructor() {
        this.currentSection = 'intro';
        this.demos = {};

        this.init();
    }

    init() {
        // Initialise le système de navigation
        this.initNavigation();

        // Initialise le basculement de thème
        this.initThemeToggle();

        // Initialise la démo d'introduction
        this.initIntroDemo();

        // Charge la section initiale
        this.showSection('intro');
    }

    initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                this.showSection(sectionId);

                // Met à jour les liens actifs
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    showSection(sectionId) {
        // Nettoie la démo précédente si elle existe
        if (this.demos[this.currentSection] && this.demos[this.currentSection].destroy) {
            this.demos[this.currentSection].destroy();
        }

        // Cache toutes les sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => section.classList.remove('active'));

        // Affiche la section demandée
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;

            // Initialise la démo pour cette section
            this.initSectionDemo(sectionId);
        }
    }

    initSectionDemo(sectionId) {
        // Initialise la démo spécifique à la section
        switch (sectionId) {
            case 'intro':
                // La démo intro est déjà initialisée
                break;

            case 'sampling':
                if (!this.demos.sampling) {
                    this.demos.sampling = new SamplingDemo();
                }
                break;

            case 'quantization':
                if (!this.demos.quantization) {
                    this.demos.quantization = new QuantizationDemo();
                }
                break;

            case 'aliasing':
                if (!this.demos.aliasing) {
                    this.demos.aliasing = new AliasingDemo();
                }
                break;

            case 'bitrate':
                if (!this.demos.bitrate) {
                    this.demos.bitrate = new BitrateCalculator();
                }
                break;

            case 'channels':
                if (!this.demos.channels) {
                    this.demos.channels = new ChannelsDemo();
                }
                break;

            case 'compression':
                if (!this.demos.compression) {
                    this.demos.compression = new CompressionDemo();
                }
                break;
        }
    }

    initThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');

        // Charge le thème sauvegardé ou utilise le thème par défaut
        const savedTheme = localStorage.getItem('audio-edu-theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('audio-edu-theme', newTheme);

            // Rafraîchit la visualisation actuelle
            this.refreshCurrentDemo();
        });
    }

    refreshCurrentDemo() {
        // Rafraîchit la démo actuelle pour appliquer les nouvelles couleurs
        const currentDemo = this.demos[this.currentSection];
        if (currentDemo && currentDemo.updateVisualization) {
            currentDemo.updateVisualization();
        }
    }

    initIntroDemo() {
        const canvas = document.getElementById('intro-canvas');
        const playButton = document.getElementById('intro-play');

        if (!canvas || !playButton) return;

        const visualizer = new AudioVisualizer(canvas);
        let isAnimating = false;

        // Animation initiale
        visualizer.clear();
        visualizer.drawGrid();

        // Dessine une onde d'exemple
        const sampleRate = 48000;
        const duration = 0.05;
        const signal = generateSineWave(440, sampleRate, duration);
        visualizer.drawWaveform(signal);

        const colors = visualizer.getThemeColors();
        visualizer.drawLegend([
            { label: 'Signal analogique', color: colors.signal }
        ], 'topright');

        playButton.addEventListener('click', () => {
            if (isAnimating) return;

            isAnimating = true;
            playButton.disabled = true;
            playButton.textContent = 'Animation en cours...';

            // Animation de numérisation
            let step = 0;
            const maxSteps = 60;

            const animate = () => {
                step++;
                const progress = step / maxSteps;

                visualizer.clear();
                visualizer.drawGrid();

                // Génère l'onde
                const samples = generateSineWave(440, sampleRate, duration);
                visualizer.drawWaveform(samples, colors.signal, 2);

                // Ajoute progressivement les points d'échantillonnage
                if (progress > 0.3) {
                    const numSamplePoints = Math.floor((progress - 0.3) * 100);
                    const sampleIndices = [];
                    const spacing = Math.floor(samples.length / 50);

                    for (let i = 0; i < Math.min(numSamplePoints, 50); i++) {
                        sampleIndices.push(i * spacing);
                    }

                    visualizer.drawSamplePoints(samples, sampleIndices, colors.sample, 5);
                }

                // Texte d'explication
                let text = 'Signal analogique continu';
                if (progress > 0.3 && progress < 0.7) {
                    text = 'Échantillonnage en cours...';
                } else if (progress >= 0.7) {
                    text = 'Signal numérisé !';
                }

                visualizer.drawText(text, canvas.width / 2, 20, {
                    font: 'bold 18px Arial',
                    align: 'center',
                    color: colors.text
                });

                if (step < maxSteps) {
                    requestAnimationFrame(animate);
                } else {
                    isAnimating = false;
                    playButton.disabled = false;
                    playButton.textContent = 'Démarrer la démo';

                    visualizer.drawLegend([
                        { label: 'Signal analogique', color: colors.signal },
                        { label: 'Échantillons numériques', color: colors.sample }
                    ], 'topright');
                }
            };

            animate();
        });

        this.demos.intro = { visualizer };
    }
}

// Initialise l'application quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AudioEducationApp();
    });
} else {
    new AudioEducationApp();
}
