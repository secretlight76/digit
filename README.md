# 🎵 Outil Pédagogique de Numérisation Audio

Application web interactive et complète pour comprendre la numérisation audio, destinée aux étudiants en audiovisuel et production audio.

## 📋 Description

Cet outil pédagogique propose une approche interactive et visuelle pour comprendre tous les aspects de la numérisation audio :

- **Échantillonnage** (Sample Rate) : Comprendre le théorème de Shannon-Nyquist
- **Quantification** (Bit Depth) : Résolution et rapport signal/bruit
- **Aliasing** : Repliement spectral et ses conséquences
- **Débit** (Bitrate) : Calcul et impact sur la taille des fichiers
- **Canaux Audio** : Spatialisation et configurations stéréo/multicanal
- **Compression** : Formats avec et sans perte (MP3, AAC, FLAC, Opus, etc.)

## ✨ Fonctionnalités

### Interface Professionnelle
- Design moderne et épuré
- Mode clair/sombre avec persistance
- Navigation intuitive entre les sections
- Responsive design pour tous les écrans

### Démonstrations Interactives
- Visualisations en temps réel avec Canvas
- Contrôles interactifs (sliders, boutons)
- Comparaisons audio avec Web Audio API
- Calculs automatiques et affichage des statistiques

### Contenu Pédagogique Complet
- Explications théoriques détaillées
- Formules mathématiques
- Exemples pratiques
- Comparaisons de formats audio
- Légendes et annotations visuelles

## 🚀 Installation et Utilisation

### Prérequis
- Node.js 22.x ou supérieur
- Un navigateur moderne (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Cloner le dépôt
git clone <url-du-repo>
cd digit

# Installer les dépendances
npm install
```

### Lancement en développement

```bash
# Démarrer le serveur de développement
npm run dev
```

L'application sera accessible à l'adresse : `http://localhost:8080`

### Déploiement sur Cloudflare Pages

Cette application est optimisée pour Cloudflare Pages :

1. Connectez votre dépôt GitHub à Cloudflare Pages
2. Configurez le build :
   - **Build command** : (aucune - application statique)
   - **Build output directory** : `/`
3. Déployez !

L'application est entièrement statique (HTML, CSS, JS) et ne nécessite aucun build.

## 📁 Structure du Projet

```
digit/
├── index.html              # Page principale
├── styles/
│   ├── main.css           # Styles principaux
│   └── themes.css         # Système de thèmes clair/dark
├── js/
│   ├── app.js             # Application principale
│   ├── modules/
│   │   ├── visualizer.js         # Visualiseur canvas
│   │   ├── sampling-demo.js      # Démo échantillonnage
│   │   ├── quantization-demo.js  # Démo quantification
│   │   ├── aliasing-demo.js      # Démo aliasing
│   │   ├── compression-demo.js   # Démo compression
│   │   └── channels-demo.js      # Démo canaux
│   └── utils/
│       ├── math-utils.js         # Utilitaires mathématiques
│       └── audio-utils.js        # Utilitaires Web Audio API
├── package.json
└── README.md
```

## 🎓 Sections Pédagogiques

### 1. Introduction
Animation interactive montrant le processus de numérisation audio de base.

### 2. Échantillonnage
- Visualisation du sampling
- Théorème de Shannon-Nyquist
- Comparaison de différentes fréquences d'échantillonnage
- Lecture audio pour entendre les différences

### 3. Quantification
- Visualisation des niveaux de quantification
- Impact de la résolution (bit depth)
- Calcul du SNR et de la plage dynamique
- Comparaison audio avant/après quantification

### 4. Aliasing
- Démonstration du repliement spectral
- Visualisation de l'aliasing en temps réel
- Calcul de la fréquence de Nyquist
- Audio démontrant l'effet d'aliasing

### 5. Débit (Bitrate)
- Calculateur de débit interactif
- Impact sur la taille des fichiers
- Différentes configurations (sample rate, bit depth, canaux)

### 6. Canaux Audio
- Visualisation de la spatialisation stéréo
- Contrôle du panoramique
- Démonstration des différences mono/stéréo
- Niveaux gauche/droite en temps réel

### 7. Compression Audio
- Comparaison détaillée des formats
- Types de compression (lossy/lossless)
- Calculateur de taille de fichier
- Formats : WAV, FLAC, MP3, AAC, Opus, OGG Vorbis, WMA

## 🛠️ Technologies Utilisées

- **HTML5** : Structure sémantique
- **CSS3** : Variables CSS, Grid, Flexbox, animations
- **JavaScript ES6+** : Modules, classes, async/await
- **Web Audio API** : Traitement et lecture audio
- **Canvas API** : Visualisations graphiques
- **LocalStorage** : Persistance du thème

## 🎨 Personnalisation du Thème

Les couleurs et le thème sont gérés via des variables CSS dans `styles/themes.css`. Pour personnaliser :

1. Modifiez les variables CSS pour le thème clair `[data-theme="light"]`
2. Modifiez les variables CSS pour le thème sombre `[data-theme="dark"]`
3. Les changements sont automatiquement appliqués

## 📱 Compatibilité

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile (iOS Safari, Chrome Mobile)

## 🔒 Sécurité

- Aucune donnée utilisateur collectée
- Pas de cookies tiers
- Tout le traitement est effectué côté client
- Code source organisé dans des modules protégés

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## 📄 Licence

MIT License - voir le fichier LICENSE pour plus de détails

## 👨‍🎓 Public Cible

- Étudiants en audiovisuel
- Étudiants en production audio
- Ingénieurs du son en formation
- Enseignants en technologies audio
- Professionnels souhaitant réviser les bases

## 🎯 Objectifs Pédagogiques

À la fin de l'utilisation de cet outil, les apprenants seront capables de :

1. Expliquer le processus de numérisation audio
2. Comprendre l'impact du sample rate sur la qualité
3. Choisir la bonne résolution pour différents usages
4. Identifier et éviter l'aliasing
5. Calculer les débits et tailles de fichiers
6. Comprendre la spatialisation audio
7. Choisir le format de compression approprié
8. Optimiser les paramètres pour différents contextes

## 📧 Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue sur GitHub.

---

Fait avec ❤️ pour l'éducation audio
