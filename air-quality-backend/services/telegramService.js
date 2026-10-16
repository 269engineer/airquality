/**
 * Service Telegram — envoi de notifications d'alertes critiques
 * Désactivé si TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID n'est pas configuré dans .env
 */

require('dotenv').config()

let bot = null

function initBot() {
  const token = process.env.TELEGRAM_TOKEN
  if (!token) return null

  try {
    const TelegramBot = require('node-telegram-bot-api')
    return new TelegramBot(token)
  } catch (err) {
    console.warn('⚠️  node-telegram-bot-api non disponible:', err.message)
    return null
  }
}

/**
 * Envoie une alerte vers le chat Telegram configuré.
 * @param {object} alert - objet alerte complet
 * @returns {boolean} true si envoyé avec succès
 */
async function sendAlert(alert) {
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!chatId) return false

  if (!bot) bot = initBot()
  if (!bot) return false

  const emoji = alert.severity === 'critical' ? '🚨' : '⚠️'
  const text  = [
    `${emoji} *ALERTE — ${alert.severity.toUpperCase()}*`,
    ``,
    `*Capteur :* ${alert.sensor}`,
    `*Polluant :* ${alert.pollutant}`,
    `*Valeur :* ${alert.value} ${alert.unit}`,
    `*Seuil :* ${alert.threshold} ${alert.unit}`,
    `*Espace :* #${alert.space_id}`,
    ``,
    `📅 ${new Date().toLocaleString('fr-FR')}`,
  ].join('\n')

  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
    console.log('📨 Telegram envoyé — alerte #' + alert.id)
    return true
  } catch (err) {
    console.error('❌ Erreur envoi Telegram:', err.message)
    return false
  }
}

module.exports = { sendAlert }
