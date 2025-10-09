// Script de vérification Supabase
// À exécuter dans la console du navigateur sur l'app

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eimvhidyuqkkxxznoiog.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbXZoaWR5dXFra3h4em5vaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzQzOTUsImV4cCI6MjA3NTQ1MDM5NX0.MBIRvQ9XI_5phOb1MczoXn7CGVA3e4lwKJl0657lj08'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  console.log('🔍 Vérification des tables Supabase...')
  
  try {
    // Test de connexion
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('👤 Utilisateur:', user?.id || 'Non connecté')
    
    if (authError) {
      console.error('❌ Erreur auth:', authError)
      return
    }
    
    // Test des tables
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
    
    if (catError) {
      console.error('❌ Erreur table categories:', catError)
    } else {
      console.log('✅ Table categories OK')
    }
    
    const { data: cards, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .limit(1)
    
    if (cardError) {
      console.error('❌ Erreur table cards:', cardError)
    } else {
      console.log('✅ Table cards OK')
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Exécuter la vérification
checkTables()

