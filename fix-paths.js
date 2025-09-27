#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Script pour corriger les chemins dans index.html pour GitHub Pages
const distDir = './dist';
const indexPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Remplacer les chemins absolus par des chemins relatifs
  content = content.replace(/\/memoboost\//g, './');
  
  fs.writeFileSync(indexPath, content);
  console.log('✅ Chemins corrigés dans index.html');
} else {
  console.log('❌ index.html non trouvé');
}
