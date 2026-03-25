// Utilitaires pour l'import/export de données MemoBoost

/**
 * Exporte les données au format JSON
 */
export const exportToJSON = (cards, categories) => {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    cards: cards.map(card => ({
      id: card.id,
      question: card.question,
      answer: card.answer,
      categoryId: card.categoryId,
      masteryStatus: card.masteryStatus || 'unknown',
      createdAt: card.createdAt,
      updatedAt: card.updatedAt
    })),
    categories: categories.map(category => ({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      color: category.color,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }))
  }
  
  return JSON.stringify(data, null, 2)
}

/**
 * Exporte les cartes au format CSV
 */
export const exportToCSV = (cards, categories) => {
  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]))
  
  const headers = [
    'Question',
    'Réponse', 
    'Dossier',
    'Statut de maîtrise',
    'Date de création',
    'Date de modification'
  ]
  
  const rows = cards.map(card => [
    `"${card.question.replace(/"/g, '""')}"`,
    `"${card.answer.replace(/"/g, '""')}"`,
    `"${categoryMap.get(card.categoryId) || 'Inconnu'}"`,
    card.masteryStatus || 'unknown',
    card.createdAt || '',
    card.updatedAt || ''
  ])
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

/**
 * Importe les données depuis un fichier JSON
 */
export const importFromJSON = (jsonString) => {
  try {
    const data = JSON.parse(jsonString)
    
    if (!data.cards || !Array.isArray(data.cards)) {
      throw new Error('Format JSON invalide : propriété "cards" manquante ou invalide')
    }
    
    if (!data.categories || !Array.isArray(data.categories)) {
      throw new Error('Format JSON invalide : propriété "categories" manquante ou invalide')
    }
    
    return {
      cards: data.cards.map(card => ({
        question: card.question || '',
        answer: card.answer || '',
        categoryId: card.categoryId || '',
        masteryStatus: card.masteryStatus || 'unknown'
      })),
      categories: data.categories.map(category => ({
        name: category.name || '',
        parentId: category.parentId || null,
        color: category.color || 'blue'
      }))
    }
  } catch (error) {
    throw new Error(`Erreur lors de l'import JSON : ${error.message}`)
  }
}

/**
 * Importe les cartes depuis un fichier CSV
 */
export const importFromCSV = (csvString) => {
  try {
    const lines = csvString.trim().split('\n')
    
    if (lines.length < 2) {
      throw new Error('Le fichier CSV doit contenir au moins un en-tête et une ligne de données')
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const expectedHeaders = ['Question', 'Réponse', 'Dossier', 'Statut de maîtrise']
    
    // Vérifier que les en-têtes requis sont présents
    const missingHeaders = expectedHeaders.filter(expected => 
      !headers.some(header => header.toLowerCase().includes(expected.toLowerCase()))
    )
    
    if (missingHeaders.length > 0) {
      throw new Error(`En-têtes manquants dans le CSV : ${missingHeaders.join(', ')}`)
    }
    
    const cards = []
    const categoryNames = new Set()
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue
      
      // Parser la ligne CSV en gérant les guillemets
      const values = parseCSVLine(line)
      
      if (values.length < 3) {
        console.warn(`Ligne ${i + 1} ignorée : pas assez de colonnes`)
        continue
      }
      
      const question = values[0]?.replace(/^"|"$/g, '') || ''
      const answer = values[1]?.replace(/^"|"$/g, '') || ''
      const categoryName = values[2]?.replace(/^"|"$/g, '') || ''
      const masteryStatus = values[3]?.replace(/^"|"$/g, '') || 'unknown'
      
      if (question && answer) {
        cards.push({
          question,
          answer,
          categoryName,
          masteryStatus: ['unknown', 'review', 'known'].includes(masteryStatus) ? masteryStatus : 'unknown'
        })
        
        if (categoryName) {
          categoryNames.add(categoryName)
        }
      }
    }
    
    // Créer les catégories uniques
    const categories = Array.from(categoryNames).map(name => ({
      name,
      parentId: null,
      color: 'blue'
    }))
    
    return { cards, categories }
  } catch (error) {
    throw new Error(`Erreur lors de l'import CSV : ${error.message}`)
  }
}

/**
 * Parse une ligne CSV en gérant les guillemets
 */
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Guillemet échappé
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  values.push(current)
  return values
}

/**
 * Télécharge un fichier
 */
export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Lit un fichier uploadé
 */
export const readUploadedFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      resolve(event.target.result)
    }
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'))
    }
    
    reader.readAsText(file, 'UTF-8')
  })
}
