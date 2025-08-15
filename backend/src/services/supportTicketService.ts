import SupportTicket, { SupportTicketCreationAttributes } from '../models/SupportTicket';
import SupportTicketMessage, { SupportTicketMessageCreationAttributes } from '../models/SupportTicketMessage';
import { emailService } from './emailService';
import { Op } from 'sequelize';

export class SupportTicketService {
  async createTicket(ticketData: SupportTicketCreationAttributes): Promise<SupportTicket> {
    try {
      // Auto-assign priority based on category and keywords
      const priority = this.determinePriority(ticketData.description, ticketData.category);
      
      const ticket = await SupportTicket.create({
        ...ticketData,
        priority,
        status: 'open'
      });

      // Create initial system message
      await this.addMessage({
        ticket_id: ticket.id,
        sender_id: 'system',
        sender_name: 'StellarRec System',
        sender_role: 'system',
        message: `Support ticket created. Ticket ID: ${ticket.id}`,
        is_internal: false
      });

      // Send confirmation email to user
      await this.sendTicketCreatedEmail(ticket);

      // Notify support team for high/urgent priority tickets
      if (priority === 'high' || priority === 'urgent') {
        await this.notifySupportTeam(ticket);
      }

      return ticket;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw new Error('Failed to create support ticket');
    }
  }

  async getTicketById(ticketId: string, userId?: string): Promise<SupportTicket | null> {
    try {
      const whereClause: any = { id: ticketId };
      
      // If userId provided, ensure user can only see their own tickets
      if (userId) {
        whereClause.user_id = userId;
      }

      const ticket = await SupportTicket.findOne({
        where: whereClause,
        include: [
          {
            model: SupportTicketMessage,
            as: 'messages',
            where: userId ? { is_internal: false } : {}, // Hide internal messages from users
            required: false,
            order: [['created_at', 'ASC']]
          }
        ]
      });

      return ticket;
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      throw new Error('Failed to fetch support ticket');
    }
  }

  async getUserTickets(userId: string, status?: string): Promise<SupportTicket[]> {
    try {
      const whereClause: any = { user_id: userId };
      
      if (status) {
        whereClause.status = status;
      }

      const tickets = await SupportTicket.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: SupportTicketMessage,
            as: 'messages',
            where: { is_internal: false },
            required: false,
            limit: 1,
            order: [['created_at', 'DESC']]
          }
        ]
      });

      return tickets;
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      throw new Error('Failed to fetch user tickets');
    }
  }

  async updateTicketStatus(
    ticketId: string, 
    status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed',
    updatedBy: string,
    updatedByName: string
  ): Promise<SupportTicket> {
    try {
      const ticket = await SupportTicket.findByPk(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const updateData: any = { status };
      
      if (status === 'resolved') {
        updateData.resolved_at = new Date();
      } else if (status === 'closed') {
        updateData.closed_at = new Date();
      }

      await ticket.update(updateData);

      // Add status change message
      await this.addMessage({
        ticket_id: ticketId,
        sender_id: updatedBy,
        sender_name: updatedByName,
        sender_role: 'support',
        message: `Ticket status changed to: ${status}`,
        is_internal: false
      });

      // Send status update email to user
      await this.sendStatusUpdateEmail(ticket, status);

      return ticket;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw new Error('Failed to update ticket status');
    }
  }

  async addMessage(messageData: SupportTicketMessageCreationAttributes): Promise<SupportTicketMessage> {
    try {
      const message = await SupportTicketMessage.create(messageData);

      // Update ticket's updated_at timestamp
      await SupportTicket.update(
        { updated_at: new Date() },
        { where: { id: messageData.ticket_id } }
      );

      // If this is a user message, change status from waiting_for_user to in_progress
      if (messageData.sender_role === 'user') {
        const ticket = await SupportTicket.findByPk(messageData.ticket_id);
        if (ticket && ticket.status === 'waiting_for_user') {
          await ticket.update({ status: 'in_progress' });
        }
      }

      // Send email notification for new messages
      if (!messageData.is_internal) {
        await this.sendNewMessageEmail(messageData.ticket_id, message);
      }

      return message;
    } catch (error) {
      console.error('Error adding ticket message:', error);
      throw new Error('Failed to add ticket message');
    }
  }

  async getTicketMessages(ticketId: string, includeInternal: boolean = false): Promise<SupportTicketMessage[]> {
    try {
      const whereClause: any = { ticket_id: ticketId };
      
      if (!includeInternal) {
        whereClause.is_internal = false;
      }

      const messages = await SupportTicketMessage.findAll({
        where: whereClause,
        order: [['created_at', 'ASC']]
      });

      return messages;
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      throw new Error('Failed to fetch ticket messages');
    }
  }

  async assignTicket(ticketId: string, assignedTo: string, assignedBy: string, assignedByName: string): Promise<SupportTicket> {
    try {
      const ticket = await SupportTicket.findByPk(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      await ticket.update({ 
        assigned_to: assignedTo,
        status: ticket.status === 'open' ? 'in_progress' : ticket.status
      });

      // Add assignment message
      await this.addMessage({
        ticket_id: ticketId,
        sender_id: assignedBy,
        sender_name: assignedByName,
        sender_role: 'support',
        message: `Ticket assigned to support team member`,
        is_internal: true
      });

      return ticket;
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw new Error('Failed to assign ticket');
    }
  }

  async getTicketStats(): Promise<any> {
    try {
      const stats = await SupportTicket.findAll({
        attributes: [
          'status',
          'category',
          'priority',
          [SupportTicket.sequelize!.fn('COUNT', '*'), 'count']
        ],
        group: ['status', 'category', 'priority'],
        raw: true
      });

      const totalTickets = await SupportTicket.count();
      const openTickets = await SupportTicket.count({ where: { status: 'open' } });
      const avgResponseTime = await this.calculateAverageResponseTime();

      return {
        total: totalTickets,
        open: openTickets,
        avgResponseTime,
        breakdown: stats
      };
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
      throw new Error('Failed to fetch ticket statistics');
    }
  }

  private determinePriority(description: string, category: string): 'low' | 'medium' | 'high' | 'urgent' {
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'deadline', 'can\'t access', 'broken'];
    const highKeywords = ['important', 'asap', 'soon', 'problem', 'issue', 'error'];
    
    const lowerDescription = description.toLowerCase();
    
    // Check for urgent keywords
    if (urgentKeywords.some(keyword => lowerDescription.includes(keyword))) {
      return 'urgent';
    }
    
    // Check for high priority keywords
    if (highKeywords.some(keyword => lowerDescription.includes(keyword))) {
      return 'high';
    }
    
    // Category-based priority
    if (category === 'technical' || category === 'account') {
      return 'medium';
    }
    
    return 'low';
  }

  private async sendTicketCreatedEmail(ticket: SupportTicket): Promise<void> {
    try {
      await emailService.sendEmail({
        to: ticket.user_email,
        subject: `Support Ticket Created - ${ticket.subject}`,
        template: 'support-ticket-created',
        data: {
          ticketId: ticket.id,
          subject: ticket.subject,
          userName: ticket.user_name,
          category: ticket.category,
          priority: ticket.priority
        }
      });
    } catch (error) {
      console.error('Error sending ticket created email:', error);
    }
  }

  private async sendStatusUpdateEmail(ticket: SupportTicket, newStatus: string): Promise<void> {
    try {
      await emailService.sendEmail({
        to: ticket.user_email,
        subject: `Support Ticket Update - ${ticket.subject}`,
        template: 'support-ticket-status-update',
        data: {
          ticketId: ticket.id,
          subject: ticket.subject,
          userName: ticket.user_name,
          newStatus,
          statusMessage: this.getStatusMessage(newStatus)
        }
      });
    } catch (error) {
      console.error('Error sending status update email:', error);
    }
  }

  private async sendNewMessageEmail(ticketId: string, message: SupportTicketMessage): Promise<void> {
    try {
      const ticket = await SupportTicket.findByPk(ticketId);
      if (!ticket) return;

      // Send to user if message is from support, send to support if message is from user
      const recipient = message.sender_role === 'user' ? 'support@stellarrec.com' : ticket.user_email;
      
      await emailService.sendEmail({
        to: recipient,
        subject: `New Message - ${ticket.subject}`,
        template: 'support-ticket-new-message',
        data: {
          ticketId: ticket.id,
          subject: ticket.subject,
          senderName: message.sender_name,
          message: message.message
        }
      });
    } catch (error) {
      console.error('Error sending new message email:', error);
    }
  }

  private async notifySupportTeam(ticket: SupportTicket): Promise<void> {
    try {
      await emailService.sendEmail({
        to: 'support@stellarrec.com',
        subject: `${ticket.priority.toUpperCase()} Priority Ticket - ${ticket.subject}`,
        template: 'support-team-notification',
        data: {
          ticketId: ticket.id,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          userName: ticket.user_name,
          userEmail: ticket.user_email,
          description: ticket.description
        }
      });
    } catch (error) {
      console.error('Error notifying support team:', error);
    }
  }

  private getStatusMessage(status: string): string {
    const messages = {
      'open': 'Your ticket has been received and is waiting to be assigned.',
      'in_progress': 'A support team member is working on your ticket.',
      'waiting_for_user': 'We need additional information from you to proceed.',
      'resolved': 'Your issue has been resolved. Please let us know if you need further assistance.',
      'closed': 'This ticket has been closed. You can reopen it by replying if needed.'
    };
    
    return messages[status as keyof typeof messages] || 'Ticket status has been updated.';
  }

  private async calculateAverageResponseTime(): Promise<number> {
    try {
      // Calculate average time between ticket creation and first support response
      const tickets = await SupportTicket.findAll({
        include: [
          {
            model: SupportTicketMessage,
            as: 'messages',
            where: { sender_role: 'support' },
            required: true,
            limit: 1,
            order: [['created_at', 'ASC']]
          }
        ]
      });

      if (tickets.length === 0) return 0;

      const totalResponseTime = tickets.reduce((sum, ticket) => {
        const firstResponse = (ticket as any).messages[0];
        if (firstResponse) {
          const responseTime = new Date(firstResponse.created_at).getTime() - new Date(ticket.created_at).getTime();
          return sum + responseTime;
        }
        return sum;
      }, 0);

      // Return average response time in hours
      return Math.round(totalResponseTime / tickets.length / (1000 * 60 * 60));
    } catch (error) {
      console.error('Error calculating average response time:', error);
      return 0;
    }
  }
}

export const supportTicketService = new SupportTicketService();