import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import authRoutes from './routes/auth';
import applicationRoutes from './routes/applications';
import universityRoutes from './routes/universities';
import googleDocsRoutes from './routes/googleDocs';
import invitationRoutes from './routes/invitations';
import recommenderRoutes from './routes/recommender';
import aiRoutes from './routes/ai';
import { createSubmissionRoutes } from './routes/submissions';
import { createWebhookRoutes } from './routes/webhooks';
import { createSubmissionQueueTable } from './services/submissionQueueService';
import { createSubmissionConfirmationsTable } from './services/submissionConfirmationService';
import { WebSocketService } from './services/websocketService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'StellarRec Backend'
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'StellarRec™ API is running' });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Application routes
app.use('/api/applications', applicationRoutes);

// University routes
app.use('/api/universities', universityRoutes);

// Google Docs routes
app.use('/api/google-docs', googleDocsRoutes);

// Invitation routes
app.use('/api', invitationRoutes);

// Recommender routes
app.use('/api/recommender', recommenderRoutes);

// AI routes
app.use('/api/ai', aiRoutes);

// Submission routes will be initialized after database connection

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: 'Internal Server Error',
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.originalUrl
    }
  });
});

async function startServer() {
  try {
    // Connect to database
    const { db } = await connectDatabase();
    console.log('✅ Database connected successfully');

    // Initialize database tables
    await createSubmissionQueueTable(db);
    console.log('✅ Submission queue table initialized');
    
    await createSubmissionConfirmationsTable(db);
    console.log('✅ Submission confirmations table initialized');

    // Initialize WebSocket service
    const websocketService = new WebSocketService(server, db);
    console.log('✅ WebSocket service initialized');

    // Initialize submission routes with database connection and WebSocket service
    app.use('/api/submissions', createSubmissionRoutes(db, websocketService));
    
    // Initialize webhook routes
    app.use('/api/webhooks', createWebhookRoutes(db, websocketService));

    // Connect to Redis
    await connectRedis();
    console.log('✅ Redis connected successfully');

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 StellarRec Backend running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket server ready for connections`);
      console.log(`👥 Connected users: ${websocketService.getConnectedUsersCount()}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  startServer();
}

export default app;