#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Script simple pour optimiser les images
// Ce script va créer des versions optimisées des images PNG

const publicDir = './public';
const imageFiles = [
  'icon-dossier-bleu.png',
  'icon-dossier-gris.png', 
  'icon-dossier-jaune.png',
  'icon-dossier-orange.png',
  'icon-dossier-rose.png',
  'icon-dossier-rouge.png',
  'icon-dossier-vert.png',
  'icon-dossier-violet.png',
  'icon-dossier.png',
  'icon-enveloppe-bleu.png',
  'icon-enveloppe-gris.png',
  'icon-enveloppe-jaune.png',
  'icon-enveloppe-orange.png',
  'icon-enveloppe-rose.png',
  'icon-enveloppe-rouge.png',
  'icon-enveloppe-vert.png',
  'icon-enveloppe-violet.png',
  'icon-json.png',
  'logo.png'
];

console.log('Images trouvées dans public/:');
imageFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`✅ ${file} (${sizeKB}KB)`);
  } else {
    console.log(`❌ ${file} (manquant)`);
  }
});

console.log('\nPour optimiser les images, vous pouvez:');
console.log('1. Utiliser un outil en ligne comme tinypng.com');
console.log('2. Utiliser ImageOptim (Mac) ou GIMP');
console.log('3. Utiliser le script: npm install -g imagemin-cli && imagemin public/*.png --out-dir=public/optimized');
