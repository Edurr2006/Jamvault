-- JamVault - Script de creación de BD
-- Ejecutar en phpMyAdmin: Importar este archivo
CREATE DATABASE IF NOT EXISTS jamvault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jamvault;

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
('Nothing Else Matters', 'Metallica', 'Heavy Metal', 3, 'tabs/metallica_nothing_else_matters.gpx', 9500),
('Stairway to Heaven', 'Led Zeppelin', 'Rock Clásico', 4, 'tabs/led_zeppelin_stairway_to_heaven.gpx', 8200),
('Smells Like Teen Spirit', 'Nirvana', 'Grunge', 2, 'tabs/nirvana_smells_like_teen_spirit.gpx', 7800),
('Enter Sandman', 'Metallica', 'Heavy Metal', 3, 'tabs/metallica_enter_sandman.gpx', 7100),
('Hotel California', 'Eagles', 'Rock', 3, 'tabs/eagles_hotel_california.gpx', 6500),
('Sweet Child O Mine', 'Guns N Roses', 'Hard Rock', 4, 'tabs/gnr_sweet_child_o_mine.gpx', 6000);
