const jwt = require('jsonwebtoken');
const { getJwtSecret, getRequestToken } = require('../utils/authSecurity');

function authMiddleware(req, res, next) {
  try {
    const token = getRequestToken(req);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No se proporcionó token de autenticación' 
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    req.usuario = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado. Por favor inicia sesión nuevamente' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Token inválido' 
    });
  }
}

module.exports = authMiddleware;
