const mqtt = require('mqtt')
require('dotenv').config()

let client = null

/**
 * Crée et retourne le client MQTT connecté au broker EMQX Cloud (TLS).
 * Appeler une seule fois au démarrage du serveur.
 */
function createMQTTClient() {
  if (client) return client

  const options = {
    clientId:  process.env.MQTT_CLIENT_ID || `backend-qai-${Date.now()}`,
    username:  process.env.MQTT_USER,
    password:  process.env.MQTT_PASSWORD,
    clean:     true,
    reconnectPeriod: 5000,   // reconnexion automatique toutes les 5s
    connectTimeout:  10000,
  }

  const brokerUrl = process.env.MQTT_BROKER || 'mqtts://n61222f2.ala.eu-central-1.emqxsl.com:8883'
  client = mqtt.connect(brokerUrl, options)

  client.on('connect', () => {
    console.log('✅ MQTT connecté —', brokerUrl)
  })

  client.on('reconnect', () => {
    console.log('🔄 MQTT reconnexion en cours...')
  })

  client.on('error', (err) => {
    console.error('❌ Erreur MQTT:', err.message)
  })

  client.on('offline', () => {
    console.warn('⚠️  MQTT hors ligne')
  })

  return client
}

function getMQTTClient() {
  if (!client) throw new Error('Client MQTT non initialisé — appelle createMQTTClient() d\'abord')
  return client
}

module.exports = { createMQTTClient, getMQTTClient }
