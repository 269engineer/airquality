const { pool }        = require('../config/db')
const telegramService = require('./telegramService')

// Seuils sur valeurs BRUTES du capteur (ADC / ppm brut de l'ESP32)
const THRESHOLDS = {
  co:          { sensor: 'MQ-7',   pollutant: 'CO (Monoxyde de carbone)',          unit: 'ppm', warning: 750,  danger: 1500 },
  gaz:         { sensor: 'MQ-2',   pollutant: 'Gaz inflammable',                   unit: 'ppm', warning: 550,  danger: 1100 },
  cov:         { sensor: 'MQ-135', pollutant: 'COV (Composes Organiques Volatils)', unit: 'ppm', warning: 550,  danger: 1100 },
  temperature: { sensor: 'DHT22',  pollutant: 'Temperature',                       unit: 'C',   warning: 35,   danger: 40   },
  humidity:    { sensor: 'DHT22',  pollutant: 'Humidite',                          unit: '%',   warning: 70,   danger: 80   },
}

const COOLDOWN_MS   = 60 * 1000   // 1 minute entre deux alertes identiques
const lastAlertTime = {}

async function checkThresholds(reading, io = null) {
  // On compare les valeurs BRUTES des capteurs (co_raw, gaz_raw, cov_raw)
  const checks = [
    { key: 'co',          value: reading.co_raw  ?? reading.co_corrected  },
    { key: 'gaz',         value: reading.gaz_raw ?? reading.gaz_corrected },
    { key: 'cov',         value: reading.cov_raw ?? reading.cov_corrected },
    { key: 'temperature', value: reading.temperature },
    { key: 'humidity',    value: reading.humidity    },
  ]

  for (const { key, value } of checks) {
    const cfg = THRESHOLDS[key]
    if (value == null || isNaN(value)) continue

    let severity = null
    if      (value >= cfg.danger)  severity = 'critical'
    else if (value >= cfg.warning) severity = 'warning'
    if (!severity) continue

    // Anti-spam : 1 alerte par capteur par minute max
    const now = Date.now()
    if (now - (lastAlertTime[key] || 0) < COOLDOWN_MS) continue
    lastAlertTime[key] = now

    const alert = await createAlert({
      severity,
      sensor:    cfg.sensor,
      pollutant: cfg.pollutant,
      value:     parseFloat(value.toFixed(2)),
      threshold: severity === 'critical' ? cfg.danger : cfg.warning,
      unit:      cfg.unit,
    })
    if (!alert) continue

    console.log(`🚨 Alerte ${severity.toUpperCase()} — ${cfg.pollutant}: ${value} ${cfg.unit}`)

    // Emission Socket.IO temps reel
    if (io) io.emit('new_alert', alert)

    // Telegram si critique
    if (severity === 'critical') {
      const sent = await telegramService.sendAlert(alert)
      if (sent) {
        await pool.execute('UPDATE alerts SET telegram_sent = 1 WHERE id = ?', [alert.id])
        alert.telegram_sent = true
      }
    }
  }
}

async function createAlert({ severity, sensor, pollutant, value, threshold, unit }) {
  const title   = `${severity === 'critical' ? 'CRITIQUE' : 'Attention'} — ${pollutant}: ${value} ${unit}`
  const message = `Capteur ${sensor} : ${value} ${unit} detecte. Seuil de ${severity === 'critical' ? 'danger' : 'securite'} depasse (${threshold} ${unit}).`

  try {
    const [result] = await pool.execute(
      `INSERT INTO alerts (severity, sensor, pollutant, value, threshold_val, unit, title, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [severity, sensor, pollutant, value, threshold, unit, title, message]
    )
    console.log(`✅ Alerte #${result.insertId} inseree en base`)
    return {
      id:            result.insertId,
      severity,      sensor, pollutant,
      value,         threshold_val: threshold,
      unit,          title, message,
      acknowledged:  false,
      telegram_sent: false,
      created_at:    new Date().toISOString(),
    }
  } catch (err) {
    console.error('❌ Erreur insertion alerte:', err.message)
    return null
  }
}

module.exports = { checkThresholds, createAlert, THRESHOLDS }
