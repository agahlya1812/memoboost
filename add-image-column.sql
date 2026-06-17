-- Ajouter la colonne image_url à la table cards (SQLite)
-- Si la colonne existe déjà, cette commande retourne une erreur ignorable.

ALTER TABLE cards ADD COLUMN image_url TEXT;

-- Vérifier que la colonne a été ajoutée
SELECT name, type FROM pragma_table_info('cards') WHERE name = 'image_url';
