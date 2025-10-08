// Script de debug Supabase
// À exécuter dans la console du navigateur sur l'app

console.log('🔍 Debug Supabase...')

// Vérifier les variables d'environnement
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Présent' : 'Manquant')

// Test de connexion directe
const supabaseUrl = 'https://eimvhidyuqkkxxznoiog.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbXZoaWR5dXFra3h4em5vaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzQzOTUsImV4cCI6MjA3NTQ1MDM5NX0.MBIRvQ9XI_5phOb1MczoXn7CGVA3e4lwKJl0657lj08'

import { createClient } from '@supabase/supabase-js'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugSupabase() {
  try {
    // 1. Test de connexion
    console.log('1️⃣ Test de connexion...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Utilisateur connecté:', user?.id || 'Aucun')
    if (authError) console.error('Erreur auth:', authError)
    
    // 2. Test des tables sans RLS
    console.log('2️⃣ Test des tables...')
    
    // Test categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    console.log('Categories:', categories?.length || 0, 'éléments')
    if (catError) console.error('Erreur categories:', catError)
    
    // Test cards
    const { data: cards, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .limit(1)
    
    console.log('Cards:', cards?.length || 0, 'éléments')
    if (cardError) console.error('Erreur cards:', cardError)
    
    // 3. Test avec user_id si connecté
    if (user?.id) {
      console.log('3️⃣ Test avec user_id...')
      
      const { data: userCategories, error: userCatError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
      
      console.log('Categories utilisateur:', userCategories?.length || 0)
      if (userCatError) console.error('Erreur categories utilisateur:', userCatError)
    }
    
    // 4. Test d'insertion simple
    console.log('4️⃣ Test d\'insertion...')
    const { data: testCategory, error: insertError } = await supabase
      .from('categories')
      .insert({
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        name: 'Test Category',
        color: 'blue'
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Erreur insertion:', insertError)
    } else {
      console.log('✅ Insertion réussie:', testCategory)
      
      // Nettoyer
      await supabase.from('categories').delete().eq('id', testCategory.id)
      console.log('🧹 Test category supprimée')
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

debugSupabase()
