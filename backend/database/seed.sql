-- Données d'exemple pour car_rental (style Skyscanner Tunis)
-- Réinitialise les voitures de démo (supprime aussi les réservations liées)

USE car_rental;

DELETE FROM reservations;
DELETE FROM cars;

ALTER TABLE cars AUTO_INCREMENT = 1;
ALTER TABLE reservations AUTO_INCREMENT = 1;

INSERT INTO cars (marque, modele, annee, prix_jour, image, disponible) VALUES
(
  'Camelcar',
  'Fiat Tipo',
  2024,
  27.00,
  'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80',
  TRUE
),
(
  'ONE',
  'Hyundai i10',
  2023,
  39.00,
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80',
  TRUE
),
(
  'Budget',
  'Renault Clio',
  2024,
  41.00,
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
  TRUE
),
(
  'Budget',
  'Suzuki Swift',
  2023,
  42.00,
  'https://images.unsplash.com/photo-1494976388531-d1058498ceb8?auto=format&fit=crop&w=800&q=80',
  TRUE
),
(
  'OK Mobility',
  'Hyundai i10 Sport',
  2024,
  49.00,
  'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=800&q=80',
  TRUE
),
(
  'Camelcar',
  'Peugeot 2008',
  2024,
  69.00,
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80',
  TRUE
);
