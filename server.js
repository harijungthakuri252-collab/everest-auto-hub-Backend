const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

dotenv.config();

// Fix DNS resolution for MongoDB Atlas on restrictive networks (local dev only)
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
}

const app = express();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://everest-auto-hub.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

const forgotLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 5,
  message: { message: 'Too many reset attempts. Please wait 10 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, max: 200,
  message: { message: 'Too many requests. Please slow down.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', forgotLimiter);
app.use('/api', generalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/services',     require('./routes/serviceRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/products',     require('./routes/productRoutes'));
app.use('/api/orders',       require('./routes/orderRoutes'));
app.use('/api/reviews',      require('./routes/reviewRoutes'));
app.use('/api/admin',        require('./routes/adminRoutes'));
app.use('/api/upload',       require('./routes/uploadRoutes'));
app.use('/api/home-content', require('./routes/homeContentRoutes'));
app.use('/api/site-content', require('./routes/siteContentRoutes'));
app.use('/api/notices',      require('./routes/noticeRoutes'));
app.use('/api/payment',      require('./routes/paymentRoutes'));

app.get('/', (req, res) => res.json({ message: 'Everest Auto Hub API Running' }));
// ─── Connect to MongoDB then start server ─────────────────────────────────────
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  family: 4,
}).then(() => {
  console.log('✅ MongoDB Connected');

  // Clean up unverified users older than 24 hours every hour
  const User = require('./models/User');
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await User.deleteMany({ isVerified: false, createdAt: { $lt: cutoff } });
      if (result.deletedCount > 0) console.log(`🧹 Cleaned ${result.deletedCount} unverified users`);
    } catch (err) {
      console.error('Cleanup error:', err.message);
    }
  }, 60 * 60 * 1000); // every hour

  app.listen(process.env.PORT || 5000, () => {
    console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
  });
}).catch(err => {
  console.error('❌ MongoDB Error:', err.message);
  process.exit(1);
});

module.exports = app;
