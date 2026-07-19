const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateUser, requireAuth } = require('../middleware/auth');
const { success, error } = require('../utils/apiResponse');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, adminCode } = req.body;

    if (!name || !name.trim()) {
      return error(res, 400, 'Vui lòng nhập họ và tên.');
    }

    if (!email || !email.includes('@')) {
      return error(res, 400, 'Vui lòng nhập email hợp lệ.');
    }

    if (!password || password.length < 6) {
      return error(res, 400, 'Mật khẩu phải có ít nhất 6 ký tự.');
    }

    const user = await authService.registerUser({ name, email, password, role, adminCode });
    const token = authService.signAuthToken(user);

    return success(res, { token, user });
  } catch (err) {
    if (err.status) {
      return error(res, err.status, err.message);
    }
    console.error('Registration error:', err);
    return error(res, 500, 'Đã xảy ra lỗi trong quá trình đăng ký.');
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 400, 'Vui lòng nhập email và mật khẩu.');
    }

    const user = await authService.loginUser({ email, password });
    const token = authService.signAuthToken(user);

    return success(res, { token, user });
  } catch (err) {
    if (err.status) {
      return error(res, err.status, err.message);
    }
    console.error('Login error:', err);
    return error(res, 500, 'Đã xảy ra lỗi trong quá trình đăng nhập.');
  }
});

// GET /api/auth/me
router.get('/me', authenticateUser, requireAuth, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.id);

    if (!user) {
      return error(res, 401, 'Người dùng không còn tồn tại.');
    }

    return success(res, { user });
  } catch (err) {
    console.error('Me error:', err);
    return error(res, 500, 'Đã xảy ra lỗi khi tải thông tin người dùng.');
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // Stateless token, just tell client to clear it
  return success(res, { message: 'Đăng xuất thành công.' });
});

module.exports = router;
