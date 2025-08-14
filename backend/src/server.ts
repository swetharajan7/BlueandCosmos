import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import {
  enforceHTTPS,
  securityHeaders,
  generalRateLimit,
  authRateLimit,
  aiRateLimit,
  speedLimiter,
  sanitizeInput,
  sqlInjectionValidation,
  xssValidation,
  handleValidationErrors,
  ddosProtection,
  requestSizeLimit
} from './middleware/security';
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
import { createConfirmationRoutes } from './routes/confirmation';
import emailRoutes from './routes/email';
import complianceRoutes from './routes/compliance';
import { createSubmissionQueueTable } from './services/submissionQueueService';
import { createSubmissionConfirmationsTable } from './services/submissionConfirmationService';
import { WebSocketService } from './services/websocketService';
import { SubmissionMonitoringService } from './services/submissionMonitoringService';
import { initializeEmailService } from './services/emailService';
import { initializeNotificationService } from './services/notificationService';
import { createNotificationTables } from './services/adminNotificationService';
import { initializeCronJobService } from './services/cronJobService';
import { createErrorLogsTable } from './services/errorLoggingService';
import { EncryptionService } from './services/encryptionService';
import { DataRetentionService } from './services/dataRetentionService';

// Function to initialize confirmation system tables
async function initializeConfirmationSystemTables(db: any) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const sqlPath = path.join(__dirname, '../../database/add_confirmation_system_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await db.query(sql);
  } catch (error) {
    console.error('Error initializing confirmation system tables:', error);
    throw error;
  }
}

// Function to initialize compliance system tables
async function initializeComplianceSystemTables(db: any) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const sqlPath = path.join(__dirname, '../../database/add_compliance_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await db.query(sql);
  } catch (error) {
    console.error('Error initializing compliance system tables:', error);
    throw error;
  }
}

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// HTTPS enforcement (production only)
app.use(enforceHTTPS);

// Comprehensive security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-Requested-With'],
  exposedHeaders: ['X-Session-ID']
}));

// DDoS protection
app.use(ddosProtection);

// Request size limiting
app.use(requestSizeLimit);

// Speed limiting for suspicious activity
app.use(speedLimiter);

// General rate limiting
app.use(generalRateLimit);

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

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

// Authentication routes with strict rate limiting
app.use('/api/auth', authRateLimit, sqlInjectionValidation, xssValidation, handleValidationErrors, authRoutes);

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

// AI routes with restrictive rate limiting
app.use('/api/ai', aiRateLimit, sqlInjectionValidation, xssValidation, handleValidationErrors, aiRoutes);

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

    // Initialize encryption service
    EncryptionService.initialize();
    console.log('✅ Encryption service initialized');

    // Initialize database tables
    await createSubmissionQueueTable(db);
    console.log('✅ Submission queue table initialized');
    
    await createSubmissionConfirmationsTable(db);
    console.log('✅ Submission confirmations table initialized');

    // Initialize confirmation system tables
    await initializeConfirmationSystemTables(db);
    console.log('✅ Confirmation system tables initialized');

    // Initialize compliance system tables
    await initializeComplianceSystemTables(db);
    console.log('✅ Compliance system tables initialized');

    // Initialize data retention policies
    const retentionService = new DataRetentionService(db);
    await retentionService.initializeRetentionPolicies();
    console.log('✅ Data retention policies initialized');

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
    app.use('/api/confirmation', createConfirmationRoutes(db, websocketService));
    app.use('/api/compliance', complianceRoutes);

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