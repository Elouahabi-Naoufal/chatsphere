# ChatSphere

Chatbot IA intégrable dans n'importe quel site via un script JS. Propulsé par Ollama (100% local).

## Prérequis

- Node.js 18+
- [Ollama](https://ollama.com) installé et en cours d'exécution
- Un modèle Ollama téléchargé : `ollama pull llama3`

## Démarrage

### 1. Backend
```bash
cd backend
npm install
npm run dev
# → http://localhost:3001
```

### 2. Dashboard
```bash
cd dashboard
npm install
npm run dev
# → http://localhost:5173
```

### 3. Créer un bot
1. Ouvre http://localhost:5173
2. Clique "Nouveau bot"
3. Remplis le nom, le prompt système (ex: "Tu es un assistant pour une boutique de vêtements...")
4. Sauvegarde → tu obtiens un **Bot ID** et le snippet d'intégration

### 4. Intégrer dans un site

Colle cette ligne **avant `</body>`** dans n'importe quel site HTML :

```html
<script
  src="http://localhost:3001/widget/widget.js"
  data-bot-id="TON_BOT_ID"
  data-server="http://localhost:3001">
</script>
```

C'est tout. Le widget apparaît en bas à droite.

### 5. Tester avec la démo
Ouvre `demo.html` dans un navigateur (remplace `YOUR_BOT_ID` par ton vrai ID).

## Structure

```
chatsphere/
├── backend/
│   ├── server.js       # API REST + WebSocket → Ollama
│   └── configs.json    # Configs des bots (auto-créé)
├── widget/
│   └── widget.js       # Script embeddable (servi par le backend)
├── dashboard/
│   └── src/App.jsx     # Interface admin React
└── demo.html           # Exemple d'intégration
```

## Comment ça marche

```
Site client (HTML/React/WordPress)
    └── charge widget.js via <script>
            └── ouvre WebSocket → backend (Node.js)
                    └── stream → Ollama (llama3 local)
```

Le widget se connecte au backend via WebSocket pour le streaming en temps réel.
Le backend parle à Ollama qui tourne localement sur ton PC.
