# GiftRadar

Radar mobile-first de concours pour gagner un **iPhone 18 / 17 (Pro/Max/Air)** et autres lots Apple. **En ligne : https://potowai.github.io/giftradar/** (PWA installable, feed rescanné 2×/jour par GitHub Actions). **Un clic sur Ouvrir = marqué comme fait**, progression gardée dans le téléphone.

## Version hébergée (recommandée)

Rien à installer : ouvre https://potowai.github.io/giftradar/ sur iPhone → Partager → « Sur l'écran d'accueil ». Le feed est un snapshot rescanné à 08h/18h UTC ; tes coches restent dans `localStorage`. Le bouton + enregistre le lien en local (le serveur d'enrichissement tourne en version locale, voir ci-dessous).

Règle produit : aucun concours exclu par géographie — on tente tout, la zone sert à trier (Nantes → France → Europe → Monde).

## Démarrage (machine)

```bash
npm install
npm run dev        # API :4000 + web :5173 (proxy /api)
npm start          # prod : serveur :4000 + dist/ statique
npm run build      # typecheck + build PWA
npm test           # node:test (serveur) + vitest (web)
```

Le scan tourne seul : cron `0 8,18 * * *` (modifiable via `SCRAPE_CRON`) + re-scan au boot si le feed a >6h.

## Sur iPhone (même Wi-Fi)

1. Lancer `npm run dev` (ou `npm start` + `npm run build` avant).
2. Trouver l'IP locale : `hostname -I`.
3. Safari → `http://<IP>:5173` (dev) ou `http://<IP>:4000` (prod).
4. Partager → **« Sur l'écran d'accueil »** → l'app est installée (offline via service worker).

## Usage quotidien

- **À faire** : cartes triées par deadline, badges prix/plateforme/zone, checklist d'étapes, bouton **Ouvrir →** (marque fait + Toast).
- **Terminés** : tout ce qui est fait, bouton **Remettre à faire ↩** si erreur.
- **+ AJOUTER** : colle un lien (post Instagram, article…) → le serveur récupère titre/image et crée la carte.
- **Faits** : masque/affiche les terminés. Recherche + filtre zone (Tous/Nantes/France/Europe/Monde). Tire vers le bas pour rafraîchir.
- Tes coches vivent dans `localStorage` (`gr:v1`) — rien ne part sur un serveur.

## API

- `GET /api/feed` → `{ feed, sources, scraped_at }` (manuels fusionnés, sans doublon)
- `GET /api/health` → `{ ok, scraped_at, entries }`
- `POST /api/scrape` → relance un scan
- `POST /api/og {url}` → `{ title, image?, description? }`
- `POST /api/entries {url, platform?, title?, prizeTier?}` → crée une entrée manuelle

## Données

- Config sources : `server/data/sources.json` (versionné) — Google News RSS (EN/FR, 17/18), r/giveaways, Démon du Jeu, Jeu-Concours.biz, Concours du Net.
- Générés au runtime (gitignorés) : `feed.json`, `manual.json`, `health.json`, `meta.json`.

## Veille manuelle (X / Instagram, non scrapables sans compte)

- X : `("iPhone 17 Pro" OR "iPhone 18") (concours OR giveaway) (RT OR tirage) -is:retweet`, onglet Récents. Les posts X sont aussi relayés auto via Google News (`gn-x-give`, `gn-x-concours`).
- Instagram : hashtags #concoursiphone #concoursapple #giveawayfrance + comptes marques (Fnac, Darty, LDLC, opérateurs).
- Tout lien trouvé → bouton + dans l'app.
- Alertes : jamais de frais de port / numéro surtaxé / lien Telegram-WhatsApp / coordonnées bancaires (badge « vigilance » si détecté).

## Instagram avec tes cookies (optionnel, version locale uniquement)

Le fetch direct IG exige une session (mur de login prouvé sans). Pour l'activer :
1. Sur ordinateur, ouvre instagram.com connecté → F12 → Application → Cookies → instagram.com.
2. Copie les valeurs `sessionid`, `csrftoken`, `ds_user_id`, `mid` au format `nom=valeur; nom=valeur`.
3. Mets-les dans `.env` : `IG_COOKIES="sessionid=...; csrftoken=...; ds_user_id=...; mid=..."` (jamais commité).
4. `POST /api/ig {"type":"profile"|"hashtag","query":"...","limit":8}` → entrées normalisées (lecture seule, 1 requête/1.5s).
5. Le bouton + accepte ensuite les liens instagram.com avec titre auto (mêmes cookies).
Avertissement : usage perso, lecture seule, fréquence basse — un abus peut faire flagger le compte.

Journal de construction : `LOG.md`.