const express = require('express')
const cors = require('cors')
const http = require('http')
const { WebSocketServer } = require('ws')
const { Ollama } = require('ollama')
const fs = require('fs')
const path = require('path')

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })
const ollama = new Ollama({ host: 'http://localhost:11434' })

// ── OpenRouter helper ──────────────────────────────────────────────────────
async function openrouterChat(messages, model, apiKey, stream, onChunk) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'ChatSphere'
    },
    body: JSON.stringify({ model, messages, stream })
  })
  if (!stream) {
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.choices[0].message.content
  }
  // SSE streaming
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
    for (const line of lines) {
      const json = line.slice(6)
      if (json === '[DONE]') continue
      try {
        const delta = JSON.parse(json).choices[0].delta.content || ''
        full += delta
        onChunk(delta)
      } catch {}
    }
  }
  return full
}

app.use(cors())
app.use(express.json())

// Serve widget.js statically so any site can load it
app.use('/widget', express.static(path.join(__dirname, '../widget')))

// ── Config store (simple JSON file, no DB needed) ──────────────────────────
const CONFIG_FILE = path.join(__dirname, 'configs.json')

function loadConfigs() {
  if (!fs.existsSync(CONFIG_FILE)) return {}
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
}

function saveConfigs(configs) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2))
}

// ── REST: Dashboard config endpoints ──────────────────────────────────────
app.get('/api/config/:botId', (req, res) => {
  const configs = loadConfigs()
  const config = configs[req.params.botId]
  if (!config) return res.status(404).json({ error: 'Bot not found' })
  res.json(config)
})

app.post('/api/config', (req, res) => {
  const { name, systemPrompt, knowledgeBase, color, welcomeMessage, model } = req.body
  if (!name || !systemPrompt) return res.status(400).json({ error: 'name and systemPrompt required' })

  if (knowledgeBase) {
    try { JSON.parse(knowledgeBase) } catch { return res.status(400).json({ error: 'knowledgeBase must be valid JSON' }) }
  }

  const configs = loadConfigs()
  const botId = Date.now().toString(36)
  configs[botId] = {
    botId,
    name,
    systemPrompt,
    knowledgeBase: knowledgeBase || '',
    color: color || '#00A8CC',
    welcomeMessage: welcomeMessage || 'Bonjour ! Comment puis-je vous aider ?',
    model: model || 'llama3'
  }
  saveConfigs(configs)
  res.json({ botId, ...configs[botId] })
})

app.put('/api/config/:botId', (req, res) => {
  const configs = loadConfigs()
  if (!configs[req.params.botId]) return res.status(404).json({ error: 'Bot not found' })
  if (req.body.knowledgeBase) {
    try { JSON.parse(req.body.knowledgeBase) } catch { return res.status(400).json({ error: 'knowledgeBase must be valid JSON' }) }
  }
  configs[req.params.botId] = { ...configs[req.params.botId], ...req.body }
  saveConfigs(configs)
  res.json(configs[req.params.botId])
})

app.get('/api/configs', (req, res) => {
  res.json(loadConfigs())
})

// ── REST: List models ─────────────────────────────────────────────────────
app.get('/api/models', async (req, res) => {
  try {
    const { models } = await ollama.list()
    res.json(models.map(m => m.name))
  } catch (err) {
    res.status(500).json({ error: 'Ollama not reachable: ' + err.message })
  }
})

// OpenRouter models list — supports ?free=true to filter free-only
app.get('/api/openrouter/models', async (req, res) => {
  const apiKey = req.headers['x-openrouter-key']
  if (!apiKey) return res.status(400).json({ error: 'Missing API key' })
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    const data = await r.json()
    let models = data.data
    if (req.query.free === 'true') {
      models = models.filter(m => m.pricing?.prompt === '0' && m.pricing?.completion === '0')
    }
    res.json(models.map(m => ({ id: m.id, name: m.name })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── REST: Simple one-shot chat (no streaming) ──────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, botId, history = [] } = req.body
  const configs = loadConfigs()
  const config = configs[botId] || { systemPrompt: 'You are a helpful assistant.', model: 'llama3', provider: 'ollama' }

  const fullSystem = config.knowledgeBase
    ? `${config.systemPrompt}\n\n---KNOWLEDGE BASE---\n${config.knowledgeBase}`
    : config.systemPrompt

  const messages = [
    { role: 'system', content: fullSystem },
    ...history,
    { role: 'user', content: message }
  ]

  try {
    if (config.provider === 'openrouter') {
      const reply = await openrouterChat(messages, config.model, config.openrouterKey, false)
      res.json({ reply })
    } else {
      const response = await ollama.chat({ model: config.model, messages })
      res.json({ reply: response.message.content })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── WebSocket: Streaming chat ──────────────────────────────────────────────
// Client sends: { type: 'chat', botId, message, history }
// Server streams back: { type: 'chunk', text } then { type: 'done' }
wss.on('connection', (ws) => {
  ws.on('message', async (raw) => {
    let data
    try { data = JSON.parse(raw) } catch { return }

    if (data.type !== 'chat') return

    const configs = loadConfigs()
    const config = configs[data.botId] || { systemPrompt: 'You are a helpful assistant.', model: 'llama3', provider: 'ollama' }

    const fullSystem = config.knowledgeBase
      ? `${config.systemPrompt}\n\n---KNOWLEDGE BASE---\n${config.knowledgeBase}`
      : config.systemPrompt

    const messages = [
      { role: 'system', content: fullSystem },
      ...(data.history || []),
      { role: 'user', content: data.message }
    ]

    try {
      if (config.provider === 'openrouter') {
        await openrouterChat(messages, config.model, config.openrouterKey, true, (delta) => {
          if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'chunk', text: delta }))
        })
      } else {
        const stream = await ollama.chat({ model: config.model, messages, stream: true })
        for await (const chunk of stream) {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'chunk', text: chunk.message.content }))
          }
        }
      }
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'done' }))
    } catch (err) {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'error', message: err.message }))
    }
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`ChatSphere backend running on http://localhost:${PORT}`))
