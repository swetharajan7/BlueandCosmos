import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface InvitationRequest {
  recommender_email: string;
  custom_message?: string;
}

export interface RecommenderInvitation {
  id: string;
  professional_email: string;
  title: string;
  organization: string;
  relationship_duration: string;
  relationship_type: string;
  mobile_phone?: string;
  status: 'invited' | 'confirmed' | 'expired';
  invitation_expires?: string;
  confirmed_at?: string;
  invited_at: string;
}

export interface InvitationDetails {
  recommender: {
    id: string;
    professional_email: string;
    title: string;
    organization: string;
  };
  application: {
    id: string;
    legal_name: string;
    program_type: string;
    application_term: string;
    universities: Array<{
      id: string;
      name: string;
      code: string;
    }>;
  };
  status: 'invited' | 'confirmed' | 'expired';
}

export interface InvitationConfirmation {
  first_name: string;
  last_name: string;
  title: string;
  organization: string;
  relationship_duration: string;
  relationship_type: string;
  mobile_phone?: string;
  password: string;
}

class InvitationService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Send invitation to recommender
   */
  async sendInvitation(applicationId: string, invitation: InvitationRequest): Promise<RecommenderInvitation> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/applications/${applicationId}/invitations`,
        invitation,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data.recommender;
      } else {
        throw new Error(response.data.error?.message || 'Failed to send invitation');
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to send invitation');
    }
  }

  /**
   * Get all recommenders for an application
   */
  async getApplicationRecommenders(applicationId: string): Promise<RecommenderInvitation[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/applications/${applicationId}/invitations`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to get recommenders');
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to get recommenders');
    }
  }

  /**
   * Resend invitation to recommender
   */
  async resendInvitation(
    applicationId: string, 
    recommenderId: string, 
    customMessage?: string
  ): Promise<void> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/applications/${applicationId}/invitations/${recommenderId}/resend`,
        { custom_message: customMessage },
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to resend invitation');
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to resend invitation');
    }
  }

  /**
   * Delete recommender invitation
   */
  async deleteInvitation(applicationId: string, recommenderId: string): Promise<void> {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/applications/${applicationId}/invitations/${recommenderId}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to delete invitation');
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to delete invitation');
    }
  }

  /**
   * Get invitation details by token (public endpoint)
   */
  async getInvitationDetails(token: string): Promise<InvitationDetails> {
    try {
      const response = await axios.get(`${API_BASE_URL}/invitations/${token}`);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Invalid invitation token');
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to get invitation details');
    }
  }

  /**
   * Confirm invitation and create recommender profile (public endpoint)
   */
  async confirmInvitation(token: string, confirmation: InvitationConfirmation): Promise<void> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/invitations/${token}/confirm`,
        confirmation
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to confirm invitation');
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to confirm invitation');
    }
  }
}

export const invitationService = new InvitationService();