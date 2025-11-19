# Configuration Déploiement Cloudflare Pages

## Configuration Recommandée

### Settings dans Cloudflare Pages Dashboard

**Build Settings:**
- **Framework preset:** None
- **Build command:** `npm run build`
- **Build output directory:** `/` (répertoire racine)

### Variables d'Environnement

Aucune variable d'environnement n'est requise pour cette application statique.

### Notes Importantes

1. **Application Statique:** Cette application ne nécessite aucune étape de build. Le script `npm run build` confirme simplement que tous les fichiers sont prêts.

2. **Répertoire de Sortie:** Utilisez `/` comme répertoire de sortie car tous les fichiers HTML, CSS et JS sont à la racine du projet.

3. **Node Version:** Le projet utilise Node.js 22.x (défini dans package.json).

4. **Compatibilité:** L'application fonctionne entièrement côté client avec :
   - HTML5
   - CSS3
   - JavaScript ES6+ (modules)
   - Web Audio API
   - Canvas API

### Structure de Déploiement

```
/ (root - output directory)
├── index.html          ← Point d'entrée
├── styles/
│   ├── main.css
│   └── themes.css
└── js/
    ├── app.js
    ├── modules/
    └── utils/
```

### Vérification Post-Déploiement

Après déploiement, vérifiez que :
1. ✅ La page index.html se charge correctement
2. ✅ Le mode clair/dark fonctionne
3. ✅ Les démonstrations audio se lancent sans erreur
4. ✅ Les visualisations Canvas s'affichent
5. ✅ La navigation entre sections fonctionne

### Troubleshooting

**Problème: Erreur 404 sur les modules JS**
- Solution: Vérifiez que le répertoire de sortie est bien `/` et non `/dist` ou `/build`

**Problème: Web Audio ne fonctionne pas**
- Solution: Assurez-vous que le site est servi en HTTPS (Cloudflare Pages le fait automatiquement)

**Problème: Thème ne persiste pas**
- Solution: Vérifiez que localStorage est autorisé (Cloudflare Pages le supporte nativement)

### Commandes Utiles

```bash
# Installation locale
npm install

# Test local
npm run dev
# Accès : http://localhost:8080

# Build (vérifie que l'app est prête)
npm run build
```

### Support

Pour toute question sur le déploiement, consultez :
- [Documentation Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Guide des applications statiques](https://developers.cloudflare.com/pages/configuration/)
