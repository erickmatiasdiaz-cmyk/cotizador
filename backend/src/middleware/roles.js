function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.usuario?.rol;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta accion'
      });
    }

    next();
  };
}

const requireAdmin = requireRole('admin');

module.exports = {
  requireRole,
  requireAdmin
};
