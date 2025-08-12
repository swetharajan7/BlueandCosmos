import { google } from 'googleapis';
import { Application } from '../types';
import { AppError } from '../utils/AppError';

export interface GoogleDocsConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  serviceAccountKey?: string;
}

export interface DocumentHeader {
  programName: string;
  universityName: string;
  term: string;
  applicantLegalName: string;
}

export interface DocumentPermission {
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
}

export class GoogleDocsService {
  private auth: any;
  private docs: any;
  private drive: any;

  constructor(config: GoogleDocsConfig) {
    // Set up service account authentication if provided
    if (config.serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(config.serviceAccountKey);
        this.auth = new google.auth.GoogleAuth({
          credentials: serviceAccount,
          scopes: [
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/drive'
          ]
        });
      } catch (error) {
        console.error('Failed to parse service account key:', error);
        this.auth = new google.auth.OAuth2(
          config.clientId,
          config.clientSecret,
          config.redirectUri
        );
      }
    } else {
      this.auth = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
      );
    }

    this.docs = google.docs({ version: 'v1', auth: this.auth });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  /**
   * Set OAuth2 credentials for user-based authentication
   */
  setCredentials(tokens: any): void {
    this.auth.setCredentials(tokens);
  }

  /**
   * Create a new Google Doc for an application
   */
  async createApplicationDocument(application: Application): Promise<string> {
    try {
      const title = this.generateDocumentTitle(application);
      
      // Create the document
      const createResponse = await this.docs.documents.create({
        requestBody: {
          title: title
        }
      });

      const documentId = createResponse.data.documentId;
      if (!documentId) {
        throw new AppError('Failed to create Google Doc', 500);
      }

      // Add the header content
      await this.addDocumentHeader(documentId, application);

      return documentId;
    } catch (error: any) {
      console.error('Error creating Google Doc:', error);
      throw new AppError(
        `Failed to create Google Doc: ${error.message}`,
        500
      );
    }
  }

  /**
   * Generate document title based on application data
   */
  private generateDocumentTitle(application: Application): string {
    const universities = application.universities?.map((u: any) => u.name).join(', ') || 'Multiple Universities';
    return `${application.program_type} Application, ${universities}, ${application.application_term} - ${application.legal_name}`;
  }

  /**
   * Add header content to the document
   */
  private async addDocumentHeader(documentId: string, application: Application): Promise<void> {
    try {
      const headerText = this.generateHeaderText(application);
      
      const requests = [
        {
          insertText: {
            location: {
              index: 1
            },
            text: headerText
          }
        },
        {
          updateTextStyle: {
            range: {
              startIndex: 1,
              endIndex: headerText.length + 1
            },
            textStyle: {
              bold: true,
              fontSize: {
                magnitude: 14,
                unit: 'PT'
              }
            },
            fields: 'bold,fontSize'
          }
        },
        {
          insertText: {
            location: {
              index: headerText.length + 1
            },
            text: '\n\n'
          }
        }
      ];

      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });
    } catch (error: any) {
      console.error('Error adding document header:', error);
      throw new AppError(
        `Failed to add document header: ${error.message}`,
        500
      );
    }
  }

  /**
   * Generate header text for the document
   */
  private generateHeaderText(application: Application): string {
    const universities = application.universities || [];
    
    if (universities.length === 1) {
      return `${application.program_type} Program, ${universities[0].name}, ${application.application_term} - ${application.legal_name}`;
    } else {
      return `${application.program_type} Programs, Multiple Universities, ${application.application_term} - ${application.legal_name}`;
    }
  }

  /**
   * Update document with application changes
   */
  async updateApplicationDocument(documentId: string, application: Application): Promise<void> {
    try {
      // Get current document content
      const doc = await this.docs.documents.get({
        documentId: documentId
      });

      // Find the header section and update it
      const newHeaderText = this.generateHeaderText(application);
      
      // Replace the first paragraph (header) with updated information
      const requests = [
        {
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: doc.data.body.content[1].paragraph.elements[0].endIndex
            }
          }
        },
        {
          insertText: {
            location: {
              index: 1
            },
            text: newHeaderText
          }
        },
        {
          updateTextStyle: {
            range: {
              startIndex: 1,
              endIndex: newHeaderText.length + 1
            },
            textStyle: {
              bold: true,
              fontSize: {
                magnitude: 14,
                unit: 'PT'
              }
            },
            fields: 'bold,fontSize'
          }
        }
      ];

      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });
    } catch (error: any) {
      console.error('Error updating Google Doc:', error);
      throw new AppError(
        `Failed to update Google Doc: ${error.message}`,
        500
      );
    }
  }

  /**
   * Add recommendation content to the document
   */
  async addRecommendationContent(
    documentId: string, 
    universityName: string, 
    recommendationContent: string,
    recommenderName: string
  ): Promise<void> {
    try {
      // Get current document to find insertion point
      const doc = await this.docs.documents.get({
        documentId: documentId
      });

      const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex - 1;
      
      const sectionHeader = `\n\n--- Recommendation for ${universityName} ---\n`;
      const recommenderInfo = `Recommender: ${recommenderName}\n`;
      const timestamp = `Date: ${new Date().toLocaleDateString()}\n\n`;
      const fullContent = sectionHeader + recommenderInfo + timestamp + recommendationContent + '\n';

      const requests = [
        {
          insertText: {
            location: {
              index: endIndex
            },
            text: fullContent
          }
        },
        {
          updateTextStyle: {
            range: {
              startIndex: endIndex,
              endIndex: endIndex + sectionHeader.length
            },
            textStyle: {
              bold: true,
              fontSize: {
                magnitude: 12,
                unit: 'PT'
              }
            },
            fields: 'bold,fontSize'
          }
        }
      ];

      await this.docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests
        }
      });
    } catch (error: any) {
      console.error('Error adding recommendation content:', error);
      throw new AppError(
        `Failed to add recommendation content: ${error.message}`,
        500
      );
    }
  }

  /**
   * Set document permissions
   */
  async setDocumentPermissions(
    documentId: string, 
    permissions: DocumentPermission[]
  ): Promise<void> {
    try {
      for (const permission of permissions) {
        await this.drive.permissions.create({
          fileId: documentId,
          requestBody: {
            type: permission.type,
            role: permission.role,
            emailAddress: permission.emailAddress
          }
        });
      }
    } catch (error: any) {
      console.error('Error setting document permissions:', error);
      throw new AppError(
        `Failed to set document permissions: ${error.message}`,
        500
      );
    }
  }

  /**
   * Get document sharing URL
   */
  async getDocumentUrl(documentId: string): Promise<string> {
    try {
      const response = await this.drive.files.get({
        fileId: documentId,
        fields: 'webViewLink'
      });

      return response.data.webViewLink || `https://docs.google.com/document/d/${documentId}/edit`;
    } catch (error: any) {
      console.error('Error getting document URL:', error);
      throw new AppError(
        `Failed to get document URL: ${error.message}`,
        500
      );
    }
  }

  /**
   * Check if document exists and is accessible
   */
  async validateDocumentAccess(documentId: string): Promise<boolean> {
    try {
      await this.docs.documents.get({
        documentId: documentId
      });
      return true;
    } catch (error: any) {
      console.error('Document validation failed:', error);
      return false;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId: documentId
      });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      throw new AppError(
        `Failed to delete document: ${error.message}`,
        500
      );
    }
  }

  /**
   * Get document metadata
   */
  async getDocumentMetadata(documentId: string): Promise<any> {
    try {
      const response = await this.drive.files.get({
        fileId: documentId,
        fields: 'id,name,createdTime,modifiedTime,owners,permissions'
      });

      return response.data;
    } catch (error: any) {
      console.error('Error getting document metadata:', error);
      throw new AppError(
        `Failed to get document metadata: ${error.message}`,
        500
      );
    }
  }
}