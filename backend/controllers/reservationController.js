const db = require("../config/database");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
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

function calculateTotalPrice(startDate, endDate, pricePerDay) {
	const durationInDays = Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
	const dailyRate = Number(pricePerDay);

	if (!Number.isFinite(dailyRate) || dailyRate < 0) {
		return null;
	}

	return Math.round(durationInDays * dailyRate * 100) / 100;
}

exports.getAllReservations = (req, res) => {
	db.query(
		"SELECT reservations.id, reservations.user_id, reservations.car_id, reservations.date_debut AS start_date, reservations.date_fin AS end_date, reservations.statut AS status, cars.marque AS car_brand, cars.modele AS car_model, cars.prix_jour AS price_per_day, (DATEDIFF(reservations.date_fin, reservations.date_debut) * cars.prix_jour) AS total_price FROM reservations LEFT JOIN cars ON reservations.car_id = cars.id ORDER BY reservations.id DESC",
		(err, reservations) => {
			if (err) {
				return res.status(500).json({ message: "Database error", error: err });
			}

			res.json(reservations);
		}
	);
};

exports.getMyReservations = (req, res) => {
	db.query(
		"SELECT reservations.id, reservations.user_id, reservations.car_id, reservations.date_debut AS start_date, reservations.date_fin AS end_date, reservations.statut AS status, cars.marque AS car_brand, cars.modele AS car_model, cars.prix_jour AS price_per_day, (DATEDIFF(reservations.date_fin, reservations.date_debut) * cars.prix_jour) AS total_price FROM reservations LEFT JOIN cars ON reservations.car_id = cars.id WHERE reservations.user_id = ? ORDER BY reservations.id DESC",
		[req.user.id],
		(err, reservations) => {
			if (err) {
				return res.status(500).json({ message: "Database error", error: err });
			}

			res.json(reservations);
		}
	);
};

exports.createReservation = (req, res) => {
	const { car_id, start_date, end_date, user_id } = req.body;

	if (!car_id || !start_date || !end_date) {
		return res.status(400).json({ message: "car_id, start_date and end_date are required" });
	}

	const parsedStartDate = parseDateOnly(start_date);
	const parsedEndDate = parseDateOnly(end_date);

	if (!parsedStartDate || !parsedEndDate) {
		return res.status(400).json({ message: "Invalid start_date or end_date" });
	}

	if (parsedEndDate <= parsedStartDate) {
		return res.status(400).json({ message: "end_date must be after start_date" });
	}

	// start date must not be in the past (compare at date precision UTC)
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	if (parsedStartDate < today) {
		return res.status(400).json({ message: "start_date cannot be in the past" });
	}

	const normalizedStartDate = formatDateOnly(parsedStartDate);
	const normalizedEndDate = formatDateOnly(parsedEndDate);

	// allow admin to create for another user via user_id
	const customerId = (req.user && req.user.role === 'admin' && user_id) ? user_id : req.user.id;

	db.query("SELECT id FROM users WHERE id = ?", [customerId], (userErr, userRows) => {
		if (userErr) return res.status(500).json({ message: "Database error", error: userErr });
		if (userRows.length === 0) return res.status(404).json({ message: "User not found" });

		db.query("SELECT id, prix_jour AS price_per_day, disponible AS available FROM cars WHERE id = ?", [car_id], (carErr, cars) => {
			if (carErr) {
				return res.status(500).json({ message: "Database error", error: carErr });
			}

			if (cars.length === 0) {
				return res.status(404).json({ message: "Car not found" });
			}

			const car = cars[0];

			if (!car.available) {
				return res.status(409).json({ message: "Car is not available" });
			}

			const totalPrice = calculateTotalPrice(parsedStartDate, parsedEndDate, car.price_per_day);

			if (totalPrice === null) {
				return res.status(400).json({ message: "Invalid car price" });
			}

			db.query(
				"SELECT id FROM reservations WHERE car_id = ? AND statut <> 'annulee' AND date_debut < ? AND date_fin > ? LIMIT 1",
				[car_id, normalizedEndDate, normalizedStartDate],
				(overlapErr, overlaps) => {
					if (overlapErr) {
						return res.status(500).json({ message: "Database error", error: overlapErr });
					}

					if (overlaps.length > 0) {
						return res.status(409).json({ message: "Car is already booked for these dates" });
					}

					db.query(
						"INSERT INTO reservations (user_id, car_id, date_debut, date_fin, statut) VALUES (?, ?, ?, ?, ?)",
						[customerId, car_id, normalizedStartDate, normalizedEndDate, "en_attente"],
						(insertErr, result) => {
							if (insertErr) {
								return res.status(500).json({ message: "Database error", error: insertErr });
							}

							res.status(201).json({
								message: "Reservation created",
								reservationId: result.insertId,
								total_price: totalPrice,
							});
						}
					);
				}
			);
		});
	});
};

exports.updateReservation = (req, res) => {
	const { id } = req.params;
	const { start_date, end_date, status } = req.body;
	const isAdmin = req.user && req.user.role === 'admin';

	// Case 1: Status only update
	if (status && !start_date && !end_date) {
		const updateQuery = isAdmin
			? "UPDATE reservations SET statut = ? WHERE id = ?"
			: "UPDATE reservations SET statut = ? WHERE id = ? AND user_id = ?";
		const updateParams = isAdmin
			? [status, id]
			: [status, id, req.user.id];

		db.query(updateQuery, updateParams, (err, result) => {
			if (err) return res.status(500).json({ message: "Database error", error: err });
			if (result.affectedRows === 0) return res.status(404).json({ message: "Reservation not found" });
			return res.json({ message: "Reservation status updated", status });
		});
		return;
	}

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
		isAdmin ? "SELECT car_id FROM reservations WHERE id = ?" : "SELECT car_id FROM reservations WHERE id = ? AND user_id = ?",
		isAdmin ? [id] : [id, req.user.id],
		(err, reservations) => {
			if (err) {
				return res.status(500).json({ message: "Database error", error: err });
			}

			if (reservations.length === 0) {
				return res.status(404).json({ message: "Reservation not found" });
			}

			const reservation = reservations[0];

			db.query(
				"SELECT id, prix_jour AS price_per_day FROM cars WHERE id = ?",
				[reservation.car_id],
				(carErr, cars) => {
					if (carErr) {
						return res.status(500).json({ message: "Database error", error: carErr });
					}

					if (cars.length === 0) {
						return res.status(404).json({ message: "Car not found" });
					}

					const car = cars[0];
					const totalPrice = calculateTotalPrice(parsedStartDate, parsedEndDate, car.price_per_day);

					if (totalPrice === null) {
						return res.status(400).json({ message: "Invalid car price" });
					}

					db.query(
						"SELECT id FROM reservations WHERE car_id = ? AND id <> ? AND statut <> 'annulee' AND date_debut < ? AND date_fin > ? LIMIT 1",
						[reservation.car_id, id, normalizedEndDate, normalizedStartDate],
						(overlapErr, overlaps) => {
							if (overlapErr) {
								return res.status(500).json({ message: "Database error", error: overlapErr });
							}

							if (overlaps.length > 0) {
								return res.status(409).json({ message: "Car is already booked for these dates" });
							}

							const updateQuery = isAdmin
								? "UPDATE reservations SET date_debut = ?, date_fin = ?, statut = ? WHERE id = ?"
								: "UPDATE reservations SET date_debut = ?, date_fin = ? WHERE id = ? AND user_id = ?";
							const updateParams = isAdmin
								? [normalizedStartDate, normalizedEndDate, status || 'en_attente', id]
								: [normalizedStartDate, normalizedEndDate, id, req.user.id];

							db.query(updateQuery, updateParams, (updateErr, result) => {
								if (updateErr) {
									return res.status(500).json({ message: "Database error", error: updateErr });
								}

								if (result.affectedRows === 0) {
									return res.status(404).json({ message: "Reservation not found" });
								}

								res.json({
									message: "Reservation updated",
									total_price: totalPrice,
								});
							});
						}
					);
				}
			);
		}
	);
};

exports.deleteReservation = (req, res) => {
	const { id } = req.params;
	const isAdmin = req.user && req.user.role === 'admin';

	const deleteQuery = isAdmin
		? "DELETE FROM reservations WHERE id = ?"
		: "DELETE FROM reservations WHERE id = ? AND user_id = ?";
	const deleteParams = isAdmin
		? [id]
		: [id, req.user.id];

	db.query(deleteQuery, deleteParams, (err, result) => {
		if (err) {
			return res.status(500).json({ message: "Database error", error: err });
		}

		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Reservation not found" });
		}

		res.json({ message: "Reservation deleted" });
	});
};
