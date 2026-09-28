const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const {
	getAllCars,
	getAvailableCars,
	getCarById,
	createCar,
	updateCar,
	deleteCar,
} = require("../controllers/carController");

router.get("/", auth, getAllCars);
router.get("/available", auth, getAvailableCars);
router.get("/:id", auth, getCarById);
router.post("/", auth, admin, createCar);
router.put("/:id", auth, admin, updateCar);
router.delete("/:id", auth, admin, deleteCar);

module.exports = router;
