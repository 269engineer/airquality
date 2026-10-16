const express = require('express')
const router  = express.Router()
const { pool } = require('../config/db')

// Les valeurs mq7/mq2/mq135 sont déjà corrigées par l'ESP32
function enrich(row) {
  const co_corrected  = row.mq7   || 0
  const gaz_corrected = row.mq2   || 0
  const cov_corrected = row.mq135 || 0
  return {
    id: 1, name: 'Espace principal', type: 'Bureau', icon: 'building',
    temperature: row.temp || 25,
    humidity:    row.hum  || 50,
    co: co_corrected, gaz_inflammable: gaz_corrected, cov: cov_corrected,
    co_corrected, gaz_corrected, cov_corrected,
    last_update: row.ts,
  }
}

// GET /api/spaces — espace unique base sur la derniere mesure
router.get('/', async (req, res) => {
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

// GET /api/spaces/:id
router.get('/:id', async (req, res) => {
  try {
    const [[latest]] = await pool.execute(
      'SELECT * FROM airquality ORDER BY ts DESC LIMIT 1'
    )
    if (!latest) return res.status(404).json({ success: false, error: 'Aucune donnee' })

    const [histRows] = await pool.execute(
      `SELECT * FROM airquality
       WHERE ts >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY ts ASC`
    )
    const history = histRows.map(r => {
      const co_corrected  = r.mq7   || 0
      const gaz_corrected = r.mq2   || 0
      const cov_corrected = r.mq135 || 0
      return { id: r.id, temperature: r.temp, humidity: r.hum,
               co: co_corrected, gaz: gaz_corrected, cov: cov_corrected,
               co_corrected, gaz_corrected, cov_corrected,
               created_at: r.ts }
    })

    res.json({ success: true, data: { ...enrich(latest), history } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
