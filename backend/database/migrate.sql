-- Mise à jour d'une base existante (sans supprimer les données)

USE car_rental;

-- Colonne created_at sur reservations (si absente)
SET @has_res_created_at := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reservations'
    AND COLUMN_NAME = 'created_at'
);

SET @sql_res_created_at := IF(
  @has_res_created_at = 0,
  'ALTER TABLE reservations ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER statut',
  'SELECT 1'
);
PREPARE stmt FROM @sql_res_created_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agrandir le champ image pour les URLs longues
ALTER TABLE cars MODIFY image VARCHAR(500) NULL;

-- Ajouter les champs OAuth pour Google et Facebook
SET @has_google_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'google_id'
);

SET @sql_google_id := IF(
  @has_google_id = 0,
  'ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER email',
  'SELECT 1'
);
PREPARE stmt FROM @sql_google_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_facebook_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'facebook_id'
);

SET @sql_facebook_id := IF(
  @has_facebook_id = 0,
  'ALTER TABLE users ADD COLUMN facebook_id VARCHAR(255) NULL UNIQUE AFTER google_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql_facebook_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Permettre au mot de passe d'être NULL (pour les inscriptions via Google/Facebook)
ALTER TABLE users MODIFY mot_de_passe VARCHAR(255) NULL;

