const authService = require('../services/authService');
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
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

const requireSeller = (req, res, next) => {
  if (!req.user) {
    return error(res, 401, 'Vui lòng đăng nhập để tiếp tục.');
  }
  
  if (req.user.role !== 'seller') {
    return error(res, 403, 'Yêu cầu quyền người bán.');
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

const requireDatabaseAdmin = async (req, res, next) => {
  if (!req.user) {
    return error(res, 401, 'Vui lòng đăng nhập để tiếp tục.');
  }
  if (!isSupabaseAdminConfigured()) {
    return error(res, 503, 'Hệ thống chưa được cấu hình.', undefined, 'DATABASE_NOT_CONFIGURED');
  }
  try {
    const { data: currentUser, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id,email,role')
      .eq('id', req.user.id)
      .maybeSingle();
    if (lookupError) {
      return error(res, 503, 'Không thể xác minh quyền quản trị.', undefined, 'ADMIN_AUTHORIZATION_FAILED');
    }
    if (!currentUser || currentUser.role !== 'admin') {
      return error(res, 403, 'Yêu cầu quyền quản trị viên.', undefined, 'ADMIN_REQUIRED');
    }
    req.user = { ...req.user, email: currentUser.email, role: currentUser.role };
    return next();
  } catch {
    return error(res, 503, 'Không thể xác minh quyền quản trị.', undefined, 'ADMIN_AUTHORIZATION_FAILED');
  }
};

module.exports = {
  authenticateUser,
  requireAuth,
  requireSeller,
  requireAdmin,
  requireDatabaseAdmin,
};
