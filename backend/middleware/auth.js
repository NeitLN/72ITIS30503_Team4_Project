const authService = require('../services/authService');
const { error } = require('../utils/apiResponse');

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = authService.verifyAuthToken(token);
      
      if (decoded) {
        req.user = decoded;
      }
    }
  } catch (err) {
    // Ignore errors here, just leave req.user undefined
  }
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return error(res, 401, 'Vui lòng đăng nhập để tiếp tục.');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return error(res, 401, 'Vui lòng đăng nhập để tiếp tục.');
  }
  
  if (req.user.role !== 'admin') {
    return error(res, 403, 'Yêu cầu quyền quản trị viên.');
  }
  
  next();
};

module.exports = {
  authenticateUser,
  requireAuth,
  requireAdmin
};
