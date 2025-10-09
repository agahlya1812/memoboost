import { jsPDF } from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

export function exportEnvelopeToPdf(folder, cards) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  const maxWidth = pageWidth - margin * 2
  let y = margin

  const title = `Fiche de révision – ${folder.name}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, margin, y)
  y += 24

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  const addMultiLine = (label, text) => {
    if (y > doc.internal.pageSize.getHeight() - margin - 60) {
      doc.addPage()
      y = margin
    }
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, y)
    y += 16
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(text || '', maxWidth)
    doc.text(lines, margin, y)
    y += lines.length * 14 + 16
  }

  cards.forEach((card, index) => {
    addMultiLine(`Q${index + 1}. ${card.categoryName || ''}`.trim(), card.question || '')
    addMultiLine('Réponse', card.answer || '')
    // séparateur
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 18
  })

  const filename = `fiche-${folder.name.replace(/[^a-z0-9-_]+/gi, '_')}.pdf`
  doc.save(filename)
}

// Parse un PDF importé et retourne un tableau de pages (texte brut)
export async function importPdfToText(file) {
  // Vite: importer l'URL du worker via ?url
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map(item => item.str).join(' ')
    pages.push(strings)
  }
  return pages
}


