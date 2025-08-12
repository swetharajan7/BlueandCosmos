import { GoogleDocsService, GoogleDocsConfig } from '../services/googleDocsService';

const googleDocsConfig: GoogleDocsConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
};

// Validate required configuration
if (!googleDocsConfig.clientId || !googleDocsConfig.clientSecret) {
  console.warn('Google Docs API configuration is incomplete. Some features may not work.');
}

// Create singleton instance
let googleDocsService: GoogleDocsService | null = null;

export const getGoogleDocsService = (): GoogleDocsService => {
  if (!googleDocsService) {
    googleDocsService = new GoogleDocsService(googleDocsConfig);
  }
  return googleDocsService;
};

export { googleDocsConfig };