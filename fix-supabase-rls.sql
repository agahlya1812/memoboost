-- Vérification du schéma SQLite
-- (SQLite n'a pas de RLS ni de policies — la sécurité est gérée côté application)

-- 1. Lister toutes les tables
SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;

-- 2. Vérifier le schéma de categories
SELECT name, type, "notnull", dflt_value
FROM pragma_table_info('categories')
ORDER BY cid;

-- 3. Vérifier le schéma de cards
SELECT name, type, "notnull", dflt_value
FROM pragma_table_info('cards')
ORDER BY cid;

-- 4. Lister les index existants
SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' ORDER BY tbl_name, name;

-- 5. Lister les triggers existants
SELECT name, tbl_name FROM sqlite_master WHERE type = 'trigger' ORDER BY tbl_name, name;
