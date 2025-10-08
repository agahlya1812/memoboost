// Script de debug Supabase pour la console du navigateur
// Copier-coller directement dans la console

console.log('🔍 Debug Supabase...')

// Configuration Supabase
const supabaseUrl = 'https://eimvhidyuqkkxxznoiog.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbXZoaWR5dXFra3h4em5vaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzQzOTUsImV4cCI6MjA3NTQ1MDM5NX0.MBIRvQ9XI_5phOb1MczoXn7CGVA3e4lwKJl0657lj08'

// Créer le client Supabase
const { createClient } = window.supabase || {}
if (!createClient) {
  console.error('❌ Supabase client non trouvé. Vérifiez que l\'app est chargée.')
  console.log('💡 Essayez de recharger la page et de réessayer.')
} else {
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  async function debugSupabase() {
    try {
      console.log('1️⃣ Test de connexion...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('Utilisateur connecté:', user?.id || 'Aucun')
      if (authError) console.error('Erreur auth:', authError)
      
      console.log('2️⃣ Test des tables...')
      
      // Test categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .limit(1)
      
      console.log('Categories:', categories?.length || 0, 'éléments')
      if (catError) {
        console.error('❌ Erreur categories:', catError)
        console.log('💡 Vérifiez que les tables existent et que RLS est configuré')
      } else {
        console.log('✅ Table categories accessible')
      }
      
      // Test cards
      const { data: cards, error: cardError } = await supabase
        .from('cards')
        .select('*')
        .limit(1)
      
      console.log('Cards:', cards?.length || 0, 'éléments')
      if (cardError) {
        console.error('❌ Erreur cards:', cardError)
        console.log('💡 Vérifiez que les tables existent et que RLS est configuré')
      } else {
        console.log('✅ Table cards accessible')
      }
      
      // Test avec user_id si connecté
      if (user?.id) {
        console.log('3️⃣ Test avec user_id...')
        
        const { data: userCategories, error: userCatError } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .limit(1)
        
        console.log('Categories utilisateur:', userCategories?.length || 0)
        if (userCatError) {
          console.error('❌ Erreur categories utilisateur:', userCatError)
          console.log('💡 Problème probable: RLS policies ou user_id incorrect')
        } else {
          console.log('✅ Categories utilisateur accessibles')
        }
      } else {
        console.log('⚠️ Aucun utilisateur connecté - testez la connexion d\'abord')
      }
      
    } catch (error) {
      console.error('❌ Erreur générale:', error)
    }
  }
  
  debugSupabase()
}
