# Redesign GiftRadar v2 — spec

Sources : impeccable (polish/typeset/colorize), ui-ux-pro-max (palette night-indigo #4338CA/#6366F1/#7C3AED sur #0F172A ; single-family Outfit ; style dark-mode-oled).

## Direction : « radar nocturne »

Un seul élément mémorable : **l'urgence temporelle**. Le compte à rebours J- devient le langage visuel (pastille thermique : ≤3j rose chaud, ≤7j ambre, sinon neutre). Tout le reste est calme et discipliné. Pas de look SaaS : pas de cartes identiques molles, pas d'eyebrow caps, pas de méta « A · B · C ».

## Tokens

- --gr-bg: #0B0E1A (fond, quasi-noir bleuté)
- --gr-surface: #151B31 (cartes)
- --gr-surface-2: #1C2340 (surfaces élevées : header, onglets)
- --gr-border: rgba(255,255,255,.09)
- --gr-text: #F1F4FF
- --gr-muted: #9AA3C0 (contraste ~7:1 sur fond → AA)
- --gr-accent: #7C6CFF (indigo-violet)
- --gr-hot: #FF4D6D (J-≤3, vigilance)
- --gr-warm: #FFB020 (J-≤7)
- --gr-ok: #34D399 (monde/livrable, succès)
- Rayons : cartes 18px, contrôles 12px, pastilles 999px.
- Type : Outfit (Google Fonts, display=swap) + fallback system-ui ; rôles : prix 17px/700, titre 15px/500, méta 13px/400 muted, chiffres J- tabulaires (font-variant-numeric).

## Mapping antd-mobile (--adm-*)

- --adm-color-primary: #7C6CFF ; --adm-color-success: #34D399 ; --adm-color-danger: #FF4D6D ; --adm-color-text: #F1F4FF ; --adm-color-weak: #9AA3C0 ; --adm-color-background: #0B0E1A ; --adm-border-color: rgba(255,255,255,.09) ; --adm-font-family: Outfit, system stack.
- Card : fond surface, radius 18, bordure 1px, pas d'ombre portée (bordure = structure).
- NavBar : surface-2 + titre prix 700.
- TabBar : surface-2, item actif accent.
- Badge plateforme : pastille pleine teintée ; géo : texte seul coloré (monde=ok, fr=accent, nantes=hot?) ; vigilance : hot outline.
- Checkbox : 22px, accent quand cochée.
- Bouton Ouvrir : primaire plein, hauteur 44px, radius 12, press-scale .97.
- Countdown : pastille 999px, fond teinté selon urgence, chiffres tabulaires.

## Par composant

- Header : NavBar surface-2, titre « GiftRadar » 700 + compteur ; bouton + AJOUTER primaire.
- Recherche + toggles : SearchBar surface, radius 12 ; toggles Faits/Douteux en segmented discret.
- Filtres géo : Selector chips, actif = accent plein, inactif = surface bordure.
- Carte : header = nom du lot (prix 700) + pastille J- thermique à droite ; badges plateforme/géo/vigilance en ligne ; titre 500 ; checklist avec ProgressBar fine ; bouton Ouvrir 44px.
- Terminés : carte atténuée (opacité .65), bouton outline « Remettre à faire ».
- Empty : message d'action (« Tire vers le bas pour rescanner »).
- Toasts : fond surface-2, texte clair.

## Motion (une seule orchestration + réponses aux actions)

- Premier chargement : stagger fade-up des cartes (CSS animation, 40ms de décalage, max 8 cartes).
- Press .97 sur boutons, check animé natif antd.
- Pull-to-refresh natif.
- `@media (prefers-reduced-motion: reduce)` : tout coupé.

## A11y (accesslint)

- Contraste AA partout (muted #9AA3C0 vérifié ~7:1).
- Cibles ≥44px (boutons, checkbox 22px + label cliquable, chips).
- Focus-visible : outline accent 2px.
- aria-labels : boutons icônes, pastille J- (texte lisible, pas que couleur : « J-3 » écrit en toutes lettres dans le DOM).
- Couleur jamais seule porteuse d'info (J- chiffré, badges textuels).
