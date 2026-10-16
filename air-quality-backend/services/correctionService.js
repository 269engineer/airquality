/**
 * Formule de correction thermohygrométrique (Wong et al., 2018)
 * ppm_corrigé = ppm_brut / (1 + a*(T-25) + b*(HR-50))
 *
 * Coefficients par capteur (issus du rapport PFE) :
 *   MQ-7  (CO)              : a=0.018, b=0.006
 *   MQ-2  (Gaz inflammable) : a=0.020, b=0.005
 *   MQ-135 (COV)            : a=0.015, b=0.004
 */

const COEFFICIENTS = {
  'MQ-7':   { a: 0.018, b: 0.006 },
  'MQ-2':   { a: 0.020, b: 0.005 },
  'MQ-135': { a: 0.015, b: 0.004 },
}

/**
 * Corrige une mesure ppm selon la température et l'humidité.
 * @param {number} rawPPM   - valeur brute du capteur
 * @param {number} temp     - température en °C (DHT22)
 * @param {number} humidity - humidité relative en % (DHT22)
 * @param {string} sensor   - 'MQ-7' | 'MQ-2' | 'MQ-135'
 * @returns {number} ppm corrigé, arrondi à 2 décimales
 */
function correctPPM(rawPPM, temp, humidity, sensor) {
  const { a, b } = COEFFICIENTS[sensor] || { a: 0.02, b: 0.005 }
  const factor = 1 + a * (temp - 25) + b * (humidity - 50)
  // Éviter une division par zéro ou un facteur négatif
  if (factor <= 0) return rawPPM
  return Math.round((rawPPM / factor) * 100) / 100
}

module.exports = { correctPPM, COEFFICIENTS }
