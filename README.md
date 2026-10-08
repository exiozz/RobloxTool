# RobloxTool — Établi Dev

Un atelier gratuit pour apprendre à créer sur Roblox. Le site est entièrement statique : pas de compte, pas de serveur, pas de traceur.

**Site :** https://exiozz.github.io/RobloxTool/

## Ce qu'il y a dedans

- **Cours** : quatre cours illustrés pour débutants (Studio, premier script, interfaces, obby). Chaque cours se termine par un projet final avec une note sur 5 étoiles.
- **Boutique** : recherche dans le Creator Store, le Marketplace et le DevForum de Roblox (les résultats s'ouvrent sur le site de Roblox), collection d'ID d'assets, accès à la référence de l'API.
- **Outils** : quinze outils (couleurs, UDim2, TweenInfo, courbe d'XP, revenus Robux, leaderstats, taux de drop…).
- **Code** : quinze extraits Luau prêts à copier.
- **Projets** : un tableau de tâches.
- **Mémo** : où ranger quoi dans Studio, les types de scripts, la communication client-serveur.
- **Deux langues** : français et anglais, avec le bouton FR / EN en haut de page.

## Lancer le site sur ton ordinateur

Aucune installation n'est nécessaire. Depuis le dossier du projet :

```
python3 -m http.server 8000
```

Puis ouvre http://localhost:8000 dans ton navigateur.

## Organisation des fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | La page et tout son contenu, pages légales comprises |
| `assets/app.css` | Les styles |
| `assets/app.js` | Toute la logique, les cours et le dictionnaire anglais |
| `assets/fonts/` | Les polices, hébergées sur place |
| `vendor/` | La coloration du code (CodeMirror) |

Le texte est écrit en français dans le code. La version anglaise vient du dictionnaire `TR` et des règles `TRX`, au début de `assets/app.js`.

## Données et vie privée

Tout ce que l'utilisateur saisit est enregistré dans le stockage local de son navigateur. Rien n'est envoyé à un serveur. La capture d'écran d'un projet final est analysée dans le navigateur par un petit programme (couleurs, détails, taille) : la note qui en sort est approximative.

## Avertissement

Établi Dev est un projet indépendant. Il n'est pas affilié à Roblox Corporation. Roblox et Roblox Studio sont des marques de Roblox Corporation.

## Crédits

Polices Unbounded, Onest et JetBrains Mono (SIL Open Font License). Coloration du code par CodeMirror (licence MIT). Les licences sont dans `assets/fonts/` et `vendor/`.
