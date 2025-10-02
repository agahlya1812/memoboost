# Déploiement MemoBoost avec PostgreSQL

## Configuration Vercel PostgreSQL

### 1. Créer une base de données PostgreSQL sur Vercel

1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Cliquez sur "Storage" dans le menu de gauche
3. Cliquez sur "Create Database" → "Postgres"
4. Choisissez un nom pour votre base (ex: `memoboost-db`)
5. Sélectionnez une région proche de vous
6. Cliquez sur "Create"

### 2. Récupérer la chaîne de connexion

1. Dans votre base de données, cliquez sur "Settings"
2. Copiez la chaîne de connexion (DATABASE_URL)
3. Elle ressemble à : `postgres://username:password@host:port/database?sslmode=require`

### 3. Configurer les variables d'environnement

1. Dans votre projet Vercel, allez dans "Settings" → "Environment Variables"
2. Ajoutez ces variables :

```
DATABASE_URL=postgres://username:password@host:port/database?sslmode=require
MEMOBOOST_SALT=memoboost-salt
NODE_ENV=production
```

### 4. Déployer l'API

1. Connectez votre repository GitHub à Vercel
2. Configurez le build :
   - **Build Command**: `npm run db:generate && npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. Déployez

### 5. Exécuter les migrations

Après le déploiement, connectez-vous à votre base de données et exécutez :

```sql
-- Créer les tables
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "masteryStatus" TEXT NOT NULL DEFAULT 'unknown',
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

### 6. Configurer le frontend

Mettez à jour `vite.config.js` pour pointer vers votre API Vercel :

```javascript
define: {
  'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
    process.env.NODE_ENV === 'production' 
      ? 'https://votre-api.vercel.app/api' 
      : '/api'
  )
}
```

## Test local avec PostgreSQL

### 1. Installer PostgreSQL localement

```bash
# macOS avec Homebrew
brew install postgresql
brew services start postgresql

# Créer une base de données
createdb memoboost
```

### 2. Configurer l'environnement local

Créez un fichier `.env` :

```
DATABASE_URL="postgresql://username:password@localhost:5432/memoboost?schema=public"
MEMOBOOST_SALT="memoboost-salt"
```

### 3. Exécuter les migrations

```bash
npm run db:migrate
```

### 4. Lancer le serveur avec base de données

```bash
npm run server:db
```

## Avantages de cette configuration

- ✅ **Persistance garantie** : Les données ne disparaissent jamais
- ✅ **Synchronisation multi-appareils** : Vos données sont accessibles partout
- ✅ **Sauvegarde automatique** : Vercel gère les backups
- ✅ **Performance** : Base de données optimisée
- ✅ **Gratuit** : Vercel PostgreSQL a un plan gratuit généreux

## Migration des données existantes

Si vous avez des données dans le fichier JSON, elles seront automatiquement migrées lors du premier démarrage du serveur avec Prisma.
