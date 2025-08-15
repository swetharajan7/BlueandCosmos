import { Request, Response } from 'express';
import { supportTicketService } from '../services/supportTicketService';
import { AuthenticatedRequest } from '../middleware/auth';

export class SupportController {
  async createTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { subject, description, category } = req.body;
      const user = req.user!;

      if (!subject || !description) {
        res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Subject and description are required'
          }
        });
        return;
      }

      const ticket = await supportTicketService.createTicket({
        user_id: user.id,
        subject,
        description,
        category: category || 'general',
        user_email: user.email,
        user_name: `${user.first_name} ${user.last_name}`,
        user_role: user.role,
        context_data: req.body.context_data || null
      });

      res.status(201).json({
        success: true,
        data: {
          ticket: {
            id: ticket.id,
            subject: ticket.subject,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            created_at: ticket.created_at
          }
        }
      });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({
        error: {
          code: 'TICKET_CREATION_FAILED',
          message: 'Failed to create support ticket'
        }
      });
    }
  }

  async getUserTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { status } = req.query;

      const tickets = await supportTicketService.getUserTickets(
        user.id,
        status as string
      );

      res.json({
        success: true,
        data: {
          tickets: tickets.map(ticket => ({
            id: ticket.id,
            subject: ticket.subject,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            last_message: (ticket as any).messages?.[0] || null
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      res.status(500).json({
        error: {
          code: 'TICKETS_FETCH_FAILED',
          message: 'Failed to fetch support tickets'
        }
      });
    }
  }

  async getTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const user = req.user!;

      const ticket = await supportTicketService.getTicketById(ticketId, user.id);

      if (!ticket) {
        res.status(404).json({
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Support ticket not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          ticket: {
            id: ticket.id,
            subject: ticket.subject,
            description: ticket.description,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            resolved_at: ticket.resolved_at,
            messages: (ticket as any).messages || []
          }
        }
      });
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      res.status(500).json({
        error: {
          code: 'TICKET_FETCH_FAILED',
          message: 'Failed to fetch support ticket'
        }
      });
    }
  }

  async addMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { message } = req.body;
      const user = req.user!;

      if (!message) {
        res.status(400).json({
          error: {
            code: 'MISSING_MESSAGE',
            message: 'Message content is required'
          }
        });
        return;
      }

      // Verify user owns the ticket
      const ticket = await supportTicketService.getTicketById(ticketId, user.id);
      if (!ticket) {
        res.status(404).json({
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Support ticket not found'
          }
        });
        return;
      }

      const ticketMessage = await supportTicketService.addMessage({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_name: `${user.first_name} ${user.last_name}`,
        sender_role: 'user',
        message,
        is_internal: false
      });

      res.status(201).json({
        success: true,
        data: {
          message: {
            id: ticketMessage.id,
            message: ticketMessage.message,
            sender_name: ticketMessage.sender_name,
            sender_role: ticketMessage.sender_role,
            created_at: ticketMessage.created_at
          }
        }
      });
    } catch (error) {
      console.error('Error adding ticket message:', error);
      res.status(500).json({
        error: {
          code: 'MESSAGE_ADD_FAILED',
          message: 'Failed to add message to ticket'
        }
      });
    }
  }

  async getTicketMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const user = req.user!;

      // Verify user owns the ticket
      const ticket = await supportTicketService.getTicketById(ticketId, user.id);
      if (!ticket) {
        res.status(404).json({
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Support ticket not found'
          }
        });
        return;
      }

      const messages = await supportTicketService.getTicketMessages(ticketId, false);

      res.json({
        success: true,
        data: {
          messages: messages.map(msg => ({
            id: msg.id,
            message: msg.message,
            sender_name: msg.sender_name,
            sender_role: msg.sender_role,
            created_at: msg.created_at
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      res.status(500).json({
        error: {
          code: 'MESSAGES_FETCH_FAILED',
          message: 'Failed to fetch ticket messages'
        }
      });
    }
  }

  // Admin endpoints
  async getAllTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      
      if (user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required'
          }
        });
        return;
      }

      const { status, category, priority, assigned_to } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {};
      if (status) whereClause.status = status;
      if (category) whereClause.category = category;
      if (priority) whereClause.priority = priority;
      if (assigned_to) whereClause.assigned_to = assigned_to;

      const { rows: tickets, count: total } = await SupportTicket.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: SupportTicketMessage,
            as: 'messages',
            limit: 1,
            order: [['created_at', 'DESC']]
          }
        ]
      });

      res.json({
        success: true,
        data: {
          tickets,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all tickets:', error);
      res.status(500).json({
        error: {
          code: 'TICKETS_FETCH_FAILED',
          message: 'Failed to fetch support tickets'
        }
      });
    }
  }

  async updateTicketStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;
      const user = req.user!;

      if (user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required'
          }
        });
        return;
      }

      const validStatuses = ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid ticket status'
          }
        });
        return;
      }

      const ticket = await supportTicketService.updateTicketStatus(
        ticketId,
        status,
        user.id,
        `${user.first_name} ${user.last_name}`
      );

      res.json({
        success: true,
        data: { ticket }
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        error: {
          code: 'STATUS_UPDATE_FAILED',
          message: 'Failed to update ticket status'
        }
      });
    }
  }

  async assignTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { ticketId } = req.params;
      const { assigned_to } = req.body;
      const user = req.user!;

      if (user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required'
          }
        });
        return;
      }

      const ticket = await supportTicketService.assignTicket(
        ticketId,
        assigned_to,
        user.id,
        `${user.first_name} ${user.last_name}`
      );

      res.json({
        success: true,
        data: { ticket }
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({
        error: {
          code: 'TICKET_ASSIGNMENT_FAILED',
          message: 'Failed to assign ticket'
        }
      });
    }
  }

  async getTicketStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      
      if (user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Admin access required'
          }
        });
        return;
      }

      const stats = await supportTicketService.getTicketStats();

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
      res.status(500).json({
        error: {
          code: 'STATS_FETCH_FAILED',
          message: 'Failed to fetch ticket statistics'
        }
      });
    }
  }
}

export const supportController = new SupportController();