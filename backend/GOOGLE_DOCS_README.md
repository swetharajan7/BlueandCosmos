# Google Docs Integration

This document describes the Google Docs integration system for StellarRec™, which automatically creates and manages Google Documents for each application.

## Overview

The Google Docs integration provides the following functionality:

1. **Automatic Document Creation**: When a student creates an application, a Google Doc is automatically created with proper header formatting
2. **Real-time Updates**: When application data changes, the Google Doc is updated automatically
3. **Document Sharing**: Configurable permissions for document access
4. **Recommendation Storage**: Recommendations are automatically added to the document
5. **Error Handling**: Robust error handling for Google API failures

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Google Docs API Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
GOOGLE_SERVICE_ACCOUNT_KEY=your-google-service-account-json-key
```

### Google Cloud Setup

1. Create a project in Google Cloud Console
2. Enable the Google Docs API and Google Drive API
3. Create credentials (OAuth 2.0 or Service Account)
4. Download the service account key (JSON format)

## API Endpoints

### Get Document URL
```
GET /api/google-docs/:applicationId/url
```
Returns the Google Docs URL for the application document.

### Update Document
```
PUT /api/google-docs/:applicationId/update
```
Updates the Google Doc with current application data.

### Set Permissions
```
POST /api/google-docs/:applicationId/permissions
```
Sets document sharing permissions.

**Request Body:**
```json
{
  "permissions": [
    {
      "type": "user",
      "role": "reader",
      "emailAddress": "user@example.com"
    }
  ]
}
```

### Add Recommendation
```
POST /api/google-docs/:applicationId/recommendation
```
Adds recommendation content to the document.

**Request Body:**
```json
{
  "universityName": "Harvard University",
  "recommendationContent": "Recommendation text...",
  "recommenderName": "Dr. John Smith"
}
```

### Get Document Metadata
```
GET /api/google-docs/:applicationId/metadata
```
Returns document metadata including creation time, modification time, and permissions.

### Validate Access
```
GET /api/google-docs/:applicationId/validate
```
Validates that the document exists and is accessible.

## Document Format

### Header Format
```
[Program Type] Program, [University Name], [Application Term] - [Student Legal Name]
```

Example:
```
Graduate Programs, Multiple Universities, Fall 2024 - John Doe
```

### Recommendation Format
```
--- Recommendation for [University Name] ---
Recommender: [Recommender Name]
Date: [Date]

[Recommendation Content]
```

## Error Handling

The system includes comprehensive error handling:

- **Google API Failures**: Automatic retries with exponential backoff
- **Authentication Errors**: Clear error messages for credential issues
- **Permission Errors**: Proper handling of access denied scenarios
- **Network Errors**: Graceful degradation when Google services are unavailable

## Security

- All API endpoints require authentication
- Document access is restricted to application owners
- Service account keys should be stored securely
- OAuth tokens are handled securely

## Testing

### Unit Tests
```bash
npm test -- --testPathPattern=googleDocs.test.ts
```

### Integration Tests
```bash
npm test -- --testPathPattern=googleDocs.integration.test.ts
```

Note: Integration tests require actual Google API credentials and are skipped by default.

## Troubleshooting

### Common Issues

1. **"Google API not configured"**
   - Ensure all environment variables are set
   - Verify Google Cloud project has APIs enabled

2. **"Permission denied"**
   - Check service account permissions
   - Verify OAuth scopes include documents and drive

3. **"Document not found"**
   - Check if document was created successfully
   - Verify document ID is stored in database

4. **"Rate limit exceeded"**
   - Implement exponential backoff
   - Consider caching frequently accessed data

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

## Implementation Details

### Service Architecture
- `GoogleDocsService`: Core service for Google API interactions
- `GoogleDocsController`: HTTP request handlers
- `ApplicationModel`: Database integration with Google Docs

### Key Features
- Automatic document creation on application creation
- Real-time updates when application data changes
- Configurable document permissions
- Recommendation content management
- Comprehensive error handling and logging

## Future Enhancements

1. **Template System**: Customizable document templates
2. **Batch Operations**: Bulk document operations
3. **Version History**: Track document changes
4. **Advanced Permissions**: Role-based document access
5. **Document Analytics**: Usage and access tracking