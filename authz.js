module.exports = function authorize(roles) {
  return function (req, res, next) {
    const role = req.headers['x-role'];
    if (!role) return res.status(401).json({ message: 'Role missing' });
    if (!roles.includes(role)) return res.status(403).json({ message: 'Access denied' });
    next();
  };
};
