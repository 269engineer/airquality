const express = require('express')
const router  = express.Router()
const { pool } = require('../config/db')

// Transforme une ligne de la table airquality en objet enrichi
// Les valeurs mq7/mq2/mq135 sont déjà corrigées par l'ESP32
function enrich(row) {
  return {
    id: row.id, space_id: 1,
    temperature: row.temp  || 25,
    humidity:    row.hum   || 50,
    co_raw:      row.mq7,   co_corrected:  row.mq7  || 0,
    gaz_raw:     row.mq2,   gaz_corrected: row.mq2  || 0,
    cov_raw:     row.mq135, cov_corrected: row.mq135 || 0,
    created_at: row.ts,
  }
}

// GET /api/readings/latest — derniere mesure
router.get('/latest', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM airquality ORDER BY ts DESC LIMIT 1'
    )
    const data = rows.length ? [enrich(rows[0])] : []
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/readings/history?hours=24
// Filtre relatif a la DERNIERE mesure presente dans la base
// (robuste meme si les donnees sont anciennes / simulees ou si l'horloge
//  serveur differe de l'heure des donnees).
router.get('/history', async (req, res) => {
  const hours = parseInt(req.query.hours) || 24
  try {
    const [rows] = await pool.query(
      `SELECT * FROM airquality
       WHERE ts >= DATE_SUB(
               (SELECT MAX(ts) FROM airquality),
               INTERVAL ? HOUR)
       ORDER BY ts ASC`,
      [hours]
    )
    res.json({ success: true, data: rows.map(enrich), hours })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/readings/all — TOUT le contenu de la base (sans limite)
router.get('/all', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM airquality ORDER BY ts DESC`
    )
    res.json({ success: true, count: rows.length, data: rows.map(enrich) })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/readings?limit=50&offset=0
router.get('/', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 500)
  const offset = parseInt(req.query.offset) || 0
  try {
    const [rows] = await pool.query(
      `SELECT * FROM airquality ORDER BY ts DESC LIMIT ${limit} OFFSET ${offset}`
    )
    res.json({ success: true, data: rows.map(enrich), limit, offset })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
