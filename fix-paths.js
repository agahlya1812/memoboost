#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Script pour vérifier les chemins dans index.html
const distDir = './dist';
const indexPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  console.log('📄 Contenu de index.html:');
  console.log(content);
  
  // Vérifier si les fichiers existent
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    console.log('📁 Fichiers dans assets/:', files);
  }
  
  console.log('✅ Vérification terminée');
} else {
  console.log('❌ index.html non trouvé');
}
