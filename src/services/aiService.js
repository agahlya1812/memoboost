import { isSupabaseEnabled, supabase } from './supabaseClient'

// Configuration de l'API IA (OpenAI, Claude ou DeepSeek)
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY || ''
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.deepseek.com/v1'
const AI_MODEL = import.meta.env.VITE_AI_MODEL || 'deepseek-chat'

/**
 * Extrait le texte d'un PDF
 */
export async function extractTextFromPDF(file) {
  try {
    // Utiliser pdf.js pour extraire le texte
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await import('pdfjs-dist')
    
    // Configuration du worker
    pdf.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.js'
    
    const loadingTask = pdf.getDocument(arrayBuffer)
    const pdfDocument = await loadingTask.promise
    
    let fullText = ''
    
    // Extraire le texte de toutes les pages
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n\n'
    }
    
    return fullText.trim()
  } catch (error) {
    console.error('Erreur lors de l\'extraction du texte PDF:', error)
    throw new Error('Impossible d\'extraire le texte du PDF')
  }
}

/**
 * Génère des cartes de révision à partir du texte avec l'IA
 */
export async function generateCardsWithAI(text, options = {}) {
  if (!AI_API_KEY) {
    throw new Error('Clé API IA non configurée')
  }

  const {
    numberOfCards = 10,
    difficulty = 'intermediate',
    subject = 'général'
  } = options

  const prompt = `
Tu es un expert en pédagogie et en création de cartes de révision. 
Analyse le texte suivant et génère ${numberOfCards} cartes de révision de qualité.

TEXTE À ANALYSER:
${text}

INSTRUCTIONS:
1. Crée des questions claires et précises en français
2. Fournis des réponses complètes mais concises
3. Varie les types de questions (définition, application, analyse, etc.)
4. Adapte le niveau de difficulté: ${difficulty}
5. Assure-toi que les questions sont pertinentes au contenu
6. Utilise un langage accessible et pédagogique

FORMAT DE RÉPONSE (JSON uniquement, pas de texte avant ou après):
{
  "cards": [
    {
      "question": "Question claire et précise",
      "answer": "Réponse complète et structurée"
    }
  ]
}

Génère exactement ${numberOfCards} cartes de révision de qualité. Réponds uniquement en JSON valide.
`

  try {
    const response = await fetch(`${AI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en création de cartes de révision. Réponds uniquement en JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      throw new Error(`Erreur API IA: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content
    
    // Parser la réponse JSON
    try {
      const parsed = JSON.parse(content)
      return parsed.cards || []
    } catch (parseError) {
      console.error('Erreur de parsing JSON:', parseError)
      console.log('Réponse IA:', content)
      throw new Error('Réponse IA invalide')
    }
  } catch (error) {
    console.error('Erreur lors de la génération IA:', error)
    throw new Error('Erreur lors de la génération des cartes')
  }
}

/**
 * Sauvegarde les cartes générées en base de données
 */
export async function saveGeneratedCards(cards, categoryId) {
  if (!isSupabaseEnabled) {
    throw new Error('Sauvegarde non disponible en mode local')
  }

  const session = await supabase.auth.getSession()
  const userId = session?.data?.session?.user?.id
  if (!userId) throw new Error('Non authentifié')

  try {
    const savedCards = []
    
    for (const card of cards) {
      const { data, error } = await supabase
        .from('cards')
        .insert({
          user_id: userId,
          question: card.question,
          answer: card.answer,
          category_id: categoryId,
          mastery_status: 'unknown'
        })
        .select('*')
        .single()

      if (error) {
        console.error('Erreur lors de la sauvegarde de la carte:', error)
        continue
      }

      savedCards.push({
        id: data.id,
        question: data.question,
        answer: data.answer,
        categoryId: data.category_id,
        masteryStatus: data.mastery_status || 'unknown',
        imageUrl: data.image_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      })
    }

    return savedCards
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des cartes:', error)
    throw new Error('Erreur lors de la sauvegarde des cartes')
  }
}

/**
 * Traite un PDF complet et génère des cartes
 */
export async function processPDFAndGenerateCards(file, categoryId, options = {}) {
  try {
    // 1. Extraire le texte du PDF
    console.log('Extraction du texte PDF...')
    const text = await extractTextFromPDF(file)
    
    if (!text || text.length < 100) {
      throw new Error('Le PDF ne contient pas assez de texte pour générer des cartes')
    }

    // 2. Générer les cartes avec l'IA
    console.log('Génération des cartes avec l\'IA...')
    const cards = await generateCardsWithAI(text, options)
    
    if (!cards || cards.length === 0) {
      throw new Error('Aucune carte générée par l\'IA')
    }

    // 3. Sauvegarder en base de données
    console.log('Sauvegarde des cartes...')
    const savedCards = await saveGeneratedCards(cards, categoryId)
    
    return {
      success: true,
      cardsGenerated: cards.length,
      cardsSaved: savedCards.length,
      cards: savedCards
    }
  } catch (error) {
    console.error('Erreur lors du traitement PDF:', error)
    throw error
  }
}
