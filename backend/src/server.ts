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
import { createAdminRoutes } from './routes/admin';
import emailRoutes from './routes/email';
import { createSubmissionQueueTable } from './services/submissionQueueService';
import { createSubmissionConfirmationsTable } from './services/submissionConfirmationService';
import { WebSocketService } from './services/websocketService';
import { SubmissionMonitoringService } from './services/submissionMonitoringService';
import { initializeEmailService } from './services/emailService';
import { initializeNotificationService } from './services/notificationService';
import { createNotificationTables } from './services/adminNotificationService';
import { initializeCronJobService } from './services/cronJobService';
import { createErrorLogsTable } from './services/errorLoggingService';

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

// Email routes will be initialized after database connection

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

    // Initialize monitoring tables
    await createErrorLogsTable(db);
    console.log('✅ Error logs table initialized');
    
    await createNotificationTables(db);
    console.log('✅ Notification tables initialized');

    // Initialize services
    const websocketService = new WebSocketService(server, db);
    console.log('✅ WebSocket service initialized');

    const emailService = initializeEmailService(db);
    console.log('✅ Email service initialized');

    const notificationService = initializeNotificationService(db);
    console.log('✅ Notification service initialized');

    const cronJobService = initializeCronJobService(db);
    cronJobService.start();
    console.log('✅ Cron job service initialized');

    const monitoringService = new SubmissionMonitoringService(db, emailService, websocketService);
    console.log('✅ Monitoring service initialized');

    // Initialize routes with database connection and services
    app.use('/api/email', emailRoutes);
    app.use('/api/submissions', createSubmissionRoutes(db, websocketService));
    app.use('/api/webhooks', createWebhookRoutes(db, websocketService));
    app.use('/api/admin', createAdminRoutes(db, emailService, websocketService));

    // Start monitoring system
    await monitoringService.startMonitoring(1); // Check every minute
    console.log('✅ Submission monitoring started');

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