;(function () {
  // ── Read config from the script tag ──────────────────────────────────────
  // <script src="http://localhost:3001/widget/widget.js"
  //         data-bot-id="abc123"
  //         data-server="http://localhost:3001"></script>
  const scriptTag = document.currentScript
  const BOT_ID = scriptTag?.getAttribute('data-bot-id') || 'default'
  const SERVER = (scriptTag?.getAttribute('data-server') || 'http://localhost:3001').replace(/\/$/, '')
  const WS_SERVER = SERVER.replace(/^http/, 'ws')

  // ── Fetch bot config (color, welcome message, name) ──────────────────────
  let botConfig = { color: '#00A8CC', welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?', name: 'ChatSphere' }

  fetch(`${SERVER}/api/config/${BOT_ID}`)
    .then(r => r.json())
    .then(cfg => { botConfig = cfg; applyColor(cfg.color); setWelcome(cfg.welcomeMessage, cfg.name) })
    .catch(() => {})

  // ── Inject styles ─────────────────────────────────────────────────────────
  const style = document.createElement('style')
  style.textContent = `
    #cs-bubble { position:fixed; bottom:24px; right:24px; width:56px; height:56px;
      border-radius:50%; background:var(--cs-color,#00A8CC); cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 16px rgba(0,0,0,.3); z-index:99999; border:none;
      transition: transform .2s; }
    #cs-bubble:hover { transform: scale(1.1); }
    #cs-bubble svg { width:28px; height:28px; fill:white; }

    #cs-window { position:fixed; bottom:92px; right:24px; width:360px; height:520px;
      background:#0A1628; border-radius:16px; display:flex; flex-direction:column;
      box-shadow:0 8px 32px rgba(0,0,0,.5); z-index:99999; overflow:hidden;
      font-family:system-ui,sans-serif; transition: opacity .2s, transform .2s;
      opacity:0; transform:translateY(16px) scale(.97); pointer-events:none; }
    #cs-window.cs-open { opacity:1; transform:translateY(0) scale(1); pointer-events:all; }

    #cs-header { background:#0D2137; padding:14px 16px; display:flex;
      align-items:center; gap:10px; }
    #cs-header-dot { width:10px; height:10px; border-radius:50%;
      background:var(--cs-color,#00A8CC); flex-shrink:0; }
    #cs-header-name { color:#fff; font-weight:600; font-size:15px; flex:1; }
    #cs-close { background:none; border:none; color:#8899A6; cursor:pointer;
      font-size:20px; line-height:1; padding:0; }

    #cs-messages { flex:1; overflow-y:auto; padding:16px; display:flex;
      flex-direction:column; gap:10px; }
    #cs-messages::-webkit-scrollbar { width:4px; }
    #cs-messages::-webkit-scrollbar-thumb { background:#1C3A5E; border-radius:2px; }

    .cs-msg { max-width:80%; padding:10px 14px; border-radius:12px;
      font-size:14px; line-height:1.5; word-break:break-word; }
    .cs-msg.cs-bot { background:#132237; color:#E8EEF4; align-self:flex-start;
      border-bottom-left-radius:4px; }
    .cs-msg.cs-user { background:var(--cs-color,#00A8CC); color:#fff;
      align-self:flex-end; border-bottom-right-radius:4px; }
    .cs-typing-indicator { background:#132237; color:#8899A6; align-self:flex-start;
      border-bottom-left-radius:4px; padding:10px 14px; border-radius:12px;
      font-size:14px; font-style:italic; }

    #cs-input-row { display:flex; gap:8px; padding:12px; background:#0D2137; }
    #cs-input { flex:1; background:#132237; border:1px solid #1C3A5E; border-radius:8px;
      color:#fff; padding:10px 12px; font-size:14px; outline:none;
      font-family:inherit; resize:none; }
    #cs-input::placeholder { color:#8899A6; }
    #cs-send { background:var(--cs-color,#00A8CC); border:none; border-radius:8px;
      color:#fff; padding:10px 14px; cursor:pointer; font-size:18px;
      display:flex; align-items:center; justify-content:center; }
    #cs-send:disabled { opacity:.5; cursor:not-allowed; }
  `
  document.head.appendChild(style)

  // ── Build DOM ─────────────────────────────────────────────────────────────
  const bubble = document.createElement('button')
  bubble.id = 'cs-bubble'
  bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>`

  const win = document.createElement('div')
  win.id = 'cs-window'
  win.innerHTML = `
    <div id="cs-header">
      <div id="cs-header-dot"></div>
      <span id="cs-header-name">ChatSphere</span>
      <button id="cs-close">✕</button>
    </div>
    <div id="cs-messages"></div>
    <div id="cs-input-row">
      <textarea id="cs-input" rows="1" placeholder="Écrivez votre message..."></textarea>
      <button id="cs-send">➤</button>
    </div>
  `

  document.body.appendChild(bubble)
  document.body.appendChild(win)

  // ── Helpers ───────────────────────────────────────────────────────────────
  function applyColor(color) {
    document.documentElement.style.setProperty('--cs-color', color)
  }

  function setWelcome(msg, name) {
    document.getElementById('cs-header-name').textContent = name || 'ChatSphere'
    const msgs = document.getElementById('cs-messages')
    if (msgs.children.length === 0) addMessage(msg, 'bot')
  }

  function addMessage(text, role) {
    const msgs = document.getElementById('cs-messages')
    const div = document.createElement('div')
    div.className = `cs-msg cs-${role}`
    div.textContent = text
    msgs.appendChild(div)
    msgs.scrollTop = msgs.scrollHeight
    return div
  }

  // ── Toggle open/close ─────────────────────────────────────────────────────
  let isOpen = false
  bubble.addEventListener('click', () => {
    isOpen = !isOpen
    win.classList.toggle('cs-open', isOpen)
    if (isOpen && document.getElementById('cs-messages').children.length === 0) {
      addMessage(botConfig.welcomeMessage, 'bot')
    }
  })
  document.getElementById('cs-close').addEventListener('click', () => {
    isOpen = false
    win.classList.remove('cs-open')
  })

  // ── WebSocket streaming chat ──────────────────────────────────────────────
  let ws = null
  let history = []
  let currentBotDiv = null
  let currentBotText = ''
  let isSending = false

  function unlockInput() {
    isSending = false
    document.getElementById('cs-send').disabled = false
    document.getElementById('cs-input').disabled = false
  }

  function connectWS(onReady) {
    ws = new WebSocket(`${WS_SERVER}`)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'chunk') {
        if (currentBotDiv) {
          currentBotText += data.text
          currentBotDiv.textContent = currentBotText
        }
      } else if (data.type === 'done') {
        history.push({ role: 'assistant', content: currentBotText })
        currentBotDiv = null
        currentBotText = ''
        unlockInput()
      } else if (data.type === 'error') {
        if (currentBotDiv) currentBotDiv.textContent = '⚠ Erreur: ' + data.message
        unlockInput()
      }
    }
    ws.onclose = () => {
      ws = null
      if (isSending) {
        if (currentBotDiv) currentBotDiv.textContent = '⚠ Connexion perdue'
        unlockInput()
      }
    }
    ws.onerror = () => {}
    ws.onopen = () => { if (onReady) onReady() }
  }

  function sendMessage() {
    const input = document.getElementById('cs-input')
    const msg = input.value.trim()
    if (!msg || isSending) return

    isSending = true
    input.value = ''
    input.style.height = 'auto'
    document.getElementById('cs-send').disabled = true
    input.disabled = true

    addMessage(msg, 'user')
    history.push({ role: 'user', content: msg })

    const typingEl = document.createElement('div')
    typingEl.className = 'cs-typing-indicator'
    typingEl.textContent = '...'
    document.getElementById('cs-messages').appendChild(typingEl)
    document.getElementById('cs-messages').scrollTop = 99999

    currentBotDiv = document.createElement('div')
    currentBotDiv.className = 'cs-msg cs-bot'
    currentBotText = ''

    const payload = JSON.stringify({ type: 'chat', botId: BOT_ID, message: msg, history: history.slice(0, -1) })

    const afterConnect = () => {
      typingEl.replaceWith(currentBotDiv)
      ws.send(payload)
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      afterConnect()
    } else {
      connectWS(afterConnect)
    }
  }

  document.getElementById('cs-send').addEventListener('click', sendMessage)
  document.getElementById('cs-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  })

  // Auto-resize textarea
  document.getElementById('cs-input').addEventListener('input', function () {
    this.style.height = 'auto'
    this.style.height = Math.min(this.scrollHeight, 100) + 'px'
  })
})()
