const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const {
	getAllReservations,
	getMyReservations,
	createReservation,
	updateReservation,
	deleteReservation,
} = require("../controllers/reservationController");

router.get("/", auth, admin, getAllReservations);
router.get("/me", auth, getMyReservations);
router.post("/", auth, createReservation);
router.put("/:id", auth, updateReservation);
router.delete("/:id", auth, deleteReservation);

module.exports = router;
