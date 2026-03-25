# Déploiement MemoBoost avec Supabase

## Architecture

- **Frontend** : React + Vite (déployé sur GitHub Pages)
- **Backend** : Supabase (auth + base de données)
- **Hébergement** : GitHub Pages + Supabase Cloud

## Configuration Supabase

### 1. Créer un projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et la clé anon

### 2. Configurer la base de données
Exécuter le script SQL dans Supabase → SQL Editor :

```sql
-- Voir le fichier supabase_schema.sql pour le schéma complet
```

### 3. Variables d'environnement
Pour le développement local, créer `.env.local` :
```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

## Déploiement

### GitHub Pages (automatique)
```bash
npm run deploy
```

### Render (avec variables d'environnement)
1. Connecter le repo GitHub
2. Configurer les variables d'environnement :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Build command : `npm run build`
4. Start command : `npm start`

### Vercel (recommandé pour variables d'environnement)
1. Connecter le repo GitHub
2. Ajouter les variables d'environnement dans les settings
3. Déploiement automatique

## Fonctionnalités

- ✅ Authentification Supabase
- ✅ Stockage des données en base
- ✅ Synchronisation multi-appareils
- ✅ Import/Export des données
- ✅ Interface responsive

## Structure du projet

```
memoboost/
├── src/
│   ├── services/
│   │   ├── api.js          # API avec bascule Supabase/fallback
│   │   └── supabaseClient.js # Client Supabase
│   └── components/         # Composants React
├── supabase_schema.sql    # Schéma de base de données
└── package.json
```

## Support

- Documentation Supabase : https://supabase.com/docs
- GitHub Pages : https://pages.github.com