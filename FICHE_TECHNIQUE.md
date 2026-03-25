# Fiche Technique - MemoBoost

## 1. Presentation

**Nom du projet** : MemoBoost

**Type** : application web SPA de creation, d'organisation et de revision de flashcards.

**Objectif** : permettre a un utilisateur authentifie de structurer ses contenus de revision par dossiers et enveloppes, de reviser ses cartes, puis d'importer ou d'exporter ses donnees.

## 2. Perimetre du depot

Ce depot contient principalement :

- le frontend React/Vite ;
- la couche d'acces aux donnees ;
- les scripts SQL de creation et de correction Supabase ;
- les assets statiques ;
- la configuration de build et de deploiement.

Le backend HTTP de fallback mentionne par l'application (`/api`, `https://memoboost-api.onrender.com/api`) n'est pas versionne dans ce depot.

## 3. Stack technique

| Domaine | Technologie |
| --- | --- |
| Frontend | React 18 |
| Build tool | Vite 7 |
| Routing | `react-router-dom` avec `HashRouter` |
| Style | CSS natif (`src/index.css`, `src/App.css`) |
| BDD / Auth / Storage | Supabase |
| Export PDF | `jspdf` |
| Lecture PDF | `pdfjs-dist` |
| Qualite | ESLint 9 |
| Deploiement | GitHub Pages, Vercel ou Render selon configuration |

## 4. Prerequis d'execution

- Node.js `>= 20.19.0`
- npm
- Variables d'environnement Supabase pour un usage sans valeurs par defaut

Scripts disponibles :

- `npm run dev` : serveur de developpement Vite
- `npm run build` : build de production
- `npm run lint` : verification ESLint
- `npm run preview` : previsualisation locale du build
- `npm run deploy` : publication manuelle de `dist` via `gh-pages`
- `npm run start` / `npm run server` : preview sur port fourni par `$PORT`

## 5. Architecture applicative

### 5.1 Vue d'ensemble

L'application est une SPA monolithique cote client :

- point d'entree : `src/main.jsx`
- composant racine : `src/App.jsx`
- navigation basee sur l'URL via `HashRouter`
- etat principal centralise dans `App`
- composants enfants pour l'affichage, l'edition, l'import/export et la revision

### 5.2 Flux de donnees

1. L'utilisateur s'authentifie.
2. La session est memorisee dans `localStorage` sous la cle `memoboost-user`.
3. L'application charge l'etat complet via `fetchState()`.
4. Les categories et cartes sont conservees dans l'etat React du composant `App`.
5. Les operations CRUD appellent soit :
   - Supabase directement ;
   - soit un backend HTTP externe de fallback.

### 5.3 Routage

Le projet utilise `HashRouter`, ce qui rend l'application compatible avec un hebergement statique type GitHub Pages.

Les dossiers sont exposes dans l'URL au moyen d'un slug genere depuis leur nom.

## 6. Fonctionnalites principales

### 6.1 Authentification

- inscription
- connexion
- persistance de session locale
- deconnexion

### 6.2 Organisation des contenus

- dossiers racine
- enveloppes imbriquees sous un dossier
- cartes rattachees a une enveloppe
- couleurs pastel associees aux dossiers / enveloppes

### 6.3 Gestion des cartes

- creation
- modification
- suppression
- ajout d'image
- statut de maitrise :
  - `unknown`
  - `review`
  - `known`

### 6.4 Revision

- session de revision sur une enveloppe
- ordre melange
- revelation de la reponse
- evaluation "Je sais" / "A revoir"
- recapitulatif de fin de session

### 6.5 Import / Export

- export JSON
- export CSV
- import JSON
- import CSV
- export PDF d'une enveloppe
- import/lecture d'un PDF de revision

## 7. Structure technique

### 7.1 Arborescence utile

```text
memoboost/
├── src/
│   ├── components/              # UI React
│   ├── constants/               # Palette et constantes UI
│   ├── services/                # API, Supabase
│   ├── utils/                   # Slug, PDF, import/export
│   ├── App.jsx                  # Orchestration principale
│   ├── App.css                  # Styles principaux
│   ├── index.css                # Styles globaux
│   └── main.jsx                 # Point d'entree
├── public/                      # Assets statiques
├── .github/workflows/deploy.yml # CI/CD GitHub Pages
├── supabase_schema.sql          # Schema principal
├── fix-database-schema.sql      # Migration images + storage
├── setup-storage.sql            # Setup bucket images
├── DEPLOYMENT.md                # Notes de deploiement
└── package.json                 # Scripts et dependances
```

### 7.2 Composants majeurs

- `src/App.jsx` : authentification, chargement des donnees, navigation, CRUD, revision, import/export.
- `src/components/FolderGrid.jsx` / `FolderCard.jsx` : affichage des dossiers et enveloppes.
- `src/components/FlashcardEnvelope.jsx` : vue enveloppe, filtres, PDF, ajout de cartes.
- `src/components/Flashcard.jsx` : carte unitaire, flip, evaluation, image, actions.
- `src/components/ItemPanel.jsx` : panneau d'ajout / modification.
- `src/components/RevisionModal.jsx` : modal de revision.
- `src/components/ImportExportModal.jsx` : import/export JSON/CSV.

### 7.3 Services et utilitaires

- `src/services/supabaseClient.js` : instanciation Supabase.
- `src/services/api.js` : couche d'acces unifiee CRUD/auth/storage.
- `src/utils/importExport.js` : logique JSON/CSV.
- `src/utils/pdf.js` : export PDF et lecture PDF.
- `src/utils/slug.js` : generation de slugs SEO/URL.

## 8. Configuration

### 8.1 Variables d'environnement

Variables attendues :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

La base API applicative est injectee dans `vite.config.js` :

- developpement : `/api` avec proxy vers `http://localhost:4000`
- production : `https://memoboost-api.onrender.com/api`

### 8.2 Configuration Vite

Points notables :

- `base` adapte selon l'environnement :
  - `/` sur Vercel
  - `/memoboost/` en production standard
- sortie de build : `dist/`
- assets : `dist/assets/`

## 9. Modele de donnees

### 9.1 Table `categories`

- `id` : UUID
- `user_id` : UUID du proprietaire
- `name` : nom du dossier / enveloppe
- `parent_id` : auto-reference vers `categories.id`
- `color` : couleur logique
- `created_at`
- `updated_at`

### 9.2 Table `cards`

- `id` : UUID
- `user_id` : UUID du proprietaire
- `category_id` : reference vers `categories.id`
- `question`
- `answer`
- `mastery_status`
- `image_url`
- `created_at`
- `updated_at`

### 9.3 Regles d'acces

Le schema principal active la RLS sur `categories` et `cards` avec des policies par utilisateur (`auth.uid() = user_id`).

### 9.4 Storage Supabase

Buckets identifies dans le code / scripts :

- `card-images` : images rattachees aux cartes
- `revisions` : PDF de revision par enveloppe

## 10. Deploiement

### 10.1 GitHub Pages

Pipeline GitHub Actions :

- declenchement sur `push` vers `main`
- installation via `npm ci`
- build via `npm run build`
- publication de `dist` via GitHub Pages

### 10.2 Hebergements alternatifs documentes

- Vercel
- Render

## 11. Securite et persistance

- session utilisateur stockee en local via `window.localStorage`
- session Supabase persistante cote navigateur
- separation des donnees par utilisateur via RLS
- upload image limite a 5 Mo et controle du type MIME cote client

## 12. Observations techniques

### 12.1 Points solides

- architecture front claire et compacte
- compatibilite hebergement statique grace a `HashRouter`
- mode de stockage principal coherent via Supabase
- scripts SQL fournis pour schema, RLS et stockage d'images

### 12.2 Points d'attention

- aucun test automatise n'est present dans le depot ;
- le fallback backend HTTP est consomme par le frontend mais absent de ce repository ;
- des `console.log` de debug sont encore presents dans `src/services/api.js` et certains composants ;
- `vite.config.js` embarque des valeurs Supabase par defaut, ce qui merite une revue de securite et de gouvernance de configuration ;
- le bucket `revisions` est utilise dans `src/components/FlashcardEnvelope.jsx`, mais aucun script SQL dedie a sa creation n'a ete identifie dans le depot ;
- des fichiers `App.jsx` et `App.css` existent aussi a la racine, alors que l'application charge `src/App.jsx` et `src/App.css` ;
- le depot contient deja un dossier `dist`, ce qui peut indiquer des artefacts de build versionnes.

## 13. Recommandations

- ajouter une section "environnements" avec valeurs attendues par cible de deploiement ;
- creer un script de provisionnement complet pour le bucket `revisions` ;
- retirer les logs de debug avant mise en production ;
- ajouter des tests minimums sur les utilitaires et les flux critiques ;
- clarifier si les fichiers racine `App.jsx` / `App.css` sont legacy ou encore utiles.

## 14. Resume

MemoBoost est un frontend React/Vite de revision par flashcards, organise autour d'un modele `dossiers -> enveloppes -> cartes`, avec authentification et stockage Supabase. Le depot est exploitable pour le frontend et la base Supabase, mais il reste des points de cadrage a fiabiliser autour du fallback backend, du stockage PDF et de la gouvernance de configuration.
