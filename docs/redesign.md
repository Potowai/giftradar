# Design Spec v1 — GiftRadar

> Sources : impeccable (polish / typeset / colorize / critique), ui-ux-pro-max (palette night-indigo #4338CA / #6366F1 / #7C3AED sur #0F172A ; famille unique Outfit ; style dark-mode-oled).

---

## 1. Direction visuelle

**Radar de nuit.** GiftRadar n'est pas un dashboard SaaS, c'est un instrument de veille. L'identité repose sur un seul élément mémorable : **l'urgence temporelle rendue thermique**. Le compte à rebours n'est pas un texte grisé dans un coin — c'est une pastille colorée qui passe du neutre au chaud au brûlant à mesure que la date limite approche, comme un blip sur un écran radar. Tout le reste est calme, discipliné, presque instrument : fond quasi-noir bleuté, cartes structuralisées par des bordures fines (pas d'ombres portées), typographie unique en trois tailles plates. Pas de look SaaS générique, pas de cartes molles identiques à partout, pas d'eyebrow ALL-CAPS, pas de séparateur « A · B · C » systématique. La hiérarchie naît de la couleur thermique et du poids typographique, pas de chrome décoratif.

---

## 2. Tokens

### 2.1 Palette

| Rôle | Token | Hex | Usage |
|------|-------|-----|-------|
| Fond | `--gr-bg` | `#0B0E1A` | Quasi-noir bleuté, écran radar éteint |
| Surface | `--gr-surface` | `#151B31` | Cartes concours |
| Surface élevée | `--gr-surface-2` | `#1C2340` | Header, onglets bottom |
| Bordure | `--gr-border` | `rgba(255,255,255,0.09)` | Structure visuelle (remplace les ombres) |
| Texte | `--gr-text` | `#F1F4FF` | Blanc légèrement tiède, pas aveuglant |
| Muted | `--gr-muted` | `#9AA3C0` | Méta, secondaire — contraste ~7:1 sur fond, AA |
| Accent | `--gr-accent` | `#7C6CFF` | Indigo-violet, actions primaires |
| Hot | `--gr-hot` | `#FF4D6D` | J-≤3, vigilance — rose vif |
| Warm | `--gr-warm` | `#FFB020` | J-≤7 — ambre |
| Ok | `--gr-ok` | `#34D399` | Monde/livrable, succès — émeraude |

### 2.2 Typographie — Outfit (famille unique)

| Rôle | Taille | Poids | Font-variant | Usage |
|------|--------|-------|--------------|-------|
| Prix / nom lot | 17px | 700 | — | Titre du prix dans le header de carte |
| Titre concours | 15px | 500 | — | Texte descriptif du concours |
| Méta | 13px | 400 | — | Échéance, source, badges secondaires |
| Countdown | 14px | 700 | `tabular-nums` | Pastille thermique (chiffres alignés) |
| Tag / badge | 12px | 600 | — | Plateforme, géo, vigilance |

Fallback obligatoire : `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` (offline-first, pas de blocage font externe).

Google Fonts URL : `https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap`

### 2.3 Espacements, rayons, ombres

| Token | Valeur | Usage |
|-------|--------|-------|
| Gap cartes | 12px | Espacement entre cartes |
| Padding cartes | 14px | Contenu interne card |
| Radius cartes | 18px | Border-radius des Card |
| Radius contrôles | 12px | Boutons, inputs, search bar |
| Radius pastilles | 999px | Countdown, tags, badges |
| Gap badges | 6px | Entre tags plateforme/géo |
| Ombres | **aucune** | La bordure 1px EST la structure — pas d'ombre portée |

---

## 3. Mapping antd-mobile (`--adm-*`)

```css
:root {
  /* Palette custom */
  --gr-bg: #0B0E1A;
  --gr-surface: #151B31;
  --gr-surface-2: #1C2340;
  --gr-border: rgba(255, 255, 255, 0.09);
  --gr-text: #F1F4FF;
  --gr-muted: #9AA3C0;
  --gr-accent: #7C6CFF;
  --gr-hot: #FF4D6D;
  --gr-warm: #FFB020;
  --gr-ok: #34D399;

  /* antd-mobile overrides */
  --adm-color-primary: #7C6CFF;
  --adm-color-success: #34D399;
  --adm-color-danger: #FF4D6D;
  --adm-color-text: #F1F4FF;
  --adm-color-weak: #9AA3C0;
  --adm-color-background: #0B0E1A;
  --adm-color-border: rgba(255, 255, 255, 0.09);
  --adm-font-family: 'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  color-scheme: dark;
}
```

| Composant antd | Surcharge | Détail |
|----------------|-----------|--------|
| Card | fond `--gr-surface`, radius 18, bordure 1px `--gr-border`, pas d'ombre | `.gr-card` |
| Card header | bordure bottom 1px `--gr-border`, padding 12px 14px | `.gr-card .adm-card-header` |
| NavBar | fond `--gr-surface-2`, bordure bottom 1px | `.gr-nav` |
| TabBar | fond `--gr-surface-2`, item actif `--gr-accent` | style inline + CSS |
| Button primary | fond `--adm-color-primary`, radius 12, hauteur min 44px | `.gr-open-btn` |
| Button :active | `transform: scale(0.97)` | micro-feedback tactile |
| Checkbox | icône 22×22px, label 14px, padding 8px vertical | `.gr-check` |
| SearchBar | fond `--gr-surface`, radius 12, via token adm | natif antd |
| Selector (chips) | actif = accent plein, inactif = surface + bordure | natif antd |
| Badge (plateforme) | pastille pleine teintée | `.gr-tag` custom |
| Toast | fond `--gr-surface-2`, texte `--gr-text` | natif antd |
| Empty | texte `--gr-muted`, icône adaptée | natif antd |
| ProgressBar | couleur `--gr-accent`, fine | checklist progress |
| Dialog | fond `--gr-surface`, radius 18, bordure | natif antd |
| Input | fond `--gr-surface-2`, radius 12, texte `--gr-text` | natif antd |

---

## 4. Changements par composant

### 4.1 Header (NavBar)

- **Quoi** : fond `--gr-surface-2`, titre « GiftRadar » en 700, compteur undone dans un Badge coloré, bouton « + AJOUTER » primaire.
- **Pourquoi** : Le header est l'ancre. Fond légèrement plus élevé que les cartes crée une séparation naturelle sans bordure lourde. Le compteur dans le badge crée un pull visuel subtil vers l'action.

### 4.2 Recherche + Filtres

- **Quoi** : SearchBar + bouton « Faits » sur la même ligne (flex, gap 8). Le SearchBar utilise le fond surface natif. Bouton « Faits » : fill outline quand inactif, solid quand actif.
- **Pourquoi** : Recherche et filtre sont liés — même ligne = même hiérarchie. Pas de séparation inutile.

### 4.3 Stale toggle

- **Quoi** : Bouton block outline, mini, sous la recherche. Texte : « Afficher X douteux (à vérifier) ⚠ » ou « Masquer les douteux ».
- **Pourquoi** : Les concours sans deadline sont incertains — le toggle les rend visibles à la demande sans polluer la vue principale.

### 4.4 Filtres géo (Selector)

- **Quoi** : Chips horizontales, gap 8. Actif = fond accent, texte blanc. Inactif = fond transparent, bordure `--gr-border`.
- **Pourquoi** : Le filtrage géo est secondaire mais important — les chips permettent un toggle rapide sans encombrer.

### 4.5 Carte concours (Card)

- **Quoi** : Structure en 4 zones :
  1. **Header** : Nom du prix (17/700) à gauche + pastille thermique à droite.
  2. **Titre** : Texte du concours (15/500).
  3. **Méta** : Échéance countdown + langue + source (13/400, muted).
  4. **Tags** : Plateforme (badge pleine teinte) + Géo (tag coloré) + Vigilance si risk (tag outline warm).
  5. **Checklist** (si étapes) : Checkboxes 22px + ProgressBar fine.
  6. **Action** : Bouton « Ouvrir → » ou « Remettre à faire ↩ ».
- **Pourquoi** : La carte est l'unité fondamentale. La pastille thermique en header droite est le premier élément eye-catching — l'utilisateur scanne l'urgence avant le contenu. Pas de쨰ombre, pas deǐeo eyebrow — la bordure 1px suffit à cadrer.

### 4.6 Pastille thermique (countdown)

- **Quoi** :
  - `≤ 3 jours` → fond `rgba(255,77,109,0.18)`, texte `#FF4D6D` (hot)
  - `≤ 7 jours` → fond `rgba(255,176,32,0.16)`, texte `#FFB020` (warm)
  - `> 7 jours` → fond `rgba(124,108,255,0.16)`, texte `#B9B1FF` (cool)
  - `pas de date` → fond `rgba(255,255,255,0.07)`, texte `--gr-muted`, poids 500
- **Pourquoi** : C'est le cœur visuel de l'app. L'urgence se lit en 200ms sans lire le texte. Les couleurs suivent une logique thermique intuitive (chaud = urgent, froid = calme). Chiffres en `tabular-nums` pour éviter les sauts de layout.

### 4.7 Terminés (onglet Checklist)

- **Quoi** : Carte en `.gr-done-card` (opacité 0.65). Bouton outline « Remettre à faire ↩ » au lieu de « Ouvrir → ».
- **Pourquoi** : L'opacité réduite signale visuellement le statut « fait » sans masquer le contenu. L'utilisateur peut toujours consulter les détails.

### 4.8 Empty state

- **Quoi** : Composant Empty natif antd, texte `--gr-muted`. Message contextuel : « Tire vers le bas pour rescanner » ou « Aucun concours trouvé ».
- **Pourquoi** : L'état vide doit guider l'action, pas afficher un trou.

### 4.9 Onglets (TabBar)

- **Quoi** : Fond `--gr-surface-2`, 4 items (Radar, Checklist, +, Settings). Item actif = couleur accent.
- **Pourquoi** : La TabBar est l'ancrage navigation. Fond identique au header = cohérence des surfaces élevées.

### 4.10 Dialog (ajout manuel)

- **Quoi** : Fond `--gr-surface`, radius 18, bordure `--gr-border`. Input avec fond `--gr-surface-2`. Boutons : « Annuler » outline, « Ajouter » primaire.
- **Pourquoi** : Le dialog reprend la langue visuelle des cartes (même fond, même radius) pour une cohérence perçue.

### 4.11 Toasts

- **Quoi** : Fond `--gr-surface-2`, texte `--gr-text`. Duration 1200-2000ms.
- **Pourquoi** : Les toasts sont éphémères — fond élevé pour se détacher du contenu sans dominer.

### 4.12 Boutons

- **Quoi** : Min-height 44px (cible tactile), border-radius 12, font-weight 600, font-size 15. :active → `scale(0.97)`.
- **Pourquoi** : La cible 44px est une exigence WCAG. Le micro-scale au toucher donne un feedback tangible sans animation lourde.

---

## 5. Motion

### 5.1 Stagger d'entrée (seule orchestration)

```css
@keyframes gr-rise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.gr-enter {
  animation: gr-rise 0.35s ease-out both;
}
```

- **Application** : Les 8 premières cartes visibles reçoivent un `animationDelay` incrémental de 40ms (0ms, 40ms, 80ms… 280ms).
- **Pourquoi** : Un seul moment orchestré — le premier chargement. Pas de micro-animation sur chaque interaction. Le stagger crée un sentiment d'arrivée progressive sans ralentir l'usage.

### 5.2 Micro-interactions liées aux actions

| Action | Feedback | Mécanisme |
|--------|----------|-----------|
| Ouvrir un concours | Scale 0.97 au toucher | CSS `:active { transform: scale(0.97) }` |
| Cocher une étape | Animation native antd checkbox | Natif antd |
| Ajouter un concours | Toast « Ajout en cours… » puis « Ajouté : … » | Toast.show |
| Pull-to-refresh | Spinner natif antd | PullToRefresh |

### 5.3 prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  .gr-enter { animation: none; }
  .gr-open-btn:active { transform: none; }
  * { transition: none !important; }
}
```

Toute animation et transition est coupée. Les toasts restent (informationnel, pas décoratif).

---

## 6. Contraintes

| Contrainte | Statut |
|------------|--------|
| Zéro changement de comportement / API / données | ✓ Spec purement visuelle |
| Textes FR partout | ✓ Copie existante préservée |
| Cibles tactiles ≥ 44px | ✓ Boutons, checkbox (22px icône + label cliquable), chips |
| Contraste AA (≥ 4.5:1 texte, ≥ 3:1 gros texte) | ✓ muted #9AA3C0 ≈ 7:1 sur #0B0E1A ; text #F1F4FF ≈ 15:1 |
| Offline-first, pas de font bloquante | ✓ display=swap + fallback system-ui obligatoire |
| Aucun changement d'API/behaviour | ✓ Spec CSS + markup uniquement |
| Pas de nouveau package | ✓ Tout repose sur antd-mobile existant |

---

## Annexe : décisions structurantes (résumé)

1. **Pastille thermique comme unique élément mémorable** — L'urgence se communique par la couleur, pas par le texte. Hot/warm/cool est un langage visuel primaire qui se lit en 200ms.

2. **Bordure comme structure, pas d'ombre** — Les cartes utilisent une bordure 1px semi-transparente pour exister spatialement. Pas de `box-shadow`. C'est plus léger, plus net, et ça évoque les grille de radar plutôt que les carte de dashboard SaaS.

3. **Famille unique Outfit à 3 tailles** — Pas de display type, pas de serif de contraste, pas de variable font. Un seul outil, 3 niveaux (13/15/17), hiérarchie par le poids (400/500/700). L'app est un instrument, pas une page marketing.
