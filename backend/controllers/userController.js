const bcrypt = require("bcryptjs");
const db = require("../config/database");

function mapUser(user) {
  return {
    id: user.id,
    name: user.nom,
    email: user.email,
    role: user.role,
  };
}

exports.getUsers = (req, res) => {
  db.query(
    "SELECT id, nom, email, role FROM users ORDER BY id DESC",
    (err, users) => {
      if (err) return res.status(500).json({ message: "Database error", error: err });
      res.json(users.map(mapUser));
    },
  );
};

exports.createUser = (req, res) => {
  const { name, email, role = "client", password = "Client2026!" } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }

  if (!["admin", "client"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.query(
    "INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)",
    [name, email, hashedPassword, role],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Email already exists" });
        }
        return res.status(500).json({ message: "Database error", error: err });
      }

      res.status(201).json({
        id: result.insertId,
        name,
        email,
        role,
      });
    },
  );
};

exports.updateUser = (req, res) => {
  const { id } = req.params;
  const { name, email, role = "client" } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and email are required" });
  }

  if (!["admin", "client"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  db.query(
    "UPDATE users SET nom = ?, email = ?, role = ? WHERE id = ?",
    [name, email, role, id],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Email already exists" });
        }
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: Number(id),
        name,
        email,
        role,
      });
    },
  );
};

exports.deleteUser = (req, res) => {
  const { id } = req.params;

  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }

  db.query("DELETE FROM users WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error", error: err });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true });
  });
};
