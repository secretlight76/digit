/**
 * Module de démonstration des canaux audio
 */

import { AudioVisualizer } from './visualizer.js';
import { generateSineWave } from '../utils/math-utils.js';
import { createStereoPannedBuffer, playBuffer, stopAllSources } from '../utils/audio-utils.js';

export class ChannelsDemo {
    constructor() {
        this.canvas = document.getElementById('channels-canvas');
        this.visualizer = new AudioVisualizer(this.canvas);

        this.panSlider = document.getElementById('pan-control');
        this.panValue = document.getElementById('pan-value');
        this.channelConfigSelect = document.getElementById('channel-config');

        this.playButton = document.getElementById('play-channels');
        this.stopButton = document.getElementById('stop-channels');

        this.leftLevelDisplay = document.getElementById('left-level');
        this.rightLevelDisplay = document.getElementById('right-level');

        this.activeSources = [];

        this.init();
    }

    init() {
        this.updateVisualization();
        this.updateLevels();

        this.panSlider.addEventListener('input', () => {
            this.panValue.textContent = this.panSlider.value;
            this.updateVisualization();
            this.updateLevels();
        });

        this.channelConfigSelect.addEventListener('change', () => {
            this.updateVisualization();
        });

        this.playButton.addEventListener('click', () => this.playAudio());
        this.stopButton.addEventListener('click', () => this.stopAudio());
    }

    updateVisualization() {
        const pan = parseInt(this.panSlider.value) / 100; // -1 à 1
        const config = this.channelConfigSelect.value;

        this.visualizer.clear();

        const colors = this.visualizer.getThemeColors();

        // Calcul des gains gauche et droite
        const leftGain = pan <= 0 ? 1 : 1 - pan;
        const rightGain = pan >= 0 ? 1 : 1 + pan;

        // Dessine les enceintes (cercles)
        const ctx = this.visualizer.ctx;
        const centerY = this.height / 2;
        const speakerRadius = 60;

        // Position de l'auditeur (centre)
        const listenerX = this.width / 2;
        const listenerY = this.height / 2;

        // Position des enceintes
        const leftSpeakerX = this.width * 0.25;
        const rightSpeakerX = this.width * 0.75;
        const speakerY = this.height / 2;

        // Dessine l'auditeur
        ctx.fillStyle = colors.text;
        ctx.beginPath();
        ctx.arc(listenerX, listenerY, 15, 0, 2 * Math.PI);
        ctx.fill();

        // Texte auditeur
        this.visualizer.drawText('👤', listenerX, listenerY - 5, {
            font: '24px Arial',
            align: 'center',
            baseline: 'middle'
        });

        // Enceinte gauche
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 4;
        ctx.globalAlpha = leftGain;
        ctx.beginPath();
        ctx.arc(leftSpeakerX, speakerY, speakerRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Remplissage proportionnel au niveau
        ctx.fillStyle = colors.signal;
        ctx.beginPath();
        ctx.arc(leftSpeakerX, speakerY, speakerRadius * leftGain, 0, 2 * Math.PI);
        ctx.fill();

        ctx.globalAlpha = 1;

        // Label gauche
        this.visualizer.drawText('GAUCHE', leftSpeakerX, speakerY + speakerRadius + 20, {
            font: 'bold 14px Arial',
            align: 'center',
            color: colors.text
        });

        // Enceinte droite
        ctx.strokeStyle = colors.sample;
        ctx.lineWidth = 4;
        ctx.globalAlpha = rightGain;
        ctx.beginPath();
        ctx.arc(rightSpeakerX, speakerY, speakerRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Remplissage proportionnel au niveau
        ctx.fillStyle = colors.sample;
        ctx.beginPath();
        ctx.arc(rightSpeakerX, speakerY, speakerRadius * rightGain, 0, 2 * Math.PI);
        ctx.fill();

        ctx.globalAlpha = 1;

        // Label droit
        this.visualizer.drawText('DROITE', rightSpeakerX, speakerY + speakerRadius + 20, {
            font: 'bold 14px Arial',
            align: 'center',
            color: colors.text
        });

        // Lignes de connexion (ondes sonores)
        ctx.setLineDash([5, 5]);

        // Ligne gauche
        ctx.strokeStyle = colors.signal;
        ctx.lineWidth = 2;
        ctx.globalAlpha = leftGain * 0.5;
        ctx.beginPath();
        ctx.moveTo(leftSpeakerX + speakerRadius, speakerY);
        ctx.lineTo(listenerX - 15, listenerY);
        ctx.stroke();

        // Ligne droite
        ctx.strokeStyle = colors.sample;
        ctx.globalAlpha = rightGain * 0.5;
        ctx.beginPath();
        ctx.moveTo(rightSpeakerX - speakerRadius, speakerY);
        ctx.lineTo(listenerX + 15, listenerY);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.setLineDash([]);

        // Titre
        const panText = pan < -0.1 ? 'Gauche' : pan > 0.1 ? 'Droite' : 'Centre';
        this.visualizer.drawText(
            `Spatialisation Audio - Panoramique : ${panText}`,
            10,
            10,
            { font: 'bold 16px Arial' }
        );

        // Info configuration
        const configText = config === 'mono' ? 'Mono (1 canal)' : 'Stéréo (2 canaux)';
        this.visualizer.drawText(
            configText,
            this.width - 10,
            10,
            { font: '14px Arial', align: 'right' }
        );
    }

    updateLevels() {
        const pan = parseInt(this.panSlider.value) / 100;

        const leftGain = pan <= 0 ? 1 : 1 - pan;
        const rightGain = pan >= 0 ? 1 : 1 + pan;

        this.leftLevelDisplay.textContent = (leftGain * 100).toFixed(0) + '%';
        this.rightLevelDisplay.textContent = (rightGain * 100).toFixed(0) + '%';
    }

    playAudio() {
        this.stopAudio();

        const pan = parseInt(this.panSlider.value) / 100;
        const config = this.channelConfigSelect.value;
        const duration = 2.0;
        const sampleRate = 44100;
        const frequency = 440;

        // Génère un signal
        const samples = generateSineWave(frequency, sampleRate, duration, 0.5);

        let buffer;
        if (config === 'mono') {
            // Mono : crée un buffer mono
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            buffer = ctx.createBuffer(1, samples.length, sampleRate);
            buffer.getChannelData(0).set(samples);
        } else {
            // Stéréo : applique le panoramique
            buffer = createStereoPannedBuffer(samples, sampleRate, pan);
        }

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

    get width() {
        return this.canvas.width;
    }

    get height() {
        return this.canvas.height;
    }
}
