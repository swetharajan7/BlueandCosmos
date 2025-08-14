import { Pool } from 'pg';
import { RecommenderModel } from '../models/Recommender';
import { ApplicationModel } from '../models/Application';
import { emailService } from './emailService';
import { AppError } from '../utils/AppError';
import { Recommender, Application } from '../types';
import { getNotificationService } from './notificationService';

export class InvitationService {
  private recommenderModel: RecommenderModel;
  private applicationModel: ApplicationModel;

  constructor(db: Pool) {
    this.recommenderModel = new RecommenderModel(db);
    this.applicationModel = new ApplicationModel(db);
  }

  /**
   * Send invitation to recommender
   */
  async sendInvitation(
    applicationId: string,
    recommenderEmail: string,
    studentName: string,
    customMessage?: string
  ): Promise<{ recommender: Recommender; invitation_token: string }> {
    try {
      // Get application details
      const application = await this.applicationModel.findById(applicationId);
      
      // Create invitation
      const { recommender, invitation_token } = await this.recommenderModel.createInvitation({
        application_id: applicationId,
        professional_email: recommenderEmail
      });

      // Send invitation email
      await this.sendInvitationEmail(
        recommender,
        invitation_token,
        application,
        studentName,
        customMessage
      );

      // Trigger notification
      try {
        const notificationService = getNotificationService();
        await notificationService.handleNotification({
          event: 'invitation_sent',
          userId: application.student_id,
          data: {
            recommenderEmail: recommenderEmail,
            recommenderName: 'Recommender', // Will be updated when they confirm
            studentName,
            universities: application.universities.map(u => u.name),
            programType: application.program_type,
            applicationTerm: application.application_term,
            invitationUrl: `${process.env.FRONTEND_URL}/recommender/invitation/${invitation_token}`,
            studentId: application.student_id
          }
        });
      } catch (error) {
        console.error('Failed to send invitation notification:', error);
        // Don't fail the invitation if notification fails
      }

      return { recommender, invitation_token };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to send invitation', 500);
    }
  }

  /**
   * Resend invitation to recommender
   */
  async resendInvitation(
    recommenderId: string,
    applicationId: string,
    studentName: string,
    customMessage?: string
  ): Promise<void> {
    try {
      // Get updated invitation token
      const { recommender, invitation_token } = await this.recommenderModel.resendInvitation(recommenderId);
      
      // Get application details
      const application = await this.applicationModel.findById(applicationId);
      
      // Send invitation email
      await this.sendInvitationEmail(
        recommender,
        invitation_token,
        application,
        studentName,
        customMessage
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to resend invitation', 500);
    }
  }

  /**
   * Get invitation status and details
   */
  async getInvitationDetails(token: string): Promise<{
    recommender: Recommender;
    application: Application;
    status: 'invited' | 'confirmed' | 'expired';
  }> {
    try {
      const recommender = await this.recommenderModel.findByInvitationToken(token);
      
      if (!recommender) {
        throw new AppError('Invalid or expired invitation token', 404);
      }

      // Get applications for this recommender
      const applications = await this.getApplicationsForRecommender(recommender.id);
      if (applications.length === 0) {
        throw new AppError('No application found for recommender', 404);
      }

      const application = await this.applicationModel.findById(applications[0]);
      const { status } = await this.recommenderModel.getInvitationStatus(recommender.id);

      return {
        recommender,
        application,
        status
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get invitation details', 500);
    }
  }

  /**
   * Confirm invitation and set up recommender profile
   */
  async confirmInvitation(
    token: string,
    profileData: {
      first_name: string;
      last_name: string;
      title: string;
      organization: string;
      relationship_duration: string;
      relationship_type: string;
      mobile_phone?: string;
      password: string;
    }
  ): Promise<Recommender> {
    try {
      const confirmedRecommender = await this.recommenderModel.confirmInvitation(token, profileData);
      
      // Send confirmation email
      await this.sendConfirmationEmail(confirmedRecommender, profileData.first_name);
      
      return confirmedRecommender;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to confirm invitation', 500);
    }
  }

  /**
   * Get applications for a recommender
   */
  private async getApplicationsForRecommender(recommenderId: string): Promise<string[]> {
    try {
      return await this.recommenderModel.getApplicationsForRecommender(recommenderId);
    } catch (error) {
      return [];
    }
  }

  /**
   * Send invitation email to recommender
   */
  private async sendInvitationEmail(
    recommender: Recommender,
    invitation_token: string,
    application: Application,
    studentName: string,
    customMessage?: string
  ): Promise<void> {
    const invitationUrl = `${process.env.FRONTEND_URL}/recommender/invitation/${invitation_token}`;
    
    // Format university list
    const universityList = application.universities
      .map(u => `• ${u.name}`)
      .join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recommendation Request - StellarRec™</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .info-box { background: #e3f2fd; border-left: 4px solid #1976d2; padding: 15px; margin: 15px 0; }
          .university-list { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recommendation Request</h1>
            <p>StellarRec™ - Universal College Recommendation System</p>
          </div>
          <div class="content">
            <h2>You've been invited to write a recommendation</h2>
            
            <div class="info-box">
              <p><strong>Student:</strong> ${studentName}</p>
              <p><strong>Program Type:</strong> ${application.program_type.charAt(0).toUpperCase() + application.program_type.slice(1)}</p>
              <p><strong>Application Term:</strong> ${application.application_term}</p>
            </div>

            <h3>Target Universities:</h3>
            <div class="university-list">
              <pre>${universityList}</pre>
            </div>

            ${customMessage ? `
            <h3>Personal Message from ${studentName}:</h3>
            <div class="info-box">
              <p><em>"${customMessage}"</em></p>
            </div>
            ` : ''}

            <h3>About StellarRec™</h3>
            <p>StellarRec™ revolutionizes the recommendation process by allowing you to write <strong>one recommendation letter</strong> that will be automatically submitted to <strong>all selected universities</strong>. This saves you time while ensuring consistent, high-quality recommendations for your student.</p>

            <div class="warning">
              <p><strong>Important:</strong> By clicking the link below, you acknowledge that you are connecting to a third-party website (StellarRec™) to complete this recommendation.</p>
            </div>

            <h3>Key Features:</h3>
            <ul>
              <li>✅ Write once, submit to multiple universities</li>
              <li>✅ AI-powered writing assistance</li>
              <li>✅ Secure, FERPA-compliant platform</li>
              <li>✅ Real-time submission tracking</li>
              <li>✅ Professional email notifications</li>
            </ul>

            <p style="text-align: center;">
              <a href="${invitationUrl}" class="button">Accept Invitation & Write Recommendation</a>
            </p>

            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #1976d2;">${invitationUrl}</p>

            <p><strong>This invitation will expire in 7 days.</strong></p>

            <h3>What happens next?</h3>
            <ol>
              <li>Click the invitation link above</li>
              <li>Confirm the student's application details</li>
              <li>Complete your professional profile</li>
              <li>Write your recommendation with AI assistance</li>
              <li>Submit to all universities with one click</li>
            </ol>

            <p>If you have any questions or concerns, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 StellarRec™. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>If you believe you received this email in error, please ignore it.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await emailService.sendEmail({
      to: recommender.professional_email,
      subject: `Recommendation Request from ${studentName} - StellarRec™`,
      html
    });
  }

  /**
   * Send confirmation email after invitation is accepted
   */
  private async sendConfirmationEmail(
    recommender: Recommender,
    firstName: string
  ): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to StellarRec™</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4caf50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to StellarRec™!</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            
            <div class="success">
              <p><strong>Your recommender account has been successfully created!</strong></p>
            </div>

            <p>Thank you for accepting the invitation to write a recommendation through StellarRec™. Your account is now active and you can begin writing recommendations.</p>

            <h3>Your Account Details:</h3>
            <ul>
              <li><strong>Email:</strong> ${recommender.professional_email}</li>
              <li><strong>Organization:</strong> ${recommender.organization}</li>
              <li><strong>Title:</strong> ${recommender.title}</li>
            </ul>

            <h3>Next Steps:</h3>
            <ol>
              <li>Log in to your StellarRec™ account</li>
              <li>Review the student's application details</li>
              <li>Write your recommendation with AI assistance</li>
              <li>Submit to all universities with one click</li>
            </ol>

            <p style="text-align: center;">
              <a href="${loginUrl}" class="button">Log In to StellarRec™</a>
            </p>

            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

            <p>Thank you for using StellarRec™ to streamline the recommendation process!</p>
          </div>
          <div class="footer">
            <p>© 2024 StellarRec™. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await emailService.sendEmail({
      to: recommender.professional_email,
      subject: 'Welcome to StellarRec™ - Account Created Successfully',
      html
    });
  }
}