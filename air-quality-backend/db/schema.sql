-- ═══════════════════════════════════════════════════════════════
--  Schéma MySQL — Projet QAI (Qualité de l'Air Intérieur)
--  ESP32 + MQ-2 + MQ-7 + MQ-135 + DHT22
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS airquality
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE airquality;

-- ───────────────────────────────────────────────────────────────
-- Table : espaces surveillés (pièces avec capteurs)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spaces (
  id           INT          AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  type         VARCHAR(50)  NOT NULL,
  icon         VARCHAR(10)  DEFAULT '🏢',
  description  TEXT,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Données initiales
INSERT INTO spaces (name, type, icon, description) VALUES
  ('Bureau principal',  'Bureau',  '🏢', 'Bureau avec poste de travail principal'),
  ('Salle de réunion',  'Salle',   '🪑', 'Salle de réunion / conférence'),
  ('Cuisine / Cafétéria','Cuisine','🍳', 'Espace cuisine et cafétéria'),
  ('Atelier technique', 'Atelier', '🔧', 'Atelier technique et maintenance'),
  ('Salle de classe',   'Classe',  '📚', 'Salle de cours et formation'),
  ('Couloir / Entrée',  'Couloir', '🚪', 'Couloir et zone d\'entrée')
ON DUPLICATE KEY UPDATE name = name;

-- ───────────────────────────────────────────────────────────────
-- Table : mesures des capteurs (une ligne = une lecture ESP32)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS readings (
  id              BIGINT       AUTO_INCREMENT PRIMARY KEY,
  space_id        INT          DEFAULT 1,            -- espace source (FK)
  -- DHT22
  temperature     FLOAT        NOT NULL,             -- °C
  humidity        FLOAT        NOT NULL,             -- %
  -- MQ-7 (CO)
  co_raw          FLOAT        NOT NULL,             -- ppm brut
  co_corrected    FLOAT        NOT NULL,             -- ppm corrigé (Wong)
  -- MQ-2 (Gaz inflammable)
  gaz_raw         FLOAT        NOT NULL,
  gaz_corrected   FLOAT        NOT NULL,
  -- MQ-135 (COV)
  cov_raw         FLOAT        NOT NULL,
  cov_corrected   FLOAT        NOT NULL,
  -- Score global calculé
  qai_score       INT          NOT NULL DEFAULT 0,
  -- Timestamp
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_readings_space FOREIGN KEY (space_id) REFERENCES spaces(id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_readings_created_at ON readings (created_at DESC);
CREATE INDEX idx_readings_space      ON readings (space_id, created_at DESC);

-- ───────────────────────────────────────────────────────────────
-- Table : alertes générées par dépassement de seuil
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id              INT          AUTO_INCREMENT PRIMARY KEY,
  space_id        INT,
  severity        ENUM('critical','warning','info') NOT NULL DEFAULT 'warning',
  -- Polluant concerné
  sensor          VARCHAR(20)  NOT NULL,             -- MQ-2, MQ-7, MQ-135, DHT22
  pollutant       VARCHAR(50)  NOT NULL,             -- CO, Gaz inflammable, COV...
  value           FLOAT        NOT NULL,             -- valeur mesurée
  threshold       FLOAT        NOT NULL,             -- seuil franchi
  unit            VARCHAR(10)  NOT NULL DEFAULT 'ppm',
  -- Contenu
  title           VARCHAR(200) NOT NULL,
  message         TEXT,
  -- État
  acknowledged    TINYINT(1)   NOT NULL DEFAULT 0,
  telegram_sent   TINYINT(1)   NOT NULL DEFAULT 0,
  -- Timestamps
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_alerts_space FOREIGN KEY (space_id) REFERENCES spaces(id)
);

CREATE INDEX idx_alerts_severity   ON alerts (severity, acknowledged);
CREATE INDEX idx_alerts_created_at ON alerts (created_at DESC);
