-- JamVault - Script de creación de BD
-- Ejecutar en phpMyAdmin: Importar este archivo
CREATE DATABASE IF NOT EXISTS jamvault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jamvault;

DROP TABLE IF EXISTS tabs;
CREATE TABLE IF NOT EXISTS tabs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  artist      VARCHAR(200) NOT NULL,
  genre       VARCHAR(100) DEFAULT NULL,
  difficulty  TINYINT DEFAULT 1 COMMENT '1-5 (1=Fácil, 5=Experto)',
  file        VARCHAR(300) NOT NULL COMMENT 'Ruta relativa desde raíz del proyecto: tabs/nombre.gpx',
  views       INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserta datos de ejemplo (borrar o completar con archivos reales)
INSERT INTO tabs (title, artist, genre, difficulty, file, views) VALUES
('Nothing Else Matters', 'Metallica', 'Heavy Metal', 3, 'tabs/Metallica - Nothing Else Matters.gp3', 9500),
('Stairway to Heaven', 'Led Zeppelin', 'Rock Clásico', 4, 'tabs/Led Zeppelin - Stairway To Heaven.gp3', 8200),
('Smells Like Teen Spirit', 'Nirvana', 'Grunge', 2, 'tabs/Nirvana - Smells Like Teen Spirit.gp4', 7800),
('Enter Sandman', 'Metallica', 'Heavy Metal', 3, 'tabs/Metallica - Enter Sandman (6).gp3', 7100),
('Hotel California', 'Eagles', 'Rock', 3, 'tabs/Eagles (The) - Hotel California (2).gp3', 6500),
('Sweet Child O Mine', 'Guns N Roses', 'Hard Rock', 4, 'tabs/Guns N Roses - Sweet Child O Mine.gp3', 6000);

-- ==========================================
-- USER PROFILES & SAVED DATA SYSTEM
-- ==========================================

DROP TABLE IF EXISTS user_songbook;
DROP TABLE IF EXISTS user_jamstudio_projects;
DROP TABLE IF EXISTS user_exercises;
DROP TABLE IF EXISTS users;

-- 1. Users Table
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Exercises
CREATE TABLE user_exercises (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  title         VARCHAR(150) NOT NULL,
  content       TEXT NOT NULL COMMENT 'JSON o texto del ejercicio',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. JamStudio Projects
CREATE TABLE user_jamstudio_projects (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  name          VARCHAR(150) NOT NULL,
  project_data  LONGTEXT NOT NULL COMMENT 'JSON state of the JamStudio project',
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. User Songbook (Kanban lists)
CREATE TABLE user_songbook (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  tab_id        INT NOT NULL,
  category      ENUM('want', 'progress', 'done') NOT NULL,
  added_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tab_id) REFERENCES tabs(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_tab (user_id, tab_id) -- A user can only have a song in one category at a time
);
