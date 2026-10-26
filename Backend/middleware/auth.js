const jwt = require('jsonwebtoken');

const TOKEN_TTL = '1d';

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

// Requires "Authorization: Bearer <token>" and sets req.user from the token.
function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: Number(payload.sub), name: payload.name, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { signToken, requireAuth, TOKEN_TTL };
