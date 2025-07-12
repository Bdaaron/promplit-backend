// Enhanced CORS - replace the existing cors section
app.use(cors({
    origin: function (origin, callback) {
      console.log('CORS request from origin:', origin);
      
      // Allow requests with no origin (mobile apps, curl requests, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'https://stunning-brioche-d1383a.netlify.app',
        'http://localhost:3000',
        'http://localhost:3001'
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(null, true); // Allow all for now to debug
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 200
  }));