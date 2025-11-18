/**
 * Module de visualisation audio
 */

export class AudioVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.animationId = null;
    }

    /**
     * Obtient les couleurs du thème actuel
     */
    getThemeColors() {
        const theme = document.body.getAttribute('data-theme') || 'light';
        const root = document.documentElement;
        const style = getComputedStyle(root);

        return {
            bg: style.getPropertyValue('--canvas-bg').trim(),
            grid: style.getPropertyValue('--canvas-grid').trim(),
            signal: style.getPropertyValue('--canvas-signal').trim(),
            sample: style.getPropertyValue('--canvas-sample').trim(),
            text: style.getPropertyValue('--canvas-text').trim()
        };
    }

    /**
     * Efface le canvas
     */
    clear() {
        const colors = this.getThemeColors();
        this.ctx.fillStyle = colors.bg;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Dessine une grille
     */
    drawGrid(divisions = 10) {
        const colors = this.getThemeColors();
        this.ctx.strokeStyle = colors.grid;
        this.ctx.lineWidth = 1;

        const stepX = this.width / divisions;
        const stepY = this.height / divisions;

        // Lignes verticales
        for (let i = 0; i <= divisions; i++) {
            const x = i * stepX;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        // Lignes horizontales
        for (let i = 0; i <= divisions; i++) {
            const y = i * stepY;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // Ligne centrale en gras
        this.ctx.strokeStyle = colors.text;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height / 2);
        this.ctx.lineTo(this.width, this.height / 2);
        this.ctx.stroke();
    }

    /**
     * Dessine une forme d'onde
     */
    drawWaveform(samples, color = null, lineWidth = 2) {
        const colors = this.getThemeColors();
        const waveColor = color || colors.signal;

        this.ctx.strokeStyle = waveColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();

        const step = this.width / samples.length;
        const centerY = this.height / 2;
        const scale = (this.height / 2) * 0.9; // 90% de la hauteur

        for (let i = 0; i < samples.length; i++) {
            const x = i * step;
            const y = centerY - (samples[i] * scale);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
    }

    /**
     * Dessine des points d'échantillonnage
     */
    drawSamplePoints(samples, indices = null, color = null, radius = 4) {
        const colors = this.getThemeColors();
        const pointColor = color || colors.sample;

        this.ctx.fillStyle = pointColor;

        const step = this.width / samples.length;
        const centerY = this.height / 2;
        const scale = (this.height / 2) * 0.9;

        const pointIndices = indices || [...Array(samples.length).keys()];

        pointIndices.forEach(i => {
            if (i >= 0 && i < samples.length) {
                const x = i * step;
                const y = centerY - (samples[i] * scale);

                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        });
    }

    /**
     * Dessine des lignes verticales pour les échantillons
     */
    drawSampleLines(samples, indices = null, color = null) {
        const colors = this.getThemeColors();
        const lineColor = color || colors.sample;

        this.ctx.strokeStyle = lineColor;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);

        const step = this.width / samples.length;
        const centerY = this.height / 2;
        const scale = (this.height / 2) * 0.9;

        const lineIndices = indices || [...Array(samples.length).keys()];

        lineIndices.forEach(i => {
            if (i >= 0 && i < samples.length) {
                const x = i * step;
                const y = centerY - (samples[i] * scale);

                this.ctx.beginPath();
                this.ctx.moveTo(x, centerY);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            }
        });

        this.ctx.setLineDash([]);
    }

    /**
     * Dessine une légende
     */
    drawLegend(items, position = 'topright') {
        const colors = this.getThemeColors();
        const padding = 15;
        const lineHeight = 25;
        const boxWidth = 180;
        const boxHeight = items.length * lineHeight + padding * 2;

        let x, y;
        if (position === 'topright') {
            x = this.width - boxWidth - padding;
            y = padding;
        } else if (position === 'topleft') {
            x = padding;
            y = padding;
        } else if (position === 'bottomright') {
            x = this.width - boxWidth - padding;
            y = this.height - boxHeight - padding;
        } else { // bottomleft
            x = padding;
            y = this.height - boxHeight - padding;
        }

        // Fond de la légende
        this.ctx.fillStyle = colors.bg;
        this.ctx.strokeStyle = colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(x, y, boxWidth, boxHeight);
        this.ctx.strokeRect(x, y, boxWidth, boxHeight);

        // Items de la légende
        this.ctx.font = '14px Arial';
        items.forEach((item, index) => {
            const itemY = y + padding + index * lineHeight;

            // Couleur de l'item
            this.ctx.fillStyle = item.color;
            this.ctx.fillRect(x + padding, itemY, 20, 15);

            // Texte de l'item
            this.ctx.fillStyle = colors.text;
            this.ctx.fillText(item.label, x + padding + 30, itemY + 12);
        });
    }

    /**
     * Dessine du texte
     */
    drawText(text, x, y, options = {}) {
        const colors = this.getThemeColors();
        const {
            font = '16px Arial',
            color = colors.text,
            align = 'left',
            baseline = 'top'
        } = options;

        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillText(text, x, y);
    }

    /**
     * Dessine les niveaux de quantification
     */
    drawQuantizationLevels(bitDepth) {
        const colors = this.getThemeColors();
        const levels = Math.pow(2, bitDepth);
        const step = this.height / levels;

        this.ctx.strokeStyle = colors.grid;
        this.ctx.lineWidth = 0.5;
        this.ctx.setLineDash([2, 2]);

        for (let i = 0; i <= levels; i++) {
            const y = i * step;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        this.ctx.setLineDash([]);
    }

    /**
     * Animation d'introduction
     */
    animateIntro(callback) {
        let progress = 0;
        const animate = () => {
            progress += 0.02;

            this.clear();
            this.drawGrid();

            // Génère une onde sinusoïdale animée
            const samples = new Float32Array(200);
            for (let i = 0; i < samples.length; i++) {
                const phase = (i / samples.length) * Math.PI * 4 + progress;
                samples[i] = Math.sin(phase) * Math.min(progress, 1);
            }

            this.drawWaveform(samples);

            if (progress < 1) {
                this.animationId = requestAnimationFrame(animate);
            } else if (callback) {
                callback();
            }
        };

        animate();
    }

    /**
     * Arrête l'animation
     */
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Dessine une comparaison avant/après
     */
    drawComparison(originalSamples, processedSamples) {
        const colors = this.getThemeColors();

        this.clear();
        this.drawGrid();

        // Signal original en bleu
        this.drawWaveform(originalSamples, colors.signal, 2);

        // Signal traité en rouge (plus transparent)
        this.drawWaveform(processedSamples, colors.sample, 3);

        this.drawLegend([
            { label: 'Original', color: colors.signal },
            { label: 'Traité', color: colors.sample }
        ]);
    }

    /**
     * Dessine un spectrogramme simplifié
     */
    drawSpectrum(frequencies, magnitudes) {
        const colors = this.getThemeColors();

        this.clear();
        this.drawGrid();

        const barWidth = this.width / frequencies.length;
        const maxMagnitude = Math.max(...magnitudes);

        this.ctx.fillStyle = colors.signal;

        frequencies.forEach((freq, i) => {
            const barHeight = (magnitudes[i] / maxMagnitude) * (this.height / 2);
            const x = i * barWidth;
            const y = this.height / 2 - barHeight;

            this.ctx.fillRect(x, y, barWidth - 1, barHeight);
        });

        // Axe des fréquences
        this.ctx.fillStyle = colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';

        const labelIndices = [0, Math.floor(frequencies.length / 2), frequencies.length - 1];
        labelIndices.forEach(i => {
            if (i < frequencies.length) {
                const x = i * barWidth + barWidth / 2;
                const freq = frequencies[i];
                this.ctx.fillText(
                    freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : `${freq}`,
                    x,
                    this.height - 10
                );
            }
        });
    }

    /**
     * Redimensionne le canvas
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
    }
}
