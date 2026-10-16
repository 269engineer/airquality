const mysql = require('mysql2/promise')
require('dotenv').config()

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'airquality',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
})

async function initTables() {
  const conn = await pool.getConnection()
  try {
    // La table airquality existe deja — on cree seulement alerts
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS alerts (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        severity      ENUM('critical','warning','info') NOT NULL DEFAULT 'warning',
        sensor        VARCHAR(20)  NOT NULL,
        pollutant     VARCHAR(50)  NOT NULL,
        value         FLOAT        NOT NULL,
        threshold_val FLOAT        NOT NULL,
        unit          VARCHAR(10)  NOT NULL DEFAULT 'ppm',
        title         VARCHAR(200) NOT NULL,
        message       TEXT,
        acknowledged  TINYINT(1)   NOT NULL DEFAULT 0,
        telegram_sent TINYINT(1)   NOT NULL DEFAULT 0,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sev (severity, acknowledged),
        INDEX idx_ts  (created_at DESC)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `)
    console.log('✅ Table alerts OK')
  } finally {
    conn.release()
  }
}

async function testConnection() {
  try {
    const conn = await pool.getConnection()
    console.log('✅ MySQL connecte — base:', process.env.DB_NAME)
    conn.release()
    await initTables()
  } catch (err) {
    console.error('❌ Erreur MySQL:', err.message)
    process.exit(1)
  }
}

module.exports = { pool, testConnection }
