import React, { useState, useEffect, useRef } from 'react'

const API = 'http://localhost:3001/api'

const defaultForm = {
  name: '', systemPrompt: '', color: '#00A8CC',
  welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
  model: '', provider: 'ollama', openrouterKey: '', knowledgeBase: ''
}

// ── Icons ──────────────────────────────────────────────────────────────────
const Icon = {
  bot: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 15h.01M16 15h.01"/></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>,
  save: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  copy: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  brain: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.96-3.1A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.96-3.1A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
  code: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  upload: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <div style={{
      background: 'rgba(13,33,55,0.6)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14,
      padding: '20px 22px',
      marginBottom: 16,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ color: '#00A8CC' }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#8899A6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

// ── Field components ───────────────────────────────────────────────────────
function Field({ label, children, error }) {
  return (
    <div style={{ marginBottom: error ? 6 : 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#6B7E94', marginBottom: 6, fontWeight: 500 }}>{label}</label>
      {children}
      {error && <div style={{ color: '#ff6b6b', fontSize: 11, marginTop: 4 }}>⚠ {error}</div>}
    </div>
  )
}

const inputStyle = {
  width: '100%', background: 'rgba(10,22,40,0.8)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, color: '#E8EEF4', padding: '9px 12px', fontSize: 13,
  outline: 'none', transition: 'border-color .2s',
}

const textareaStyle = {
  ...inputStyle, resize: 'vertical', minHeight: 90, lineHeight: 1.6,
}

export default function App() {
  const [bots, setBots] = useState({})
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [savedMsg, setSavedMsg] = useState('')
  const [kbError, setKbError] = useState('')
  const [copied, setCopied] = useState(false)
  const [models, setModels] = useState([])
  const [modelsError, setModelsError] = useState('')
  const [orModels, setOrModels] = useState([])
  const [orModelsLoading, setOrModelsLoading] = useState(false)
  const [orSearch, setOrSearch] = useState('')
  const [orFreeOnly, setOrFreeOnly] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    fetchBots()
    fetch(`${API}/models`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) { setModels(data); setForm(f => ({ ...f, model: f.model || data[0] || '' })) }
        else setModelsError(data.error)
      })
      .catch(() => setModelsError('Ollama non disponible'))
  }, [])

  async function fetchOrModels(apiKey, freeOnly = orFreeOnly) {
    if (!apiKey) return
    setOrModelsLoading(true)
    try {
      const r = await fetch(`${API}/openrouter/models?free=${freeOnly}`, { headers: { 'x-openrouter-key': apiKey } })
      const data = await r.json()
      if (Array.isArray(data)) setOrModels(data)
    } catch {}
    setOrModelsLoading(false)
  }

  async function fetchBots() {
    const res = await fetch(`${API}/configs`)
    const data = await res.json()
    setBots(data)
    if (!selectedId && Object.keys(data).length > 0) {
      const first = Object.keys(data)[0]
      setSelectedId(first)
      setForm(data[first])
    }
  }

  function selectBot(id) {
    setSelectedId(id); setForm(bots[id]); setSavedMsg(''); setKbError('')
    if (bots[id].provider === 'openrouter' && bots[id].openrouterKey) fetchOrModels(bots[id].openrouterKey)
  }

  function newBot() { setSelectedId(null); setForm(defaultForm); setSavedMsg(''); setKbError('') }

  async function save() {
    if (kbError) return
    const method = selectedId ? 'PUT' : 'POST'
    const url = selectedId ? `${API}/config/${selectedId}` : `${API}/config`
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (data.botId) { setSelectedId(data.botId); setSavedMsg('Sauvegardé'); fetchBots(); setTimeout(() => setSavedMsg(''), 2500) }
  }

  function set(key, val) {
    if (key === 'knowledgeBase') {
      try { if (val) JSON.parse(val); setKbError('') } catch { setKbError('JSON invalide') }
    }
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleFileDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer?.files[0] || e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => set('knowledgeBase', ev.target.result)
    reader.readAsText(file)
  }

  const snippet = selectedId
    ? `<script src="http://localhost:3001/widget/widget.js"\n  data-bot-id="${selectedId}"\n  data-server="http://localhost:3001">\n</script>`
    : null

  function copySnippet() {
    navigator.clipboard.writeText(snippet)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const botList = Object.values(bots)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'radial-gradient(ellipse at 20% 0%, #0d2137 0%, #060d1a 60%)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 4,
        borderRight: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(6,13,26,0.7)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #00A8CC, #0070a8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            boxShadow: '0 0 16px #00A8CC44',
          }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.02em' }}>ChatSphere</div>
            <div style={{ fontSize: 11, color: '#4A6080' }}>Dashboard</div>
          </div>
        </div>

        {/* Bot list label */}
        <div style={{ fontSize: 10, fontWeight: 600, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 6 }}>
          Mes bots ({botList.length})
        </div>

        {botList.map(b => (
          <button key={b.botId} onClick={() => selectBot(b.botId)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
            borderRadius: 9, cursor: 'pointer', border: 'none', textAlign: 'left', width: '100%',
            background: b.botId === selectedId ? 'rgba(0,168,204,0.12)' : 'transparent',
            color: b.botId === selectedId ? '#00A8CC' : '#8899A6',
            transition: 'all .15s',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: b.color || '#00A8CC',
              boxShadow: b.botId === selectedId ? `0 0 8px ${b.color || '#00A8CC'}` : 'none',
            }} />
            <span style={{ fontSize: 13, fontWeight: b.botId === selectedId ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.name}
            </span>
          </button>
        ))}

        <button onClick={newBot} style={{
          marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px 10px', borderRadius: 9, cursor: 'pointer',
          background: 'rgba(0,168,204,0.08)', border: '1px dashed rgba(0,168,204,0.3)',
          color: '#00A8CC', fontSize: 13, fontWeight: 500, transition: 'all .15s',
        }}>
          {Icon.plus} Nouveau bot
        </button>

        {/* Bottom badge */}
        <div style={{ marginTop: 'auto', padding: '10px 8px' }}>
          <div style={{
            background: 'rgba(0,168,204,0.06)', border: '1px solid rgba(0,168,204,0.15)',
            borderRadius: 8, padding: '8px 10px',
          }}>
            <div style={{ fontSize: 11, color: '#4A6080', marginBottom: 2 }}>Version</div>
            <div style={{ fontSize: 12, color: '#00A8CC', fontWeight: 600 }}>ChatSphere v1.0</div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto', maxWidth: 760 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>
            {selectedId ? `Configurer — ${form.name || '...'}` : 'Créer un nouveau bot'}
          </h1>
          <p style={{ fontSize: 13, color: '#4A6080', marginTop: 4 }}>
            {selectedId ? `ID: ${selectedId}` : 'Configurez votre assistant IA et intégrez-le en une ligne'}
          </p>
        </div>

        {/* Identity */}
        <Section icon={Icon.bot} title="Identité">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
            <Field label="Nom du bot">
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Assistant TechShop" />
            </Field>
            <Field label="Couleur">
              <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                style={{ width: 44, height: 36, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, background: 'none', cursor: 'pointer', padding: 2 }} />
            </Field>
          </div>
          <Field label="Message de bienvenue">
            <input style={inputStyle} value={form.welcomeMessage} onChange={e => set('welcomeMessage', e.target.value)} />
          </Field>
        </Section>

        {/* Behavior */}
        <Section icon={Icon.settings} title="Comportement">
          <Field label="Prompt système">
            <textarea style={{ ...textareaStyle, minHeight: 110 }} value={form.systemPrompt}
              onChange={e => set('systemPrompt', e.target.value)}
              placeholder="Tu es un assistant pour une boutique. Réponds en français, sois amical..." />
          </Field>
        </Section>

        {/* Knowledge Base */}
        <Section icon={Icon.brain} title="Base de connaissances">
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileDrop} />
          <div
            onClick={() => !form.knowledgeBase && fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            style={{
              border: `1.5px dashed ${dragOver ? '#00A8CC' : kbError ? '#ff6b6b' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10, padding: form.knowledgeBase ? 0 : '20px 16px',
              background: dragOver ? 'rgba(0,168,204,0.05)' : 'transparent',
              transition: 'all .2s', cursor: form.knowledgeBase ? 'default' : 'pointer',
              textAlign: form.knowledgeBase ? 'left' : 'center',
            }}>
            {form.knowledgeBase ? (
              <div style={{ position: 'relative' }}>
                <textarea
                  style={{ ...textareaStyle, minHeight: 120, fontFamily: 'monospace', fontSize: 11, marginBottom: 0, borderRadius: 10 }}
                  value={form.knowledgeBase}
                  onChange={e => set('knowledgeBase', e.target.value)} />
                <button onClick={() => set('knowledgeBase', '')} style={{
                  position: 'absolute', top: 8, right: 8, background: 'rgba(255,107,107,0.15)',
                  border: '1px solid rgba(255,107,107,0.3)', borderRadius: 6, color: '#ff6b6b',
                  fontSize: 11, padding: '2px 8px', cursor: 'pointer',
                }}>Effacer</button>
              </div>
            ) : (
              <>
                <div style={{ color: '#00A8CC', marginBottom: 8 }}>{Icon.upload}</div>
                <div style={{ fontSize: 13, color: '#8899A6', marginBottom: 4 }}>Glisser-déposer un fichier <strong style={{ color: '#E8EEF4' }}>.json</strong></div>
                <div style={{ fontSize: 11, color: '#4A6080' }}>ou cliquer pour parcourir</div>
              </>
            )}
          </div>
          {kbError && <div style={{ color: '#ff6b6b', fontSize: 11, marginTop: 6 }}>⚠ {kbError}</div>}
        </Section>

        {/* Model */}
        <Section icon={Icon.settings} title="Modèle IA">
          <Field label="Fournisseur">
            <select style={inputStyle} value={form.provider} onChange={e => {
              const p = e.target.value
              set('provider', p)
              set('model', p === 'ollama' ? (models[0] || '') : '')
              if (p === 'openrouter' && form.openrouterKey) fetchOrModels(form.openrouterKey)
            }}>
              <option value="ollama">🖥 Ollama — Local</option>
              <option value="openrouter">☁ OpenRouter — Cloud</option>
            </select>
          </Field>

          {form.provider === 'ollama' && (
            <Field label="Modèle Ollama" error={modelsError}>
              {!modelsError && (
                <select style={inputStyle} value={form.model} onChange={e => set('model', e.target.value)}>
                  {models.length === 0 ? <option>Chargement...</option> : models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
            </Field>
          )}

          {form.provider === 'openrouter' && (
            <>
              <Field label="Clé API OpenRouter">
                <input style={inputStyle} type="password" value={form.openrouterKey}
                  onChange={e => { set('openrouterKey', e.target.value); fetchOrModels(e.target.value) }}
                  placeholder="sk-or-v1-..." />
              </Field>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: '#6B7E94', fontWeight: 500 }}>Modèle OpenRouter</label>
                <label style={{ fontSize: 11, color: '#4A6080', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={orFreeOnly} onChange={e => { setOrFreeOnly(e.target.checked); fetchOrModels(form.openrouterKey, e.target.checked) }} />
                  Gratuits uniquement
                </label>
              </div>
              <input style={{ ...inputStyle, marginBottom: 8 }} value={orSearch}
                onChange={e => setOrSearch(e.target.value)} placeholder="🔍 Rechercher..." />
              {orModelsLoading
                ? <div style={{ fontSize: 12, color: '#4A6080', padding: '8px 0' }}>Chargement des modèles...</div>
                : orModels.length > 0
                  ? <select style={inputStyle} value={form.model} onChange={e => set('model', e.target.value)}>
                      {orModels
                        .filter(m => m.id.toLowerCase().includes(orSearch.toLowerCase()) || m.name.toLowerCase().includes(orSearch.toLowerCase()))
                        .map(m => <option key={m.id} value={m.id}>{m.name} — {m.id}</option>)}
                    </select>
                  : <input style={inputStyle} value={form.model} onChange={e => set('model', e.target.value)}
                      placeholder="Ex: openai/gpt-4o-mini" />
              }
            </>
          )}
        </Section>

        {/* Save button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={save} disabled={!!kbError} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', background: 'linear-gradient(135deg, #00A8CC, #0070a8)',
            border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 14,
            cursor: kbError ? 'not-allowed' : 'pointer', opacity: kbError ? 0.5 : 1,
            boxShadow: '0 4px 16px rgba(0,168,204,0.3)', transition: 'all .2s',
          }}>
            {Icon.save} Sauvegarder
          </button>
          {savedMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00C896', fontSize: 13 }}>
              {Icon.check} {savedMsg}
            </div>
          )}
        </div>

        {/* Embed snippet */}
        {snippet && (
          <Section icon={Icon.code} title="Intégration">
            <p style={{ fontSize: 12, color: '#4A6080', marginBottom: 12 }}>
              Colle ce code dans n'importe quel site — WordPress, HTML, React, peu importe.
            </p>
            <div style={{
              background: 'rgba(6,13,26,0.8)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '14px 16px', position: 'relative',
            }}>
              <pre style={{ fontFamily: 'monospace', fontSize: 12, color: '#00C896', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{snippet}</pre>
              <button onClick={copySnippet} style={{
                position: 'absolute', top: 10, right: 10,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', background: copied ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(0,200,150,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 6, color: copied ? '#00C896' : '#8899A6', fontSize: 11, cursor: 'pointer',
                transition: 'all .2s',
              }}>
                {copied ? Icon.check : Icon.copy}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
          </Section>
        )}
      </main>
    </div>
  )
}
