/**
 * ═══════════════════════════════════════════════════════════════
 *  AirWatch Backend — Serveur principal
 *  Stack : Node.js + Express + MQTT + MySQL + Socket.IO
 *  Projet PFE 2026 — Qualité de l'Air Intérieur (QAI)
 * ═══════════════════════════════════════════════════════════════
 */

require('dotenv').config()

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const cors       = require('cors')

const { testConnection }    = require('./config/db')
const { createMQTTClient }  = require('./config/mqtt')
const { startMQTTListener, setSocketIO } = require('./services/mqttService')

// ── Routes ────────────────────────────────────────────────────
const readingsRouter = require('./routes/readings')
const alertsRouter   = require('./routes/alerts')
const spacesRouter   = require('./routes/spaces')

const PORT        = process.env.PORT         || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// ── Express ───────────────────────────────────────────────────
const app    = express()
const server = http.createServer(app)

app.use(cors({
  origin:      FRONTEND_URL,
  methods:     ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}))
app.use(express.json())

// ── Socket.IO ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      FRONTEND_URL,
    methods:     ['GET', 'POST'],
    credentials: true,
  },
})

io.on('connection', (socket) => {
  console.log(`🔌 Client connecté — socket ${socket.id}`)
  socket.on('disconnect', () => {
    console.log(`🔌 Client déconnecté — socket ${socket.id}`)
  })
})

// ── Routes API ────────────────────────────────────────────────
app.use('/api/readings', readingsRouter)
app.use('/api/alerts',   alertsRouter)
app.use('/api/spaces',   spacesRouter)

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    project:   'AirWatch QAI — PFE 2026',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()) + 's',
  })
})

// ── Démarrage ─────────────────────────────────────────────────
async function start() {
  console.log('\n🚀 Démarrage AirWatch Backend...\n')

  // 1. Connexion MySQL
  await testConnection()

  // 2. Client MQTT
  createMQTTClient()

  // 3. Injecter Socket.IO dans le service MQTT
  setSocketIO(io)

  // 4. Démarrer la souscription MQTT
  startMQTTListener()

  // 5. Démarrer le serveur HTTP
  server.listen(PORT, () => {
    console.log(`\n🌐 API disponible sur http://localhost:${PORT}`)
    console.log(`   GET  /api/health`)
    console.log(`   GET  /api/readings/latest`)
    console.log(`   GET  /api/readings/history?hours=24&space_id=1`)
    console.log(`   GET  /api/alerts`)
    console.log(`   GET  /api/spaces\n`)
  })
}

start().catch((err) => {
  console.error('❌ Erreur fatale au démarrage:', err.message)
  process.exit(1)
})
