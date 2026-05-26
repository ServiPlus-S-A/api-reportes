const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend-reportes:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// [Pattern: Rate Limiter] (Availability / Capacity / Resource Limit)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware for JWT authorization & simple RBAC
// [Pattern: Valet Key / RBAC] (Security)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // RBAC verification: Only users with 'admin' or 'analista' roles can access reportes
    if (user.role !== 'admin' && user.role !== 'analista') {
      return res.status(403).json({ error: 'Insufficient permissions. Requires admin/analista.' });
    }
    
    req.user = user;
    next();
  });
};

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'api-gateway' });
});

// Mock login route to issue tokens for development/verification
app.post('/auth/login', express.json(), (req, res) => {
  const { username, role } = req.body;
  if (!username || !role) {
    return res.status(400).json({ error: 'Username and role are required' });
  }
  const token = jwt.sign({ username, role }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Proxy reports to backend
app.use(
  '/reportes',
  authenticateToken,
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/reportes': '/reportes',
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Pass user details header to backend
        if (req.user) {
          proxyReq.setHeader('x-user-id', req.user.username);
          proxyReq.setHeader('x-user-role', req.user.role);
        }
      },
      error: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(502).json({ error: 'Bad Gateway. Backend reports service is offline.' });
      }
    }
  })
);

app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
  console.log(`Routing /reportes requests to: ${BACKEND_URL}`);
});
