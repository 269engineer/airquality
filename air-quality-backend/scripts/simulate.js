/**
 * scripts/simulate.js
 * Simule l'ESP32 en publiant des données sur le broker MQTT.
 * Usage : node scripts/simulate.js
 */

require('dotenv').config()
const mqtt = require('mqtt')

const BROKER   = process.env.MQTT_BROKER   || 'mqtts://n61222f2.ala.eu-central-1.emqxsl.com:8883'
const TOPIC    = process.env.MQTT_TOPIC    || 'esp32/airquality'
const USER     = process.env.MQTT_USER
const PASSWORD = process.env.MQTT_PASSWORD

console.log('\n🧪 Simulateur ESP32 — AirWatch QAI')
console.log('   Broker :', BROKER)
console.log('   Topic  :', TOPIC)
console.log('   Envoi  : 1 message / 5 secondes\n')

const client = mqtt.connect(BROKER, {
  clientId:       'esp32-simulator-' + Date.now(),
  username:       USER,
  password:       PASSWORD,
  clean:          true,
  reconnectPeriod: 5000,
})

client.on('connect', () => {
  console.log('✅ Connecté au broker MQTT\n')

  let tick = 0
  function send() {
    tick++

    // Simule 3 espaces (space_id 1, 2, 3) en rotation
    const spaceId = (tick % 3) + 1

    // Valeurs réalistes + légère variation aléatoire
    const temp = 22 + Math.random() * 6
    const hum  = 40 + Math.random() * 20
    const mq7  = 5  + Math.random() * 30   // CO
    const mq2  = 80 + Math.random() * 200  // Gaz inflammable
    const mq135= 50 + Math.random() * 150  // COV

    const payload = JSON.stringify({
      temperature: parseFloat(temp.toFixed(1)),
      humidity:    parseFloat(hum.toFixed(1)),
      mq7:         parseFloat(mq7.toFixed(1)),
      mq2:         parseFloat(mq2.toFixed(1)),
      mq135:       parseFloat(mq135.toFixed(1)),
      space_id:    spaceId,
    })

    client.publish(TOPIC, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ Erreur publication:', err.message)
      } else {
        console.log(`📤 [${new Date().toLocaleTimeString()}] Espace #${spaceId} →`, JSON.parse(payload))
      }
    })
  }

  // Premier envoi immédiat
  send()
  // Puis toutes les 5 secondes
  const interval = setInterval(send, 5000)

  // Arrêt propre avec Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(interval)
    client.end()
    console.log('\n⏹  Simulation arrêtée.')
    process.exit(0)
  })
})

client.on('error', (err) => {
  console.error('❌ Erreur MQTT:', err.message)
})

client.on('reconnect', () => {
  console.log('🔄 Reconnexion...')
})
