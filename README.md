# MemoBoost 📚

Une application web moderne pour créer et réviser des cartes mémoire (flashcards) avec un système d'organisation par dossiers et enveloppes.

## ✨ Fonctionnalités

### 🗂️ Organisation
- **Dossiers** : Organisez vos sujets d'étude
- **Enveloppes** : Groupez vos cartes par thème
- **Icônes colorées** : Dossiers et enveloppes avec des icônes personnalisées

### 📝 Gestion des cartes
- **Création facile** : Ajoutez questions et réponses
- **Édition** : Modifiez vos cartes existantes
- **Suppression** : Gérez votre contenu
- **Statuts de maîtrise** : Marquez vos cartes (À évaluer, À revoir, Maîtrisée)

### 🔄 Mode révision
- **Révision interactive** : Testez vos connaissances
- **Barre de progression** : Suivez votre avancement
- **Cartes mélangées** : Ordre aléatoire à chaque session
- **Évaluation** : Jugez votre niveau de maîtrise

### 📊 Import/Export
- **Export JSON** : Sauvegardez toutes vos données
- **Export CSV** : Compatible Excel/Google Sheets
- **Import** : Importez vos données depuis d'autres sources
- **Synchronisation** : Vos données sont sauvegardées en ligne

### 📱 Responsive Design
- **iPhone 14 Pro Max** : Optimisé pour les smartphones
- **iPad Air 5** : Interface adaptée aux tablettes
- **Navigation tactile** : Boutons optimisés pour le touch

## 🚀 Installation

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn

### Installation
```bash
# Cloner le repository
git clone https://github.com/votre-username/memoboost.git
cd memoboost

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 🛠️ Technologies utilisées

- **Frontend** : React 18 + Vite
- **Styling** : CSS3 avec design responsive
- **Icons** : Icônes personnalisées PNG
- **Build** : Vite pour un développement rapide

## 📁 Structure du projet

```
memoboost/
├── src/
│   ├── components/          # Composants React
│   │   ├── Flashcard.jsx
│   │   ├── FlashcardEnvelope.jsx
│   │   ├── FlashcardGrid.jsx
│   │   ├── FolderCard.jsx
│   │   ├── FolderGrid.jsx
│   │   ├── ItemPanel.jsx
│   │   ├── RevisionModal.jsx
│   │   └── ImportExportModal.jsx
│   ├── constants/          # Constantes (palette de couleurs)
│   ├── services/           # Services API
│   ├── utils/              # Utilitaires (import/export, slug)
│   ├── App.jsx             # Composant principal
│   └── App.css             # Styles principaux
├── public/                 # Assets statiques
│   ├── icon-dossier-*.png  # Icônes de dossiers colorées
│   ├── icon-enveloppe-*.png # Icônes d'enveloppes colorées
│   └── logo.png            # Logo de l'application
├── package.json
└── README.md
```

## 🎨 Personnalisation

### Couleurs disponibles
- Rouge, Orange, Jaune, Vert
- Bleu, Violet, Rose, Gris

### Icônes
- Dossiers : `icon-dossier-[couleur].png`
- Enveloppes : `icon-enveloppe-[couleur].png`

## 📱 Support des appareils

- ✅ iPhone 14 Pro Max (430x932)
- ✅ iPad Air 5 (820x1180)
- ✅ Desktop (1920x1080+)
- ✅ Navigation tactile optimisée

## 🤝 Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👨‍💻 Auteur

Créé avec ❤️ pour améliorer l'apprentissage et la mémorisation.

---

**MemoBoost** - Transformez vos révisions en expérience interactive ! 🚀