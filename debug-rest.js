// Script de debug Supabase via API REST
// Copier-coller directement dans la console du navigateur

console.log('🔍 Debug Supabase via API REST...')

const supabaseUrl = 'https://eimvhidyuqkkxxznoiog.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpbXZoaWR5dXFra3h4em5vaW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzQzOTUsImV4cCI6MjA3NTQ1MDM5NX0.MBIRvQ9XI_5phOb1MczoXn7CGVA3e4lwKJl0657lj08'

async function debugSupabaseREST() {
  try {
    console.log('1️⃣ Test de connexion API...')
    
    // Test de base - vérifier que l'API répond
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })
    
    console.log('Status API:', response.status)
    if (!response.ok) {
      console.error('❌ API non accessible:', response.status, response.statusText)
      return
    }
    console.log('✅ API accessible')
    
    console.log('2️⃣ Test des tables...')
    
    // Test categories
    const catResponse = await fetch(`${supabaseUrl}/rest/v1/categories?select=*&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Categories status:', catResponse.status)
    if (catResponse.ok) {
      const catData = await catResponse.json()
      console.log('✅ Categories accessible:', catData.length, 'éléments')
    } else {
      const catError = await catResponse.text()
      console.error('❌ Erreur categories:', catResponse.status, catError)
    }
    
    // Test cards
    const cardResponse = await fetch(`${supabaseUrl}/rest/v1/cards?select=*&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Cards status:', cardResponse.status)
    if (cardResponse.ok) {
      const cardData = await cardResponse.json()
      console.log('✅ Cards accessible:', cardData.length, 'éléments')
    } else {
      const cardError = await cardResponse.text()
      console.error('❌ Erreur cards:', cardResponse.status, cardError)
    }
    
    console.log('3️⃣ Test avec user_id...')
    
    // Test avec un user_id spécifique
    const userId = 'user-0871e438-57ee-459f-9417-ea47f7e8e462'
    
    const userCatResponse = await fetch(`${supabaseUrl}/rest/v1/categories?select=*&user_id=eq.${userId}&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Categories user status:', userCatResponse.status)
    if (userCatResponse.ok) {
      const userCatData = await userCatResponse.json()
      console.log('✅ Categories user accessible:', userCatData.length, 'éléments')
    } else {
      const userCatError = await userCatResponse.text()
      console.error('❌ Erreur categories user:', userCatResponse.status, userCatError)
    }
    
    console.log('4️⃣ Test d\'insertion...')
    
    const testData = {
      user_id: userId,
      name: 'Test Category',
      color: 'blue'
    }
    
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/categories`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testData)
    })
    
    console.log('Insert status:', insertResponse.status)
    if (insertResponse.ok) {
      const insertData = await insertResponse.json()
      console.log('✅ Insertion réussie:', insertData)
      
      // Nettoyer
      if (insertData[0]?.id) {
        await fetch(`${supabaseUrl}/rest/v1/categories?id=eq.${insertData[0].id}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        })
        console.log('🧹 Test category supprimée')
      }
    } else {
      const insertError = await insertResponse.text()
      console.error('❌ Erreur insertion:', insertResponse.status, insertError)
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

debugSupabaseREST()

