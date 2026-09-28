function admin(req, res, next) {
	if (req.user?.role !== "admin") {
		return res.status(403).json({ message: "Accès administrateur requis" });
	}

	next();
}

module.exports = admin;
