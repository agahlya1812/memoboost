-- Script de correction RLS pour Supabase
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier que RLS est activé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('categories', 'cards');

-- 2. Lister les policies existantes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('categories', 'cards');

-- 3. Supprimer toutes les policies existantes (au cas où)
DROP POLICY IF EXISTS "categories_select_own" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;

DROP POLICY IF EXISTS "cards_select_own" ON public.cards;
DROP POLICY IF EXISTS "cards_insert_own" ON public.cards;
DROP POLICY IF EXISTS "cards_update_own" ON public.cards;
DROP POLICY IF EXISTS "cards_delete_own" ON public.cards;

-- 4. Recréer les policies correctement
CREATE POLICY "categories_select_own" ON public.categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "categories_insert_own" ON public.categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_update_own" ON public.categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "categories_delete_own" ON public.categories
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "cards_select_own" ON public.cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cards_insert_own" ON public.cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cards_update_own" ON public.cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cards_delete_own" ON public.cards
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Vérifier que tout est correct
SELECT 'RLS Status:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('categories', 'cards');

SELECT 'Policies:' as info;
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('categories', 'cards');
