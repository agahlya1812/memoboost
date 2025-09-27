#!/bin/bash

# Script de déploiement simple pour GitHub Pages
echo "🚀 Déploiement de MemoBoost sur GitHub Pages..."

# Build du projet
echo "📦 Construction du projet..."
npm run build

# Vérification des fichiers
echo "🔍 Vérification des fichiers..."
ls -la dist/

# Ajout des fichiers au repository
echo "📝 Ajout des fichiers..."
git add dist/
git add public/

# Commit
echo "💾 Commit des changements..."
git commit -m "Deploy: Update dist folder for GitHub Pages"

# Push
echo "🚀 Push vers GitHub..."
git push origin main

echo "✅ Déploiement terminé !"
echo "🌐 Votre site sera disponible sur: https://agahlya1812.github.io/memoboost/"
