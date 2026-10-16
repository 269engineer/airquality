const { getMQTTClient } = require('../config/mqtt')
const { pool }          = require('../config/db')
const alertService      = require('./alertService')

const TOPIC = process.env.MQTT_TOPIC || 'esp32/airquality'
let _io = null

function setSocketIO(io) { _io = io }

function startMQTTListener() {
  const client = getMQTTClient()
  client.subscribe(TOPIC, { qos: 1 }, (err) => {
    if (err) console.error('Impossible de souscrire:', TOPIC, err.message)
    else     console.log('📡 Souscrit au topic MQTT:', TOPIC)
  })
  client.on('message', async (topic, payload) => {
    if (topic !== TOPIC) return
    await handleMessage(payload.toString())
  })
}

async function handleMessage(rawPayload) {
  let data
  try { data = JSON.parse(rawPayload) }
  catch (e) { console.error('Payload MQTT invalide:', rawPayload); return }

  const { temperature, humidity, mq7 = 0, mq2 = 0, mq135 = 0 } = data

  if (temperature == null || humidity == null) {
    console.warn('Payload incomplet — temp/hum manquants'); return
  }

  // Données déjà corrigées par l'ESP32 — pas de recalcul côté backend
  const co_corrected  = mq7
  const gaz_corrected = mq2
  const cov_corrected = mq135

  // Sauvegarder dans la table airquality
  let insertId
  try {
    const [result] = await pool.execute(
      'INSERT INTO airquality (mq2, mq7, mq135, temp, hum) VALUES (?, ?, ?, ?, ?)',
      [mq2, mq7, mq135, temperature, humidity]
    )
    insertId = result.insertId
  } catch (err) {
    console.error('Erreur insertion MySQL:', err.message); return
  }

  const reading = {
    id: insertId, space_id: 1,
    temperature, humidity,
    co_raw:  mq7,  gaz_raw:  mq2,  cov_raw: mq135,
    co_corrected, gaz_corrected, cov_corrected,
    created_at: new Date().toISOString(),
  }

  console.log(`📊 #${insertId} | mq7:${mq7} mq2:${mq2} mq135:${mq135} | T:${temperature}C H:${humidity}%`)

  // Verifier les seuils sur valeurs brutes → inserer alertes si depassement
  await alertService.checkThresholds(reading, _io)

  // Diffuser la lecture en temps reel
  if (_io) _io.emit('new_reading', reading)
}

module.exports = { startMQTTListener, setSocketIO }
