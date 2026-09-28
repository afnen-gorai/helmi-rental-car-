const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// REGISTER
exports.register = (req, res) => {
  const { name, nom, email, password } = req.body;
  const userName = name || nom;
  if (!userName || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  db.query("SELECT id FROM users WHERE email = ?", [email], (err, users) => {
    if (err) return res.status(500).json({ message: "Database error", error: err });

    if (users.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.query(
      "INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)",
      [userName, email, hashedPassword, "client"],
      (insertErr, result) => {
        if (insertErr) return res.status(500).json({ message: "Database error", error: insertErr });

        const token = jwt.sign({ id: result.insertId, role: "client" }, JWT_SECRET, {
          expiresIn: "1d",
        });

        res.status(201).json({
          message: "User created",
          userId: result.insertId,
          token,
          user: {
            id: result.insertId,
            name,
            email,
            role: "client",
          },
        });
      }
    );
  });
};

// LOGIN
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error", error: err });

    if (result.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = result[0];

    if (!user.mot_de_passe) {
      return res.status(401).json({ message: "Veuillez vous connecter avec Google ou Facebook" });
    }

    const isValid = bcrypt.compareSync(password, user.mot_de_passe);

    if (!isValid) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1d",
    });

    const safeUser = {
      id: user.id,
      name: user.nom,
      email: user.email,
      role: user.role,
    };

    res.json({ token, user: safeUser });
  });
};