const jwt = require("jsonwebtoken");

// Verifies the JWT issued at login and attaches the payload to req.user.
// Payload shape: { staffUserId, role, doctorId (if role === 'doctor'), fullName, email }
function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing authentication token." });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Restricts a route to one or more roles, e.g. requireRole('admin') or
// requireRole('admin', 'receptionist'). Admin and Doctor each get their own
// login screen in the frontend; this is the matching server-side check.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have access to this resource." });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
