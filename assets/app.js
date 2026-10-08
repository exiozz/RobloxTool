const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const fmt = (n, d = 2) => Number(n).toLocaleString(LOCALE, { maximumFractionDigits: d });
const num = id => parseFloat($(id).value) || 0;
const CM = window.CodeMirror || null;

function copyText(text, btn) {
  const done = t => { if (!btn) return; const o = btn.textContent; btn.textContent = t; setTimeout(() => btn.textContent = o, 1300); };
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); done(ok ? 'Copié' : 'Copie bloquée'); };
  try { navigator.clipboard.writeText(text).then(() => done('Copié'), fallback); } catch (e) { fallback(); }
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]'); if (b) { const el = $(b.dataset.copy); copyText('value' in el ? el.value : el.textContent, b); }
  const v = e.target.closest('[data-v]'); if (v) copyText(v.dataset.v, v);
});
function outRows(el, rows) {
  el.innerHTML = rows.map(([k, v]) => `<div class="outrow"><b>${esc(k)}</b><code>${esc(v)}</code><button class="btn ghost sm" data-v="${esc(v)}">Copier</button></div>`).join('');
}
function paint(el, code, mode) { if (CM && CM.runMode && mode) CM.runMode(code, mode, el); else el.textContent = code; }

/* ---------- Langages ---------- */
const EXT = {
  luau: { m: 'lua', l: 'Luau', c: 'rbx' }, lua: { m: 'lua', l: 'Lua', c: 'rbx' },
  cpp: { m: 'text/x-c++src', l: 'C++', c: 'ue' }, h: { m: 'text/x-c++src', l: 'C++', c: 'ue' },
  cs: { m: 'text/x-csharp', l: 'C#', c: 'unity' }, gd: { m: 'python', l: 'GDScript', c: 'godot' },
  js: { m: 'javascript', l: 'JavaScript', c: 'web' }, json: { m: 'application/json', l: 'JSON', c: 'web' },
  css: { m: 'css', l: 'CSS', c: 'web' }, html: { m: 'htmlmixed', l: 'HTML', c: 'web' }, md: { m: null, l: 'Markdown', c: 'muted' }
};
const extOf = n => n.includes('.') ? n.split('.').pop().toLowerCase() : '';
const langOf = n => EXT[extOf(n)] || { m: null, l: 'Texte', c: 'muted' };
const ENG = { rbx: 'Roblox · Luau', ue: 'Unreal · C++', unity: 'Unity · C#', godot: 'Godot · GDScript', web: 'Web · JS/CSS' };
const ENG_MODE = { rbx: 'lua', ue: 'text/x-c++src', unity: 'text/x-csharp', godot: 'python', web: 'javascript' };
const ENG_EXT = { rbx: 'luau', ue: 'cpp', unity: 'cs', godot: 'gd', web: 'js' };


/* ============ SOCLE : réglages, favoris, messages, fenêtres ============ */
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pl = (n, one, many) => n + ' ' + (n > 1 ? many : one);
const KEYS = ['prefs', 'files', 'open', 'active', 'tasks', 'snips', 'learn', 'favs', 'shop', 'courses'];
let prefs = Object.assign({ name: '', rbx: '', rid: '', eng: '', theme: 'auto', fs: 13, wrap: false, seen: false }, load('prefs', {})); prefs.eng = '';
let favs = Object.assign({ tools: [], snips: [] }, load('favs', {}));
const hostTheme = document.documentElement.getAttribute('data-theme');
const ENGS = [['rbx', 'Roblox'], ['ue', 'Unreal'], ['unity', 'Unity'], ['godot', 'Godot'], ['web', 'Web']];
const prefCat = () => prefs.eng === 'rbx' ? 'rbx' : prefs.eng === 'web' ? 'web' : prefs.eng ? 'jeu' : '';
function applyPrefs() {
  const r = document.documentElement;
  if (prefs.theme === 'auto') { if (hostTheme) r.setAttribute('data-theme', hostTheme); else r.removeAttribute('data-theme'); } else r.setAttribute('data-theme', prefs.theme);
  if (cm) { cm.setOption('lineWrapping', !!prefs.wrap); cm.getWrapperElement().style.fontSize = prefs.fs + 'px'; cm.refresh(); }
  save('prefs', prefs);
}
function toast(msg, undo) {
  const t = document.createElement('div'); t.className = 'toast'; const s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
  if (undo) { const b = document.createElement('button'); b.textContent = 'Annuler'; b.onclick = () => { undo(); t.remove(); }; t.appendChild(b); }
  $('toasts').appendChild(t); setTimeout(() => t.remove(), undo ? 6500 : 2600);
}
let modalBack = null;
function modal(html, mount) {
  modalBack = document.activeElement; $('modal-body').innerHTML = html; $('modal').hidden = false;
  const f = $('modal-body').querySelector('input,select,textarea,button'); if (f) f.focus(); if (mount) mount($('modal-body'));
}
function closeModal() { if ($('modal').hidden) return; $('modal').hidden = true; $('modal-body').innerHTML = ''; if (modalBack && modalBack.focus) modalBack.focus(); }
$('modal').addEventListener('click', e => {
  if (e.target === $('modal') || e.target.closest('[data-x]')) { closeModal(); return; }
  const p = e.target.closest('[data-pick]'); if (p) { prefs.eng = prefs.eng === p.dataset.pick ? '' : p.dataset.pick; p.parentNode.querySelectorAll('[data-pick]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pick === prefs.eng)); save('prefs', prefs); snFilter = prefs.eng || 'all'; personalize(); }
});
const engChoices = () => ENGS.map(([k, l]) => `<button type="button" class="chip" data-pick="${k}" aria-pressed="${prefs.eng === k}" style="--c:var(--${k})">${l}</button>`).join('');
function favToggle(kind, key) { const a = favs[kind], i = a.indexOf(key); if (i < 0) a.push(key); else a.splice(i, 1); save('favs', favs); toast(i < 0 ? 'Ajouté aux favoris' : 'Retiré des favoris'); }
function personalize() { homeRender(); toolsRender(); snRender(); lrRender(); eqRender(); }

/* ============ LANGUES ============ */
const LANG = prefs.lang === 'en' || prefs.lang === 'fr' ? prefs.lang : ((navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en');
const LOCALE = LANG === 'en' ? 'en-GB' : 'fr-FR';
document.documentElement.lang = LANG;
const TR = {"Établi Dev, accueil": "Établi Dev, home", "Accueil": "Home", "Boutique": "Shop", "Outils": "Tools", "Projets": "Projects", "Cours": "Lessons", "Mémo": "Cheat sheet", "Chercher un outil, un cours, un snippet…": "Search a tool, a lesson, a snippet…", "Raccourcis clavier": "Keyboard shortcuts", "Profil et réglages": "Profile and settings", "Ouvrir la boutique": "Open the shop", "Nouvelle tâche": "New task", "Tout chercher": "Search everything", "Continuer le cours": "Continue the lesson", "Concentration": "Focus", "Démarrer": "Start", "Remettre à zéro": "Reset", "Favoris": "Favourites", "Tâches ouvertes": "Open tasks", "Mes cours": "My lessons", "Raccourcis Roblox": "Roblox shortcuts", "Prochaines étapes": "Next steps", "Boîte à outils": "Toolbox", "Quinze outils pour les calculs qu'on refait sans arrêt dans Studio. Mets une étoile à ceux que tu utilises le plus.": "Fifteen tools for the sums you keep redoing in Studio. Star the ones you use most.", "Filtrer les outils…": "Filter tools…", "Filtrer les outils": "Filter tools", "Aucun outil ne correspond. Efface le filtre ou choisis « Tout ».": "No tool matches. Clear the filter or choose \"All\".", "Couleurs": "Colours", "Choisir une couleur": "Pick a colour", "Valeur": "Value", "Unité": "Unit", "Mètres": "Metres", "Largeur (px)": "Width (px)", "Hauteur (px)": "Height (px)", "Position X": "X position", "Position Y": "Y position", "Écran : largeur": "Screen: width", "Écran : hauteur": "Screen: height", "En Scale, ton interface garde ses proportions sur téléphone comme sur PC.": "In Scale, your interface keeps its proportions on phone and on PC.", "Durée (s)": "Duration (s)", "Jouer l'aperçu": "Play preview", "Copier le code": "Copy code", "Courbe d'XP": "XP curve", "XP de base": "Base XP", "Exposant": "Exponent", "Niveaux": "Levels", "Copier la fonction Luau": "Copy Luau function", "Revenus Robux": "Robux earnings", "Prix du pass (R$)": "Pass price (R$)", "Ventes": "Sales", "Taux DevEx ($/R$)": "DevEx rate ($/R$)", "Formater": "Format", "Minifier": "Minify", "Vers table Luau": "To Luau table", "Copier": "Copy", "Générer d'autres": "Generate more", "Timestamp Unix (s)": "Unix timestamp (s)", "Générateur de leaderstats": "Leaderstats generator", "Statistiques, séparées par des virgules": "Stats, separated by commas", "Copier le script": "Copy script", "À coller dans un Script de ServerScriptService. Le dossier doit s'appeler exactement « leaderstats ».": "Paste into a Script in ServerScriptService. The folder must be named exactly \"leaderstats\".", "ID d'asset": "Asset ID", "ID ou lien Roblox": "Roblox ID or link", "Colle un ID ou un lien": "Paste an ID or a link", "Voir sur Roblox ↗": "View on Roblox ↗", "Ajouter à ma collection": "Add to my collection", "Prix à fixer": "Price to set", "Je veux recevoir (R$)": "I want to receive (R$)", "Taux de drop": "Drop rate", "Chance par essai (%)": "Chance per try (%)", "Nombre d'essais": "Number of tries", "La malchance existe : un compteur de pitié, qui garantit l'objet après un certain nombre d'essais, évite de frustrer les joueurs.": "Bad luck is real: a pity counter, which guarantees the item after a set number of tries, keeps players from getting frustrated.", "Lerp et remap": "Lerp and remap", "De (a)": "From (a)", "Vers (b)": "To (b)", "Entrée min": "Input min", "Entrée max": "Input max", "Sortie min": "Output min", "Sortie max": "Output max", "Palette harmonique": "Colour harmony", "Couleur de base": "Base colour", "Choisis une couleur de base, puis clique sur une teinte pour copier son code.": "Pick a base colour, then click a shade to copy its code.", "Dégradé": "Gradient", "Début": "Start", "Fin": "End", "Bibliothèque de code": "Code library", "Chercher (datastore, timer, fetch…)": "Search (datastore, timer, fetch…)", "Chercher un snippet": "Search a snippet", "Ajouter mon snippet": "Add my snippet", "Titre": "Title", "Catégorie": "Category", "Enregistrer": "Save", "Glisse les cartes d'une colonne à l'autre. Clique sur un titre pour modifier la tâche.": "Drag cards from one column to another. Click a title to edit the task.", "Ex. Corriger le saut double": "E.g. Fix the double jump", "Projet": "Project", "Mon jeu": "My game", "Fonctionnalité": "Feature", "Idée": "Idea", "Priorité": "Priority", "Normale": "Normal", "Urgente": "Urgent", "Plus tard": "Later", "Ajouter": "Add", "Afficher": "Show", "Retirer les exemples": "Remove the examples", "Choisis un cours. Chaque leçon t'explique une seule chose, avec une image, des étapes à suivre et des vidéos. À la fin, tu fabriques un vrai projet et tu reçois ta note.": "Pick a course. Each lesson explains one single thing, with a picture, steps to follow and videos. At the end, you build a real project and get your grade.", "Mémo Roblox": "Roblox cheat sheet", "Les tableaux qu'on finit toujours par rechercher : où ranger ses objets, quel script utiliser, comment faire parler client et serveur.": "The tables you always end up looking for: where to put your objects, which script to use, how to make client and server talk.", "Chercher (ServerStorage, LocalScript, FireClient…)": "Search (ServerStorage, LocalScript, FireClient…)", "Chercher dans le mémo": "Search the cheat sheet", "Cherche dans les boutiques officielles de Roblox. Choisis un rayon, tape ta recherche : les résultats s'ouvrent sur le site de Roblox, dans un nouvel onglet.": "Search the official Roblox stores. Pick an aisle, type your search: results open on the Roblox website, in a new tab.", "Ta recherche": "Your search", "Ouvrir ↗": "Open ↗", "Idées pour ce rayon": "Ideas for this aisle", "Recherches récentes": "Recent searches", "Ma collection": "My collection", "Garde ici les ID des assets que tu réutilises, pour les copier en un clic.": "Keep the IDs of the assets you reuse here, to copy them in one click.", "Nom": "Name", "Musique du lobby": "Lobby music", "ID ou lien": "ID or link", "Modèle": "Model", "Autre": "Other", "Référence de l'API": "API reference", "Tape le nom d'une classe pour ouvrir sa page dans la documentation officielle.": "Type a class name to open its page in the official documentation.", "Classe": "Class", "Avant d'installer un asset": "Before installing an asset", "Regarde qui l'a créé.": "Look at who made it.", "Un créateur connu, beaucoup d'avis et une date récente sont de bons signes.": "A known creator, lots of reviews and a recent date are good signs.", "Lis les scripts du modèle.": "Read the model's scripts.", "Méfie-toi d'un require suivi d'un nombre, de getfenv, de loadstring ou d'un script caché au fond de plusieurs dossiers.": "Be wary of a require followed by a number, of getfenv, of loadstring, or of a script hidden deep inside several folders.", "Refuse les permissions inutiles.": "Refuse permissions it doesn't need.", "Un plugin de construction n'a pas besoin d'envoyer des requêtes HTTP.": "A building plugin has no need to send HTTP requests.", "Garde tes identifiants pour toi.": "Keep your login details to yourself.", "Aucun outil sérieux ne demande ton mot de passe ni ton cookie .ROBLOSECURITY.": "No serious tool asks for your password or your .ROBLOSECURITY cookie.", "Tes tâches, snippets, favoris, cours et réglages sont enregistrés dans ce navigateur uniquement. Tu peux en copier une sauvegarde depuis les réglages.": "Your tasks, snippets, favourites, lessons and settings are saved in this browser only. You can copy a backup from the settings.", "Conditions d'utilisation": "Terms of Service", "Confidentialité": "Privacy", "Mentions légales": "Legal Notice", "Code source sur GitHub ↗": "Source code on GitHub ↗", "Établi Dev n'est pas affilié à Roblox Corporation. Roblox et Roblox Studio sont des marques de Roblox Corporation.": "Établi Dev is not affiliated with Roblox Corporation. Roblox and Roblox Studio are trademarks of Roblox Corporation.", "Tape pour chercher…": "Type to search…", "Recherche globale": "Global search", "choisir": "select", "Entrée": "Enter", "ouvrir": "open", "Échap": "Esc", "fermer": "close", "Studs et mètres": "Studs and metres", "GUID et dates": "GUID and dates", "Dégradé (ColorSequence)": "Gradient (ColorSequence)", "Tout": "All", "Économie": "Economy", "Données": "Data", "Réseau": "Network", "Monétisation": "Monetisation", "Organisation": "Organisation", "Raccourcis de Studio": "Studio shortcuts", "Lancer le test": "Start the test", "Arrêter le test": "Stop the test", "Lancer sans personnage": "Run without a character", "Dupliquer": "Duplicate", "Grouper en Model": "Group into a Model", "Centrer la vue sur la sélection": "Centre the view on the selection", "Sélection, déplacement, taille, rotation": "Select, move, scale, rotate", "Chercher dans tous les scripts": "Search in all scripts", "Ctrl Maj F": "Ctrl Shift F", "Sur Mac, Ctrl devient Cmd. Les raccourcis peuvent changer selon la version de Studio.": "On Mac, Ctrl becomes Cmd. Shortcuts may change depending on your version of Studio.", "Séquence": "Sequence", "À pied": "Walking", "En sprint": "Sprinting", "Niveau": "Level", "XP pour monter": "XP to level up", "XP cumulée": "Total XP", "Par vente": "Per sale", "En dollars": "In dollars", "Court": "Short", "Résultat": "Result", "Code lerp": "Lerp code", "Code remap": "Remap code", "Couleur": "Colour", "Colle un ID ou un lien Roblox pour obtenir tous ses formats.": "Paste a Roblox ID or link to get all its formats.", "Tu reçois": "You receive", "Part Roblox": "Roblox's share", "Sauvegarde DataStore avec leaderstats": "DataStore saving with leaderstats", "Charge à l'arrivée, sauvegarde au départ et à la fermeture du serveur. Les appels sont protégés par pcall.": "Loads on join, saves on leave and when the server shuts down. Calls are protected with pcall.", "RemoteEvent sécurisé côté serveur": "Secure RemoteEvent on the server", "Ne fais jamais confiance au client : vérifie le type, le prix et la fréquence des appels.": "Never trust the client: check the type, the price and how often it calls.", "Zone à toucher avec délai par joueur": "Touch zone with a per-player cooldown", "Évite que Touched se déclenche dix fois de suite pour le même joueur.": "Stops Touched from firing ten times in a row for the same player.", "ModuleScript réutilisable": "Reusable ModuleScript", "Range tes fonctions dans un module et appelle-les depuis plusieurs scripts.": "Put your functions in a module and call them from several scripts.", "RemoteFunction : demander une info au serveur": "RemoteFunction: ask the server for information", "Le client pose une question, le serveur répond. À réserver aux cas où tu as besoin d'une réponse.": "The client asks a question, the server answers. Keep it for cases where you need a reply.", "Classement mondial avec OrderedDataStore": "Global leaderboard with OrderedDataStore", "Enregistre un score par joueur et récupère les dix meilleurs.": "Saves one score per player and fetches the top ten.", "Vérifier un Game Pass": "Check a Game Pass", "Vérifie à l'arrivée du joueur, et débloque tout de suite après un achat en jeu.": "Checks when the player joins, and unlocks straight after an in-game purchase.", "Produit développeur avec ProcessReceipt": "Developer product with ProcessReceipt", "Un seul ProcessReceipt par jeu. Ne renvoie PurchaseGranted qu'une fois la récompense vraiment donnée.": "Only one ProcessReceipt per game. Return PurchaseGranted only once the reward has really been given.", "Menu qui glisse avec un tween": "Sliding menu with a tween", "Notification à l'écran": "On-screen notification", "Depuis un LocalScript. SetCore peut échouer si on l'appelle trop tôt, d'où le pcall.": "From a LocalScript. SetCore can fail if called too early, hence the pcall.", "Téléporter un joueur": "Teleport a player", "PivotTo déplace tout le personnage d'un coup, sans le casser.": "PivotTo moves the whole character at once, without breaking it.", "Raycast depuis la souris": "Raycast from the mouse", "LocalScript : trouve ce que le joueur vise quand il clique.": "LocalScript: finds what the player is aiming at when they click.", "Boucle de manches": "Round loop", "Intermission, manche, fin. Le statut est un attribut que l'interface peut afficher.": "Intermission, round, end. The status is an attribute that the interface can display.", "Brique mortelle": "Kill brick", "Le classique des obbys, à mettre dans la Part.": "The obby classic, to put inside the Part.", "Un seul script pour toutes les parts taguées": "One script for all tagged parts", "Ajoute le tag « Lave » dans Studio : plus besoin de copier le script dans chaque Part.": "Add the \"Lave\" tag in Studio: no more copying the script into every Part.", "Tous les projets": "All projects", "Simulateur": "Simulator", "À faire": "To do", "Le joueur traverse le sol après un respawn": "The player falls through the floor after a respawn", "exemple": "example", "Ajouter une boutique de skins": "Add a skin shop", "Boss final avec trois phases": "Final boss with three phases", "En cours": "In progress", "Sauvegarder l'inventaire avec DataStore": "Save the inventory with DataStore", "Supprimer": "Delete", "Terminé": "Done", "Menu principal et écran de chargement": "Main menu and loading screen", "Barre d'outils": "Toolbar", "Découvrir Roblox Studio": "Discover Roblox Studio", "Tes tout premiers pas : poser des blocs, les colorer et tester ton jeu.": "Your very first steps: place blocks, colour them and test your game.", "Commencer": "Start", "Mon premier script": "My first script", "Apprends à donner des ordres à ton jeu avec Luau, le langage de Roblox.": "Learn to give orders to your game with Luau, the Roblox language.", "BOUTIQUE": "SHOP", "Épée": "Sword", "Bouclier": "Shield", "Créer une interface": "Build an interface", "Menus, boutons, compteurs : tout ce que le joueur voit sur son écran.": "Menus, buttons, counters: everything the player sees on their screen.", "Départ": "Start", "Lave": "Lava", "Arrivée": "Finish", "Fabriquer un obby": "Make an obby", "Ton premier vrai jeu : un parcours d'obstacles avec de la lave et des checkpoints.": "Your first real game: an obstacle course with lava and checkpoints.", "Où ranger quoi": "Where things go", "Qui le voit": "Who sees it", "On y met": "What goes there", "Serveur et clients": "Server and clients", "RemoteEvents, ModuleScripts partagés, modèles à cloner des deux côtés.": "RemoteEvents, shared ModuleScripts, models to clone on both sides.", "Clients, en tout premier": "Clients, first of all", "L'écran de chargement.": "The loading screen.", "Serveur seulement": "Server only", "Les Scripts : logique du jeu, sauvegarde, achats.": "Scripts: game logic, saving, purchases.", "Cartes, modèles et données que les joueurs ne doivent pas pouvoir copier.": "Maps, models and data that players must not be able to copy.", "Copié chez chaque joueur": "Copied to every player", "Les interfaces (ScreenGui).": "Interfaces (ScreenGui).", "Copié une fois par joueur": "Copied once per player", "LocalScripts qui durent toute la session : caméra, entrées clavier.": "LocalScripts that last the whole session: camera, keyboard input.", "Copié à chaque apparition": "Copied on every spawn", "LocalScripts liés au personnage.": "LocalScripts tied to the character.", "Copié dans le sac du joueur": "Copied into the player's backpack", "Les outils (Tool) donnés au départ.": "The tools (Tool) given at the start.", "Les joueurs connectés et leurs leaderstats.": "Connected players and their leaderstats.", "Le ciel, l'heure et les effets visuels.": "Sky, time of day and visual effects.", "Les sons globaux et les groupes de sons.": "Global sounds and sound groups.", "Trois types de scripts": "Three kinds of scripts", "Tourne sur": "Runs on", "On le range dans": "Where it goes", "Sert à": "Used for", "Le serveur": "The server", "Sauvegarde, règles du jeu, achats, anti-triche.": "Saving, game rules, purchases, anti-cheat.", "L'appareil du joueur": "The player's device", "Entrées, caméra, interface, effets visuels.": "Input, camera, interface, visual effects.", "Là où on l'appelle avec require()": "Wherever it is called with require()", "ReplicatedStorage ou ServerStorage": "ReplicatedStorage or ServerStorage", "Code partagé entre plusieurs scripts.": "Code shared between several scripts.", "Faire communiquer les scripts": "Making scripts talk to each other", "Sens": "Direction", "Objet": "Object", "On envoie avec": "Send with", "On reçoit avec": "Receive with", "Client vers serveur": "Client to server", "Serveur vers un client": "Server to one client", "Serveur vers tous les clients": "Server to all clients", "Client vers serveur, avec réponse": "Client to server, with a reply", "Entre scripts du même côté": "Between scripts on the same side", "Modèles": "Models", "Vidéos": "Videos", "Expériences": "Experiences", "Communauté": "Community", "Bâtiments, véhicules, armes, PNJ et décors prêts à poser. Les recherches en anglais donnent plus de résultats.": "Buildings, vehicles, weapons, NPCs and scenery ready to place. Searches in English give more results.", "Tes dernières recherches apparaîtront ici.": "Your latest searches will appear here.", "Ta collection est vide. Ajoute l'ID d'un modèle, d'une image ou d'un son que tu réutilises souvent.": "Your collection is empty. Add the ID of a model, an image or a sound you often reuse.", "Bonjour, on forge quoi aujourd'hui ?": "Hello, what are we forging today?", "outils": "tools", "assets en collection": "assets in your collection", "projets notés": "graded projects", "Mes créations ↗": "My creations ↗", "Ajouter mon pseudo Roblox": "Add my Roblox username", "Clique sur l'étoile d'un outil ou d'un snippet pour le retrouver ici.": "Click the star on a tool or a snippet to find it here.", "en cours": "in progress", "Faire le tour de Studio": "Take a tour of Studio", "Créer un script et dire bonjour": "Create a script and say hello", "Le ScreenGui, ta feuille blanche": "The ScreenGui, your blank sheet", "Dessiner le parcours": "Draw the course", "Bienvenue dans ton atelier Roblox": "Welcome to your Roblox workshop", "Deux infos facultatives pour personnaliser l'accueil. Tu pourras les changer dans les réglages.": "Two optional details to personalise the home page. You can change them in the settings.", "Ton prénom ou pseudo": "Your first name or nickname", "Facultatif": "Optional", "Ton pseudo Roblox": "Your Roblox username", "Pas de mot de passe : ton pseudo sert seulement à créer un lien vers ton profil.": "No password: your username is only used to create a link to your profile.", "C'est parti": "Let's go", "Bonjour": "Hello", ", on forge quoi aujourd'hui ?": ", what are we forging today?", "Pause": "Pause", "Pause terminée. On y retourne.": "Break over. Back to it.", "Session terminée. Prends une pause.": "Session over. Take a break.", "Pas encore de favori. Clique sur l'étoile d'un outil pour l'épingler ici et sur l'accueil.": "No favourites yet. Click the star on a tool to pin it here and on the home page.", "Ajouté aux favoris": "Added to favourites", "Retiré des favoris": "Removed from favourites", "JSON valide, formaté.": "Valid JSON, formatted.", "JSON valide, minifié.": "Valid JSON, minified.", "Converti en table Luau. Recolle du JSON pour recommencer.": "Converted to a Luau table. Paste JSON again to start over.", "Lien": "Link", "Voir ↗": "View ↗", "Ajouté à ta collection": "Added to your collection", "Cet asset est déjà dans ta collection.": "This asset is already in your collection.", "jamais": "never", "entrée min = entrée max": "input min = input max", "Copié": "Copied", "Pas encore de favori. Clique sur l'étoile d'un snippet pour le garder sous la main.": "No favourites yet. Click the star on a snippet to keep it handy.", "Aucun snippet ne correspond. Essaie un autre mot ou une autre catégorie.": "No snippet matches. Try another word or another category.", "à moi": "mine", "Snippet enregistré": "Snippet saved", "Snippet supprimé": "Snippet deleted", "Annuler": "Undo", "Ma tâche": "My task", "Tâche ajoutée dans « À faire »": "Task added to \"To do\"", "Tâche supprimée": "Task deleted", "Modifier la tâche": "Edit the task", "Colonne": "Column", "Tâche mise à jour": "Task updated", "Glisse ici la tâche sur laquelle tu travailles.": "Drag here the task you are working on.", "Les tâches finies arrivent ici.": "Finished tasks land here.", "Exemples retirés": "Examples removed", "Aucune tâche": "No tasks", "Rien à faire. Ajoute une tâche au-dessus.": "Nothing to do. Add a task above.", "Outil": "Tool", "Aucune tâche ouverte. Ajoute-en une avec « Nouvelle tâche ».": "No open tasks. Add one with \"New task\".", "← Tous les cours": "← All courses", "Fermer": "Close", "Studio, c'est l'atelier où l'on fabrique les jeux Roblox. Il y a cinq zones à connaître, et c'est tout.": "Studio is the workshop where Roblox games are made. There are five areas to know, and that's all.", "L'écran de Studio. L'Explorer, à droite, est la zone que tu utiliseras le plus.": "The Studio screen. The Explorer, on the right, is the area you will use the most.", "Ouvre Roblox Studio et choisis le modèle « Baseplate ».": "Open Roblox Studio and choose the \"Baseplate\" template.", "À droite, l'Explorer liste tout ce qu'il y a dans ton jeu.": "On the right, the Explorer lists everything in your game.", "Juste en dessous, Properties montre les réglages de l'objet sélectionné.": "Just below, Properties shows the settings of the selected object.", "En bas, Output affiche les messages de tes scripts.": "At the bottom, Output shows the messages from your scripts.", "Astuce.": "Tip.", "Si une fenêtre a disparu, rouvre-la depuis l'onglet View, tout en haut.": "If a window has disappeared, reopen it from the View tab, at the very top.", "▶ Voir des vidéos ↗": "▶ Watch videos ↗", "J'ai fini cette leçon": "I finished this lesson", "Poser et déplacer un bloc": "Place and move a block", "Ouvrir": "Open", "Changer la couleur et la matière": "Change the colour and material", "Ranger ses objets": "Keep your objects tidy", "Tester son jeu": "Test your game", "Dans Roblox, un bloc s'appelle une Part. Presque tout est construit avec des Parts.": "In Roblox, a block is called a Part. Almost everything is built from Parts.", "Sélectionner": "Select", "Déplacer": "Move", "Changer la taille": "Resize", "Tourner": "Rotate", "Les cinq raccourcis à connaître pour construire vite.": "The five shortcuts to know for building fast.", "Dans l'onglet Home, clique sur Part : un bloc apparaît.": "In the Home tab, click Part: a block appears.", "Choisis l'outil Move et tire sur les flèches pour le déplacer.": "Choose the Move tool and drag the arrows to move it.", "Avec Scale, tire sur les boules pour changer sa taille.": "With Scale, drag the balls to change its size.", "Avec Rotate, fais-le tourner.": "With Rotate, turn it around.", "Appuie sur Ctrl D pour en faire une copie.": "Press Ctrl D to make a copy.", "Sur Mac, utilise la touche Cmd à la place de Ctrl.": "On Mac, use the Cmd key instead of Ctrl.", "Chaque Part a des réglages. On les change dans la fenêtre Properties.": "Every Part has settings. You change them in the Properties window.", "coché": "ticked", "Les réglages les plus utiles d'une Part.": "The most useful settings of a Part.", "Clique sur ta Part pour la sélectionner.": "Click your Part to select it.", "Dans Properties, clique sur Color et choisis une couleur.": "In Properties, click Color and pick a colour.", "Change Material : essaie Wood, Neon ou Glass.": "Change Material: try Wood, Neon or Glass.", "Coche la case Anchored.": "Tick the Anchored box.", "Sans Anchored, ton bloc tombe dès que le jeu démarre. C'est l'oubli le plus courant !": "Without Anchored, your block falls as soon as the game starts. It's the most common thing to forget!", "Un jeu contient vite des centaines d'objets. Si tu les ranges dès le début, tu ne te perdras jamais.": "A game quickly holds hundreds of objects. If you tidy them from the start, you will never get lost.", "Maison": "House", "Toit": "Roof", "Trois Parts rangées dans un Model appelé Maison.": "Three Parts stored in a Model called House.", "Sélectionne plusieurs Parts en maintenant Ctrl.": "Select several Parts while holding Ctrl.", "Appuie sur Ctrl G : elles sont regroupées dans un Model.": "Press Ctrl G: they are grouped into a Model.", "Donne un nom clair à ton Model, par exemple « Maison ».": "Give your Model a clear name, for example \"House\".", "Tu peux jouer à ton jeu à tout moment pour voir si tout marche.": "You can play your game at any time to see if everything works.", "Jouer avec ton personnage": "Play with your character", "Les touches pour tester.": "The keys for testing.", "Promène-toi et vérifie que rien ne tombe.": "Walk around and check that nothing falls.", "Corrige ce qui ne va pas, puis recommence.": "Fix what is wrong, then try again.", "Ce que tu changes pendant un test est effacé quand tu arrêtes. Arrête toujours le test avant de construire.": "What you change during a test is erased when you stop. Always stop the test before building.", "Construis une cabane avec quatre murs, un toit et une porte assez grande pour que ton personnage puisse entrer.": "Build a cabin with four walls, a roof and a door big enough for your character to walk in.", "Porte": "Door", "Une idée de cabane. La tienne peut être très différente !": "One idea for a cabin. Yours can be very different!", "Ce que j'ai réussi": "What I managed to do", "Ma cabane a quatre murs et un toit": "My cabin has four walls and a roof", "Toutes les Parts sont ancrées": "All the Parts are anchored", "J'ai utilisé au moins trois couleurs ou matières": "I used at least three colours or materials", "Tout est rangé dans un Model appelé Cabane": "Everything is stored in a Model called Cabin", "Mon personnage peut entrer par la porte": "My character can walk in through the door", "Montre ton travail": "Show your work", "Ajoute une capture d'écran de ton projet. Seulement ton écran, jamais une photo de toi. La note est approximative : un petit programme regarde les couleurs et les détails de l'image, sans la comprendre.": "Add a screenshot of your project. Only your screen, never a photo of yourself. The grade is approximate: a small program looks at the colours and details of the picture, without understanding it.", "Capture d'écran de ton projet": "Screenshot of your project", "Obtenir ma note": "Get my grade", "Coche ce que tu as réussi ou ajoute une capture d'écran, et je te donne ta note.": "Tick what you managed to do or add a screenshot, and I'll give you your grade.", "Refaire noter mon projet": "Grade my project again", "Bien joué, tu as fait plus de la moitié du chemin.": "Well played, you are more than halfway there.", "Bravo pour": "Well done for", "Ta capture ressemble bien à un écran de Studio ou de jeu.": "Your screenshot does look like a Studio or game screen.", "Pour aller encore plus loin": "To go even further", "Coche la liste pour avoir une note plus juste.": "Tick the list to get a fairer grade.", "Note approximative. Un petit programme regarde les couleurs, les détails et la taille de ta capture, puis ta liste. Il ne comprend pas vraiment ton projet : demande aussi l'avis d'un ami.": "Approximate grade. A small program looks at the colours, the detail and the size of your screenshot, then at your list. It does not really understand your project: ask a friend for their opinion too.", "Beau début ! Tous les pros ont commencé comme ça.": "Good start! Every pro began like this.", "Incroyable, tu as tout réussi. C'est du travail de pro !": "Amazing, you got everything right. That's pro work!", "Bravo ! Leçon suivante.": "Well done! Next lesson.", "Marquer comme non faite": "Mark as not done", "Continuer": "Continue", "Un script, c'est une liste d'ordres que le jeu suit. On commence par lui faire dire bonjour.": "A script is a list of orders the game follows. We start by making it say hello.", "Ton tout premier script.": "Your very first script.", "Dans l'Explorer, survole ServerScriptService et clique sur le +.": "In the Explorer, hover over ServerScriptService and click the +.", "Choisis Script.": "Choose Script.", "Efface ce qui est écrit et tape la ligne de l'image.": "Delete what is written and type the line from the picture.", "Regarde dans Output : ton message est là.": "Look in Output: your message is there.", "Les guillemets sont obligatoires autour d'un texte.": "Quotation marks are required around text.", "Les variables, des boîtes à valeurs": "Variables, boxes for values", "Changer une Part avec un script": "Change a Part with a script", "Réagir quand on touche": "React when something is touched", "Répéter avec une boucle": "Repeat with a loop", "Une variable est une boîte avec un nom. Tu y ranges un nombre ou un texte pour le réutiliser.": "A variable is a box with a name. You store a number or some text in it to reuse it.", "Deux variables, puis un message qui les utilise.": "Two variables, then a message that uses them.", "Écris local, puis le nom de ta boîte.": "Write local, then the name of your box.", "Mets un signe = et la valeur à ranger.": "Add an = sign and the value to store.", "Utilise le nom de la boîte dans print.": "Use the name of the box inside print.", "Change la valeur et relance pour voir la différence.": "Change the value and run again to see the difference.", "Un script peut modifier les objets du jeu. Ici, il va repeindre la Part dans laquelle il est rangé.": "A script can change the objects in the game. Here, it will repaint the Part it is stored in.", "Le script est rangé dans la Part. script.Parent désigne donc cette Part.": "The script is stored in the Part. So script.Parent means that Part.", "Ajoute une Part, puis clique sur son + et choisis Script.": "Add a Part, then click its + and choose Script.", "Écris : local part = script.Parent": "Write: local part = script.Parent", "Lance le jeu : ta Part est rouge et à moitié transparente.": "Run the game: your Part is red and half transparent.", "Un événement prévient ton script quand quelque chose se passe. Touched se déclenche quand on touche la Part.": "An event tells your script when something happens. Touched fires when someone touches the Part.", "Quand on touche la Part, elle devient verte.": "When someone touches the Part, it turns green.", "Mets ce script dans une Part.": "Put this script in a Part.", "Lance le jeu et marche sur la Part.": "Run the game and walk onto the Part.", "Elle change de couleur !": "It changes colour!", "Remplace la couleur par celle que tu veux.": "Replace the colour with the one you want.", "Une boucle répète des ordres sans s'arrêter. Parfait pour faire clignoter une Part.": "A loop repeats orders without stopping. Perfect for making a Part blink.", "La Part devient transparente, attend une seconde, redevient normale, et recommence.": "The Part becomes transparent, waits one second, goes back to normal, and starts again.", "Lance le jeu : la Part clignote.": "Run the game: the Part blinks.", "Change le nombre dans task.wait pour aller plus vite ou plus lentement.": "Change the number in task.wait to go faster or slower.", "N'oublie jamais task.wait() dans une boucle while. Sans lui, Studio se bloque.": "Never forget task.wait() in a while loop. Without it, Studio freezes.", "Fabrique un bloc qui change de couleur tout seul toutes les secondes, et qui devient transparent quand un joueur le touche.": "Make a block that changes colour by itself every second, and that becomes transparent when a player touches it.", "Toucher": "Touch", "Une façon de ranger ton projet : une Part et deux scripts.": "One way to organise your project: one Part and two scripts.", "Mon script est rangé dans la Part": "My script is stored in the Part", "J'utilise une variable pour la Part": "I use a variable for the Part", "La couleur change en boucle avec task.wait": "The colour changes in a loop with task.wait", "Il se passe quelque chose quand on touche le bloc": "Something happens when the block is touched", "Il n'y a aucune erreur rouge dans Output": "There is no red error in Output", "Une interface se range dans StarterGui. Le ScreenGui est la feuille, et tu poses tes éléments dessus.": "An interface goes in StarterGui. The ScreenGui is the sheet, and you place your elements on it.", "Un ScreenGui avec un Frame à l'intérieur.": "A ScreenGui with a Frame inside.", "Dans l'Explorer, survole StarterGui et clique sur le +.": "In the Explorer, hover over StarterGui and click the +.", "Choisis ScreenGui.": "Choose ScreenGui.", "Clique sur le + du ScreenGui et choisis Frame.": "Click the + on the ScreenGui and choose Frame.", "Un rectangle blanc apparaît sur ton écran : c'est ton premier élément.": "A white rectangle appears on your screen: that's your first element.", "Placer et agrandir un Frame": "Place and resize a Frame", "Ajouter du texte et des images": "Add text and images", "Un bouton qui réagit": "A button that reacts", "Le style des pros": "The pro look", "S'adapter au téléphone": "Fit on a phone", "Faire bouger le menu": "Make the menu move", "Un Frame est un rectangle. Sa taille et sa place se règlent avec Size et Position.": "A Frame is a rectangle. Its size and place are set with Size and Position.", "Les réglages pour un Frame bien centré.": "The settings for a well-centred Frame.", "Sélectionne ton Frame.": "Select your Frame.", "Ton Frame est maintenant pile au centre.": "Your Frame is now right in the centre.", "Change Size pour qu'il prenne la place que tu veux.": "Change Size so it takes the space you want.", "TextLabel affiche du texte, ImageLabel affiche une image.": "TextLabel shows text, ImageLabel shows a picture.", "Un titre et une image dans un Frame.": "A title and a picture in a Frame.", "Dans ton Frame, ajoute un TextLabel.": "In your Frame, add a TextLabel.", "Change sa propriété Text pour écrire ton titre.": "Change its Text property to write your title.", "Coche TextScaled pour que le texte s'adapte à la taille.": "Tick TextScaled so the text fits the size.", "Ajoute un ImageLabel.": "Add an ImageLabel.", "Dans Image, colle l'ID d'une image trouvée dans la Boutique.": "In Image, paste the ID of a picture found in the Shop.", "Garde tes ID d'images dans « Ma collection », page Boutique.": "Keep your image IDs in \"My collection\", on the Shop page.", "Un TextButton est un bouton. Pour qu'il fasse quelque chose, on lui ajoute un LocalScript.": "A TextButton is a button. To make it do something, you add a LocalScript to it.", "Le LocalScript à ranger dans le bouton.": "The LocalScript to store in the button.", "Ajoute un TextButton dans ton Frame.": "Add a TextButton in your Frame.", "Clique sur son + et choisis LocalScript.": "Click its + and choose LocalScript.", "Écris le code de l'image.": "Write the code from the picture.", "Lance le jeu et clique : « Clic ! » s'affiche dans Output.": "Run the game and click: \"Clic !\" shows up in Output.", "Quatre petits objets transforment un rectangle tout plat en vrai menu de jeu.": "Four small objects turn a flat rectangle into a real game menu.", "Jouer": "Play", "Avant": "Before", "Après": "After", "Le même menu, avant et après.": "The same menu, before and after.", "Ajoute un UICorner dans ton Frame : les coins s'arrondissent.": "Add a UICorner in your Frame: the corners become round.", "Ajoute un UIStroke pour dessiner un contour.": "Add a UIStroke to draw an outline.", "Ajoute un UIGradient pour un dégradé de couleurs.": "Add a UIGradient for a colour gradient.", "Ajoute un UIPadding pour laisser de l'air sur les bords.": "Add a UIPadding to leave some room at the edges.", "L'outil Dégradé te donne le code de ton UIGradient.": "The Gradient tool gives you the code for your UIGradient.", "Beaucoup de joueurs sont sur téléphone. Une interface en pixels déborde sur leur petit écran.": "Many players are on a phone. An interface sized in pixels spills off their small screen.", "En Offset : ça déborde": "In Offset: it spills over", "En Scale : ça rentre": "In Scale: it fits", "Le même menu sur un téléphone.": "The same menu on a phone.", "Dans Size, le premier nombre de chaque paire est le Scale, le second est l'Offset.": "In Size, the first number of each pair is the Scale, the second is the Offset.", "Dans l'onglet Test, clique sur Device pour voir ton jeu sur un téléphone.": "In the Test tab, click Device to see your game on a phone.", "Ajoute un UIAspectRatioConstraint pour qu'un carré reste carré.": "Add a UIAspectRatioConstraint so a square stays square.", "Un menu qui glisse est bien plus agréable qu'un menu qui apparaît d'un coup. On appelle ça un tween.": "A menu that slides is much nicer than a menu that pops up all at once. This is called a tween.", "Le menu glisse jusqu'au centre en un quart de seconde.": "The menu slides to the centre in a quarter of a second.", "Va dans l'onglet Code et cherche « Menu qui glisse ».": "Go to the Code tab and search for \"Sliding menu\".", "Copie le snippet dans un LocalScript, rangé dans ton bouton.": "Copy the snippet into a LocalScript, stored in your button.", "Appelle ton Frame « Menu ».": "Name your Frame \"Menu\".", "Lance le jeu et clique sur le bouton.": "Run the game and click the button.", "Fabrique un menu de boutique : un titre, trois objets à vendre avec leur prix, un bouton pour fermer et un bouton pour ouvrir le menu.": "Make a shop menu: a title, three items for sale with their price, a button to close and a button to open the menu.", "Un exemple de boutique. Choisis tes propres couleurs et tes propres objets.": "An example shop. Choose your own colours and your own items.", "Mon menu est centré avec AnchorPoint": "My menu is centred with AnchorPoint", "Il a un titre et trois objets avec leur prix": "It has a title and three items with their price", "Les coins sont arrondis avec UICorner": "The corners are rounded with UICorner", "Les tailles sont en Scale : ça marche sur téléphone": "Sizes are in Scale: it works on a phone", "Un bouton ouvre et ferme le menu": "A button opens and closes the menu", "Le menu s'anime avec un tween": "The menu is animated with a tween", "Un obby est une suite de plateformes. Le joueur saute de l'une à l'autre jusqu'à l'arrivée.": "An obby is a series of platforms. The player jumps from one to the next until the finish.", "Un parcours vu de côté : départ, plateformes, lave, arrivée.": "A course seen from the side: start, platforms, lava, finish.", "Pose une Part pour le départ et ancre-la.": "Place a Part for the start and anchor it.", "Duplique-la avec Ctrl D pour créer les plateformes suivantes.": "Duplicate it with Ctrl D to create the next platforms.", "Si un saut est impossible, rapproche les plateformes.": "If a jump is impossible, move the platforms closer.", "Commence facile. Un obby trop dur dès le début fait partir les joueurs.": "Start easy. An obby that is too hard from the start makes players leave.", "La lave qui fait perdre": "Lava that makes you lose", "Un obstacle qui disparaît": "A disappearing obstacle", "L'arrivée et la publication": "The finish and publishing", "Une brique de lave remet le joueur au dernier checkpoint quand il la touche.": "A lava brick sends the player back to the last checkpoint when they touch it.", "Le script de la lave, à ranger dans la Part.": "The lava script, to store in the Part.", "Pose une Part rouge, avec la matière Neon.": "Place a red Part, with the Neon material.", "Ajoute un Script dedans.": "Add a Script inside.", "Écris le code de l'image, ou copie le snippet « Brique mortelle ».": "Write the code from the picture, or copy the \"Kill brick\" snippet.", "Teste : en touchant la lave, ton personnage recommence.": "Test: when touching the lava, your character starts again.", "Un checkpoint évite de tout recommencer. Dans Roblox, on le fait avec un SpawnLocation et une équipe.": "A checkpoint saves you from starting all over. In Roblox, you make one with a SpawnLocation and a team.", "décoché": "unticked", "Les réglages d'un SpawnLocation qui sert de checkpoint.": "The settings of a SpawnLocation used as a checkpoint.", "Ajoute un SpawnLocation à chaque étape.": "Add a SpawnLocation at each stage.", "Dans le service Teams, crée une équipe par étape.": "In the Teams service, create one team per stage.", "Donne au SpawnLocation la même TeamColor que son équipe.": "Give the SpawnLocation the same TeamColor as its team.", "Décoche Neutral et coche AllowTeamChangeOnTouch.": "Untick Neutral and tick AllowTeamChangeOnTouch.", "Coche AutoAssignable seulement sur l'équipe de la première étape.": "Tick AutoAssignable only on the team of the first stage.", "Donne une couleur différente à chaque équipe, sinon les checkpoints se mélangent.": "Give each team a different colour, otherwise the checkpoints get mixed up.", "Une plateforme qui disparaît et revient oblige le joueur à sauter au bon moment.": "A platform that disappears and comes back forces the player to jump at the right moment.", "La plateforme disparaît deux secondes, puis revient deux secondes.": "The platform disappears for two seconds, then comes back for two seconds.", "Ajoute un Script dans une de tes plateformes.": "Add a Script in one of your platforms.", "Teste et règle les temps pour que le saut reste possible.": "Test and adjust the timings so the jump stays possible.", "CanCollide décoché veut dire qu'on passe à travers.": "CanCollide unticked means you pass straight through.", "Il reste à fêter la victoire du joueur, puis à mettre ton jeu en ligne.": "All that's left is to celebrate the player's win, then put your game online.", "Le script de la plateforme d'arrivée.": "The script for the finish platform.", "Pose une plateforme dorée à la fin du parcours.": "Place a golden platform at the end of the course.", "Ajoute le script de l'image.": "Add the script from the picture.", "Fais tout ton obby du début à la fin, sans tricher.": "Play your whole obby from start to finish, without cheating.", "Clique sur File, puis Publish to Roblox pour le mettre en ligne.": "Click File, then Publish to Roblox to put it online.", "Fais tester ton obby par un ami : s'il reste bloqué, l'étape est trop dure.": "Have a friend test your obby: if they get stuck, the stage is too hard.", "Fabrique un obby complet : cinq étapes différentes, de la lave, un obstacle qui bouge ou disparaît, des checkpoints et une arrivée.": "Make a complete obby: five different stages, lava, an obstacle that moves or disappears, checkpoints and a finish.", "Un exemple de parcours. Invente le tien !": "An example course. Invent your own!", "Mon obby a cinq étapes différentes": "My obby has five different stages", "Il y a au moins une brique de lave": "There is at least one lava brick", "Un obstacle bouge ou disparaît": "An obstacle moves or disappears", "Il y a un checkpoint entre les étapes": "There is a checkpoint between stages", "Il y a une plateforme d'arrivée": "There is a finish platform", "Je l'ai fini moi-même du début à la fin": "I finished it myself from start to finish", "Toutes les leçons sont finies. Place au projet final !": "All lessons are finished. Time for the final project!", "Ton image est presque vide. Montre ton projet de plus près.": "Your picture is almost empty. Show your project closer up.", "Il y a beaucoup de détails à regarder.": "There is a lot of detail to look at.", "Ton image ressemble plutôt à une photo. Fais une vraie capture d'écran, ce sera plus net.": "Your picture looks more like a photo. Take a real screenshot, it will be sharper.", "Il y a peu de couleurs. Ajoute une couleur qui ressort.": "There are few colours. Add one colour that stands out.", "Ta capture est petite. Passe en plein écran avant de la prendre.": "Your screenshot is small. Go full screen before taking it.", "Tu as fini tous les cours et tous les projets. Bravo !": "You finished every course and every project. Well done!", "Aucune ligne ne correspond à cette recherche.": "No row matches this search.", "Des outils qui ajoutent des fonctions à Studio. Les recherches en anglais donnent plus de résultats.": "Tools that add features to Studio. Searches in English give more results.", "Textures, icônes et decals pour tes parts et tes interfaces. Les recherches en anglais donnent plus de résultats.": "Textures, icons and decals for your parts and interfaces. Searches in English give more results.", "Musiques et effets sonores. Les recherches en anglais donnent plus de résultats.": "Music and sound effects. Searches in English give more results.", "Clips à afficher dans un VideoFrame. Les recherches en anglais donnent plus de résultats.": "Clips to show in a VideoFrame. Searches in English give more results.", "Vêtements et accessoires pour les avatars. Les recherches en anglais donnent plus de résultats.": "Clothes and accessories for avatars. Searches in English give more results.", "Les jeux des autres, pour t'inspirer. Les recherches en anglais donnent plus de résultats.": "Other people's games, for inspiration. Searches in English give more results.", "Questions, tutoriels et ressources de la communauté. Les recherches en anglais donnent plus de résultats.": "Questions, tutorials and resources from the community. Searches in English give more results.", "Effacer": "Clear", "Recherches effacées": "Searches cleared", "Je ne trouve pas d'ID dans ce texte. Colle un nombre ou un lien Roblox.": "I can't find an ID in this text. Paste a number or a Roblox link.", "Leçon": "Lesson", "Prénom ou pseudo": "First name or nickname", "Pseudo Roblox": "Roblox username", "ID de ton compte Roblox (facultatif)": "Your Roblox account ID (optional)", "Le nombre dans le lien de ton profil": "The number in your profile link", "Ton pseudo et ton ID servent seulement à créer un lien vers ton profil. Établi Dev ne se connecte pas à ton compte et ne te demandera jamais ton mot de passe.": "Your username and ID are only used to create a link to your profile. Établi Dev does not connect to your account and will never ask for your password.", "Langue": "Language", "Thème": "Theme", "Automatique": "Automatic", "Clair": "Light", "Sombre": "Dark", "Tes données": "Your data", "Tout est enregistré dans ce navigateur. Copie une sauvegarde pour la garder ou la passer sur un autre appareil.": "Everything is saved in this browser. Copy a backup to keep it or move it to another device.", "Copier ma sauvegarde": "Copy my backup", "Tout effacer": "Erase everything", "Restaurer": "Restore", "Cette sauvegarde est illisible. Colle le texte complet copié depuis « Copier ma sauvegarde ».": "This backup can't be read. Paste the full text copied from \"Copy my backup\".", "Confirmer : tout effacer": "Confirm: erase everything", "Chercher partout": "Search everywhere", "Changer de page": "Change page", "Afficher cette aide": "Show this help", "Fermer une fenêtre": "Close a window", "Sur Mac, Ctrl devient Cmd.": "On Mac, Ctrl becomes Cmd.", "Bonsoir": "Good evening", "Bonsoir, on forge quoi aujourd'hui ?": "Good evening, what are we forging today?", "Reprendre": "Resume", "Revoir": "Review", "Copie bloquée": "Copy blocked", "Recharge la page pour finir.": "Reload the page to finish.", "Choisis une image PNG ou JPG de moins de 15 Mo.": "Choose a PNG or JPG image under 15 MB.", "Je n'arrive pas à lire cette image. Essaie une capture en PNG ou en JPG.": "I can't read this picture. Try a PNG or JPG screenshot.", "Super travail ! Il ne te manque presque rien.": "Great work! You are almost there.", "Timestamp invalide.": "Invalid timestamp.", "Rien trouvé. Essaie un autre mot.": "Nothing found. Try another word.", "Bienvenue !": "Welcome!", "Mon profil ↗": "My profile ↗", "Tâche": "Task", "BlocMagique": "MagicBlock", "Note calculée d'après la liste que tu as cochée.": "Grade calculated from the list you ticked.", "Des morceaux prêts à copier, tous en Luau, classés par thème.": "Ready-to-copy pieces of code, all in Luau, sorted by topic.", "Ta première cabane": "Your first cabin", "Le bloc magique": "The magic block", "Ta boutique comme les pros": "Your shop, like the pros", "Ton obby de cinq étapes": "Your five-stage obby", "Les checkpoints": "Checkpoints"};
const TRX = [[/^Favori : (.+)$/, (m, a) => 'Favourite: ' + T(a)],
[/^Déplacer vers (.+)$/, (m, a) => 'Move to ' + T(a)],
[/^Retirer (.+)$/, 'Remove $1'],
[/^« (.+) » retiré$/, '"$1" removed'],
[/^« (.+) » supprimé$/, '"$1" deleted'],
[/^Fiche officielle : (.+) ↗$/, 'Official reference: $1 ↗'],
[/^Projet final : (.+)$/, (m, a) => 'Final project: ' + T(a)],
[/^(.+) · leçon (\d+) sur (\d+)$/, (m, a, b, c) => T(a) + ' · lesson ' + b + ' of ' + c],
[/^(.+) · projet final$/, (m, a) => T(a) + ' · final project'],
[/^Ouvrir le rayon (.+) ↗$/, (m, a) => 'Browse ' + T(a) + ' ↗'],
[/^Chercher « (.+) » dans la boutique Roblox$/, 'Search "$1" in the Roblox shop'],
[/^Chercher « (.+) » dans (.+) ↗$/, (m, a, b) => 'Search "' + a + '" in ' + T(b) + ' ↗'],
[/^Ouvrir (\w+) ↗$/, 'Open $1 ↗'],
[/^Rayon (.+)$/, (m, a) => 'Shop: ' + T(a)],
[/^Profil de (.+) ↗$/, "$1's profile ↗"],
[/^Bienvenue, (.+) !$/, 'Welcome, $1!'],
[/^(.+) · (Modèles|Vidéos|Expériences)$/, (m, a, b) => a + ' · ' + T(b)],
[/^JSON invalide : (.+)$/, 'Invalid JSON: $1'],
[/^Correspond au (.+)\. Sur Roblox, os\.time\(\) renvoie cette valeur\.$/, 'That is $1. On Roblox, os.time() returns this value.'],
[/^(Base|Analogue|Triade|Complément) : copier (.+)$/, (m, a, b) => ({ Base: 'Base', Analogue: 'Analogous', Triade: 'Triad', 'Complément': 'Complement' })[a] + ': copy ' + b],
[/^(\d+) tâches? en cours, (\d+) bugs? ouverts?, (\d+) sur (\d+) leçons terminées\.$/, (m, a, b, c, d) => a + (a === '1' ? ' task' : ' tasks') + ' in progress, ' + b + (b === '1' ? ' open bug, ' : ' open bugs, ') + c + ' of ' + d + ' lessons done.'],
[/^(\d+) sur (\d+) tâches? terminées?$/, '$1 of $2 tasks done'],
[/^(\d+) leçons et 1 projet final$/, '$1 lessons and 1 final project'],
[/^Pause\ (\d+(?:[.,]\d+)?)$/, "Break $1"],
[/^UDim(\d+(?:[.,]\d+)?)\ :\ pixels\ vers\ Scale$/, "UDim$1: pixels to Scale"],
[/^Roblox\ garde\ (\d+(?:[.,]\d+)?)\ %\ sur\ les\ passes\ et\ produits\.\ Vérifie\ le\ taux\ DevEx\ actuel\ sur\ le\ site\ de\ Roblox\ avant\ de\ compter\ dessus\.$/, "Roblox keeps $1% on passes and products. Check the current DevEx rate on the Roblox website before counting on it."],
[/^Roblox\ garde\ (\d+(?:[.,]\d+)?)\ %\ sur\ les\ passes\ et\ les\ produits\ :\ il\ faut\ donc\ afficher\ un\ prix\ plus\ haut\ que\ ce\ que\ tu\ veux\ toucher\.$/, "Roblox keeps $1% on passes and products, so you need to show a higher price than what you want to earn."],
[/^(\d+(?:[.,]\d+)?)\ stud\ =\ (\d+(?:[.,]\d+)?)\ m\.\ Un\ personnage\ marche\ à\ (\d+(?:[.,]\d+)?)\ studs\ par\ seconde\ par\ défaut\.$/, "$1 stud = $2 m. A character walks at $3 studs per second by default."],
[/^Maj\ F(\d+(?:[.,]\d+)?)$/, "Shift F$1"],
[/^Ctrl\ (\d+(?:[.,]\d+)?)\ à\ (\d+(?:[.,]\d+)?)$/, "Ctrl $1 to $2"],
[/^(\d+(?:[.,]\d+)?)\ s\ à\ (\d+(?:[.,]\d+)?)\ studs\/s$/, "$1 s at $2 studs/s"],
[/^(\d+(?:[.,]\d+)?)\ %\ de\ chance\ d'en\ avoir\ au\ moins\ un$/, "$1% chance of getting at least one"],
[/^(\d+(?:[.,]\d+)?)\ sur\ (\d+(?:[.,]\d+)?)$/, "$1 in $2"],
[/^(\d+(?:[.,]\d+)?)\ essais$/, "$1 tries"],
[/^Mets\ AnchorPoint\ à\ (\d+(?:[.,]\d+)?),\ (\d+(?:[.,]\d+)?)\ sur\ le\ Frame\ pour\ qu'il\ se\ centre\ bien\.$/, "Set AnchorPoint to $1, $2 on the Frame so it centres properly."],
[/^Ton\ monde\ en\ (\d+(?:[.,]\d+)?)D$/, "Your $1D world"],
[/^(\d+(?:[.,]\d+)?)\ leçons\ et\ (\d+(?:[.,]\d+)?)\ projet\ final$/, "$1 lessons and $2 final project"],
[/^Tout\ ce\ qui\ existe\ dans\ le\ monde\ (\d+(?:[.,]\d+)?)D\ :\ parts,\ modèles,\ terrain\.$/, "Everything that exists in the $1D world: parts, models, terrain."],
[/^(\d+(?:[.,]\d+)?)\ essai$/, "$1 try"],
[/^(\d+(?:[.,]\d+)?)\ sur\ (\d+(?:[.,]\d+)?)\ leçons\ terminées\.\ Les\ vidéos\ s'ouvrent\ sur\ YouTube,\ dans\ un\ nouvel\ onglet\.$/, "$1 of $2 lessons done. Videos open on YouTube, in a new tab."],
[/^Au\ milieu,\ tu\ vois\ ton\ monde\ en\ (\d+(?:[.,]\d+)?)D\.$/, "In the middle, you see your $1D world."],
[/^Mur(\d+(?:[.,]\d+)?)$/, "Wall$1"],
[/^Dans\ l'Explorer,\ clique\ sur\ une\ Part\ et\ appuie\ sur\ F(\d+(?:[.,]\d+)?)\ pour\ la\ renommer\.$/, "In the Explorer, click a Part and press F$1 to rename it."],
[/^Appuie\ sur\ F(\d+(?:[.,]\d+)?)\ :\ ton\ personnage\ apparaît\ dans\ le\ jeu\.$/, "Press F$1: your character appears in the game."],
[/^Appuie\ sur\ Maj\ F(\d+(?:[.,]\d+)?)\ pour\ arrêter\.$/, "Press Shift F$1 to stop."],
[/^(\d+(?:[.,]\d+)?)\ étoiles\ sur\ (\d+(?:[.,]\d+)?)\.\ Bravo\ !$/, "$1 stars out of $2. Well done!"],
[/^(\d+(?:[.,]\d+)?)\ étoiles\ sur\ (\d+(?:[.,]\d+)?)$/, "$1 stars out of $2"],
[/^J'ai\ repéré\ (\d+(?:[.,]\d+)?)\ couleurs\ principales\ :\ c'est\ varié\.$/, "I spotted $1 main colours: nice variety."],
[/^Appuie\ sur\ F(\d+(?:[.,]\d+)?)\.$/, "Press F$1."],
[/^Écris\ :\ part\.Color\ =\ Color(\d+(?:[.,]\d+)?)\.fromRGB\((\d+(?:[.,]\d+)?),\ (\d+(?:[.,]\d+)?),\ (\d+(?:[.,]\d+)?)\)$/, "Write: part.Color = Color$1.fromRGB($2, $3, $4)"],
[/^Écris\ :\ part\.Transparency\ =\ (\d+(?:[.,]\d+)?)$/, "Write: part.Transparency = $1"],
[/^L'outil\ Couleurs\ de\ l'onglet\ Outils\ te\ donne\ le\ code\ Color(\d+(?:[.,]\d+)?)\ de\ n'importe\ quelle\ couleur\.$/, "The Colours tool in the Tools tab gives you the Color$1 code of any colour."],
[/^Mets\ AnchorPoint\ à\ (\d+(?:[.,]\d+)?),\ (\d+(?:[.,]\d+)?)\.$/, "Set AnchorPoint to $1, $2."],
[/^Mets\ Position\ à\ \{(\d+(?:[.,]\d+)?),\ (\d+(?:[.,]\d+)?)\},\ \{(\d+(?:[.,]\d+)?),\ (\d+(?:[.,]\d+)?)\}\.$/, "Set Position to {$1, $2}, {$3, $4}."],
[/^AnchorPoint\ à\ (\d+(?:[.,]\d+)?),\ (\d+(?:[.,]\d+)?)\ veut\ dire\ :\ je\ place\ l'élément\ par\ son\ milieu\.$/, "AnchorPoint at $1, $2 means: I place the element by its middle."],
[/^Activated\ marche\ à\ la\ souris,\ au\ doigt\ et\ à\ la\ manette\.\ C'est\ mieux\ que\ MouseButton(\d+(?:[.,]\d+)?)Click\.$/, "Activated works with the mouse, a finger and a gamepad. It's better than MouseButton$1Click."],
[/^Mets\ les\ Offsets\ à\ (\d+(?:[.,]\d+)?)\ et\ règle\ les\ Scales,\ entre\ (\d+(?:[.,]\d+)?)\ et\ (\d+(?:[.,]\d+)?)\.$/, "Set the Offsets to $1 and adjust the Scales, between $2 and $3."],
[/^L'outil\ «\ UDim(\d+(?:[.,]\d+)?)\ :\ pixels\ vers\ Scale\ »\ fait\ la\ conversion\ pour\ toi\.$/, "The \"UDim$1: pixels to Scale\" tool does the conversion for you."],
[/^Une\ animation\ courte,\ entre\ (\d+(?:[.,]\d+)?)\ et\ (\d+(?:[.,]\d+)?)\ seconde,\ suffit\.$/, "A short animation, between $1 and $2 second, is enough."],
[/^Espace\-les\ un\ peu,\ puis\ teste\ chaque\ saut\ avec\ F(\d+(?:[.,]\d+)?)\.$/, "Space them out a little, then test each jump with F$1."],
[/^Formes\ (\d+(?:[.,]\d+)?)D\ à\ utiliser\ dans\ un\ MeshPart\.\ Les\ recherches\ en\ anglais\ donnent\ plus\ de\ résultats\.$/, "$1D shapes to use in a MeshPart. Searches in English give more results."],
[/^Alt\ (\d+(?:[.,]\d+)?)\ à\ (\d+(?:[.,]\d+)?)$/, "Alt $1 to $2"],
];
const trMiss = new Set(); window.__trMiss = trMiss;
function tr(s) { const k = s.trim(); if (!k || !/[A-Za-zÀ-ÿ]{2}/.test(k)) return null; let v = TR[k];
  if (v === undefined) for (const [r, p] of TRX) if (r.test(k)) { v = k.replace(r, p); break; }
  if (v === undefined) { trMiss.add(k); return null; } return s.replace(k, () => v); }
const T = s => { if (LANG !== 'en') return s; const v = tr(s); return v === null ? s : v; };
const NOTR = '[data-notr],pre,textarea,script,style';
function trNode(n) {
  if (n.nodeType === 3) { const p = n.parentNode; if (!p || !p.closest || p.closest(NOTR)) return; const v = tr(n.nodeValue); if (v !== null && v !== n.nodeValue) n.nodeValue = v; }
  else if (n.nodeType === 1) { if (n.closest(NOTR)) return; ['placeholder', 'title', 'aria-label'].forEach(a => { const x = n.getAttribute(a); if (x) { const v = tr(x); if (v !== null && v !== x) n.setAttribute(a, v); } }); n.childNodes.forEach(trNode); }
}
if (LANG === 'en') { trNode(document.body); new MutationObserver(ms => ms.forEach(m => { if (m.type === 'characterData') trNode(m.target); else m.addedNodes.forEach(trNode); })).observe(document.body, { childList: true, subtree: true, characterData: true }); }
document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === LANG));
document.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (!b || b.dataset.lang === LANG) return; prefs.lang = b.dataset.lang; save('prefs', prefs); try { location.reload(); } catch (x) {} });
const YT_EN = [['tutoriel', 'tutorial'], ['français', ''], ['débutant', 'beginner'], ['découvrir', 'getting started'], ['créer un', 'make an'], ['tester son jeu', ''], ['publier son jeu', ''], ['plateforme qui disparait', 'disappearing platform'], ['changer couleur', 'change color'], ['lave', 'lava'], ['centrer', 'center'], ['organiser', 'organize'], ['moderne', 'modern'], ['boucle', 'loop'], ['premier script', 'first script'], ['clic bouton', 'button click']];
/* ============ NAVIGATION ============ */
const TABS = ['accueil', 'boutique', 'outils', 'code', 'projets', 'apprendre', 'memo', 'conditions', 'confidentialite', 'mentions'];
const NAMES = { accueil: 'Accueil', editeur: 'Éditeur', boutique: 'Boutique', outils: 'Outils', code: 'Code', projets: 'Projets', apprendre: 'Cours', memo: 'Mémo', conditions: "Conditions d'utilisation", confidentialite: 'Confidentialité', mentions: 'Mentions légales' };
function showTab() {
  let t = location.hash.slice(1); if (!TABS.includes(t)) t = load('tab3', 'accueil'); if (!TABS.includes(t)) t = 'accueil';
  TABS.forEach(n => { $('p-' + n).hidden = n !== t; });
  document.querySelectorAll('.rail a[data-nav]').forEach(a => a.getAttribute('href') === '#' + t ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  $('bar-title').textContent = NAMES[t]; save('tab3', t); if (['conditions', 'confidentialite', 'mentions'].includes(t)) window.scrollTo(0, 0);
  if (t === 'accueil') homeRender();
  if (t === 'editeur' && cm) setTimeout(() => cm.refresh(), 0);
  if (t === 'projets') tkRender();
  if (t === 'outils') toolsRender();
}
const go = t => { if (location.hash === '#' + t) showTab(); else location.hash = t; };
addEventListener('hashchange', showTab);
function doAct(a) {
  if (a === 'shop') go('boutique');
  else if (a === 'newtask') { go('projets'); setTimeout(() => $('tk-title').focus(), 60); }
  else if (a === 'search') palOpen();
  else if (a === 'learn') courseResume();
  else if (a === 'settings') settings();
  else if (a === 'help') help();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) doAct(b.dataset.act); });

let cm = null;
/* ============ OUTILS ============ */
function hexRGB(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim()); return m ? [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16)) : null; }
const toLin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
function colorUpdate(hex) {
  const rgb = hexRGB(hex); if (!rgb) return; const [r, g, b] = rgb, h = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  const f = rgb.map(v => v / 255), d3 = v => (+v.toFixed(3)).toString(), lin = f.map(toLin);
  const mx = Math.max(...f), mn = Math.min(...f), l = (mx + mn) / 2; let hh = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    hh = (mx === f[0] ? (f[1] - f[2]) / d + (f[1] < f[2] ? 6 : 0) : mx === f[1] ? (f[2] - f[0]) / d + 2 : (f[0] - f[1]) / d + 4) * 60; }
  $('col-pick').value = h.toLowerCase(); $('col-sw').style.background = h;
  outRows($('col-out'), [['Roblox', `Color3.fromRGB(${r}, ${g}, ${b})`], ['Roblox', `Color3.fromHex("${h}")`], ['Unreal', `FColor(${r}, ${g}, ${b})`],
    ['Unreal', `FLinearColor(${lin.map(v => d3(v) + 'f').join(', ')})`], ['Unity', `new Color(${f.map(v => d3(v) + 'f').join(', ')})`], ['Godot', `Color("${h}")`],
    ['CSS', `rgb(${r} ${g} ${b})`], ['CSS', `hsl(${Math.round(hh)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`]]);
}
$('col-pick').addEventListener('input', e => { $('col-hex').value = e.target.value.toUpperCase(); colorUpdate(e.target.value); });
$('col-hex').addEventListener('input', e => colorUpdate(e.target.value));

function unitUpdate() { const m = num('un-val') * parseFloat($('un-from').value);
  outRows($('un-out'), [['Roblox', fmt(m / 0.28, 3) + ' studs'], ['Unreal', fmt(m * 100, 2) + ' uu (cm)'], ['Unity', fmt(m, 3) + ' unités'], ['Godot 3D', fmt(m, 3) + ' m'], ['Réel', fmt(m, 3) + ' m']]); }
$('un-val').addEventListener('input', unitUpdate); $('un-from').addEventListener('change', unitUpdate);

function udUpdate() { const pw = num('ud-pw') || 1, ph = num('ud-ph') || 1, r = v => (+v.toFixed(3)).toString();
  outRows($('ud-out'), [['Size', `UDim2.fromScale(${r(num('ud-w') / pw)}, ${r(num('ud-h') / ph)})`], ['Position', `UDim2.fromScale(${r(num('ud-x') / pw)}, ${r(num('ud-y') / ph)})`]]); }
['ud-w', 'ud-h', 'ud-x', 'ud-y', 'ud-pw', 'ud-ph'].forEach(i => $(i).addEventListener('input', udUpdate));

const bounceOut = t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; };
const EASE = { Linear: t => t, Sine: t => 1 - Math.cos(t * Math.PI / 2), Quad: t => t * t, Cubic: t => t ** 3, Quart: t => t ** 4, Quint: t => t ** 5,
  Exponential: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10), Circular: t => 1 - Math.sqrt(1 - t * t), Back: t => 2.70158 * t ** 3 - 1.70158 * t * t,
  Elastic: t => t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI / 3)), Bounce: t => 1 - bounceOut(1 - t) };
$('tw-style').innerHTML = Object.keys(EASE).map(k => `<option${k === 'Quad' ? ' selected' : ''}>${k}</option>`).join('');
function tweenCode() { const d = num('tw-dur') || 1;
  paint($('tw-code'), `local TweenService = game:GetService("TweenService")\n\nlocal info = TweenInfo.new(\n\t${d}, -- durée en secondes\n\tEnum.EasingStyle.${$('tw-style').value},\n\tEnum.EasingDirection.${$('tw-dir').value}\n)\n\nlocal tween = TweenService:Create(part, info, {\n\tPosition = part.Position + Vector3.new(0, 10, 0),\n})\ntween:Play()`, 'lua'); }
let twRaf = 0;
function tweenPlay() { cancelAnimationFrame(twRaf);
  const f = EASE[$('tw-style').value], dir = $('tw-dir').value, dur = (num('tw-dur') || 1) * 1000;
  const e = t => dir === 'In' ? f(t) : dir === 'Out' ? 1 - f(1 - t) : t < .5 ? f(2 * t) / 2 : 1 - f(2 - 2 * t) / 2;
  const span = $('tw-track').clientWidth - 34, dot = $('tw-dot'), t0 = performance.now();
  const step = now => { const t = Math.min(1, (now - t0) / dur); dot.style.transform = `translateX(${e(t) * span}px)`; if (t < 1) twRaf = requestAnimationFrame(step); };
  twRaf = requestAnimationFrame(step); }
['tw-dur', 'tw-style', 'tw-dir'].forEach(i => $(i).addEventListener('input', tweenCode)); $('tw-play').addEventListener('click', tweenPlay);

function xpUpdate() { const base = Math.max(1, num('xp-base') || 100), ex = Math.max(1, num('xp-exp') || 1.5), n = Math.min(30, Math.max(2, parseInt($('xp-n').value) || 10));
  const rows = []; let total = 0; for (let i = 1; i < n; i++) { const need = Math.floor(base * Math.pow(i, ex)); total += need; rows.push([i, need, total]); }
  const max = rows[rows.length - 1][1];
  $('xp-table').innerHTML = '<tr><th>Niveau</th><th>XP pour monter</th><th>XP cumulée</th><th style="width:30%"></th></tr>' +
    rows.map(r => `<tr><td>${r[0]} → ${r[0] + 1}</td><td>${fmt(r[1], 0)}</td><td>${fmt(r[2], 0)}</td><td><div class="bar-x" style="width:${r[1] / max * 100}%"></div></td></tr>`).join('');
  paint($('xp-code'), `-- XP nécessaire pour passer du niveau donné au suivant\nlocal function xpPourMonter(niveau: number): number\n\treturn math.floor(${base} * niveau ^ ${ex})\nend`, 'lua'); }
['xp-base', 'xp-exp', 'xp-n'].forEach(i => $(i).addEventListener('input', xpUpdate));

function rbUpdate() { const per = Math.floor(num('rb-price') * 0.7), tot = per * num('rb-sales');
  outRows($('rb-out'), [['Par vente', fmt(per, 0) + ' R$'], ['Total', fmt(tot, 0) + ' R$'], ['En dollars', fmt(tot * num('rb-rate'), 2) + ' $']]); }
['rb-price', 'rb-sales', 'rb-rate'].forEach(i => $(i).addEventListener('input', rbUpdate));

function toLuau(v, ind) { const pad = '\t'.repeat(ind), pad1 = '\t'.repeat(ind + 1);
  if (v === null) return 'nil'; if (typeof v === 'string') return JSON.stringify(v); if (typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return v.length ? '{\n' + v.map(x => pad1 + toLuau(x, ind + 1) + ',\n').join('') + pad + '}' : '{}';
  const ks = Object.keys(v); if (!ks.length) return '{}';
  return '{\n' + ks.map(k => pad1 + (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : '[' + JSON.stringify(k) + ']') + ' = ' + toLuau(v[k], ind + 1) + ',\n').join('') + pad + '}'; }
function setMsg(id, ok, text) { const m = $(id); m.className = 'msg ' + (ok ? 'ok' : 'bad'); m.textContent = text; }
function jsonDo(fn, okMsg) { try { $('js-in').value = fn(JSON.parse($('js-in').value)); setMsg('js-msg', true, okMsg); } catch (e) { setMsg('js-msg', false, 'JSON invalide : ' + e.message); } }
$('js-fmt').addEventListener('click', () => jsonDo(v => JSON.stringify(v, null, 2), 'JSON valide, formaté.'));
$('js-min').addEventListener('click', () => jsonDo(v => JSON.stringify(v), 'JSON valide, minifié.'));
$('js-lua').addEventListener('click', () => jsonDo(v => 'local data = ' + toLuau(v, 0), 'Converti en table Luau. Recolle du JSON pour recommencer.'));

function rxUpdate() { const t = $('rx-t').value; let re;
  try { let fl = $('rx-f').value.replace(/[^dgimsuy]/g, ''); if (!fl.includes('g')) fl += 'g'; re = new RegExp($('rx-p').value, fl); }
  catch (e) { $('rx-out').textContent = t; setMsg('rx-msg', false, 'Motif invalide : ' + e.message); return; }
  let html = '', last = 0, n = 0, m;
  while ((m = re.exec(t)) && n < 500) { if (m[0] === '') { re.lastIndex++; continue; } html += esc(t.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>'; last = m.index + m[0].length; n++; }
  $('rx-out').innerHTML = html + esc(t.slice(last)); setMsg('rx-msg', n > 0, n + (n > 1 ? ' correspondances' : ' correspondance')); }
['rx-p', 'rx-f', 'rx-t'].forEach(i => $(i).addEventListener('input', rxUpdate));

const ENC = { b64e: s => btoa(String.fromCharCode(...new TextEncoder().encode(s))), b64d: s => new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(s.trim()), c => c.charCodeAt(0))), urle: encodeURIComponent, urld: decodeURIComponent };
document.addEventListener('click', e => { const b = e.target.closest('[data-en]'); if (!b) return;
  try { $('en-in').value = ENC[b.dataset.en]($('en-in').value); setMsg('en-msg', true, 'Converti.'); } catch (err) { setMsg('en-msg', false, "Ce texte ne peut pas être décodé de cette façon."); } });

function ctUpdate() { const a = hexRGB($('ct-fg').value), b = hexRGB($('ct-bg').value); if (!a || !b) return;
  const lum = c => { const [r, g, bl] = c.map(v => toLin(v / 255)); return .2126 * r + .7152 * g + .0722 * bl; }, l1 = lum(a), l2 = lum(b), ratio = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
  const s = $('ct-sample'); s.style.color = $('ct-fg').value; s.style.background = $('ct-bg').value;
  outRows($('ct-out'), [['Ratio', fmt(ratio, 2) + ' : 1'], ['Texte', ratio >= 4.5 ? 'Lisible (AA)' : 'Trop faible'], ['Gros titre', ratio >= 3 ? 'Lisible (AA)' : 'Trop faible'], ['Niveau AAA', ratio >= 7 ? 'Atteint' : 'Non atteint']]); }
['ct-fg', 'ct-bg'].forEach(i => $(i).addEventListener('input', ctUpdate));

function uuid() { try { return crypto.randomUUID(); } catch (e) { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : r & 3 | 8).toString(16); }); } }
function idUpdate() { const now = Math.floor(Date.now() / 1000), u = uuid();
  outRows($('id-out'), [['UUID', u], ['GUID', '{' + u.toUpperCase() + '}'], ['Court', u.replace(/-/g, '').slice(0, 10)], ['Unix', String(now)]]); $('id-ts').value = now; tsUpdate(); }
function tsUpdate() { const d = new Date(num('id-ts') * 1000); $('id-date').textContent = isNaN(d) ? 'Timestamp invalide.' : 'Correspond au ' + d.toLocaleString(LOCALE, { dateStyle: 'full', timeStyle: 'medium' }) + '. Sur Roblox, os.time() renvoie cette valeur.'; }
$('id-gen').addEventListener('click', idUpdate); $('id-ts').addEventListener('input', tsUpdate);


/* ---------- Nouveaux outils ---------- */
function rgbHsl(c) { const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; } return [h, s, l]; }
function hslHex(h, s, l) { h = ((h % 360) + 360) % 360; const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); }; return ('#' + f(0) + f(8) + f(4)).toUpperCase(); }
const lumOf = c => { const v = c.map(x => toLin(x / 255)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
function dropUpdate() { const p = Math.min(100, Math.max(0, num('dr-p'))) / 100, n = Math.max(0, num('dr-n'));
  const need = x => p <= 0 ? 'jamais' : p >= 1 ? '1 essai' : fmt(Math.ceil(Math.log(1 - x) / Math.log(1 - p)), 0) + ' essais';
  outRows($('dr-out'), [['Résultat', fmt((1 - Math.pow(1 - p, n)) * 100, 1) + " % de chance d'en avoir au moins un"], ['1 sur 2', need(.5)], ['9 sur 10', need(.9)], ['99 sur 100', need(.99)]]); }
['dr-p', 'dr-n'].forEach(i => $(i).addEventListener('input', dropUpdate));
function lerpUpdate() { const a = num('lp-a'), b = num('lp-b'), i0 = num('rm-i0'), i1 = num('rm-i1'), o0 = num('rm-o0'), o1 = num('rm-o1');
  outRows($('lp-out'), [['Lerp', fmt(a + (b - a) * num('lp-t'), 4)], ['Remap', i1 === i0 ? 'entrée min = entrée max' : fmt(o0 + (num('rm-v') - i0) * (o1 - o0) / (i1 - i0), 4)],
    ['Code lerp', 'a + (b - a) * t'], ['Code remap', 'outMin + (v - inMin) * (outMax - outMin) / (inMax - inMin)']]); }
['lp-a', 'lp-b', 'lp-t', 'rm-v', 'rm-i0', 'rm-i1', 'rm-o0', 'rm-o1'].forEach(i => $(i).addEventListener('input', lerpUpdate));
function palUpdate() { const rgb = hexRGB($('pl-c').value); if (!rgb) return; const [h, s, l] = rgbHsl(rgb);
  $('pl-out').innerHTML = [['Base', 0], ['Analogue', 30], ['Analogue', -30], ['Triade', 120], ['Triade', -120], ['Complément', 180]].map(([n, d]) => { const x = hslHex(h + d, s, l);
    return `<button data-v="${x}" title="${n} : copier ${x}" style="background:${x};color:${lumOf(hexRGB(x)) > .4 ? '#000' : '#fff'}">${x}</button>`; }).join(''); }
$('pl-c').addEventListener('input', palUpdate);
function gradUpdate() { const a = $('gr-a').value.toUpperCase(), b = $('gr-b').value.toUpperCase(), g = `linear-gradient(${num('gr-ang')}deg, ${a}, ${b})`;
  $('gr-sample').style.background = g; outRows($('gr-out'), [['CSS', 'background: ' + g + ';'], ['Roblox', `ColorSequence.new(Color3.fromHex("${a}"), Color3.fromHex("${b}"))`]]); }
['gr-a', 'gr-b', 'gr-ang'].forEach(i => $(i).addEventListener('input', gradUpdate));
function resUpdate() { const w = Math.max(1, Math.round(num('rs-w'))), h = Math.max(1, Math.round(num('rs-h'))), gcd = (a, b) => b ? gcd(b, a % b) : a, g = gcd(w, h), at = y => Math.round(y * w / h) + ' × ' + y;
  outRows($('rs-out'), [['Ratio', (w / g) + ':' + (h / g) + '  (' + fmt(w / h, 3) + ')'], ['Pixels', fmt(w * h / 1e6, 2) + ' mégapixels'], ['En 720p', at(720)], ['En 1080p', at(1080)], ['En 1440p', at(1440)]]); }
['rs-w', 'rs-h'].forEach(i => $(i).addEventListener('input', resUpdate));

/* ---------- Outils Roblox ---------- */
['t-rx', 't-en', 't-ct', 't-res'].forEach(id => $(id).remove());
$('t-un').querySelector('h2').textContent = 'Studs et mètres';
$('un-from').innerHTML = '<option value="0.28">Studs</option><option value="1">Mètres</option>';
$('t-un').querySelector('.hint').textContent = '1 stud = 0,28 m. Un personnage marche à 16 studs par seconde par défaut.';
$('t-id').querySelector('h2').textContent = 'GUID et dates';
$('t-grad').querySelector('h2').textContent = 'Dégradé (ColorSequence)';
function colorUpdate(hex) { const rgb = hexRGB(hex); if (!rgb) return; const [r, g, b] = rgb, h = '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(), d3 = v => (+v.toFixed(3)).toString();
  const [hh, s, l] = rgbHsl(rgb), v = l + s * Math.min(l, 1 - l), sv = v ? 2 * (1 - l / v) : 0;
  $('col-pick').value = h.toLowerCase(); $('col-sw').style.background = h;
  outRows($('col-out'), [['fromRGB', `Color3.fromRGB(${r}, ${g}, ${b})`], ['fromHex', `Color3.fromHex("${h}")`], ['Color3.new', `Color3.new(${rgb.map(x => d3(x / 255)).join(', ')})`],
    ['fromHSV', `Color3.fromHSV(${d3(hh / 360)}, ${d3(sv)}, ${d3(v)})`], ['Séquence', `ColorSequence.new(Color3.fromRGB(${r}, ${g}, ${b}))`]]); }
function unitUpdate() { const m = num('un-val') * parseFloat($('un-from').value), st = m / 0.28;
  outRows($('un-out'), [['Studs', fmt(st, 3) + ' studs'], ['Mètres', fmt(m, 3) + ' m'], ['À pied', fmt(st / 16, 1) + ' s à 16 studs/s'], ['En sprint', fmt(st / 26, 1) + ' s à 26 studs/s']]); }
function gradUpdate() { const a = $('gr-a').value.toUpperCase(), b = $('gr-b').value.toUpperCase();
  $('gr-sample').style.background = `linear-gradient(${num('gr-ang')}deg, ${a}, ${b})`;
  outRows($('gr-out'), [['Couleur', `ColorSequence.new(Color3.fromHex("${a}"), Color3.fromHex("${b}"))`], ['Rotation', 'UIGradient.Rotation = ' + num('gr-ang')]]); }
function lsUpdate() { const type = $('ls-type').value, seen = new Set(), names = $('ls-in').value.split(',').map(s => s.trim().replace(/["\\]/g, '')).filter(Boolean).slice(0, 8);
  const body = names.map((n, i) => { let v = n.normalize('NFD').replace(/[^A-Za-z0-9_]/g, '').replace(/^\d+/, '') || 'stat' + (i + 1); v = v[0].toLowerCase() + v.slice(1); while (seen.has(v) || v === 'leaderstats' || v === 'player') v += i + 1; seen.add(v);
    return `\n\tlocal ${v} = Instance.new("${type}")\n\t${v}.Name = "${n}"\n\t${v}.Value = ${type === 'StringValue' ? '""' : 0}\n\t${v}.Parent = leaderstats\n`; }).join('');
  paint($('ls-code'), `local Players = game:GetService("Players")\n\nPlayers.PlayerAdded:Connect(function(player)\n\tlocal leaderstats = Instance.new("Folder")\n\tleaderstats.Name = "leaderstats"\n\tleaderstats.Parent = player\n${body}end)`, 'lua'); }
['ls-in', 'ls-type'].forEach(i => $(i).addEventListener('input', lsUpdate));
const assetId = s => { const m = /\d{5,}/.exec(s); return m ? m[0] : ''; };
function asUpdate() { const id = assetId($('as-in').value); $('as-open').hidden = !id; $('as-save').hidden = !id;
  if (!id) { $('as-out').innerHTML = '<p class="empty">Colle un ID ou un lien Roblox pour obtenir tous ses formats.</p>'; return; }
  $('as-open').href = 'https://create.roblox.com/store/asset/' + id;
  outRows($('as-out'), [['ID', id], ['Studio', 'rbxassetid://' + id], ['Luau', '"rbxassetid://' + id + '"'], ['Lien', 'https://create.roblox.com/store/asset/' + id]]); }
$('as-in').addEventListener('input', asUpdate);
$('as-save').addEventListener('click', () => shopAdd(assetId($('as-in').value), 'Asset ' + assetId($('as-in').value), 'Autre'));
function prUpdate() { const want = Math.max(0, Math.round(num('pr-want'))), price = Math.ceil(want / 0.7), got = Math.floor(price * 0.7);
  outRows($('pr-out'), [['Prix à fixer', fmt(price, 0) + ' R$'], ['Tu reçois', fmt(got, 0) + ' R$'], ['Part Roblox', fmt(price - got, 0) + ' R$']]); }
$('pr-want').addEventListener('input', prUpdate);
/* ---------- Filtre et favoris des outils ---------- */
const TOOLCAT = { 't-col': 'ui', 't-un': 'jeu', 't-ud': 'ui', 't-tw': 'ui jeu', 't-xp': 'jeu eco', 't-rb': 'eco', 't-js': 'code', 't-id': 'code', 't-drop': 'jeu eco', 't-lerp': 'jeu code', 't-pal': 'ui', 't-grad': 'ui', 't-ls': 'code jeu', 't-asset': 'code ui', 't-price': 'eco' };
let tlCat = 'all';
document.querySelectorAll('#tl-grid .panel').forEach(p => { const h = p.querySelector('h2'); p.dataset.name = h.textContent; h.insertAdjacentHTML('beforeend', `<button class="star" data-fav-tool="${p.id}" aria-label="Favori : ${esc(p.dataset.name)}">★</button>`); });
$('tl-chips').innerHTML = [['all', 'Tout'], ['fav', 'Favoris'], ['ui', 'Interface'], ['jeu', 'Gameplay'], ['eco', 'Économie'], ['code', 'Code']].map(([k, l]) => `<button class="chip plain" data-tl="${k}">${l}</button>`).join('');
function toolsRender() { const q = norm($('tl-q').value.trim()), pc = prefCat(); let n = 0;
  document.querySelectorAll('#tl-grid .panel').forEach(p => { const fav = favs.tools.includes(p.id), cat = TOOLCAT[p.id] || '';
    p.hidden = !((tlCat === 'all' || (tlCat === 'fav' ? fav : cat.includes(tlCat))) && (!q || norm(p.dataset.name).includes(q))); if (!p.hidden) n++;
    p.style.order = fav ? -2 : pc && cat.split(' ').includes(pc) ? -1 : 0; p.querySelector('.star').setAttribute('aria-pressed', fav); });
  $('tl-chips').querySelectorAll('[data-tl]').forEach(c => c.setAttribute('aria-pressed', c.dataset.tl === tlCat));
  $('tl-empty').hidden = n > 0; $('tl-empty').textContent = tlCat === 'fav' && !q ? "Pas encore de favori. Clique sur l'étoile d'un outil pour l'épingler ici et sur l'accueil." : 'Aucun outil ne correspond. Efface le filtre ou choisis « Tout ».'; }
$('tl-q').addEventListener('input', toolsRender);
$('tl-chips').addEventListener('click', e => { const b = e.target.closest('[data-tl]'); if (b) { tlCat = b.dataset.tl; toolsRender(); } });
$('tl-grid').addEventListener('click', e => { const b = e.target.closest('[data-fav-tool]'); if (b) { favToggle('tools', b.dataset.favTool); toolsRender(); } });
function toolOpen(id) { tlCat = 'all'; $('tl-q').value = ''; go('outils'); setTimeout(() => { toolsRender(); const p = $(id); if (p) p.scrollIntoView({ block: 'start' }); }, 60); }

/* ============ SNIPPETS ============ */
const SNIPS_OLD = [
{ e: 'rbx', t: 'Sauvegarde DataStore avec leaderstats', d: "Charge à l'arrivée, sauvegarde au départ et à la fermeture du serveur. Les appels sont protégés par pcall.", c: String.raw`local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local store = DataStoreService:GetDataStore("PlayerData_v1")

local function load(player)
	local ok, data = pcall(function()
		return store:GetAsync("user_" .. player.UserId)
	end)
	if not ok then
		warn("Chargement échoué :", data)
		player:Kick("Impossible de charger tes données, réessaie.")
		return
	end

	local stats = Instance.new("Folder")
	stats.Name = "leaderstats"
	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Value = data and data.coins or 0
	coins.Parent = stats
	stats.Parent = player
end

local function save(player)
	local stats = player:FindFirstChild("leaderstats")
	if not stats then return end
	local ok, err = pcall(function()
		store:SetAsync("user_" .. player.UserId, { coins = stats.Coins.Value })
	end)
	if not ok then warn("Sauvegarde échouée :", err) end
end

Players.PlayerAdded:Connect(load)
Players.PlayerRemoving:Connect(save)
game:BindToClose(function()
	for _, player in Players:GetPlayers() do
		save(player)
	end
end)` },
{ e: 'rbx', t: 'RemoteEvent sécurisé côté serveur', d: 'Ne fais jamais confiance au client : vérifie le type, le prix et la fréquence des appels.', c: String.raw`-- Script (ServerScriptService)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local buyItem = ReplicatedStorage:WaitForChild("BuyItem") -- RemoteEvent

local PRICES = { Sword = 100, Shield = 75 }
local lastCall = {}

buyItem.OnServerEvent:Connect(function(player, itemName)
	if typeof(itemName) ~= "string" then return end
	local price = PRICES[itemName]
	if not price then return end

	local now = os.clock()
	if lastCall[player] and now - lastCall[player] < 0.5 then return end
	lastCall[player] = now

	local coins = player.leaderstats.Coins
	if coins.Value < price then return end
	coins.Value -= price
	-- donne l'objet ici
end)

Players.PlayerRemoving:Connect(function(player)
	lastCall[player] = nil
end)` },
{ e: 'rbx', t: 'Zone à toucher avec délai par joueur', d: 'Évite que Touched se déclenche dix fois de suite pour le même joueur.', c: String.raw`local Players = game:GetService("Players")
local part = script.Parent
local cooldown = {}

part.Touched:Connect(function(hit)
	local player = Players:GetPlayerFromCharacter(hit.Parent)
	if not player or cooldown[player] then return end

	cooldown[player] = true
	player.leaderstats.Coins.Value += 10
	task.wait(1)
	cooldown[player] = nil
end)` },
{ e: 'rbx', t: 'ModuleScript réutilisable', d: 'Range tes fonctions dans un module et appelle-les depuis plusieurs scripts.', c: String.raw`-- ReplicatedStorage/Modules/Monnaie (ModuleScript)
local Monnaie = {}

function Monnaie.ajouter(player, montant)
	local coins = player.leaderstats.Coins
	coins.Value += montant
	return coins.Value
end

function Monnaie.peutPayer(player, prix)
	return player.leaderstats.Coins.Value >= prix
end

return Monnaie

-- Dans un autre script :
-- local Monnaie = require(game.ReplicatedStorage.Modules.Monnaie)
-- Monnaie.ajouter(player, 50)` },
{ e: 'ue', t: 'Line trace depuis la caméra', d: 'Pour viser, interagir ou tirer. À placer dans un Character ou un Pawn.', c: String.raw`FVector Start;
FRotator Rot;
GetController()->GetPlayerViewPoint(Start, Rot);
const FVector End = Start + Rot.Vector() * 1000.f;

FHitResult Hit;
FCollisionQueryParams Params;
Params.AddIgnoredActor(this);

if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params))
{
	if (AActor* HitActor = Hit.GetActor())
	{
		UE_LOG(LogTemp, Log, TEXT("Touché : %s"), *HitActor->GetName());
	}
}` },
{ e: 'ue', t: 'Timer qui se répète', d: 'Appelle une fonction toutes les 2 secondes sans passer par Tick.', c: String.raw`// MySpawner.h
FTimerHandle SpawnTimer;
void SpawnEnemy();

// MySpawner.cpp
void AMySpawner::BeginPlay()
{
	Super::BeginPlay();
	GetWorldTimerManager().SetTimer(
		SpawnTimer, this, &AMySpawner::SpawnEnemy, 2.0f, true);
}

void AMySpawner::EndPlay(const EEndPlayReason::Type Reason)
{
	GetWorldTimerManager().ClearTimer(SpawnTimer);
	Super::EndPlay(Reason);
}` },
{ e: 'ue', t: 'Variable et fonction visibles en Blueprint', d: 'Le pont classique entre C++ et Blueprints.', c: String.raw`UCLASS()
class MYGAME_API APickup : public AActor
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pickup")
	int32 Value = 10;

	UFUNCTION(BlueprintCallable, Category = "Pickup")
	void Collect(AActor* Collector);
};` },
{ e: 'unity', t: 'Apparition en boucle avec une coroutine', d: 'Fait apparaître un prefab à intervalle régulier.', c: String.raw`using System.Collections;
using UnityEngine;

public class Spawner : MonoBehaviour
{
    [SerializeField] private GameObject prefab;
    [SerializeField] private float interval = 2f;

    private void Start() => StartCoroutine(SpawnLoop());

    private IEnumerator SpawnLoop()
    {
        var wait = new WaitForSeconds(interval);
        while (true)
        {
            Instantiate(prefab, transform.position, Quaternion.identity);
            yield return wait;
        }
    }
}` },
{ e: 'unity', t: 'GameManager unique entre les scènes', d: 'Un singleton simple qui survit aux changements de scène.', c: String.raw`using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }
}` },
{ e: 'unity', t: 'Pièce à ramasser', d: 'Un Collider en mode Trigger qui réagit au joueur.', c: String.raw`using UnityEngine;

public class Coin : MonoBehaviour
{
    [SerializeField] private int value = 1;

    private void OnTriggerEnter(Collider other)
    {
        if (!other.CompareTag("Player")) return;
        Debug.Log("Pièce ramassée : +" + value);
        Destroy(gameObject);
    }
}` },
{ e: 'godot', t: 'Déplacement 2D avec saut', d: 'Pour un CharacterBody2D. get_gravity() demande Godot 4.3 ou plus récent.', c: String.raw`extends CharacterBody2D

const SPEED := 300.0
const JUMP_VELOCITY := -400.0

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity += get_gravity() * delta

	if Input.is_action_just_pressed("ui_accept") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	var direction := Input.get_axis("ui_left", "ui_right")
	velocity.x = direction * SPEED
	move_and_slide()` },
{ e: 'godot', t: 'Objet à ramasser avec un signal', d: 'Une Area2D qui prévient le reste du jeu puis disparaît.', c: String.raw`extends Area2D

signal collected(value: int)

@export var value := 1

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		collected.emit(value)
		queue_free()` },
{ e: 'web', t: 'fetch avec délai maximum et erreurs', d: "fetch ne lève pas d'erreur sur un 404 : il faut tester res.ok soi-même.", c: String.raw`async function getJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

getJSON("/api/scores")
  .then((data) => console.log(data))
  .catch((err) => console.error("Échec :", err.message));` },
{ e: 'web', t: 'Debounce', d: "Attend que l'utilisateur arrête de taper avant de lancer une recherche.", c: String.raw`function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const search = debounce((q) => console.log("Recherche :", q), 400);
input.addEventListener("input", (e) => search(e.target.value));` },
{ e: 'web', t: 'Grille responsive sans media query', d: 'Les colonnes se créent et se replient toutes seules selon la largeur.', css: 1, c: String.raw`.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: 1rem;
}` }
];

const SCAT = { data: 'Données', net: 'Réseau', jeu: 'Gameplay', ui: 'Interface', eco: 'Monétisation', code: 'Organisation' };
const OLDCAT = { 'Sauvegarde DataStore avec leaderstats': 'data', 'RemoteEvent sécurisé côté serveur': 'net', 'Zone à toucher avec délai par joueur': 'jeu', 'ModuleScript réutilisable': 'code' };
const SNIPS = SNIPS_OLD.filter(s => s.e === 'rbx').map(s => ({ t: s.t, d: s.d, c: s.c, cat: OLDCAT[s.t] || 'code' })).concat([
{ cat: 'net', t: 'RemoteFunction : demander une info au serveur', d: "Le client pose une question, le serveur répond. À réserver aux cas où tu as besoin d'une réponse.", c: String.raw`-- Script serveur
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local getPrix = ReplicatedStorage:WaitForChild("GetPrix") -- RemoteFunction

local PRICES = { Sword = 100, Shield = 75 }

getPrix.OnServerInvoke = function(player, itemName)
	if typeof(itemName) ~= "string" then return nil end
	return PRICES[itemName]
end

-- LocalScript
-- local prix = ReplicatedStorage.GetPrix:InvokeServer("Sword")` },
{ cat: 'data', t: 'Classement mondial avec OrderedDataStore', d: 'Enregistre un score par joueur et récupère les dix meilleurs.', c: String.raw`local DataStoreService = game:GetService("DataStoreService")
local classement = DataStoreService:GetOrderedDataStore("TopCoins")

local function enregistrer(player, score)
	pcall(function()
		classement:SetAsync(tostring(player.UserId), score)
	end)
end

local function top10()
	local ok, pages = pcall(function()
		return classement:GetSortedAsync(false, 10)
	end)
	if not ok then return {} end

	local resultat = {}
	for rang, entree in pages:GetCurrentPage() do
		table.insert(resultat, {
			rang = rang,
			userId = tonumber(entree.key),
			score = entree.value,
		})
	end
	return resultat
end` },
{ cat: 'eco', t: 'Vérifier un Game Pass', d: "Vérifie à l'arrivée du joueur, et débloque tout de suite après un achat en jeu.", c: String.raw`local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local PASS_ID = 0 -- remplace par l'ID de ton pass

local function aLePass(player)
	local ok, possede = pcall(function()
		return MarketplaceService:UserOwnsGamePassAsync(player.UserId, PASS_ID)
	end)
	return ok and possede
end

Players.PlayerAdded:Connect(function(player)
	if aLePass(player) then
		player:SetAttribute("VIP", true)
	end
end)

MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, achete)
	if achete and passId == PASS_ID then
		player:SetAttribute("VIP", true)
	end
end)` },
{ cat: 'eco', t: 'Produit développeur avec ProcessReceipt', d: "Un seul ProcessReceipt par jeu. Ne renvoie PurchaseGranted qu'une fois la récompense vraiment donnée.", c: String.raw`local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local PRODUITS = {
	[0] = function(player) -- remplace 0 par l'ID du produit
		player.leaderstats.Coins.Value += 500
	end,
}

MarketplaceService.ProcessReceipt = function(receipt)
	local player = Players:GetPlayerByUserId(receipt.PlayerId)
	local donner = PRODUITS[receipt.ProductId]
	if not player or not donner then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	local ok, err = pcall(donner, player)
	if not ok then
		warn("Achat non traité :", err)
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	return Enum.ProductPurchaseDecision.PurchaseGranted
end` },
{ cat: 'ui', t: 'Menu qui glisse avec un tween', d: 'Mets AnchorPoint à 0.5, 0.5 sur le Frame pour qu\'il se centre bien.', c: String.raw`-- LocalScript dans le bouton (TextButton)
local TweenService = game:GetService("TweenService")

local bouton = script.Parent
local menu = bouton.Parent:WaitForChild("Menu") -- un Frame
local info = TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local ouvert = false

menu.Position = UDim2.fromScale(0.5, 1.5)

bouton.Activated:Connect(function()
	ouvert = not ouvert
	local cible = if ouvert then UDim2.fromScale(0.5, 0.5) else UDim2.fromScale(0.5, 1.5)
	TweenService:Create(menu, info, { Position = cible }):Play()
end)` },
{ cat: 'ui', t: "Notification à l'écran", d: 'Depuis un LocalScript. SetCore peut échouer si on l\'appelle trop tôt, d\'où le pcall.', c: String.raw`local StarterGui = game:GetService("StarterGui")

local function notifier(titre, texte)
	pcall(function()
		StarterGui:SetCore("SendNotification", {
			Title = titre,
			Text = texte,
			Duration = 4,
		})
	end)
end

notifier("Bravo", "Tu as trouvé un coffre secret.")` },
{ cat: 'jeu', t: 'Téléporter un joueur', d: 'PivotTo déplace tout le personnage d\'un coup, sans le casser.', c: String.raw`local function teleporter(player: Player, destination: BasePart)
	local character = player.Character
	if not character then return end
	character:PivotTo(destination.CFrame + Vector3.new(0, 4, 0))
end

teleporter(player, workspace.Spawns.Lobby)` },
{ cat: 'jeu', t: 'Raycast depuis la souris', d: 'LocalScript : trouve ce que le joueur vise quand il clique.', c: String.raw`local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

local function viser()
	local pos = UserInputService:GetMouseLocation()
	local rayon = camera:ViewportPointToRay(pos.X, pos.Y)

	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { player.Character }

	return workspace:Raycast(rayon.Origin, rayon.Direction * 500, params)
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed then return end
	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		local resultat = viser()
		if resultat then
			print("Touché :", resultat.Instance:GetFullName())
		end
	end
end)` },
{ cat: 'jeu', t: 'Boucle de manches', d: "Intermission, manche, fin. Le statut est un attribut que l'interface peut afficher.", c: String.raw`local Players = game:GetService("Players")

local INTERMISSION = 15
local DUREE_MANCHE = 60
local JOUEURS_MIN = 2

while true do
	repeat task.wait(1) until #Players:GetPlayers() >= JOUEURS_MIN

	for t = INTERMISSION, 1, -1 do
		workspace:SetAttribute("Statut", "Début dans " .. t)
		task.wait(1)
	end

	for t = DUREE_MANCHE, 1, -1 do
		workspace:SetAttribute("Statut", "Manche : " .. t .. " s")
		task.wait(1)
	end

	workspace:SetAttribute("Statut", "Manche terminée")
	task.wait(3)
end` },
{ cat: 'jeu', t: 'Brique mortelle', d: 'Le classique des obbys, à mettre dans la Part.', c: String.raw`script.Parent.Touched:Connect(function(hit)
	local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.Health = 0
	end
end)` },
{ cat: 'code', t: 'Un seul script pour toutes les parts taguées', d: 'Ajoute le tag « Lave » dans Studio : plus besoin de copier le script dans chaque Part.', c: String.raw`local CollectionService = game:GetService("CollectionService")

local function installer(part)
	part.Touched:Connect(function(hit)
		local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
		if humanoid then
			humanoid.Health = 0
		end
	end)
end

for _, part in CollectionService:GetTagged("Lave") do
	installer(part)
end
CollectionService:GetInstanceAddedSignal("Lave"):Connect(installer)` }
]);
let mySnips = load('snips', []).map(s => s.cat ? s : { ...s, cat: 'code' }), snFilter = 'all', snShown = [];
const slug = t => norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || 'snippet';
$('sn-eng').innerHTML = Object.entries(SCAT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('sn-chips').innerHTML = '<button class="chip plain" data-f="all">Tout</button><button class="chip plain" data-f="fav">Favoris</button>' + Object.entries(SCAT).map(([k, v]) => `<button class="chip plain" data-f="${k}">${v}</button>`).join('');
function snRender() {
  const q = norm($('sn-q').value.trim());
  $('sn-chips').querySelectorAll('[data-f]').forEach(c => c.setAttribute('aria-pressed', c.dataset.f === snFilter));
  snShown = mySnips.map((s, i) => ({ ...s, mine: i })).concat(SNIPS).filter(s => (snFilter === 'all' || (snFilter === 'fav' ? favs.snips.includes(s.t) : s.cat === snFilter)) && (!q || norm(s.t + ' ' + (s.d || '') + ' ' + s.c + ' ' + T(s.t) + ' ' + T(s.d || '')).includes(q)));
  $('sn-list').innerHTML = snShown.length ? snShown.map((s, i) => `<article class="panel"><div class="snip-head"><h2>${esc(s.t)}</h2><span class="tag">${SCAT[s.cat] || 'Luau'}</span><button class="star" data-fav-snip="${i}" aria-pressed="${favs.snips.includes(s.t)}" aria-label="Favori : ${esc(s.t)}">★</button></div>
    ${s.d ? `<p class="hint">${esc(s.d)}</p>` : ''}<pre id="sn-pre-${i}" class="cm-s-etabli"></pre>
    <div class="row"><button class="btn ghost sm" data-copy="sn-pre-${i}">Copier</button>
    ${s.mine !== undefined ? `<button class="btn ghost sm" data-del-snip="${s.mine}">Supprimer</button><span class="tag">à moi</span>` : ''}</div></article>`).join('')
    : `<p class="empty">${snFilter === 'fav' && !q ? "Pas encore de favori. Clique sur l'étoile d'un snippet pour le garder sous la main." : 'Aucun snippet ne correspond. Essaie un autre mot ou une autre catégorie.'}</p>`;
  snShown.forEach((s, i) => paint($('sn-pre-' + i), s.c, 'lua'));
}
$('sn-q').addEventListener('input', snRender);
$('sn-chips').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { snFilter = b.dataset.f; snRender(); } });
$('sn-form').addEventListener('submit', e => { e.preventDefault(); mySnips.unshift({ cat: $('sn-eng').value, t: $('sn-title').value.trim(), c: $('sn-codein').value }); save('snips', mySnips); e.target.reset(); snFilter = 'all'; snRender(); toast('Snippet enregistré'); });
$('sn-list').addEventListener('click', e => {
  const f = e.target.closest('[data-fav-snip]'); if (f) { favToggle('snips', snShown[+f.dataset.favSnip].t); snRender(); return; }
  const d = e.target.closest('[data-del-snip]'); if (d) { const i = +d.dataset.delSnip, s = mySnips.splice(i, 1)[0]; save('snips', mySnips); snRender(); toast('Snippet supprimé', () => { mySnips.splice(i, 0, s); save('snips', mySnips); snRender(); }); return; }
});
/* ============ PROJETS ============ */
const COLS = [['todo', 'À faire'], ['doing', 'En cours'], ['done', 'Terminé']];
const TYPES = { feat: 'Fonctionnalité', bug: 'Bug', idee: 'Idée' };
let tasks = load('tasks', null) || [
  { id: 1, t: "Sauvegarder l'inventaire avec DataStore", p: 'Obby Tycoon', k: 'feat', c: 'doing', ex: 1 },
  { id: 2, t: 'Le joueur traverse le sol après un respawn', p: 'Obby Tycoon', k: 'bug', c: 'todo', pr: 'h', ex: 1 },
  { id: 3, t: 'Ajouter une boutique de skins', p: 'Obby Tycoon', k: 'feat', c: 'todo', ex: 1 },
  { id: 4, t: 'Boss final avec trois phases', p: 'Simulateur', k: 'idee', c: 'todo', pr: 'l', ex: 1 },
  { id: 5, t: 'Menu principal et écran de chargement', p: 'Simulateur', k: 'feat', c: 'done', ex: 1 }
];
let tkProj = '';
const prRank = t => t.pr === 'h' ? 0 : t.pr === 'l' ? 2 : 1;
function tkRender() {
  const projs = [...new Set(tasks.map(t => t.p).filter(Boolean))]; if (tkProj && !projs.includes(tkProj)) tkProj = '';
  $('tk-filter').innerHTML = '<option value="">Tous les projets</option>' + projs.map(p => `<option${p === tkProj ? ' selected' : ''}>${esc(p)}</option>`).join('');
  $('tk-projs').innerHTML = projs.map(p => `<option value="${esc(p)}">`).join('');
  const scope = tasks.filter(t => !tkProj || t.p === tkProj), nd = scope.filter(t => t.c === 'done').length;
  $('tk-prog-l').textContent = scope.length ? `${nd} sur ${pl(scope.length, 'tâche terminée', 'tâches terminées')}` : 'Aucune tâche'; $('tk-prog').style.width = (scope.length ? nd / scope.length * 100 : 0) + '%';
  $('board').innerHTML = COLS.map(([id, name], ci) => { const l = scope.filter(t => t.c === id).sort((a, b) => prRank(a) - prRank(b));
    return `<div class="col" data-col="${id}"><h2>${name} <span>${l.length}</span></h2>` + (l.length ? l.map(t => `<div class="task" draggable="true" data-task="${t.id}"><button class="task-t" data-edit="${t.id}">${esc(t.t)}</button>
      <div class="meta"><span class="tag${t.k === 'bug' ? ' bug' : ''}">${TYPES[t.k]}</span>${t.pr === 'h' ? '<span class="tag hot">Urgent</span>' : t.pr === 'l' ? '<span class="tag">Plus tard</span>' : ''}${t.p ? `<span class="hint">${esc(t.p)}</span>` : ''}${t.ex ? '<span class="tag ex">exemple</span>' : ''}</div><div class="acts">
      ${ci > 0 ? `<button class="btn ghost sm" data-mv="-1" data-id="${t.id}" aria-label="Déplacer vers ${COLS[ci - 1][1]}">←</button>` : ''}
      ${ci < 2 ? `<button class="btn ghost sm" data-mv="1" data-id="${t.id}" aria-label="Déplacer vers ${COLS[ci + 1][1]}">→</button>` : ''}
      <button class="btn ghost sm" data-rm="${t.id}">Supprimer</button></div></div>`).join('') : `<p class="empty">${id === 'todo' ? 'Rien à faire. Ajoute une tâche au-dessus.' : id === 'doing' ? 'Glisse ici la tâche sur laquelle tu travailles.' : 'Les tâches finies arrivent ici.'}</p>`) + '</div>'; }).join('');
  $('tk-clear').hidden = !tasks.some(t => t.ex);
}
const tkSave = () => { save('tasks', tasks); tkRender(); };
function tkRemove(id) { const i = tasks.findIndex(x => x.id == id); if (i < 0) return; const t = tasks.splice(i, 1)[0]; tkSave(); toast('Tâche supprimée', () => { tasks.splice(i, 0, t); tkSave(); }); }
function tkEdit(id) { const t = tasks.find(x => x.id == id); if (!t) return; const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${l}</option>`).join('');
  modal(`<h2>Modifier la tâche</h2><div class="field"><label for="te-t">Titre</label><input type="text" id="te-t" value="${esc(t.t)}"></div>
    <div class="row"><div class="field"><label for="te-p">Projet</label><input type="text" id="te-p" value="${esc(t.p || '')}" list="tk-projs"></div><div class="field"><label for="te-c">Colonne</label><select id="te-c">${opt(Object.fromEntries(COLS), t.c)}</select></div></div>
    <div class="row"><div class="field"><label for="te-k">Type</label><select id="te-k">${opt(TYPES, t.k)}</select></div><div class="field"><label for="te-pr">Priorité</label><select id="te-pr">${opt({ n: 'Normale', h: 'Urgente', l: 'Plus tard' }, t.pr || 'n')}</select></div></div>
    <div class="field"><label for="te-n">Notes</label><textarea id="te-n" style="font-family:var(--body)">${esc(t.note || '')}</textarea></div>
    <div class="row end"><button class="btn danger" id="te-rm">Supprimer</button><span style="flex:1"></span><button class="btn ghost" data-x>Annuler</button><button class="btn" id="te-ok">Enregistrer</button></div>`, () => {
    $('te-ok').onclick = () => { const v = $('te-t').value.trim(); if (!v) { $('te-t').focus(); return; } Object.assign(t, { t: v, p: $('te-p').value.trim(), c: $('te-c').value, k: $('te-k').value, pr: $('te-pr').value, note: $('te-n').value }); delete t.ex; closeModal(); tkSave(); toast('Tâche mise à jour'); };
    $('te-rm').onclick = () => { closeModal(); tkRemove(t.id); };
  }); }
$('tk-filter').addEventListener('change', e => { tkProj = e.target.value; tkRender(); });
$('tk-form').addEventListener('submit', e => { e.preventDefault(); const t = $('tk-title').value.trim(); if (!t) return;
  tasks.push({ id: Date.now(), t, p: $('tk-proj').value.trim(), k: $('tk-type').value, pr: $('tk-prio').value, c: 'todo' }); $('tk-title').value = ''; tkSave(); toast('Tâche ajoutée dans « À faire »'); });
$('tk-clear').addEventListener('click', () => { const old = tasks; tasks = tasks.filter(t => !t.ex); tkSave(); toast('Exemples retirés', () => { tasks = old; tkSave(); }); });
$('board').addEventListener('click', e => { const mv = e.target.closest('[data-mv]'), rm = e.target.closest('[data-rm]'), ed = e.target.closest('[data-edit]');
  if (mv) { const t = tasks.find(x => x.id == mv.dataset.id); t.c = COLS[COLS.findIndex(c => c[0] === t.c) + (+mv.dataset.mv)][0]; tkSave(); }
  else if (rm) tkRemove(rm.dataset.rm); else if (ed) tkEdit(ed.dataset.edit); });
let dragId = null;
$('board').addEventListener('dragstart', e => { const t = e.target.closest('[data-task]'); if (t) { dragId = t.dataset.task; try { e.dataTransfer.setData('text/plain', dragId); } catch (x) {} } });
$('board').addEventListener('dragover', e => { const c = e.target.closest('[data-col]'); if (c && dragId) { e.preventDefault(); document.querySelectorAll('.col.over').forEach(x => x !== c && x.classList.remove('over')); c.classList.add('over'); } });
$('board').addEventListener('drop', e => { const c = e.target.closest('[data-col]'); if (!c || !dragId) return; e.preventDefault(); const t = tasks.find(x => x.id == dragId); dragId = null; if (t) { t.c = c.dataset.col; tkSave(); } });
$('board').addEventListener('dragend', () => { dragId = null; document.querySelectorAll('.col.over').forEach(x => x.classList.remove('over')); });

/* ============ COURS ============ */
const YT = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(LANG === 'en' ? YT_EN.reduce((a, [f, e]) => a.split(f).join(e), q).replace(/\s+/g, ' ').trim() : q);
const REF = c => 'https://create.roblox.com/docs/reference/engine/classes/' + c;
const SHOP_MOCK = [[18, 10, 64, 80, '', 'frame', 14], [24, 14, 36, 12, 'BOUTIQUE', 'text'], [71, 14, 7, 12, '×', 'lava', 20], [23, 32, 16, 34, 'Épée', 'img', 8], [42, 32, 16, 34, 'Bouclier', 'img', 8], [61, 32, 16, 34, 'Potion', 'img', 8], [24, 70, 14, 10, '100', 'btn', 6], [43, 70, 14, 10, '75', 'btn', 6], [62, 70, 14, 10, '20', 'btn', 6]];
const OBBY_MOCK = [[4, 62, 18, 10, 'Départ', 'ok'], [27, 52, 12, 8, '', 'plat'], [42, 74, 26, 8, 'Lave', 'lava'], [46, 42, 12, 8, '', 'plat'], [65, 32, 12, 8, '', 'plat'], [83, 20, 13, 11, 'Arrivée', 'btn']];
const COURSES = [
{ id: 'studio', n: 'Découvrir Roblox Studio', sub: 'Tes tout premiers pas : poser des blocs, les colorer et tester ton jeu.', cover: { t: 'studio', hl: 'vp' }, lessons: [
  { t: 'Faire le tour de Studio', intro: "Studio, c'est l'atelier où l'on fabrique les jeux Roblox. Il y a cinq zones à connaître, et c'est tout.", pic: { t: 'studio', hl: 'ex' }, cap: "L'écran de Studio. L'Explorer, à droite, est la zone que tu utiliseras le plus.",
    steps: ['Ouvre Roblox Studio et choisis le modèle « Baseplate ».', 'Au milieu, tu vois ton monde en 3D.', "À droite, l'Explorer liste tout ce qu'il y a dans ton jeu.", "Juste en dessous, Properties montre les réglages de l'objet sélectionné.", 'En bas, Output affiche les messages de tes scripts.'],
    tip: "Si une fenêtre a disparu, rouvre-la depuis l'onglet View, tout en haut.", vid: 'Roblox Studio débutant découvrir interface tutoriel français' },
  { t: 'Poser et déplacer un bloc', intro: 'Dans Roblox, un bloc s\'appelle une Part. Presque tout est construit avec des Parts.', pic: { t: 'keys', rows: [['Ctrl 1', 'Sélectionner'], ['Ctrl 2', 'Déplacer'], ['Ctrl 3', 'Changer la taille'], ['Ctrl 4', 'Tourner'], ['Ctrl D', 'Dupliquer']] }, cap: 'Les cinq raccourcis à connaître pour construire vite.',
    steps: ["Dans l'onglet Home, clique sur Part : un bloc apparaît.", 'Choisis l\'outil Move et tire sur les flèches pour le déplacer.', 'Avec Scale, tire sur les boules pour changer sa taille.', 'Avec Rotate, fais-le tourner.', 'Appuie sur Ctrl D pour en faire une copie.'],
    tip: 'Sur Mac, utilise la touche Cmd à la place de Ctrl.', vid: 'Roblox Studio Part move scale rotate tutoriel débutant', ref: 'Part' },
  { t: 'Changer la couleur et la matière', intro: 'Chaque Part a des réglages. On les change dans la fenêtre Properties.', pic: { t: 'props', rows: [['Anchored', 'coché', 1], ['Color', '255, 106, 61'], ['Material', 'Wood'], ['Transparency', '0'], ['CanCollide', 'coché']] }, cap: 'Les réglages les plus utiles d\'une Part.',
    steps: ['Clique sur ta Part pour la sélectionner.', 'Dans Properties, clique sur Color et choisis une couleur.', 'Change Material : essaie Wood, Neon ou Glass.', 'Coche la case Anchored.'],
    tip: 'Sans Anchored, ton bloc tombe dès que le jeu démarre. C\'est l\'oubli le plus courant !', vid: 'Roblox Studio properties color material anchored tutoriel', ref: 'BasePart' },
  { t: 'Ranger ses objets', intro: "Un jeu contient vite des centaines d'objets. Si tu les ranges dès le début, tu ne te perdras jamais.", pic: { t: 'tree', rows: [[0, 'Workspace', 'svc'], [1, 'Maison', 'model', 1], [2, 'Mur1', 'part'], [2, 'Mur2', 'part'], [2, 'Toit', 'part'], [1, 'Baseplate', 'part']] }, cap: 'Trois Parts rangées dans un Model appelé Maison.',
    steps: ["Dans l'Explorer, clique sur une Part et appuie sur F2 pour la renommer.", 'Sélectionne plusieurs Parts en maintenant Ctrl.', 'Appuie sur Ctrl G : elles sont regroupées dans un Model.', 'Donne un nom clair à ton Model, par exemple « Maison ».'],
    vid: 'Roblox Studio explorer model group organiser tutoriel', ref: 'Model' },
  { t: 'Tester son jeu', intro: 'Tu peux jouer à ton jeu à tout moment pour voir si tout marche.', pic: { t: 'keys', rows: [['F5', 'Jouer avec ton personnage'], ['Maj F5', 'Arrêter le test'], ['F8', 'Lancer sans personnage']] }, cap: 'Les touches pour tester.',
    steps: ['Appuie sur F5 : ton personnage apparaît dans le jeu.', 'Promène-toi et vérifie que rien ne tombe.', 'Appuie sur Maj F5 pour arrêter.', 'Corrige ce qui ne va pas, puis recommence.'],
    tip: 'Ce que tu changes pendant un test est effacé quand tu arrêtes. Arrête toujours le test avant de construire.', vid: 'Roblox Studio tester son jeu play test tutoriel' }],
  final: { t: 'Ta première cabane', brief: 'Construis une cabane avec quatre murs, un toit et une porte assez grande pour que ton personnage puisse entrer.', pic: { t: 'scr', boxes: [[30, 38, 40, 46, '', 'frame', 2], [24, 22, 52, 18, 'Toit', 'lava', 4], [44, 56, 12, 28, 'Porte', 'ghost', 2], [0, 84, 100, 16, 'Baseplate', 'plat', 0]] }, cap: 'Une idée de cabane. La tienne peut être très différente !',
    checks: ['Ma cabane a quatre murs et un toit', 'Toutes les Parts sont ancrées', "J'ai utilisé au moins trois couleurs ou matières", 'Tout est rangé dans un Model appelé Cabane', 'Mon personnage peut entrer par la porte'] } },

{ id: 'script', n: 'Mon premier script', sub: 'Apprends à donner des ordres à ton jeu avec Luau, le langage de Roblox.', cover: { t: 'code', code: 'local pieces = 10\nprint("Bonjour !", pieces)' }, lessons: [
  { t: 'Créer un script et dire bonjour', intro: 'Un script, c\'est une liste d\'ordres que le jeu suit. On commence par lui faire dire bonjour.', pic: { t: 'code', code: 'print("Bonjour !")' }, cap: 'Ton tout premier script.',
    steps: ["Dans l'Explorer, survole ServerScriptService et clique sur le +.", 'Choisis Script.', 'Efface ce qui est écrit et tape la ligne de l\'image.', 'Appuie sur F5.', 'Regarde dans Output : ton message est là.'],
    tip: 'Les guillemets sont obligatoires autour d\'un texte.', vid: 'Roblox Studio premier script print tutoriel français débutant', ref: 'Script' },
  { t: 'Les variables, des boîtes à valeurs', intro: 'Une variable est une boîte avec un nom. Tu y ranges un nombre ou un texte pour le réutiliser.', pic: { t: 'code', code: 'local pseudo = "Lina"\nlocal pieces = 10\n\nprint(pseudo, "a", pieces, "pièces")' }, cap: 'Deux variables, puis un message qui les utilise.',
    steps: ['Écris local, puis le nom de ta boîte.', 'Mets un signe = et la valeur à ranger.', 'Utilise le nom de la boîte dans print.', 'Change la valeur et relance pour voir la différence.'],
    vid: 'Roblox Luau variables local tutoriel débutant' },
  { t: 'Changer une Part avec un script', intro: 'Un script peut modifier les objets du jeu. Ici, il va repeindre la Part dans laquelle il est rangé.', pic: { t: 'tree', rows: [[0, 'Workspace', 'svc'], [1, 'Part', 'part'], [2, 'Script', 'script', 1]] }, cap: 'Le script est rangé dans la Part. script.Parent désigne donc cette Part.',
    steps: ['Ajoute une Part, puis clique sur son + et choisis Script.', 'Écris : local part = script.Parent', 'Écris : part.Color = Color3.fromRGB(255, 0, 0)', 'Écris : part.Transparency = 0.5', 'Lance le jeu : ta Part est rouge et à moitié transparente.'],
    tip: 'L\'outil Couleurs de l\'onglet Outils te donne le code Color3 de n\'importe quelle couleur.', vid: 'Roblox script.Parent changer couleur part tutoriel', ref: 'BasePart' },
  { t: 'Réagir quand on touche', intro: 'Un événement prévient ton script quand quelque chose se passe. Touched se déclenche quand on touche la Part.', pic: { t: 'code', code: 'local part = script.Parent\n\npart.Touched:Connect(function(hit)\n\tpart.Color = Color3.fromRGB(0, 200, 100)\nend)' }, cap: 'Quand on touche la Part, elle devient verte.',
    steps: ['Mets ce script dans une Part.', 'Lance le jeu et marche sur la Part.', 'Elle change de couleur !', 'Remplace la couleur par celle que tu veux.'],
    vid: 'Roblox Touched event tutoriel débutant français' },
  { t: 'Répéter avec une boucle', intro: 'Une boucle répète des ordres sans s\'arrêter. Parfait pour faire clignoter une Part.', pic: { t: 'code', code: 'local part = script.Parent\n\nwhile true do\n\tpart.Transparency = 0.8\n\ttask.wait(1)\n\tpart.Transparency = 0\n\ttask.wait(1)\nend' }, cap: 'La Part devient transparente, attend une seconde, redevient normale, et recommence.',
    steps: ['Mets ce script dans une Part.', 'Lance le jeu : la Part clignote.', 'Change le nombre dans task.wait pour aller plus vite ou plus lentement.'],
    tip: 'N\'oublie jamais task.wait() dans une boucle while. Sans lui, Studio se bloque.', vid: 'Roblox while true do task.wait boucle tutoriel débutant' }],
  final: { t: 'Le bloc magique', brief: 'Fabrique un bloc qui change de couleur tout seul toutes les secondes, et qui devient transparent quand un joueur le touche.', pic: { t: 'tree', rows: [[0, 'Workspace', 'svc'], [1, 'BlocMagique', 'part', 1], [2, 'Couleurs', 'script'], [2, 'Toucher', 'script']] }, cap: 'Une façon de ranger ton projet : une Part et deux scripts.',
    checks: ['Mon script est rangé dans la Part', "J'utilise une variable pour la Part", 'La couleur change en boucle avec task.wait', 'Il se passe quelque chose quand on touche le bloc', "Il n'y a aucune erreur rouge dans Output"] } },

{ id: 'gui', n: 'Créer une interface', sub: 'Menus, boutons, compteurs : tout ce que le joueur voit sur son écran.', cover: { t: 'scr', boxes: SHOP_MOCK }, lessons: [
  { t: 'Le ScreenGui, ta feuille blanche', intro: "Une interface se range dans StarterGui. Le ScreenGui est la feuille, et tu poses tes éléments dessus.", pic: { t: 'tree', rows: [[0, 'StarterGui', 'svc'], [1, 'ScreenGui', 'gui', 1], [2, 'Frame', 'gui']] }, cap: 'Un ScreenGui avec un Frame à l\'intérieur.',
    steps: ["Dans l'Explorer, survole StarterGui et clique sur le +.", 'Choisis ScreenGui.', 'Clique sur le + du ScreenGui et choisis Frame.', 'Un rectangle blanc apparaît sur ton écran : c\'est ton premier élément.'],
    vid: 'Roblox Studio ScreenGui Frame tutoriel débutant français', ref: 'ScreenGui' },
  { t: 'Placer et agrandir un Frame', intro: 'Un Frame est un rectangle. Sa taille et sa place se règlent avec Size et Position.', pic: { t: 'props', rows: [['AnchorPoint', '0.5, 0.5', 1], ['Position', '{0.5, 0}, {0.5, 0}', 1], ['Size', '{0.4, 0}, {0.5, 0}'], ['BackgroundColor3', '27, 24, 22']] }, cap: 'Les réglages pour un Frame bien centré.',
    steps: ['Sélectionne ton Frame.', 'Mets AnchorPoint à 0.5, 0.5.', 'Mets Position à {0.5, 0}, {0.5, 0}.', 'Ton Frame est maintenant pile au centre.', 'Change Size pour qu\'il prenne la place que tu veux.'],
    tip: 'AnchorPoint à 0.5, 0.5 veut dire : je place l\'élément par son milieu.', vid: 'Roblox GUI AnchorPoint Position Size centrer Frame tutoriel', ref: 'Frame' },
  { t: 'Ajouter du texte et des images', intro: 'TextLabel affiche du texte, ImageLabel affiche une image.', pic: { t: 'scr', boxes: [[20, 14, 60, 72, '', 'frame', 6], [28, 20, 44, 14, 'BOUTIQUE', 'text'], [36, 40, 28, 36, 'Image', 'img', 6]] }, cap: 'Un titre et une image dans un Frame.',
    steps: ['Dans ton Frame, ajoute un TextLabel.', 'Change sa propriété Text pour écrire ton titre.', 'Coche TextScaled pour que le texte s\'adapte à la taille.', 'Ajoute un ImageLabel.', 'Dans Image, colle l\'ID d\'une image trouvée dans la Boutique.'],
    tip: 'Garde tes ID d\'images dans « Ma collection », page Boutique.', vid: 'Roblox TextLabel ImageLabel tutoriel GUI débutant', ref: 'TextLabel' },
  { t: 'Un bouton qui réagit', intro: 'Un TextButton est un bouton. Pour qu\'il fasse quelque chose, on lui ajoute un LocalScript.', pic: { t: 'code', code: 'local bouton = script.Parent\n\nbouton.Activated:Connect(function()\n\tprint("Clic !")\nend)' }, cap: 'Le LocalScript à ranger dans le bouton.',
    steps: ['Ajoute un TextButton dans ton Frame.', 'Clique sur son + et choisis LocalScript.', 'Écris le code de l\'image.', 'Lance le jeu et clique : « Clic ! » s\'affiche dans Output.'],
    tip: 'Activated marche à la souris, au doigt et à la manette. C\'est mieux que MouseButton1Click.', vid: 'Roblox TextButton LocalScript clic bouton tutoriel français', ref: 'TextButton' },
  { t: 'Le style des pros', intro: 'Quatre petits objets transforment un rectangle tout plat en vrai menu de jeu.', pic: { t: 'pair', items: [{ label: 'Avant', boxes: [[15, 15, 70, 70, '', 'frame', 0], [32, 55, 36, 18, 'Jouer', 'img', 0]] }, { label: 'Après', boxes: [[15, 15, 70, 70, '', 'frame', 16], [32, 55, 36, 18, 'Jouer', 'btn', 10]] }] }, cap: 'Le même menu, avant et après.',
    steps: ['Ajoute un UICorner dans ton Frame : les coins s\'arrondissent.', 'Ajoute un UIStroke pour dessiner un contour.', 'Ajoute un UIGradient pour un dégradé de couleurs.', 'Ajoute un UIPadding pour laisser de l\'air sur les bords.'],
    tip: 'L\'outil Dégradé te donne le code de ton UIGradient.', vid: 'Roblox UICorner UIStroke UIGradient tutoriel GUI moderne', ref: 'UICorner' },
  { t: 'S\'adapter au téléphone', intro: 'Beaucoup de joueurs sont sur téléphone. Une interface en pixels déborde sur leur petit écran.', pic: { t: 'pair', items: [{ label: 'En Offset : ça déborde', phone: 1, boxes: [[10, 30, 140, 22, 'Menu', 'frame', 6]] }, { label: 'En Scale : ça rentre', phone: 1, boxes: [[10, 30, 80, 22, 'Menu', 'frame', 6]] }] }, cap: 'Le même menu sur un téléphone.',
    steps: ['Dans Size, le premier nombre de chaque paire est le Scale, le second est l\'Offset.', 'Mets les Offsets à 0 et règle les Scales, entre 0 et 1.', 'Dans l\'onglet Test, clique sur Device pour voir ton jeu sur un téléphone.', 'Ajoute un UIAspectRatioConstraint pour qu\'un carré reste carré.'],
    tip: 'L\'outil « UDim2 : pixels vers Scale » fait la conversion pour toi.', vid: 'Roblox GUI scale offset mobile UIAspectRatioConstraint tutoriel', ref: 'UIAspectRatioConstraint' },
  { t: 'Faire bouger le menu', intro: 'Un menu qui glisse est bien plus agréable qu\'un menu qui apparaît d\'un coup. On appelle ça un tween.', pic: { t: 'code', code: 'local TweenService = game:GetService("TweenService")\nlocal info = TweenInfo.new(0.25)\n\nTweenService:Create(menu, info, {\n\tPosition = UDim2.fromScale(0.5, 0.5),\n}):Play()' }, cap: 'Le menu glisse jusqu\'au centre en un quart de seconde.',
    steps: ['Va dans l\'onglet Code et cherche « Menu qui glisse ».', 'Copie le snippet dans un LocalScript, rangé dans ton bouton.', 'Appelle ton Frame « Menu ».', 'Lance le jeu et clique sur le bouton.'],
    tip: 'Une animation courte, entre 0,2 et 0,3 seconde, suffit.', vid: 'Roblox TweenService GUI animation menu tutoriel', ref: 'TweenService' }],
  final: { t: 'Ta boutique comme les pros', brief: 'Fabrique un menu de boutique : un titre, trois objets à vendre avec leur prix, un bouton pour fermer et un bouton pour ouvrir le menu.', pic: { t: 'scr', boxes: SHOP_MOCK }, cap: 'Un exemple de boutique. Choisis tes propres couleurs et tes propres objets.',
    checks: ['Mon menu est centré avec AnchorPoint', 'Il a un titre et trois objets avec leur prix', 'Les coins sont arrondis avec UICorner', 'Les tailles sont en Scale : ça marche sur téléphone', 'Un bouton ouvre et ferme le menu', 'Le menu s\'anime avec un tween'] } },

{ id: 'obby', n: 'Fabriquer un obby', sub: 'Ton premier vrai jeu : un parcours d\'obstacles avec de la lave et des checkpoints.', cover: { t: 'scr', boxes: OBBY_MOCK }, lessons: [
  { t: 'Dessiner le parcours', intro: 'Un obby est une suite de plateformes. Le joueur saute de l\'une à l\'autre jusqu\'à l\'arrivée.', pic: { t: 'scr', boxes: OBBY_MOCK }, cap: 'Un parcours vu de côté : départ, plateformes, lave, arrivée.',
    steps: ['Pose une Part pour le départ et ancre-la.', 'Duplique-la avec Ctrl D pour créer les plateformes suivantes.', 'Espace-les un peu, puis teste chaque saut avec F5.', 'Si un saut est impossible, rapproche les plateformes.'],
    tip: 'Commence facile. Un obby trop dur dès le début fait partir les joueurs.', vid: 'Roblox Studio créer un obby tutoriel français débutant' },
  { t: 'La lave qui fait perdre', intro: 'Une brique de lave remet le joueur au dernier checkpoint quand il la touche.', pic: { t: 'code', code: 'script.Parent.Touched:Connect(function(hit)\n\tlocal humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")\n\tif humanoid then\n\t\thumanoid.Health = 0\n\tend\nend)' }, cap: 'Le script de la lave, à ranger dans la Part.',
    steps: ['Pose une Part rouge, avec la matière Neon.', 'Ajoute un Script dedans.', 'Écris le code de l\'image, ou copie le snippet « Brique mortelle ».', 'Teste : en touchant la lave, ton personnage recommence.'],
    vid: 'Roblox kill brick lave script tutoriel obby', ref: 'Humanoid' },
  { t: 'Les checkpoints', intro: 'Un checkpoint évite de tout recommencer. Dans Roblox, on le fait avec un SpawnLocation et une équipe.', pic: { t: 'props', rows: [['Neutral', 'décoché', 1], ['AllowTeamChangeOnTouch', 'coché', 1], ['TeamColor', 'Bright blue', 1], ['Anchored', 'coché']] }, cap: 'Les réglages d\'un SpawnLocation qui sert de checkpoint.',
    steps: ['Ajoute un SpawnLocation à chaque étape.', 'Dans le service Teams, crée une équipe par étape.', 'Donne au SpawnLocation la même TeamColor que son équipe.', 'Décoche Neutral et coche AllowTeamChangeOnTouch.', 'Coche AutoAssignable seulement sur l\'équipe de la première étape.'],
    tip: 'Donne une couleur différente à chaque équipe, sinon les checkpoints se mélangent.', vid: 'Roblox obby checkpoints SpawnLocation Teams tutoriel', ref: 'SpawnLocation' },
  { t: 'Un obstacle qui disparaît', intro: 'Une plateforme qui disparaît et revient oblige le joueur à sauter au bon moment.', pic: { t: 'code', code: 'local part = script.Parent\n\nwhile true do\n\tpart.Transparency = 1\n\tpart.CanCollide = false\n\ttask.wait(2)\n\tpart.Transparency = 0\n\tpart.CanCollide = true\n\ttask.wait(2)\nend' }, cap: 'La plateforme disparaît deux secondes, puis revient deux secondes.',
    steps: ['Ajoute un Script dans une de tes plateformes.', 'Écris le code de l\'image.', 'Teste et règle les temps pour que le saut reste possible.'],
    tip: 'CanCollide décoché veut dire qu\'on passe à travers.', vid: 'Roblox obby plateforme qui disparait script tutoriel' },
  { t: 'L\'arrivée et la publication', intro: 'Il reste à fêter la victoire du joueur, puis à mettre ton jeu en ligne.', pic: { t: 'code', code: 'script.Parent.Touched:Connect(function(hit)\n\tlocal player = game.Players:GetPlayerFromCharacter(hit.Parent)\n\tif player then\n\t\tprint(player.Name .. " a fini l\'obby !")\n\tend\nend)' }, cap: 'Le script de la plateforme d\'arrivée.',
    steps: ['Pose une plateforme dorée à la fin du parcours.', 'Ajoute le script de l\'image.', 'Fais tout ton obby du début à la fin, sans tricher.', 'Clique sur File, puis Publish to Roblox pour le mettre en ligne.'],
    tip: 'Fais tester ton obby par un ami : s\'il reste bloqué, l\'étape est trop dure.', vid: 'Roblox Studio publier son jeu publish to Roblox tutoriel' }],
  final: { t: 'Ton obby de cinq étapes', brief: 'Fabrique un obby complet : cinq étapes différentes, de la lave, un obstacle qui bouge ou disparaît, des checkpoints et une arrivée.', pic: { t: 'scr', boxes: OBBY_MOCK }, cap: 'Un exemple de parcours. Invente le tien !',
    checks: ['Mon obby a cinq étapes différentes', 'Il y a au moins une brique de lave', 'Un obstacle bouge ou disparaît', 'Il y a un checkpoint entre les étapes', 'Il y a une plateforme d\'arrivée', "Je l'ai fini moi-même du début à la fin"] } }
];
let cs = Object.assign({ done: {}, res: {}, chk: {} }, load('courses', {})), crId = null, crLesson = 0, crPhoto = null, crPhotoUrl = '', crBusy = false, crNote = '';
const csSave = () => save('courses', cs);
const stars = n => '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>';
const lessonsDone = c => c.lessons.filter((_, i) => cs.done[c.id + ':' + i]).length;
const KCOL = { svc: 'var(--muted)', gui: 'var(--godot)', script: 'var(--ok)', part: 'var(--web)', model: 'var(--unity)' };
const scr = (boxes, phone) => `<div class="scr${phone ? ' phone' : ''}">` + boxes.map(b => `<div class="b-${b[5] || 'frame'}" style="left:${b[0]}%;top:${b[1]}%;width:${b[2]}%;height:${b[3]}%;border-radius:${b[6] === undefined ? 6 : b[6]}px">${esc(b[4] || '')}</div>`).join('') + '</div>';
function pic(p) {
  if (!p) return '';
  if (p.t === 'tree') return '<div class="win tree"><div class="win-t">Explorer</div>' + p.rows.map(r => `<div class="${r[3] ? 'hl' : ''}" style="padding-left:${10 + r[0] * 16}px"><i class="ic" style="--k:${KCOL[r[2]] || KCOL.svc}"></i>${esc(r[1])}</div>`).join('') + '</div>';
  if (p.t === 'props') return '<div class="win props"><div class="win-t">Properties</div>' + p.rows.map(r => `<div class="${r[2] ? 'hl' : ''}"><span>${esc(r[0])}</span><span>${esc(r[1])}</span></div>`).join('') + '</div>';
  if (p.t === 'scr') return scr(p.boxes, p.phone);
  if (p.t === 'pair') return '<div class="pair">' + p.items.map(it => `<div>${scr(it.boxes, it.phone)}<span>${esc(it.label)}</span></div>`).join('') + '</div>';
  if (p.t === 'studio') return '<div class="studio">' + [['tb', "Barre d'outils"], ['vp', 'Ton monde en 3D'], ['ex', 'Explorer'], ['pr', 'Properties'], ['out', 'Output']].map(([k, l]) => `<div class="${k}${p.hl === k ? ' hl' : ''}">${l}</div>`).join('') + '</div>';
  if (p.t === 'keys') return '<div class="win" style="padding:0 12px 4px">' + keyRows(p.rows) + '</div>';
  if (p.t === 'code') return `<pre class="cm-s-etabli" data-lua="${esc(p.code)}"></pre>`;
  return '';
}
const paintAll = el => el.querySelectorAll('pre[data-lua]').forEach(p => paint(p, p.dataset.lua, 'lua'));
function lrRender() {
  $('cr-list').innerHTML = COURSES.map(c => { const n = lessonsDone(c), r = cs.res[c.id], tot = c.lessons.length + 1, d = n + (r ? 1 : 0);
    return `<article class="course" data-course="${c.id}"><div class="course-art">${pic(c.cover)}</div><div class="course-b"><small>${c.lessons.length} leçons et 1 projet final</small><h2>${esc(c.n)}</h2><p>${esc(c.sub)}</p>
      <div class="prog"><i style="width:${d / tot * 100}%"></i></div><div class="course-f"><button class="btn sm">${d === 0 ? 'Commencer' : d === tot ? 'Revoir' : 'Continuer'}</button>${r ? `<span class="stars" aria-label="${r.stars} étoiles sur 5">${stars(r.stars)}</span>` : `<span class="hint">${n} / ${c.lessons.length}</span>`}</div></div></article>`; }).join('');
  paintAll($('cr-list'));
}
function crRender() {
  const c = COURSES.find(x => x.id === crId); if (!c) return;
  const n = lessonsDone(c), r = cs.res[c.id], F = c.lessons.length, f = c.final, chk = cs.chk[c.id] || [], li = a => a.map(x => `<li>${esc(x)}</li>`).join('');
  $('cr-view').innerHTML = `<button class="btn ghost sm" data-cr-back>← Tous les cours</button>
    <div class="head" style="margin-top:14px"><h1>${esc(c.n)}</h1><p>${esc(c.sub)}</p></div>
    <div class="prog" style="max-width:52rem"><i style="width:${(n + (r ? 1 : 0)) / (F + 1) * 100}%"></i></div>
    <p class="hint" style="margin-top:6px">${n} sur ${F} leçons terminées. Les vidéos s'ouvrent sur YouTube, dans un nouvel onglet.</p><ol class="lessons">` +
    c.lessons.map((l, i) => { const d = cs.done[c.id + ':' + i], op = crLesson === i;
      return `<li class="lesson${d ? ' done' : ''}"><button class="lesson-h" data-lesson="${i}" aria-expanded="${op}"><span class="num">${d ? '✓' : i + 1}</span><span class="grow">${esc(l.t)}</span><span class="hint">${op ? 'Fermer' : 'Ouvrir'}</span></button>` + (op ? `<div class="lesson-b"><p>${esc(l.intro)}</p>
        <figure class="pic">${pic(l.pic)}<figcaption>${esc(l.cap || '')}</figcaption></figure>
        <ol class="todo">${li(l.steps)}</ol>${l.tip ? `<div class="tipbox"><b>Astuce.</b> ${esc(l.tip)}</div>` : ''}
        <div class="row"><a class="btn ghost" href="${esc(YT(l.vid))}" target="_blank" rel="noopener">▶ Voir des vidéos ↗</a>${l.ref ? `<a class="btn ghost" href="${REF(l.ref)}" target="_blank" rel="noopener">Fiche officielle : ${l.ref} ↗</a>` : ''}
          <span style="flex:1"></span>${d ? `<button class="btn ghost" data-undo-lesson="${i}">Marquer comme non faite</button>` : `<button class="btn" data-done-lesson="${i}">J'ai fini cette leçon</button>`}</div></div>` : '') + '</li>'; }).join('') +
    `<li class="lesson final${r ? ' done' : ''}"><button class="lesson-h" data-lesson="${F}" aria-expanded="${crLesson === F}"><span class="num">★</span><span class="grow">Projet final : ${esc(f.t)}</span><span class="hint">${crLesson === F ? 'Fermer' : 'Ouvrir'}</span></button>` + (crLesson === F ? `<div class="lesson-b"><p>${esc(f.brief)}</p>
      <figure class="pic">${pic(f.pic)}<figcaption>${esc(f.cap)}</figcaption></figure>
      <div><span class="lbl">Ce que j'ai réussi</span><div class="chk">${f.checks.map((t, i) => `<label><input type="checkbox" data-chk="${i}"${chk[i] ? ' checked' : ''}> <span>${esc(t)}</span></label>`).join('')}</div></div>
      <div class="photo"><span class="lbl">Montre ton travail</span><p class="hint">Ajoute une capture d'écran de ton projet. Seulement ton écran, jamais une photo de toi. La note est approximative : un petit programme regarde les couleurs et les détails de l'image, sans la comprendre.</p>
        <input type="file" id="cr-file" accept="image/png,image/jpeg,image/webp" aria-label="Capture d'écran de ton projet">${crPhotoUrl ? `<img src="${crPhotoUrl}" alt="Ta capture d'écran">` : ''}</div>
      <div class="row"><button class="btn" id="cr-grade"${crBusy ? ' disabled' : ''}>${crBusy ? 'Je regarde ton travail…' : r ? 'Refaire noter mon projet' : 'Obtenir ma note'}</button></div>
      ${crNote ? `<p class="msg bad" role="status">${esc(crNote)}</p>` : ''}
      ${r ? `<div class="result"><div class="stars" aria-label="${r.stars} étoiles sur 5">${stars(r.stars)}</div><h3>${esc(r.msg)}</h3>
        ${r.bravo.length ? `<div><span class="lbl">Bravo pour</span><ul>${li(r.bravo)}</ul></div>` : ''}${r.tips.length ? `<div><span class="lbl">Pour aller encore plus loin</span><ul>${li(r.tips)}</ul></div>` : ''}
        <p class="hint">${r.by === 'img' ? "Note approximative. Un petit programme regarde les couleurs, les détails et la taille de ta capture, puis ta liste. Il ne comprend pas vraiment ton projet : demande aussi l'avis d'un ami." : "Note calculée d'après la liste que tu as cochée."}</p></div>` : ''}</div>` : '') + '</li></ol>';
  paintAll($('cr-view'));
}
function courseShow(id) { const c = COURSES.find(x => x.id === id); if (!c) return; crId = id; crPhoto = null; crPhotoUrl = ''; crNote = ''; crBusy = false;
  const i = c.lessons.findIndex((_, k) => !cs.done[id + ':' + k]); crLesson = i < 0 ? c.lessons.length : i;
  $('cr-list-view').hidden = true; $('cr-view').hidden = false; crRender(); window.scrollTo(0, 0); }
function courseBack() { crId = null; $('cr-view').hidden = true; $('cr-list-view').hidden = false; lrRender(); window.scrollTo(0, 0); }
function courseResume() { const c = COURSES.find(x => lessonsDone(x) < x.lessons.length || !cs.res[x.id]) || COURSES[0]; go('apprendre'); courseShow(c.id); }
const cleanList = a => (Array.isArray(a) ? a : []).slice(0, 3).map(x => String(x).slice(0, 200)).filter(Boolean);
function analyse(im) {
  const W = 160, H = Math.max(1, Math.round(W * im.naturalHeight / im.naturalWidth)), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0, W, H); const d = cx.getImageData(0, 0, W, H).data, n = W * H, hist = new Map(); let flat = 0, edges = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4); hist.set(k, (hist.get(k) || 0) + 1);
    if (x < W - 1) { const df = Math.abs(d[i] - d[i + 4]) + Math.abs(d[i + 1] - d[i + 5]) + Math.abs(d[i + 2] - d[i + 6]); if (df < 8) flat++; else if (df > 90) edges++; } }
  let colors = 0, top = 0; hist.forEach(v => { if (v / n >= 0.015) colors++; if (v / n > top) top = v / n; });
  return { w: im.naturalWidth, h: im.naturalHeight, flat: flat / n, edges: edges / n, colors, top };
}
async function crGrade() {
  const c = COURSES.find(x => x.id === crId); if (!c || crBusy) return; const f = c.final, chk = cs.chk[c.id] || [], yes = f.checks.filter((_, i) => chk[i]), no = f.checks.filter((_, i) => !chk[i]);
  crNote = ''; let a = null;
  if (!yes.length && !crPhoto) { crNote = "Coche ce que tu as réussi ou ajoute une capture d'écran, et je te donne ta note."; crRender(); return; }
  if (crPhoto) { try { const im = new Image(); im.src = crPhotoUrl; await im.decode(); a = analyse(im); } catch (e) { crNote = "Je n'arrive pas à lire cette image. Essaie une capture en PNG ou en JPG."; crRender(); return; } }
  const part = yes.length / f.checks.length, bravo = [], tips = []; let score = part;
  if (a) {
    const shot = a.flat >= 0.3, empty = a.top > 0.9; let i = 0;
    if (empty) tips.push("Ton image est presque vide. Montre ton projet de plus près.");
    else {
      if (shot) { i += 0.4; bravo.push("Ta capture ressemble bien à un écran de Studio ou de jeu."); } else tips.push("Ton image ressemble plutôt à une photo. Fais une vraie capture d'écran, ce sera plus net.");
      i += 0.3 * Math.min(a.colors, 6) / 6; if (a.colors >= 4) bravo.push("J'ai repéré " + a.colors + " couleurs principales : c'est varié."); else tips.push("Il y a peu de couleurs. Ajoute une couleur qui ressort.");
      i += 0.2 * Math.min(1, a.edges / 0.05); if (a.edges >= 0.03) bravo.push("Il y a beaucoup de détails à regarder.");
      if (a.w >= 800) i += 0.1; else tips.push("Ta capture est petite. Passe en plein écran avant de la prendre.");
    }
    score = yes.length ? 0.65 * part + 0.35 * i : Math.min(0.5, i);
    if (!yes.length) tips.unshift("Coche la liste pour avoir une note plus juste.");
  }
  yes.slice(0, 2).forEach(x => bravo.push(x)); no.slice(0, 2).forEach(x => tips.push(x));
  const s = Math.max(1, Math.min(5, Math.round(5 * score)));
  cs.res[c.id] = { stars: s, by: a ? 'img' : 'auto', bravo: bravo.slice(0, 4), tips: tips.slice(0, 4),
    msg: s === 5 ? "Incroyable, tu as tout réussi. C'est du travail de pro !" : s === 4 ? 'Super travail ! Il ne te manque presque rien.' : s === 3 ? 'Bien joué, tu as fait plus de la moitié du chemin.' : 'Beau début ! Tous les pros ont commencé comme ça.' };
  csSave(); toast(s + ' étoiles sur 5. Bravo !'); crRender();
}
$('p-apprendre').addEventListener('click', e => {
  const co = e.target.closest('[data-course]'); if (co) { courseShow(co.dataset.course); return; }
  if (e.target.closest('[data-cr-back]')) { courseBack(); return; }
  const c = COURSES.find(x => x.id === crId); if (!c) return;
  const dn = e.target.closest('[data-done-lesson]'), un = e.target.closest('[data-undo-lesson]'), lh = e.target.closest('[data-lesson]');
  if (dn) { const i = +dn.dataset.doneLesson; cs.done[c.id + ':' + i] = 1; csSave(); crLesson = i + 1; toast(i + 1 < c.lessons.length ? 'Bravo ! Leçon suivante.' : 'Toutes les leçons sont finies. Place au projet final !'); crRender(); const h = document.querySelector('[data-lesson="' + crLesson + '"]'); if (h) h.parentNode.scrollIntoView({ block: 'start' }); }
  else if (un) { delete cs.done[c.id + ':' + un.dataset.undoLesson]; csSave(); crRender(); }
  else if (lh) { const i = +lh.dataset.lesson; crLesson = crLesson === i ? -1 : i; crRender(); }
  else if (e.target.closest('#cr-grade')) crGrade();
});
$('p-apprendre').addEventListener('change', e => {
  if (e.target.dataset.chk !== undefined) { const a = cs.chk[crId] || (cs.chk[crId] = []); a[+e.target.dataset.chk] = e.target.checked ? 1 : 0; csSave(); return; }
  if (e.target.id === 'cr-file') { const file = e.target.files && e.target.files[0]; if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 15e6) { crNote = 'Choisis une image PNG ou JPG de moins de 15 Mo.'; crRender(); return; }
    if (crPhotoUrl) { try { URL.revokeObjectURL(crPhotoUrl); } catch (x) {} } crPhoto = file; crPhotoUrl = URL.createObjectURL(file); crNote = ''; crRender(); }
});
/* ============ MÉMO ============ */
const MEMO = [
  { n: 'Où ranger quoi', cols: ['Service', 'Qui le voit', 'On y met'], rows: [
    ['Workspace', 'Serveur et clients', 'Tout ce qui existe dans le monde 3D : parts, modèles, terrain.'],
    ['ReplicatedStorage', 'Serveur et clients', 'RemoteEvents, ModuleScripts partagés, modèles à cloner des deux côtés.'],
    ['ReplicatedFirst', 'Clients, en tout premier', "L'écran de chargement."],
    ['ServerScriptService', 'Serveur seulement', 'Les Scripts : logique du jeu, sauvegarde, achats.'],
    ['ServerStorage', 'Serveur seulement', 'Cartes, modèles et données que les joueurs ne doivent pas pouvoir copier.'],
    ['StarterGui', 'Copié chez chaque joueur', 'Les interfaces (ScreenGui).'],
    ['StarterPlayerScripts', 'Copié une fois par joueur', 'LocalScripts qui durent toute la session : caméra, entrées clavier.'],
    ['StarterCharacterScripts', 'Copié à chaque apparition', 'LocalScripts liés au personnage.'],
    ['StarterPack', 'Copié dans le sac du joueur', 'Les outils (Tool) donnés au départ.'],
    ['Players', 'Serveur et clients', 'Les joueurs connectés et leurs leaderstats.'],
    ['Lighting', 'Serveur et clients', "Le ciel, l'heure et les effets visuels."],
    ['SoundService', 'Serveur et clients', 'Les sons globaux et les groupes de sons.']] },
  { n: 'Trois types de scripts', cols: ['Type', 'Tourne sur', 'On le range dans', 'Sert à'], rows: [
    ['Script', 'Le serveur', 'ServerScriptService', 'Sauvegarde, règles du jeu, achats, anti-triche.'],
    ['LocalScript', "L'appareil du joueur", 'StarterPlayerScripts, StarterGui, StarterCharacterScripts', 'Entrées, caméra, interface, effets visuels.'],
    ['ModuleScript', "Là où on l'appelle avec require()", 'ReplicatedStorage ou ServerStorage', 'Code partagé entre plusieurs scripts.']] },
  { n: 'Faire communiquer les scripts', cols: ['Sens', 'Objet', 'On envoie avec', 'On reçoit avec'], rows: [
    ['Client vers serveur', 'RemoteEvent', ':FireServer(...)', '.OnServerEvent'],
    ['Serveur vers un client', 'RemoteEvent', ':FireClient(player, ...)', '.OnClientEvent'],
    ['Serveur vers tous les clients', 'RemoteEvent', ':FireAllClients(...)', '.OnClientEvent'],
    ['Client vers serveur, avec réponse', 'RemoteFunction', ':InvokeServer(...)', '.OnServerInvoke'],
    ['Entre scripts du même côté', 'BindableEvent', ':Fire(...)', '.Event']] }
];
const EQ = MEMO.flatMap(m => m.rows);
function eqRender() { const q = norm($('eq-q').value.trim());
  $('memo').innerHTML = MEMO.map(m => { const rows = m.rows.filter(r => !q || norm(r.join(' ') + ' ' + r.map(T).join(' ')).includes(q));
    return rows.length ? `<div class="panel"><h2>${m.n}</h2><div class="scroll"><table class="eq"><tr>${m.cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows.map(r => '<tr>' + r.map(c => `<td>${esc(c)}</td>`).join('') + '</tr>').join('')}</table></div></div>` : ''; }).join('') || '<p class="empty">Aucune ligne ne correspond à cette recherche.</p>'; }
$('eq-q').addEventListener('input', eqRender);
const keyRows = k => '<div class="keys">' + k.map(([a, b]) => `<div><span>${esc(b)}</span><kbd>${esc(a)}</kbd></div>`).join('') + '</div>';
$('keys').innerHTML = '<div class="panel"><h2>Raccourcis de Studio</h2>' + keyRows([['F5', 'Lancer le test'], ['Maj F5', 'Arrêter le test'], ['F8', 'Lancer sans personnage'], ['Ctrl D', 'Dupliquer'], ['Ctrl G', 'Grouper en Model'], ['F', 'Centrer la vue sur la sélection'], ['Ctrl 1 à 4', 'Sélection, déplacement, taille, rotation'], ['Ctrl Maj F', 'Chercher dans tous les scripts']]) + '<p class="hint">Sur Mac, Ctrl devient Cmd. Les raccourcis peuvent changer selon la version de Studio.</p></div>';
/* ============ ACCUEIL ============ */
function homeRender() {
  const doing = tasks.filter(t => t.c === 'doing').length, bugs = tasks.filter(t => t.k === 'bug' && t.c !== 'done').length, h = new Date().getHours();
  const tot = COURSES.reduce((a, c) => a + c.lessons.length, 0), nd = COURSES.reduce((a, c) => a + lessonsDone(c), 0);
  $('hm-date').textContent = new Date().toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
  $('hm-hello').innerHTML = (h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour') + (prefs.name ? ' <em>' + esc(prefs.name) + '</em>' : '') + ", on forge quoi aujourd'hui ?";
  $('hm-sub').textContent = `${pl(doing, 'tâche', 'tâches')} en cours, ${pl(bugs, 'bug ouvert', 'bugs ouverts')}, ${nd} sur ${tot} leçons terminées.`;
  $('hm-stats').innerHTML = `<span><b>${SNIPS.length + mySnips.length}</b> snippets</span><span><b>${Object.keys(TOOLCAT).length}</b> outils</span><span><b>${shop.items.length}</b> assets en collection</span><span><b>${Object.keys(cs.res).length}</b> projets notés</span>`;
  const prof = prefs.rid ? 'https://www.roblox.com/users/' + prefs.rid + '/profile' : prefs.rbx ? 'https://www.roblox.com/search/users?keyword=' + encodeURIComponent(prefs.rbx) : '';
  $('hm-links').innerHTML = [['Creator Store', 'https://create.roblox.com/store'], ['Mes créations', 'https://create.roblox.com/dashboard/creations'], ['Documentation', 'https://create.roblox.com/docs'], ['DevForum', 'https://devforum.roblox.com/']].concat(prof ? [[prefs.rbx ? 'Profil de ' + prefs.rbx : 'Mon profil', prof]] : []).map(([l, u]) => `<a class="chip plain" href="${esc(u)}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join('') + (prof ? '' : '<button class="chip plain" data-act="settings">Ajouter mon pseudo Roblox</button>');
  const fv = favs.tools.map(id => $(id) ? `<button data-go-tool="${id}"><span class="star" aria-hidden="true" style="color:var(--mark)">★</span><span class="grow">${esc($(id).dataset.name)}</span><span class="hint">Outil</span></button>` : '')
    .concat(favs.snips.map(t => `<button data-go-snip="${esc(t)}"><span class="star" aria-hidden="true" style="color:var(--mark)">★</span><span class="grow">${esc(t)}</span><span class="hint">Snippet</span></button>`)).join('');
  $('hm-favs').innerHTML = fv || "<p class=\"empty\">Clique sur l'étoile d'un outil ou d'un snippet pour le retrouver ici.</p>";
  const open = tasks.filter(t => t.c !== 'done').sort((a, b) => (b.c === 'doing') - (a.c === 'doing') || prRank(a) - prRank(b)).slice(0, 5);
  $('hm-tasks').innerHTML = open.length ? open.map(t => `<a href="#projets"><span class="tag${t.k === 'bug' ? ' bug' : ''}">${TYPES[t.k]}</span><span class="grow">${esc(t.t)}</span>${t.c === 'doing' ? '<span class="tag hot">en cours</span>' : ''}</a>`).join('') : '<p class="empty">Aucune tâche ouverte. Ajoute-en une avec « Nouvelle tâche ».</p>';
  $('hm-courses').innerHTML = COURSES.map(c => { const r = cs.res[c.id]; return `<button data-go-course="${c.id}"><span class="grow">${esc(c.n)}</span>${r ? `<span class="stars">${stars(r.stars)}</span>` : `<span class="hint">${lessonsDone(c)} / ${c.lessons.length}</span>`}</button>`; }).join('');
  const next = COURSES.map(c => { const i = c.lessons.findIndex((_, k) => !cs.done[c.id + ':' + k]); return i >= 0 ? [c, 'leçon ' + (i + 1) + ' sur ' + c.lessons.length, c.lessons[i].t] : cs.res[c.id] ? null : [c, 'projet final', c.final.t]; }).filter(Boolean);
  $('hm-learn').innerHTML = next.length ? next.map(([c, w, t]) => `<a href="#apprendre" data-go-course="${c.id}"><small>${esc(c.n)} · ${w}</small>${esc(t)}</a>`).join('') : '<p class="empty">Tu as fini tous les cours et tous les projets. Bravo !</p>';
}$('p-accueil').addEventListener('click', e => {
  const c = e.target.closest('[data-go-course]'); if (c) { e.preventDefault(); go('apprendre'); courseShow(c.dataset.goCourse); return; }
  const t = e.target.closest('[data-go-tool]'); if (t) { toolOpen(t.dataset.goTool); return; }
  const s = e.target.closest('[data-go-snip]'); if (s) { snFilter = 'all'; $('sn-q').value = s.dataset.goSnip; snRender(); go('code'); }
});
let fc = { total: 1500, left: 1500, end: 0, t: 0 };
function fcRender() { $('fc-time').textContent = String(Math.floor(fc.left / 60)).padStart(2, '0') + ':' + String(fc.left % 60).padStart(2, '0'); $('fc-bar').style.width = (100 - fc.left / fc.total * 100) + '%';
  $('fc-go').textContent = fc.t ? 'Pause' : fc.left < fc.total && fc.left > 0 ? 'Reprendre' : 'Démarrer'; }
function fcStop() { clearInterval(fc.t); fc.t = 0; }
function fcSet(min) { fcStop(); fc.total = fc.left = min * 60; document.querySelectorAll('[data-fc]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.fc === min)); fcRender(); }
$('fc-go').addEventListener('click', () => { if (fc.t) { fcStop(); fcRender(); return; } if (fc.left <= 0) fc.left = fc.total; fc.end = Date.now() + fc.left * 1000;
  fc.t = setInterval(() => { fc.left = Math.max(0, Math.round((fc.end - Date.now()) / 1000)); if (!fc.left) { fcStop(); toast(fc.total <= 600 ? 'Pause terminée. On y retourne.' : 'Session terminée. Prends une pause.'); } fcRender(); }, 500); fcRender(); });
$('fc-reset').addEventListener('click', () => fcSet(fc.total / 60));
document.addEventListener('click', e => { const b = e.target.closest('[data-fc]'); if (b) fcSet(+b.dataset.fc); });

/* ============ BOUTIQUE ============ */
const kw = q => q ? '?keyword=' + encodeURIComponent(q) : '';
const SHOP = [
  ['models', 'Modèles', 'Creator Store', 'Bâtiments, véhicules, armes, PNJ et décors prêts à poser.', q => 'https://create.roblox.com/store/models' + kw(q), ['low poly tree', 'sword', 'house', 'car', 'npc']],
  ['plugins', 'Plugins', 'Creator Store', 'Des outils qui ajoutent des fonctions à Studio.', q => 'https://create.roblox.com/store/plugins' + kw(q), ['animator', 'building tools', 'terrain', 'tag editor', 'lighting']],
  ['decals', 'Images', 'Creator Store', 'Textures, icônes et decals pour tes parts et tes interfaces.', q => 'https://create.roblox.com/store/decals' + kw(q), ['grass texture', 'wood texture', 'button icon', 'coin icon']],
  ['audio', 'Audio', 'Creator Store', 'Musiques et effets sonores.', q => 'https://create.roblox.com/store/audio' + kw(q), ['menu music', 'click', 'explosion', 'footsteps', 'coin']],
  ['meshes', 'Meshes', 'Creator Store', 'Formes 3D à utiliser dans un MeshPart.', q => 'https://create.roblox.com/store/meshes' + kw(q), ['rock', 'tree', 'crate', 'sword']],
  ['video', 'Vidéos', 'Creator Store', 'Clips à afficher dans un VideoFrame.', q => 'https://create.roblox.com/store/video' + kw(q), ['fire', 'water', 'loading']],
  ['catalog', 'Avatar', 'Marketplace', 'Vêtements et accessoires pour les avatars.', q => 'https://www.roblox.com/catalog' + (q ? '?Keyword=' + encodeURIComponent(q) : ''), ['hat', 'hair', 'wings', 'sword']],
  ['games', 'Expériences', 'Roblox', "Les jeux des autres, pour t'inspirer.", q => 'https://www.roblox.com/discover/' + (q ? '?Keyword=' + encodeURIComponent(q) : ''), ['obby', 'tycoon', 'simulator', 'tower defense']],
  ['forum', 'DevForum', 'Communauté', 'Questions, tutoriels et ressources de la communauté.', q => 'https://devforum.roblox.com/' + (q ? 'search?q=' + encodeURIComponent(q) : ''), ['datastore', 'tween', 'anti cheat', 'ui scaling']]
];
let shop = Object.assign({ recent: [], items: [] }, load('shop', {})), shCat = 'models';
const shopBy = k => SHOP.find(s => s[0] === k) || SHOP[0];
const shopUrl = (k, q) => shopBy(k)[4](String(q).trim());
const shopSave = () => save('shop', shop);
function shopRender() {
  const c = shopBy(shCat), q = $('sh-q').value.trim();
  $('sh-tiles').innerHTML = SHOP.map(s => `<button type="button" data-sh="${s[0]}" aria-pressed="${s[0] === shCat}"><small>${s[2]}</small>${s[1]}</button>`).join('');
  $('sh-desc').textContent = c[3] + ' Les recherches en anglais donnent plus de résultats.';
  $('sh-go').href = shopUrl(shCat, q); $('sh-go').textContent = (q ? 'Chercher « ' + q + ' » dans ' + c[1] : 'Ouvrir le rayon ' + c[1]) + ' ↗';
  $('sh-ideas').innerHTML = c[5].map(i => `<button type="button" class="chip plain" data-idea="${esc(i)}">${esc(i)}</button>`).join('');
  $('sh-recent').innerHTML = shop.recent.length ? shop.recent.map(r => `<a class="chip plain" href="${esc(shopUrl(r.c, r.q))}" target="_blank" rel="noopener">${esc(r.q)} · ${shopBy(r.c)[1]}</a>`).join('') + '<button type="button" class="btn ghost sm" id="sh-clear">Effacer</button>' : '<span class="hint">Tes dernières recherches apparaîtront ici.</span>';
}
$('sh-q').addEventListener('input', () => { const c = shopBy(shCat), q = $('sh-q').value.trim(); $('sh-go').href = shopUrl(shCat, q); $('sh-go').textContent = (q ? 'Chercher « ' + q + ' » dans ' + c[1] : 'Ouvrir le rayon ' + c[1]) + ' ↗'; });
$('sh-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('sh-go').click(); } });
$('sh-go').addEventListener('click', () => { const q = $('sh-q').value.trim(); if (!q) return;
  shop.recent = [{ q, c: shCat }].concat(shop.recent.filter(r => !(r.q === q && r.c === shCat))).slice(0, 8); shopSave(); setTimeout(shopRender, 50); });
$('p-boutique').addEventListener('click', e => {
  const t = e.target.closest('[data-sh]'); if (t) { shCat = t.dataset.sh; shopRender(); return; }
  const i = e.target.closest('[data-idea]'); if (i) { $('sh-q').value = i.dataset.idea; shopRender(); $('sh-go').focus(); return; }
  if (e.target.closest('#sh-clear')) { const old = shop.recent; shop.recent = []; shopSave(); shopRender(); toast('Recherches effacées', () => { shop.recent = old; shopSave(); shopRender(); }); return; }
  const r = e.target.closest('[data-co-rm]'); if (r) { const n = +r.dataset.coRm, it = shop.items.splice(n, 1)[0]; shopSave(); collRender(); toast('« ' + it.name + ' » retiré', () => { shop.items.splice(n, 0, it); shopSave(); collRender(); }); }
});
function collRender() { $('co-list').innerHTML = shop.items.length ? shop.items.map((it, i) => `<div class="outrow"><b>${esc(it.type)}</b><code>${esc(it.name)} · rbxassetid://${esc(it.id)}</code><button class="btn ghost sm" data-v="rbxassetid://${esc(it.id)}">Copier</button><a class="btn ghost sm" href="https://create.roblox.com/store/asset/${esc(it.id)}" target="_blank" rel="noopener">Voir ↗</a><button class="btn ghost sm" data-co-rm="${i}" aria-label="Retirer ${esc(it.name)}">×</button></div>`).join('')
  : "<p class=\"empty\">Ta collection est vide. Ajoute l'ID d'un modèle, d'une image ou d'un son que tu réutilises souvent.</p>"; }
function shopAdd(id, name, type) { if (!id) { toast("Je ne trouve pas d'ID dans ce texte. Colle un nombre ou un lien Roblox."); return false; }
  if (shop.items.some(x => x.id === id)) { toast('Cet asset est déjà dans ta collection.'); return false; }
  shop.items.unshift({ id, name, type }); shopSave(); collRender(); toast('Ajouté à ta collection'); return true; }
$('co-form').addEventListener('submit', e => { e.preventDefault(); if (shopAdd(assetId($('co-id').value), $('co-name').value.trim(), $('co-type').value)) { $('co-name').value = ''; $('co-id').value = ''; } });
$('api-list').innerHTML = ['TweenService', 'Players', 'Humanoid', 'DataStoreService', 'RemoteEvent', 'RemoteFunction', 'UserInputService', 'RunService', 'MarketplaceService', 'CollectionService', 'BasePart', 'Model', 'ScreenGui', 'TextButton', 'UIListLayout', 'Workspace', 'Instance', 'HttpService', 'ProximityPrompt', 'PathfindingService'].map(c => `<option value="${c}">`).join('');
function apiUpdate() { const c = $('api-in').value.replace(/[^A-Za-z0-9]/g, ''); $('api-go').href = 'https://create.roblox.com/docs/reference/engine/classes/' + (c || 'Instance'); $('api-go').textContent = 'Ouvrir ' + (c || 'Instance') + ' ↗'; }
$('api-in').addEventListener('input', apiUpdate);
$('api-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('api-go').click(); } });
function shopSearch(q) { $('sh-q').value = q; shopRender(); go('boutique'); setTimeout(() => $('sh-go').focus(), 80); }
/* ============ PALETTE ============ */
let palItems = [], palShown = [], palIdx = 0;
function palBuild() {
  palItems = TABS.map(t => ({ l: NAMES[t], k: 'Page', run: () => go(t) }));
  [['Nouvelle tâche', 'newtask'], ['Profil et réglages', 'settings'], ['Raccourcis clavier', 'help']].forEach(([l, a]) => palItems.push({ l, k: 'Action', run: () => doAct(a) }));
  document.querySelectorAll('#tl-grid .panel').forEach(p => palItems.push({ l: p.dataset.name, k: 'Outil', run: () => toolOpen(p.id) }));
  mySnips.concat(SNIPS).forEach(s => palItems.push({ l: s.t, k: 'Snippet', run: () => { snFilter = 'all'; $('sn-q').value = s.t; snRender(); go('code'); } }));
  tasks.filter(t => t.c !== 'done').forEach(t => palItems.push({ l: t.t, k: 'Tâche', run: () => { go('projets'); setTimeout(() => tkEdit(t.id), 60); } }));
  COURSES.forEach(c => { palItems.push({ l: c.n, k: 'Cours', run: () => { go('apprendre'); courseShow(c.id); } }); c.lessons.forEach((l, i) => palItems.push({ l: l.t, k: 'Leçon', run: () => { go('apprendre'); courseShow(c.id); crLesson = i; crRender(); } })); });
  SHOP.forEach(s => palItems.push({ l: 'Rayon ' + s[1], k: 'Boutique', run: () => { shCat = s[0]; shopRender(); go('boutique'); } }));
  EQ.forEach(r => palItems.push({ l: r[0], k: 'Mémo', run: () => { $('eq-q').value = r[0]; eqRender(); go('memo'); } }));
}
function palRender() { const q = norm($('pal-q').value.trim()); palShown = palItems.filter(i => !q || norm(i.l + ' ' + i.k + ' ' + T(i.l) + ' ' + T(i.k)).includes(q)).slice(0, 9); const raw = $('pal-q').value.trim(); if (raw) palShown.push({ l: 'Chercher « ' + raw + ' » dans la boutique Roblox', k: 'Boutique', run: () => shopSearch(raw) }); palIdx = Math.min(palIdx, Math.max(0, palShown.length - 1));
  $('pal-list').innerHTML = palShown.length ? palShown.map((i, n) => `<button data-pal="${n}" class="${n === palIdx ? 'on' : ''}"><span>${esc(i.l)}</span><small>${esc(i.k)}</small></button>`).join('') : '<p class="empty" style="padding:10px">Rien trouvé. Essaie un autre mot.</p>'; }
function palOpen() { closeModal(); palBuild(); palIdx = 0; $('pal-q').value = ''; $('pal').hidden = false; palRender(); $('pal-q').focus(); }
function palClose() { $('pal').hidden = true; }
function palRun(n) { const i = palShown[n]; if (!i) return; palClose(); i.run(); }
$('pal-open').addEventListener('click', palOpen);
$('pal-q').addEventListener('input', () => { palIdx = 0; palRender(); });
$('pal').addEventListener('click', e => { const b = e.target.closest('[data-pal]'); if (b) palRun(+b.dataset.pal); else if (e.target === $('pal')) palClose(); });
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopPropagation(); $('pal').hidden ? palOpen() : palClose(); return; }
  if (!$('pal').hidden) {
    if (e.key === 'Escape') palClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); palIdx = Math.min(palShown.length - 1, palIdx + 1); palRender(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palIdx = Math.max(0, palIdx - 1); palRender(); }
    else if (e.key === 'Enter') { e.preventDefault(); palRun(palIdx); }
    return;
  }
  if (!$('modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
  if (e.altKey && /^Digit[1-7]$/.test(e.code)) { e.preventDefault(); go(TABS[+e.code.slice(5) - 1]); return; }
  if (e.key === '?' && !e.target.closest('input,textarea,select,.CodeMirror,[contenteditable]')) { e.preventDefault(); help(); }
}, true);

/* ============ RÉGLAGES, BIENVENUE, AIDE ============ */
function reloadPage() { try { location.reload(); } catch (e) {} toast('Recharge la page pour finir.'); }
function settings() {
  modal(`<h2>Profil et réglages</h2>
    <div class="row"><div class="field"><label for="s-name">Prénom ou pseudo</label><input type="text" id="s-name" maxlength="24" value="${esc(prefs.name)}"></div>
      <div class="field"><label for="s-rbx">Pseudo Roblox</label><input type="text" id="s-rbx" maxlength="20" value="${esc(prefs.rbx)}" spellcheck="false"></div></div>
    <div class="field"><label for="s-rid">ID de ton compte Roblox (facultatif)</label><input type="text" id="s-rid" inputmode="numeric" maxlength="14" value="${esc(prefs.rid)}" placeholder="Le nombre dans le lien de ton profil"></div>
    <p class="hint">Ton pseudo et ton ID servent seulement à créer un lien vers ton profil. Établi Dev ne se connecte pas à ton compte et ne te demandera jamais ton mot de passe.</p>
    <div class="row"><div class="field"><label for="s-lang">Langue</label><select id="s-lang" data-notr><option value="fr"${LANG === 'fr' ? ' selected' : ''}>Français</option><option value="en"${LANG === 'en' ? ' selected' : ''}>English</option></select></div><div class="field"><label for="s-theme">Thème</label><select id="s-theme">${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<option value="${k}"${prefs.theme === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <hr><span class="lbl">Tes données</span><p class="hint">Tout est enregistré dans ce navigateur. Copie une sauvegarde pour la garder ou la passer sur un autre appareil.</p>
    <div class="row"><button class="btn ghost" id="s-export">Copier ma sauvegarde</button><button class="btn danger" id="s-reset">Tout effacer</button></div>
    <textarea id="s-import" placeholder="Colle une sauvegarde ici pour la restaurer" aria-label="Sauvegarde à restaurer" style="min-height:70px"></textarea>
    <div class="row end"><button class="btn ghost" id="s-restore">Restaurer</button><button class="btn" data-x>Terminé</button></div>`, box => {
    box.addEventListener('input', e => { if (!['s-name', 's-rbx', 's-rid', 's-theme', 's-fs', 's-wrap'].includes(e.target.id)) return;
      prefs.name = $('s-name').value.trim(); prefs.rbx = $('s-rbx').value.trim().replace(/[^A-Za-z0-9_]/g, ''); prefs.rid = $('s-rid').value.replace(/\D/g, '');
      prefs.theme = $('s-theme').value; applyPrefs(); homeRender(); });
    $('s-lang').onchange = e => { prefs.lang = e.target.value; save('prefs', prefs); closeModal(); reloadPage(); };
    $('s-export').onclick = e => { const d = {}; KEYS.forEach(k => { d[k] = load(k, null); }); copyText(JSON.stringify({ etabli: 1, data: d }), e.currentTarget); };
    $('s-reset').onclick = e => { const b = e.currentTarget; if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Confirmer : tout effacer'; return; } KEYS.concat('tab3', 'v4').forEach(k => { try { localStorage.removeItem(k); } catch (x) {} }); closeModal(); reloadPage(); };
    $('s-restore').onclick = () => { let o = null; try { o = JSON.parse($('s-import').value); } catch (x) {} if (!o || o.etabli !== 1 || !o.data) { toast("Cette sauvegarde est illisible. Colle le texte complet copié depuis « Copier ma sauvegarde »."); return; }
      KEYS.forEach(k => { if (o.data[k] != null) save(k, o.data[k]); }); closeModal(); reloadPage(); };
  });
}
function welcome() {
  prefs.seen = true; save('prefs', prefs);
  modal(`<h2>Bienvenue dans ton atelier Roblox</h2><p class="hint">Deux infos facultatives pour personnaliser l'accueil. Tu pourras les changer dans les réglages.</p>
    <div class="field"><label for="w-name">Ton prénom ou pseudo</label><input type="text" id="w-name" maxlength="24" placeholder="Facultatif"></div>
    <div class="field"><label for="w-rbx">Ton pseudo Roblox</label><input type="text" id="w-rbx" maxlength="20" placeholder="Facultatif" spellcheck="false"></div>
    <p class="hint">Pas de mot de passe : ton pseudo sert seulement à créer un lien vers ton profil.</p>
    <div class="row end"><button class="btn ghost" data-x>Plus tard</button><button class="btn" id="w-go">C'est parti</button></div>`, () => {
    $('w-go').onclick = () => { prefs.name = $('w-name').value.trim(); prefs.rbx = $('w-rbx').value.trim().replace(/[^A-Za-z0-9_]/g, ''); save('prefs', prefs); closeModal(); personalize(); toast(prefs.name ? 'Bienvenue, ' + prefs.name + ' !' : 'Bienvenue !'); };
  });
}function help() {
  modal('<h2>Raccourcis clavier</h2>' + keyRows([['Ctrl K', 'Chercher partout'], ['Alt 1 à 7', 'Changer de page'], ['?', 'Afficher cette aide'], ['Échap', 'Fermer une fenêtre']]) +
    '<p class="hint">Sur Mac, Ctrl devient Cmd.</p><div class="row end"><button class="btn" data-x>Fermer</button></div>');
}

/* ============ DÉMARRAGE ============ */
tasks.forEach(t => { if (!t.ex) return; if (t.p === 'Projet Unreal') t.p = 'Simulateur'; if (t.p === 'Portfolio') { t.p = 'Obby Tycoon'; t.t = 'Ajouter une boutique de skins'; } });
applyPrefs();
$('col-hex').value = '#FF6A3D'; colorUpdate('#FF6A3D');
unitUpdate(); udUpdate(); tweenCode(); xpUpdate(); rbUpdate(); idUpdate(); dropUpdate(); lerpUpdate(); palUpdate(); gradUpdate(); lsUpdate(); asUpdate(); prUpdate();
toolsRender(); snRender(); tkRender(); lrRender(); eqRender(); shopRender(); collRender(); apiUpdate(); showTab();
if (!prefs.seen) welcome();
