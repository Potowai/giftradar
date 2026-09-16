# LOG — journal de construction GiftRadar

Format : `[phase] note` — chaque commit pousse une ligne datée.

## 0.1 Scaffold (Phase 0)
- Repo créé, stack posée : Express + Vite + React 18 + antd-mobile + vite-plugin-pwa + vitest.
- API de base : `/api/health`, `/api/feed`, `/api/scrape` (stub).
- Sources initiales : seeds Reddit (données réelles à valider en Phase 1).
- Décisions : pas de lint, la porte de qualité = `typecheck + build + tests` + auto-réflexion niveau agent (règle 5).
- Règle produit : **aucun concours exclu par géographie** — on tente tout, la géo sert seulement à trier/badger.
- Prix : détection large (17*, 18*, autre Apple) — jamais filtrer hors iPhone, uniquement prioritiser.

## 1.0 Scraper réel (Phase 1)
- Sources validées live : 4× Google News RSS (EN 17, EN 18, FR 17, FR 18) + r/giveaways (flaky 429, gardé avec backoff).
- Rejetés : astuce Google Alerts RSS (morte), agregateurs HTML (anti-bot), Reddit seul (rate-limit).
- Smoke run : 160 entrées réelles (2× iphone-18, 133× iphone-17, 25× apple). Heuristiques : 10/10 tests.
- Bug trouvé+corrigé : modelName dupliquait le "1" (1\s*17 au lieu de 17) — variants Pro/Max/Air OK maintenant.
- Points faibles assumés : liens Google News = URLs de redirection (résolvent au clic) ; deadlines souvent null (triées en dernier) ; Reddit 0 entrée ce run (santé trackée, retry au prochain cron) ; quasi-doublons inter-flux possibles (URLs canoniques différentes).
- Règle 5 : 1) compile oui (tsc + build verts, preuves ci-dessus) 2) meilleure solution ? non — GN RSS est le meilleur compromis fiabilité/effort 3) doutes listés ci-dessus, tous acceptés ou corrigés → zéro point bloquant restant.

## 2.0 Ajout manuel + og-fetch (Phase 2)
- POST /api/og : lit og:title/og:image/og:description (cheerio), fallback <title> puis hostname.
- POST /api/entries : crée une entrée kind=manual via normalize (heuristiques réutilisées), override platform/prizeTier possible, persiste manual.json, fusionnée dans GET /api/feed sans doublon.
- Vérifié live : entrée IG test créée (og bloqué par Instagram → fallback hostname, attendu), feed 160+1, puis manual.json réinitialisé.
- Tests og.test.js : 3/3. Total serveur 13/13, web 5/5, build vert.
- Règle 5 : 1) oui (preuves ci-dessus) 2) alternative (formulaire 100% client) rejetée — le serveur seul contourne les murs anti-hotlink 3) point faible : Instagram bloque l'og-fetch sans session → fallback hostname, l'utilisateur complète le titre à la main si besoin → accepté, zéro bloquant.