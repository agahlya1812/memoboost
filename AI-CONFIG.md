# Configuration de l'IA pour MemoBoost

## Variables d'environnement requises

Ajoutez ces variables à votre fichier `.env` :

```bash
# Configuration Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Configuration API IA (DeepSeek) - RECOMMANDÉ
VITE_AI_API_KEY=sk-5d8e806755d54dac89fe03a70ec6e39a
VITE_AI_API_URL=https://api.deepseek.com/v1
VITE_AI_MODEL=deepseek-chat

# Alternative: Configuration OpenAI
# VITE_AI_API_KEY=your_openai_api_key
# VITE_AI_API_URL=https://api.openai.com/v1
# VITE_AI_MODEL=gpt-4

# Alternative: Configuration Claude
# VITE_AI_API_KEY=your_claude_api_key
# VITE_AI_API_URL=https://api.anthropic.com/v1
# VITE_AI_MODEL=claude-3-sonnet-20240229
```

## Configuration DeepSeek (Recommandé)

1. Créez un compte sur [DeepSeek](https://platform.deepseek.com/)
2. Générez une clé API dans la section "API Keys"
3. La clé est déjà configurée dans le fichier `.env`

## Configuration OpenAI (Alternative)

1. Créez un compte sur [OpenAI](https://platform.openai.com/)
2. Générez une clé API dans la section "API Keys"
3. Ajoutez la clé à votre fichier `.env`

## Configuration Claude (Alternative)

1. Créez un compte sur [Anthropic](https://console.anthropic.com/)
2. Générez une clé API
3. Modifiez les variables d'environnement pour utiliser Claude

## Fonctionnalités IA

- **Extraction de texte** : Analyse automatique des PDFs
- **Génération de cartes** : Création de questions/réponses pertinentes
- **Sauvegarde automatique** : Les cartes sont stockées en base de données
- **Interface intuitive** : Drag & drop des PDFs

## Coûts estimés

- **DeepSeek** : ~$0.0014 par 1K tokens (très économique, ~$0.01-0.05 par PDF)
- **OpenAI GPT-4** : ~$0.03 par 1K tokens (généralement $0.10-0.50 par PDF)
- **Claude** : Tarifs similaires à OpenAI

## Sécurité

- Les clés API sont stockées côté client
- Aucune donnée n'est partagée avec des tiers
- Les PDFs sont traités localement avant l'envoi à l'IA
