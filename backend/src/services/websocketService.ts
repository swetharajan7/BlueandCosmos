import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

export interface SubmissionStatusUpdate {
  submissionId: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  universityName: string;
  applicantName: string;
  timestamp: Date;
  externalReference?: string;
  errorMessage?: string;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
}

export class WebSocketService {
  private io: SocketIOServer;
  private db: Pool;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(server: HttpServer, db: Pool) {
    this.db = db;
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupAuthentication();
    this.setupConnectionHandlers();
  }

  private setupAuthentication(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        
        // Verify user exists and is active
        const userResult = await this.db.query(
          'SELECT id, email, role, is_verified FROM users WHERE id = $1 AND is_verified = true',
          [decoded.userId]
        );

        if (userResult.rows.length === 0) {
          return next(new Error('Invalid or inactive user'));
        }

        socket.data.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        };

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket) => {
      const userId = socket.data.user.id;
      
      console.log(`User ${userId} connected via WebSocket (${socket.id})`);

      // Track connected user
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socket.id);

      // Join user-specific room for targeted updates
      socket.join(`user:${userId}`);

      // Handle subscription to specific submission updates
      socket.on('subscribe:submission', (submissionId: string) => {
        socket.join(`submission:${submissionId}`);
        console.log(`User ${userId} subscribed to submission ${submissionId}`);
      });

      // Handle unsubscription from submission updates
      socket.on('unsubscribe:submission', (submissionId: string) => {
        socket.leave(`submission:${submissionId}`);
        console.log(`User ${userId} unsubscribed from submission ${submissionId}`);
      });

      // Handle subscription to recommendation updates (all submissions for a recommendation)
      socket.on('subscribe:recommendation', (recommendationId: string) => {
        socket.join(`recommendation:${recommendationId}`);
        console.log(`User ${userId} subscribed to recommendation ${recommendationId}`);
      });

      // Handle unsubscription from recommendation updates
      socket.on('unsubscribe:recommendation', (recommendationId: string) => {
        socket.leave(`recommendation:${recommendationId}`);
        console.log(`User ${userId} unsubscribed from recommendation ${recommendationId}`);
      });

      // Handle ping for connection health check
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`User ${userId} disconnected (${socket.id}): ${reason}`);
        
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.connectedUsers.delete(userId);
          }
        }
      });
    });
  }

  /**
   * Send submission status update to relevant users
   */
  async broadcastSubmissionUpdate(update: SubmissionStatusUpdate): Promise<void> {
    try {
      // Get the recommendation and application details to determine who should receive updates
      const query = `
        SELECT r.application_id, a.student_id, r.recommender_id
        FROM submissions s
        JOIN recommendations r ON s.recommendation_id = r.id
        JOIN applications a ON r.application_id = a.id
        WHERE s.id = $1
      `;
      
      const result = await this.db.query(query, [update.submissionId]);
      
      if (result.rows.length === 0) {
        console.warn(`No application found for submission ${update.submissionId}`);
        return;
      }

      const { student_id, recommender_id } = result.rows[0];

      // Broadcast to submission-specific room
      this.io.to(`submission:${update.submissionId}`).emit('submission:status', update);

      // Broadcast to user-specific rooms (student and recommender)
      this.io.to(`user:${student_id}`).emit('submission:status', update);
      
      if (recommender_id) {
        // Get recommender user ID
        const recommenderResult = await this.db.query(
          'SELECT user_id FROM recommenders WHERE id = $1',
          [recommender_id]
        );
        
        if (recommenderResult.rows.length > 0) {
          this.io.to(`user:${recommenderResult.rows[0].user_id}`).emit('submission:status', update);
        }
      }

      console.log(`Broadcasted submission update for ${update.submissionId} to relevant users`);
    } catch (error) {
      console.error('Error broadcasting submission update:', error);
    }
  }

  /**
   * Send bulk submission progress update
   */
  async broadcastBulkSubmissionProgress(recommendationId: string, progress: {
    completed: number;
    total: number;
    currentUniversity?: string;
    message: string;
  }): Promise<void> {
    try {
      // Get the application details to determine who should receive updates
      const query = `
        SELECT a.student_id, r.recommender_id
        FROM recommendations r
        JOIN applications a ON r.application_id = a.id
        WHERE r.id = $1
      `;
      
      const result = await this.db.query(query, [recommendationId]);
      
      if (result.rows.length === 0) {
        console.warn(`No application found for recommendation ${recommendationId}`);
        return;
      }

      const { student_id, recommender_id } = result.rows[0];

      const progressUpdate = {
        recommendationId,
        progress,
        timestamp: new Date()
      };

      // Broadcast to recommendation-specific room
      this.io.to(`recommendation:${recommendationId}`).emit('recommendation:progress', progressUpdate);

      // Broadcast to user-specific rooms
      this.io.to(`user:${student_id}`).emit('recommendation:progress', progressUpdate);
      
      if (recommender_id) {
        const recommenderResult = await this.db.query(
          'SELECT user_id FROM recommenders WHERE id = $1',
          [recommender_id]
        );
        
        if (recommenderResult.rows.length > 0) {
          this.io.to(`user:${recommenderResult.rows[0].user_id}`).emit('recommendation:progress', progressUpdate);
        }
      }

      console.log(`Broadcasted bulk submission progress for recommendation ${recommendationId}`);
    } catch (error) {
      console.error('Error broadcasting bulk submission progress:', error);
    }
  }

  /**
   * Send system-wide notification (admin only)
   */
  broadcastSystemNotification(notification: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: Date;
  }): void {
    this.io.emit('system:notification', notification);
    console.log(`Broadcasted system notification: ${notification.title}`);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get connected sockets count
   */
  getConnectedSocketsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Send direct message to specific user
   */
  async sendToUser(userId: string, event: string, data: any): Promise<boolean> {
    const userSockets = this.connectedUsers.get(userId);
    if (!userSockets || userSockets.size === 0) {
      return false;
    }

    this.io.to(`user:${userId}`).emit(event, data);
    return true;
  }

  /**
   * Get WebSocket server instance for external use
   */
  getIO(): SocketIOServer {
    return this.io;
  }
}