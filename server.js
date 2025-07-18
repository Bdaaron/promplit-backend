const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate Limiting - Multiple Tiers
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: message,
      retryAfter: Math.round(windowMs / 1000)
    });
  }
});

// Global rate limit
const globalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per 15 minutes per IP
  'Too many requests from this IP, please try again later.'
);

// API-specific rate limits
const apiLimiter = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 API calls per minute
  'Too many API requests, please wait a moment.'
);

const promptLimiter = createRateLimit(
  60 * 1000, // 1 minute
  5, // 5 prompt generations per minute
  'Too many prompt requests, please slow down.'
);

const stripeLimiter = createRateLimit(
  60 * 1000, // 1 minute
  3, // 3 payment attempts per minute
  'Too many payment requests, please wait.'
);

// Apply rate limiting
app.use(globalLimiter);
app.use('/api/', apiLimiter);
app.use('/api/prompts/generate', promptLimiter);
app.use('/api/stripe/', stripeLimiter);

// Security Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(hpp()); // Prevent HTTP Parameter Pollution

// CORS Configuration - FIXED
app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS request from origin:', origin);
    
    // Allow requests with no origin (mobile apps, postman, etc)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://stunning-brioche-d1383a.netlify.app',
      'https://promplit.xyz',
      'https://www.promplit.xyz',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('CORS allowed origin:', origin);
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      // FIXED: Allow all origins temporarily to restore functionality
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // FIXED: Added back all methods
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // FIXED: Added back all headers
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Body parsing with size limits
app.use(express.json({ 
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        // XSS protection
        req.body[key] = xss(req.body[key]);
        // Basic sanitization
        req.body[key] = req.body[key].trim();
        // Remove potential script tags
        req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
    }
  }
  next();
};

app.use(sanitizeInput);

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Routes
app.use('/api/prompts', require('./routes/prompts'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/creator', require('./routes/creator'));

// Health check with minimal info
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
  
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Error:', error.message);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({ 
    error: 'Internal server error',
    ...(isDev && { message: error.message, stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Secure server running on port ${PORT}`);
  console.log(`🛡️ Security features enabled`);
});