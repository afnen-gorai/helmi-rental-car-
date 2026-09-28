const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const passport = require("../config/passport");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Google OAuth routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "http://localhost:5174" }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id, role: req.user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    const safeUser = {
      id: req.user.id,
      name: req.user.nom,
      email: req.user.email,
      role: req.user.role,
    };

    // Redirect to frontend with token
    res.redirect(`http://localhost:5174?token=${token}&user=${encodeURIComponent(JSON.stringify(safeUser))}`);
  }
);

// Facebook OAuth routes (only if credentials are provided)
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));

  router.get(
    "/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: "http://localhost:5174" }),
    (req, res) => {
      const token = jwt.sign({ id: req.user.id, role: req.user.role }, JWT_SECRET, {
        expiresIn: "1d",
      });

      const safeUser = {
        id: req.user.id,
        name: req.user.nom,
        email: req.user.email,
        role: req.user.role,
      };

      // Redirect to frontend with token
      res.redirect(`http://localhost:5174?token=${token}&user=${encodeURIComponent(JSON.stringify(safeUser))}`);
    }
  );
}

// Regular auth routes
router.post("/register", register);
router.post("/login", login);

module.exports = router;