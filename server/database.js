import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default prisma

// Fonctions utilitaires pour la migration des données existantes
export async function migrateFromJsonStore(jsonData) {
  try {
    // Migrer les utilisateurs
    for (const user of jsonData.users || []) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          passwordHash: user.passwordHash,
          name: user.name || null
        },
        create: {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          name: user.name || null
        }
      })
    }

    // Migrer les catégories
    for (const category of jsonData.categories || []) {
      await prisma.category.upsert({
        where: { id: category.id },
        update: {
          name: category.name,
          parentId: category.parentId || null,
          color: category.color || 'blue',
          userId: category.userId
        },
        create: {
          id: category.id,
          name: category.name,
          parentId: category.parentId || null,
          color: category.color || 'blue',
          userId: category.userId
        }
      })
    }

    // Migrer les cartes
    for (const card of jsonData.cards || []) {
      await prisma.card.upsert({
        where: { id: card.id },
        update: {
          question: card.question,
          answer: card.answer,
          masteryStatus: card.masteryStatus || 'unknown',
          categoryId: card.categoryId,
          userId: card.userId
        },
        create: {
          id: card.id,
          question: card.question,
          answer: card.answer,
          masteryStatus: card.masteryStatus || 'unknown',
          categoryId: card.categoryId,
          userId: card.userId
        }
      })
    }

    console.log('Migration from JSON store completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}
