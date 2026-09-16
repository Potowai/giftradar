# GiftRadar

Radar mobile-first de concours pour gagner un **iPhone 18 / 17 (Pro/Max/Air)** et autres lots Apple. Le serveur scanne 5 sources RSS 2×/jour, l'app liste tout, **un clic sur Ouvrir = marqué comme fait**, progression gardée dans le téléphone.

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

- Config sources : `server/data/sources.json` (versionné).
- Générés au runtime (gitignorés) : `feed.json`, `manual.json`, `health.json`, `meta.json`.

Journal de construction : `LOG.md`.