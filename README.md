# GiftRadar

Radar mobile-first de concours pour gagner un **iPhone 17 / 18 (Pro/Max/Air)** et autres gros lots Apple. Frappe large : un concours hors France ? On tente quand même. Tracking "clic = fait" en local, interface mobile uniquement.

## Stack

- Serveur Node (Express) : scrap + API sur `:4000`
- Web : Vite + React + antd-mobile, PWA offline
- Stockage runtime : `server/data/` (feed.json, manual.json, health.json) — gitignorés
- Ta persistance : `localStorage` du téléphone (clé `gr:v1`)

## Démarrage

```bash
npm install
npm run dev        # API :4000 + web :5173
npm run build      # typecheck + build PWA dans dist/
npm start          # serveur + dist statique sur :4000
npm test           # node:test (server) + vitest (web)
npm run typecheck
```

Depuis un iPhone : sur le même Wi-Fi, ouvrir `http://<IP-de-cette-machine>:5173`, puis « Ajouter à l'écran d'accueil ».

## Contenu des sources

Config des sources dans `server/data/sources.json`. Les fichiers `feed.json` / `manual.json` / `health.json` sont générés (non versionnés).

Detail : voir `LOG.md` (journal de construction) et la doc dans le code.