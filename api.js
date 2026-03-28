// Simple API that reads OpenClaw session JSONL files and serves live agent data
const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 3099
const SESS_DIR = '/data/.openclaw/agents/main/sessions'

const MODEL_SHORT = {
  'claude-sonnet-4-6': 'Sonnet 4.6',
  'claude-haiku-4-5': 'Haiku 4.5',
  'claude-opus-4-6': 'Opus 4.6',
  'claude-haiku-3-5': 'Haiku 3.5',
}

function shortModel(m) {
  if (!m) return 'Unknown'
  for (const [k, v] of Object.entries(MODEL_SHORT)) if (m.includes(k.split('-').slice(-2).join('-'))) return v
  if (m.includes('haiku')) return 'Haiku'
  if (m.includes('sonnet')) return 'Sonnet'
  if (m.includes('opus')) return 'Opus'
  return m.split('/').pop() || m
}

function parseSession(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim()
    if (!raw) return null
    const lines = raw.split('\n').filter(Boolean)
    
    let model = null, label = null, startedAt = null, endedAt = null
    let status = 'done', totalTokensOut = 0, totalTokensIn = 0

    for (const line of lines) {
      try {
        const obj = JSON.parse(line)
        // Metadata lines
        if (obj.model && !model) model = obj.model
        if (obj.label && !label) label = obj.label
        if (obj.startedAt && !startedAt) startedAt = obj.startedAt
        if (obj.endedAt && !endedAt) endedAt = obj.endedAt
        if (obj.status) status = obj.status
        // Usage in message lines
        if (obj.usage) {
          if (obj.usage.output) totalTokensOut += obj.usage.output
          if (obj.usage.input) totalTokensIn += obj.usage.input
        }
      } catch {}
    }

    const stat = fs.statSync(filePath)
    return {
      id: path.basename(filePath, '.jsonl'),
      label,
      model: model || 'claude-sonnet-4-6',
      startedAt: startedAt || stat.ctimeMs,
      endedAt,
      status,
      tokensOut: totalTokensOut,
      tokensIn: totalTokensIn,
      lastModified: stat.mtimeMs
    }
  } catch { return null }
}

function getSessions() {
  try {
    if (!fs.existsSync(SESS_DIR)) return { boss: getBoss(), agents: [], updatedAt: Date.now() }

    const files = fs.readdirSync(SESS_DIR)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => path.join(SESS_DIR, f))

    const sessions = files.map(parseSession).filter(Boolean)
    sessions.sort((a, b) => b.startedAt - a.startedAt)

    // Identify main session (largest file / most tokens / no label usually)
    // Subagents have labels or are smaller
    const mainSess = sessions.find(s => !s.label) || sessions[0]
    const subagents = sessions
      .filter(s => s.id !== mainSess?.id)
      .slice(0, 30)
      .map((s, i) => ({
        id: s.id.slice(0, 8),
        fullId: s.id,
        name: s.label || `Agent-${String(i + 1).padStart(2, '0')}`,
        model: s.model,
        modelShort: shortModel(s.model),
        status: s.status === 'running' ? 'working' : s.status === 'timeout' ? 'timeout' : 'done',
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        tokensOut: s.tokensOut,
        tokensIn: s.tokensIn,
        runtimeMs: s.endedAt ? s.endedAt - s.startedAt : Date.now() - s.startedAt,
        lastModified: s.lastModified
      }))

    return {
      boss: {
        name: 'Neymar',
        model: 'claude-sonnet-4-6',
        modelShort: 'Sonnet 4.6',
        status: 'active',
        startedAt: mainSess?.startedAt || Date.now(),
        tokensOut: mainSess?.tokensOut || 0,
        tokensIn: mainSess?.tokensIn || 0,
      },
      agents: subagents,
      totalSessions: sessions.length,
      updatedAt: Date.now()
    }
  } catch (e) {
    return { boss: null, agents: [], error: e.message, updatedAt: Date.now() }
  }
}

function getBoss() {
  return { name: 'Neymar', model: 'claude-sonnet-4-6', modelShort: 'Sonnet 4.6', status: 'active', startedAt: Date.now() }
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')
  if (req.url === '/sessions') {
    res.end(JSON.stringify(getSessions()))
  } else {
    res.end(JSON.stringify({ ok: true, port: PORT }))
  }
})

server.listen(PORT, () => console.log(`Office API on :${PORT}`))
