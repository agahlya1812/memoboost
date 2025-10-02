# MemoBoost API - Render Deployment

## Configuration Render

### Variables d'environnement requises :
```
DATABASE_URL=postgres://username:password@host:port/database?sslmode=require
MEMOBOOST_SALT=memoboost-salt
NODE_ENV=production
```

### Build Command :
```
npm install && npx prisma generate
```

### Start Command :
```
npm start
```

### Port :
Render utilise automatiquement le port via `process.env.PORT`
