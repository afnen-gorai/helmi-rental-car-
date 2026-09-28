const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function extractBearerToken(header) {
	if (typeof header !== "string") {
		return null;
	}

	const match = header.match(/^Bearer\s+(.+)$/i);
	return match ? match[1].trim() : null;
}

function auth(req, res, next) {
	if (!JWT_SECRET) {
		return res.status(500).json({ message: "JWT secret is not configured" });
	}

	const token = extractBearerToken(req.headers.authorization);

	if (!token) {
		return res.status(401).json({ message: "Missing authorization token" });
	}

	try {
		const payload = jwt.verify(token, JWT_SECRET);
		if (!payload || typeof payload.id === "undefined") {
			return res.status(401).json({ message: "Invalid token payload" });
		}

		req.user = {
			id: payload.id,
			role: payload.role || "client",
		};
		next();
	} catch (error) {
		return res.status(401).json({ message: "Invalid or expired token" });
	}
}

module.exports = auth;
