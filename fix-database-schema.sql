-- Script complet pour résoudre l'erreur "Could not find the 'image_url' column"
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter la colonne image_url à la table cards
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cards' 
        AND column_name = 'image_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.cards ADD COLUMN image_url text null;
        RAISE NOTICE 'Colonne image_url ajoutée à la table cards';
    ELSE
        RAISE NOTICE 'Colonne image_url existe déjà';
    END IF;
END $$;

-- 2. Créer le bucket pour les images des cartes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-images',
  'card-images',
  true,
  5242880, -- 5MB en bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Supprimer les anciennes politiques s'elles existent
DROP POLICY IF EXISTS "Users can upload their own card images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own card images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own card images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own card images" ON storage.objects;

-- 4. Créer les politiques de sécurité pour le stockage
CREATE POLICY "Users can upload their own card images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'card-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own card images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'card-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own card images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'card-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own card images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'card-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Vérifier que tout est configuré correctement
SELECT 
  'Schema check' as check_type,
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cards' 
AND table_schema = 'public'
AND column_name = 'image_url';

SELECT 
  'Storage check' as check_type,
  id, 
  name, 
  public, 
  file_size_limit
FROM storage.buckets 
WHERE id = 'card-images';
