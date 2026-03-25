# Migration pour le support des images

## Problème
L'erreur `Could not find the 'image_url' column of 'cards' in the schema cache` indique que la colonne `image_url` n'existe pas encore dans la base de données Supabase.

## Solution

### 1. Exécuter le script de migration

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Copiez et exécutez le contenu du fichier `fix-database-schema.sql`

### 2. Vérification

Le script va :
- ✅ Ajouter la colonne `image_url` à la table `cards`
- ✅ Créer le bucket `card-images` pour le stockage
- ✅ Configurer les politiques de sécurité
- ✅ Vérifier que tout est configuré correctement

### 3. Test

Après avoir exécuté le script :
1. Rafraîchissez votre application
2. Essayez d'ajouter une image à une carte
3. L'image devrait maintenant s'uploader et s'afficher correctement

## Fichiers de migration

- `fix-database-schema.sql` - Script complet de migration
- `add-image-column.sql` - Script pour ajouter uniquement la colonne
- `setup-storage.sql` - Script pour configurer le stockage

## En cas de problème

Si l'erreur persiste :
1. Vérifiez que le script s'est exécuté sans erreur
2. Vérifiez que la colonne `image_url` existe dans la table `cards`
3. Vérifiez que le bucket `card-images` existe dans Storage
4. Contactez l'administrateur si nécessaire
