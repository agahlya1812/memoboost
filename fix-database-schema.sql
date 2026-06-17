-- Correction du schema SQLite : ajout de image_url sur cards

-- 1. Ajouter image_url si elle n'existe pas
--    (ignorer l'erreur "duplicate column" si elle existe déjà)
ALTER TABLE cards ADD COLUMN image_url TEXT;

-- 2. Vérifier le schéma de cards
SELECT name, type, "notnull", dflt_value
FROM pragma_table_info('cards')
ORDER BY cid;
