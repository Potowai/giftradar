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

## 3.0 Frontend complet (Phase 3)
- store.ts : openedAt/markOpened/unmark (clic Ouvrir = marqué fait), toggleStep n'écrase plus un "ouvert".
- App : onglet Terminés avec "Remettre à faire", PullToRefresh, Toasts, dialogue Ajouter → POST /api/entries + refresh, toggle "Faits".
- store.test.ts : 6/6. Serveur 13/13. Build vert, PWA vérifiée (manifest standalone FR, sw.js + workbox générés).
- Règle 5 : 1) oui (tsc+build+tests ci-dessus) 2) alternative (swipe-undo) reportée — bouton "Remettre à faire" suffit pour v1 3) doute : pas de test sur vrai iPhone (émulateur indisponible ici) → mitigé par build PWA standard + meta viewport ; à valider demain sur le téléphone → point ouvert assumé, seul restant.

## 4.0 Scheduler + docs (Phase 4)
- node-cron 08h00/18h00 (SCRAPE_CRON surchargeable) + re-scan au boot si feed vide ou >6h. Gardé hors tests (GR_NO_LISTEN).
- README complet : install, accès iPhone en LAN, usage quotidien, API, données.
- Règle 5 : 1) à vérifier (build+tests ci-dessous) 2) alternative (cron système) rejetée — node-cron = zéro config, suit le serveur 3) doute : si la machine dort, pas de scan — noté dans README (lane "machine allumée") → accepté, zéro bloquant.

## 5.0 Deploy GitHub Pages (Phase 5, remplace Render)
- Render Blueprint inutilisable → Pages + Actions : PWA statique (base relative), feed.snapshot.json commité, workflow scrape 08h/18h UTC qui commit le snapshot, workflow pages qui build+teste+déploie.
- Front dégrade proprement sans serveur : snapshot embarqué, ajouts manuels 100% locaux.
- Vérifié live : page 200, snapshot 159 entrées, manifest 200, run scrape manuel vert + commit bot + redéploiement auto.
- Règle 5 : 1) oui (build+tests verts avant push, déploiement live vérifié par curl) 2) alternative (Vercel/Netlify serverless) rejetée — refactor inutile pour une app perso 3) doute : snapshot figé entre 2 scans (≤12h de décalage) → assumé, le cron couvre ; zéro bloquant.

## 6.0 Purge des concours finis (16 sept 2026)
- Drop : mots-fin ([terminé], *TERMINÉ*, ended/closed/expired, gagnants annoncés), deadlines passées, sans-date >180j (ex: promos Coupe du Monde de juin), news déguisées (staging/slammed/buys N).
- Dédupe : même tier + même jour + 25 premiers caractères (ex: Tenorshare ×3 → ×1).
- Douteux (60-180j, ex: vieux giveaways MacRumors) : gardés mais masqués par défaut, toggle "Afficher N douteux".
- Résultat : 160 → 20 (3 actionnables par défaut + 17 douteux). Tests 19/19 + 6/6, build vert.
- Règle 5 : 1) oui 2) alternative (seuil stale à 30j) rejetée — constats : 85/97 items GN ont >180j, un seuil bas noie tout 3) limite honnête : sans date de fin explicite on ne peut pas prouver qu'un concours est ouvert — le badge "à vérifier" couvre ce cas ; zéro bloquant.

## 7.0 Annuaires spécialisés (listes par lot)
- 3 annuaires FR intégrés comme sources HTML : Démon du Jeu (recherche par lot, slug = prix+plateforme+deadline), Jeu-Concours.biz (page gagner-iphone.html, 15 fiches récentes, fin absolue/relative par fiche), Concours du Net (cartes high-tech, "Fin le JJ/MM/AAAA"). ToutGagner écarté (rendement nul).
- Slug parsing FR (mois en toutes lettres), deadlines JJ/MM/AAAA, plateformes IG/FB depuis URL, badge "vigilance" (frais de port, surtaxé, Telegram/WhatsApp, coordonnées bancaires).
- Résultat : 20 → 61 entrées (26 IG + 6 FB), ex : iPhone 18 Pro Max IG fin 20 sept, iPhone 18 FB fin 30 oct. Tests 26/26 + 6/6, build vert.
- X/IG en recherche directe : pas d'API publique → reste manuel (hashtags #concoursiphone #giveawayfrance + comptes marques dans README).
- Règle 5 : 1) oui 2) alternative (scraper les pages détail une par une) rejetée — 60+ requêtes, anti-bot probable, le slug donne déjà l'essentiel 3) doute : conditions exactes (like/tag/RT) non extraites — affichées génériquement par plateforme, l'utilisateur les voit en ouvrant le lien ; zéro bloquant.