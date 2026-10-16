const express = require('express')
const router  = express.Router()
const { pool } = require('../config/db')

// GET /api/alerts
router.get('/', async (req, res) => {
  const { severity, acknowledged, space_id } = req.query
  const limit  = Math.min(parseInt(req.query.limit) || 50, 200)
  const offset = parseInt(req.query.offset) || 0

  const conditions = []
  const params     = []

  if (severity)     { conditions.push('severity = ?');     params.push(severity) }
  if (space_id)     { conditions.push('space_id = ?');     params.push(parseInt(space_id)) }
  if (acknowledged !== undefined) {
    conditions.push('acknowledged = ?')
    params.push(acknowledged === 'true' || acknowledged === '1' ? 1 : 0)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const [rows] = await pool.query(
      `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    )
    const [cnt] = await pool.query(
      `SELECT COUNT(*) AS total FROM alerts ${where}`,
      params
    )
    res.json({ success: true, data: rows, total: cnt[0].total, limit, offset })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    await pool.execute('UPDATE alerts SET acknowledged = 1 WHERE id = ?', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PATCH /api/alerts/acknowledge-all
router.patch('/acknowledge-all', async (req, res) => {
  try {
    const [r] = await pool.execute('UPDATE alerts SET acknowledged = 1 WHERE acknowledged = 0')
    res.json({ success: true, updated: r.affectedRows })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE /api/alerts/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    await pool.execute('DELETE FROM alerts WHERE id = ?', [id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/alerts/stats
router.get('/stats', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        SUM(severity = 'critical' AND acknowledged = 0) AS critical,
        SUM(severity = 'warning'  AND acknowledged = 0) AS warning,
        SUM(severity = 'info'     AND acknowledged = 0) AS info,
        SUM(acknowledged = 0)                           AS unread,
        COUNT(*)                                        AS total
      FROM alerts
    `)
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

module.exports = router
