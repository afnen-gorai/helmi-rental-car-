const db = require("../config/database");

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value) {
	if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) {
		return null;
	}

	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));

	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}

	return date;
}

function formatDateOnly(date) {
	return date.toISOString().slice(0, 10);
}

exports.getAllCars = (req, res) => {
	db.query(
		"SELECT id, marque AS brand, modele AS model, annee AS year, prix_jour AS price_per_day, image AS image_url, disponible AS available FROM cars ORDER BY id DESC",
		(err, cars) => {
		if (err) {
			return res.status(500).json({ message: "Database error", error: err });
		}

		res.json(cars);
		}
	);
};

exports.getCarById = (req, res) => {
	const { id } = req.params;

	db.query(
		"SELECT id, marque AS brand, modele AS model, annee AS year, prix_jour AS price_per_day, image AS image_url, disponible AS available FROM cars WHERE id = ?",
		[id],
		(err, cars) => {
		if (err) {
			return res.status(500).json({ message: "Database error", error: err });
		}

		if (cars.length === 0) {
			return res.status(404).json({ message: "Car not found" });
		}

		res.json(cars[0]);
		}
	);
};

exports.createCar = (req, res) => {
	const { brand, model, year, price_per_day, image_url, available } = req.body;

	if (!brand || !model || !price_per_day) {
		return res.status(400).json({ message: "brand, model and price_per_day are required" });
	}

	db.query(
		"INSERT INTO cars (marque, modele, annee, prix_jour, image, disponible) VALUES (?, ?, ?, ?, ?, ?)",
		[brand, model, year || null, price_per_day, image_url || null, available ?? true],
		(err, result) => {
			if (err) {
				return res.status(500).json({ message: "Database error", error: err });
			}

			res.status(201).json({
				message: "Car created",
				carId: result.insertId,
			});
		}
	);
};

exports.updateCar = (req, res) => {
	const { id } = req.params;
	const { brand, model, year, price_per_day, image_url, available } = req.body;

	if (!brand || !model || !price_per_day) {
		return res.status(400).json({ message: "brand, model and price_per_day are required" });
	}

	db.query(
		"UPDATE cars SET marque = ?, modele = ?, annee = ?, prix_jour = ?, image = ?, disponible = ? WHERE id = ?",
		[brand, model, year || null, price_per_day, image_url || null, available, id],
		(err, result) => {
			if (err) {
				return res.status(500).json({ message: "Database error", error: err });
			}

			if (result.affectedRows === 0) {
				return res.status(404).json({ message: "Car not found" });
			}

			res.json({ message: "Car updated" });
		}
	);
};

exports.deleteCar = (req, res) => {
	const { id } = req.params;

	db.query("DELETE FROM cars WHERE id = ?", [id], (err, result) => {
		if (err) {
			return res.status(500).json({ message: "Database error", error: err });
		}

		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Car not found" });
		}

		res.json({ message: "Car deleted" });
	});
};

exports.getAvailableCars = (req, res) => {
	const { start_date, end_date } = req.query;

	if (!start_date || !end_date) {
		return res.status(400).json({ message: "start_date and end_date are required" });
	}

	const parsedStartDate = parseDateOnly(start_date);
	const parsedEndDate = parseDateOnly(end_date);

	if (!parsedStartDate || !parsedEndDate) {
		return res.status(400).json({ message: "Invalid start_date or end_date" });
	}

	if (parsedEndDate <= parsedStartDate) {
		return res.status(400).json({ message: "end_date must be after start_date" });
	}

	const normalizedStartDate = formatDateOnly(parsedStartDate);
	const normalizedEndDate = formatDateOnly(parsedEndDate);

	db.query(
		"SELECT id, marque AS brand, modele AS model, annee AS year, prix_jour AS price_per_day, image AS image_url, disponible AS available FROM cars WHERE disponible = 1 AND id NOT IN (SELECT car_id FROM reservations WHERE statut <> 'annulee' AND date_debut < ? AND date_fin > ?)",
		[normalizedEndDate, normalizedStartDate],
		(err, cars) => {
			if (err) {
				return res.status(500).json({ message: "Database error", error: err });
			}

			res.json(cars);
		}
	);
};
