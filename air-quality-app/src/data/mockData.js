// mockData.js — seuils de securite utilises dans toute l'application

// ── Seuils de securite ────────────────────────────────────────────────────────
export const THRESHOLDS = {
  co:              { danger: 1500, warning: 750, unit: 'ppm', sensor: 'MQ-7'   },
  gaz_inflammable: { danger: 1100, warning: 550, unit: 'ppm', sensor: 'MQ-2'   },
  cov:             { danger: 1100, warning: 550, unit: 'ppm', sensor: 'MQ-135' },
  temperature:     { danger: 40,   warning: 35,  unit: 'C',   sensor: 'DHT22'  },
  humidity:        { danger: 80,   warning: 70,  unit: '%',   sensor: 'DHT22'  },
}

export const history24h = [
  { time: '00h', co: 180, gaz: 320, cov: 85,  temp: 21.5, hum: 45 },
  { time: '04h', co: 145, gaz: 270, cov: 72,  temp: 20.5, hum: 48 },
  { time: '08h', co: 320, gaz: 680, cov: 145, temp: 23.5, hum: 42 },
  { time: '12h', co: 480, gaz: 1100,cov: 210, temp: 26.0, hum: 38 },
  { time: '16h', co: 460, gaz: 1050,cov: 195, temp: 26.5, hum: 37 },
  { time: '20h', co: 310, gaz: 720, cov: 138, temp: 24.0, hum: 41 },
  { time: '24h', co: 422, gaz: 1050,cov: 128, temp: 24.0, hum: 40 },
]

export const spaces = [
  { id: 1, name: 'Bureau principal',   type: 'Bureau',  icon: '🏢', co: 422,  gaz_inflammable: 1050, cov: 128, temperature: 24.0, humidity: 40, status: 'warning',  lastUpdate: '2026-06-24T10:32:00', sensors: ['MQ-2','MQ-7','MQ-135','DHT22'] },
  { id: 2, name: 'Salle de reunion',   type: 'Salle',   icon: '🪑', co: 85,   gaz_inflammable: 210,  cov: 62,  temperature: 22.5, humidity: 52, status: 'good',     lastUpdate: '2026-06-24T10:30:00', sensors: ['MQ-2','MQ-7','MQ-135','DHT22'] },
  { id: 3, name: 'Cuisine',            type: 'Cuisine', icon: '🍳', co: 680,  gaz_inflammable: 2100, cov: 320, temperature: 32.0, humidity: 65, status: 'critical', lastUpdate: '2026-06-24T10:29:00', sensors: ['MQ-2','MQ-7','MQ-135','DHT22'] },
  { id: 4, name: 'Atelier technique',  type: 'Atelier', icon: '🔧', co: 310,  gaz_inflammable: 780,  cov: 420, temperature: 28.0, humidity: 44, status: 'warning',  lastUpdate: '2026-06-24T10:31:00', sensors: ['MQ-2','MQ-7','MQ-135','DHT22'] },
  { id: 5, name: 'Salle de classe',    type: 'Classe',  icon: '📚', co: 120,  gaz_inflammable: 180,  cov: 95,  temperature: 23.0, humidity: 50, status: 'good',     lastUpdate: '2026-06-24T10:28:00', sensors: ['MQ-2','MQ-7','MQ-135','DHT22'] },
  { id: 6, name: 'Couloir / Entree',   type: 'Couloir', icon: '🚪', co: 42,   gaz_inflammable: 95,   cov: 38,  temperature: 21.5, humidity: 55, status: 'good',     lastUpdate: '2026-06-24T10:33:00', sensors: ['MQ-2','MQ-7','DHT22'] },
]

export const alerts = [
  { id: 1, severity: 'critical', title: 'Gaz inflammable critique', space: 'Cuisine', sensor: 'MQ-2',   pollutant: 'Gaz inflammable', value: 2100, threshold: 1000, unit: 'ppm', time: '2026-06-24T10:29:00', acknowledged: false, telegram_sent: true  },
  { id: 2, severity: 'critical', title: 'CO dangereux',             space: 'Cuisine', sensor: 'MQ-7',   pollutant: 'CO',              value: 680,  threshold: 50,   unit: 'ppm', time: '2026-06-24T10:29:00', acknowledged: false, telegram_sent: true  },
  { id: 3, severity: 'warning',  title: 'CO eleve',                 space: 'Bureau',  sensor: 'MQ-7',   pollutant: 'CO',              value: 422,  threshold: 25,   unit: 'ppm', time: '2026-06-24T10:32:00', acknowledged: false, telegram_sent: true  },
  { id: 4, severity: 'warning',  title: 'COV eleves',               space: 'Atelier', sensor: 'MQ-135', pollutant: 'COV',             value: 420,  threshold: 250,  unit: 'ppm', time: '2026-06-24T10:31:00', acknowledged: false, telegram_sent: false },
]
