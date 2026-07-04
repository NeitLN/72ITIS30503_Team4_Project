const { supabase, isSupabaseConfigured } = require('../lib/supabase');
const crypto = require('crypto');

const AUTH_SECRET = process.env.STYLEHUB_AUTH_SECRET || 'stylehub-local-demo-auth-secret';

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha256').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || !storedHash.startsWith('pbkdf2$')) return false;
  try {
    const parts = storedHash.split('$');
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const hash = parts[3];

    const computedHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(computedHash, 'utf8'));
  } catch (err) {
    return false;
  }
};

const signAuthToken = (user) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  
  // 7 days expiration
  const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
  
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    exp
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
};

const verifyAuthToken = (token) => {
  if (!token) return null;
  
  try {
    const [header, payload, signature] = token.split('.');
    
    const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
      
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expectedSignature, 'utf8'))) {
      return null;
    }
    
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    
    return decodedPayload;
  } catch (err) {
    return null;
  }
};

const sanitizeUser = (user) => {
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

const registerUser = async (payload) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Database is not configured');
  }

  const { name, email, password, role = 'customer', adminCode } = payload;
  
  let assignedRole = 'customer';
  if (role === 'admin' && adminCode === process.env.STYLEHUB_ADMIN_CODE) {
    assignedRole = 'admin';
  } else if (role === 'seller') {
     // Optional: allow seller role if needed
     assignedRole = 'seller';
  }

  const password_hash = hashPassword(password);

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash,
        role: assignedRole
      }
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // unique violation
      throw { status: 409, message: 'Email already exists' };
    }
    console.error('Error inserting user payload details:', JSON.stringify(error, null, 2));
    throw new Error('Database error during registration');
  }

  return sanitizeUser(data);
};

const loginUser = async ({ email, password }) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Database is not configured');
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (error || !user) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  if (!verifyPassword(password, user.password_hash)) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  return sanitizeUser(user);
};

const getUserById = async (id) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Database is not configured');
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) {
    return null;
  }

  return sanitizeUser(user);
};

module.exports = {
  hashPassword,
  verifyPassword,
  signAuthToken,
  verifyAuthToken,
  sanitizeUser,
  registerUser,
  loginUser,
  getUserById
};

