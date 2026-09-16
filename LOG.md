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

## 13.0 IG 100% mobile (secret GitHub)
- Utilisateur mobile-only → pas de .env local possible. Solution : cookies collés en secret Actions IG_COOKIES (via Safari iPhone), script scripts/scrape-ig.mjs branché dans le workflow après le snapshot (garde propre sans cookies).
- Watchlist : hashtags concoursiphone/concoursapple/giveawayfrance (+ profils, vide pour l'instant), 6 posts/source, 1.5s d'intervalle, fusion dédupliquée dans le snapshot.
- README : guide extraction cookies via Inspect Browser + ajout du secret, tout mobile.
- Règle 5 : 1) oui (build+32/32+6/6, garde testée live exit 0) 2) alternative (cookies codés en dur) rejetée — secret uniquement 3) validation live complète en attente des cookies utilisateur ; zéro bloquant côté code.

## 12.0 X via readers + IG à cookies
- Readers X : twstalker 403, xcancel 451, nitter mort, syndication morte, xstalk mort. MAIS Google News indexe les posts X → sources gn-x-give (21) + gn-x-concours (5), plateforme détectée via titre (« - x.com », Follow+RT).
- Instagram : plomberie cookies prête (server/instagram.js, POST /api/ig, og.js enrichi, 4 tests). En attente de la chaîne IG_COOKIES de l'utilisateur pour validation live.
- Résultat : 127 entrées (59 site, 34 IG, 8 FB, 26 X). Tests 32/32.
- Règle 5 : 1) oui 2) alternative (session partagée codée en dur) rejetée — .env gitignoré uniquement 3) zéro bloquant.

## 11.0 Fetch direct IG/X : testé, impossible en gratuit
- Instagram sans session : mur de login (titre générique, 0 donnée post). X sans login : redirect auth-wall (302). API X payante (~200$/mois), Graph API IG réservée aux comptes possédés.
- Seule voie technique (cookies de session perso) = fragile + violation ToS + risque de ban du compte servant à participer → refusé.
- Telegram t.me/s/... fonctionne sans auth mais aucun canal concours public trouvé (bonsplans = deals Amazon, 0 IG).
- Couverture retenue : annuaires à relais humain (jcb/ddj/cdn) + ajout manuel + watchlist README.

## 10.0 Concours influenceurs/marques EU-tech
- jcb gagner-iphone = déjà 48 fiches influenceurs/marques (fabiancrfx, yanissa, ugreen, celio…) — cœur de la couverture.
- Ajouté : cdn-instagram + cdn-x (standing, 0 Apple aujourd'hui, se déclencheront seuls).
- Murs constatés : Gleam 403, Kingsumo 405, Sweepwidget JS-only, HotUKDeals 403, X/IG/TikTok = login requis, EchantillonsClub = archives mortes, pages marques ddj (fnac/darty/ldlc/orangé) = 0 Apple en cours (redondant avec recherche par lot de toute façon).
- Résultat : 102 entrées (34 IG + 8 FB). Tests/build verts.
- Règle 5 : 1) oui 2) alternative (scraper IG via proxy) rejetée — ToS + ban, le flux manuel + README couvre 3) zéro bloquant.

## 9.0 Course aux 100 concours
- 36 sources : 14 GN RSS (angles FR/EN, after: pour la fraîcheur, sweepstakes/gift-card), 2 Reddit, 4 annuaires FR (ddj ×5 requêtes, jcb ×5 pages, cdn, tg ×2).
- Élagué : requêtes mortes (carrier deals, bourse-aux-lots, catégories redondantes, doublon ddj-tablette), EchantillonsClub (archives 100% expirées).
- Résultat : 20 → **101 entrées** (15× iPhone 18, 68× iPhone 17, 18× Apple), 54 actionnables par défaut + 47 douteux masqués. Intent +sweepstakes.
- Limite honnête : le pool gratuit trouve ~100 concours Apple non-finis ; au-delà = requêtes redondantes (dédupliquées) ou hors-sujet. Les sources fraîches permanentes (nouveautés jcb, semaine tg) regarniront au fil des jours.
- Règle 5 : 1) oui (27/27+6/6, build vert) 2) alternative (assouplir les filtres) rejetée — gonflerait avec des finis, contraire à la purge demandée 3) zéro bloquant.

## 8.0 Thème clair + skill Taste
- Skill taste (Leonxlnx/taste-skill, 87 Ko) installé et vérifié.
- Refonte 100% claire « brief du matin » : papier #F6F4EE, encre #1C1A16, indigo #4F46E5, J- thermiques adaptés, manifest/theme-color/barre iOS clairs, color-scheme light.
- A11y : 9/9 contrastes AA calculés (5.31 à 15.80). tsc+build+26+6 verts.
- Règle 5 : 1) oui 2) alternative (double thème sombre/clair) rejetée — consigne stricte : clair uniquement 3) zéro bloquant.

## 7.0 Redesign « radar nocturne » (skills)
- Spec docs/redesign.md (impeccable + ui-ux-pro-max : palette night-indigo, Outfit single-family, motion unique).
- J- thermique (hot ≤3j / warm ≤7j), tokens --gr-*, thème antd via --adm-*, stagger d'entrée, reduced-motion respecté.
- A11y (accesslint) : 4 contrastes corrigés par calcul (primaire #6A5CFF 4.58, badges → pastilles teintées 6.7-12.2), cibles 44px, focus-visible, aria-labels, couleur jamais seule.
- Agent design délégué mais vide → repris en direct (règle d'orchestration).
- Règle 5 : 1) oui (tsc+build+26+6 verts) 2) alternative (migration shadcn) rejetée — stack antd verrouillée, skills shadcn dispo pour plus tard 3) zéro bloquant.

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