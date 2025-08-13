# University Portal Integration Framework

## Overview

The University Portal Integration Framework provides a comprehensive system for submitting recommendation letters to multiple universities through various submission methods. The framework includes an abstraction layer for different submission types, a robust queue system with retry mechanisms, and comprehensive validation.

## Architecture

### Core Components

1. **Submission Model** (`models/Submission.ts`)
   - Manages submission data and database operations
   - Tracks submission status, retry counts, and external references
   - Provides bulk operations for multiple submissions

2. **University Integration Service** (`services/universityIntegrationService.ts`)
   - Main service orchestrating submission processes
   - Implements adapter pattern for different submission methods
   - Handles validation and error management

3. **Submission Queue Service** (`services/submissionQueueService.ts`)
   - Manages asynchronous processing of submissions
   - Implements priority-based queue with exponential backoff
   - Provides retry mechanisms and failure handling

4. **Submission Controller** (`controllers/submissionController.ts`)
   - REST API endpoints for submission management
   - Handles authentication and input validation
   - Provides admin interfaces for queue management

## Submission Methods

### Email Submission Adapter
- **Use Case**: Universities that accept recommendations via email
- **Configuration**: Requires `email_address` in university record
- **Process**: Formats recommendation and sends via email service
- **Reference**: Generates `EMAIL_` prefixed tracking reference

### API Submission Adapter
- **Use Case**: Universities with direct API integration
- **Configuration**: Requires `api_endpoint` in university record
- **Process**: Makes HTTP requests to university APIs
- **Reference**: Generates `API_` prefixed tracking reference

### Manual Submission Adapter
- **Use Case**: Universities requiring manual processing
- **Configuration**: No special configuration required
- **Process**: Marks for manual intervention
- **Reference**: Generates `MANUAL_` prefixed tracking reference

## Queue System

### Priority Levels
- **1 (Highest)**: Urgent submissions, retries
- **5 (Default)**: Standard submissions
- **10 (Lowest)**: Bulk operations, background tasks

### Retry Mechanism
- **Exponential Backoff**: Base delay of 1 second, multiplier of 2.0
- **Maximum Attempts**: 5 retries per submission
- **Maximum Backoff**: 5 minutes between attempts
- **Failure Handling**: Permanent failure after max attempts

### Queue Processing
- **Batch Processing**: Processes up to 10 submissions per cycle
- **Concurrent Processing**: Multiple submissions processed in parallel
- **Status Tracking**: Real-time status updates and monitoring

## API Endpoints

### Submission Management
```
POST   /api/submissions/submit                    # Submit recommendation to universities
GET    /api/submissions/:id/status               # Get submission status
GET    /api/submissions/recommendation/:id       # Get all submissions for recommendation
POST   /api/submissions/:id/retry                # Retry failed submission
POST   /api/submissions/retry-all-failed         # Retry all failed submissions
GET    /api/submissions/stats                    # Get submission statistics
```

### Queue Management
```
GET    /api/submissions/queue/status             # Get queue status
GET    /api/submissions/queue/items              # Get paginated queue items
PUT    /api/submissions/:id/priority             # Set submission priority
POST   /api/submissions/queue/start              # Start queue processing
POST   /api/submissions/queue/stop               # Stop queue processing
```

### Validation
```
POST   /api/submissions/validate/:universityId  # Validate submission data
```

## Database Schema

### Submissions Table
```sql
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recommendation_id UUID NOT NULL REFERENCES recommendations(id),
    university_id UUID NOT NULL REFERENCES universities(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    submission_method VARCHAR(20) NOT NULL,
    external_reference VARCHAR(255),
    submitted_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Submission Queue Table
```sql
CREATE TABLE submission_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES submissions(id),
    priority INTEGER NOT NULL DEFAULT 5,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    backoff_multiplier DECIMAL(3,1) NOT NULL DEFAULT 2.0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Examples

### Submit Recommendation
```typescript
const result = await integrationService.submitRecommendation(
  'recommendation-id',
  ['university-1', 'university-2']
);

console.log(`Successful: ${result.successful.length}`);
console.log(`Failed: ${result.failed.length}`);
```

### Start Queue Processing
```typescript
const queueService = new SubmissionQueueService(db);
await queueService.startProcessing(30000); // Process every 30 seconds
```

### Retry Failed Submission
```typescript
await queueService.retrySubmission('submission-id', 1); // High priority
```

### Get Submission Status
```typescript
const submission = await integrationService.getSubmissionStatus('submission-id');
console.log(`Status: ${submission.status}`);
```

## Configuration

### Environment Variables
```env
# Queue processing
QUEUE_PROCESSING_INTERVAL=30000
QUEUE_MAX_RETRIES=5
QUEUE_BASE_BACKOFF_MS=1000
QUEUE_MAX_BACKOFF_MS=300000

# Email service (for email submissions)
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@stellarrec.com

# University API configurations
UNIVERSITY_API_TIMEOUT=30000
UNIVERSITY_API_RETRIES=3
```

### University Configuration
Universities must be configured with appropriate submission methods:

```sql
-- Email submission university
INSERT INTO universities (name, code, submission_format, email_address)
VALUES ('Harvard University', 'HARVARD', 'email', 'admissions@harvard.edu');

-- API submission university
INSERT INTO universities (name, code, submission_format, api_endpoint)
VALUES ('MIT', 'MIT', 'api', 'https://api.mit.edu/admissions/recommendations');

-- Manual submission university
INSERT INTO universities (name, code, submission_format)
VALUES ('Stanford University', 'STANFORD', 'manual');
```

## Error Handling

### Common Error Scenarios
1. **University Not Found**: Invalid university ID provided
2. **Validation Failure**: Submission data doesn't meet requirements
3. **Network Errors**: API endpoints unavailable
4. **Authentication Errors**: Invalid credentials for university APIs
5. **Rate Limiting**: Too many requests to university systems

### Error Recovery
- **Automatic Retry**: Failed submissions automatically retry with backoff
- **Manual Intervention**: Admin can manually retry or investigate failures
- **Fallback Methods**: Can switch submission methods if primary fails
- **Notification System**: Alerts administrators of persistent failures

## Monitoring and Observability

### Metrics Tracked
- Submission success/failure rates by university
- Queue processing times and throughput
- Retry attempt distributions
- Error frequency and types

### Logging
- All submission attempts logged with timestamps
- Error messages and stack traces captured
- Queue processing events tracked
- University-specific submission patterns monitored

### Health Checks
- Queue processing status monitoring
- Database connection health
- External service availability
- Submission backlog alerts

## Security Considerations

### Data Protection
- All submission data encrypted in transit and at rest
- University credentials stored securely
- Access logs maintained for audit purposes
- FERPA compliance for educational records

### Authentication
- JWT-based authentication for all API endpoints
- Role-based access control (student, recommender, admin)
- University API credentials managed securely
- Rate limiting to prevent abuse

### Privacy
- Submission data only accessible to authorized users
- University-specific data isolation
- Audit trails for all data access
- Compliance with GDPR and FERPA requirements

## Testing

### Unit Tests
- Individual adapter functionality
- Queue processing logic
- Validation rules
- Error handling scenarios

### Integration Tests
- End-to-end submission workflows
- Database operations
- API endpoint functionality
- Queue processing with real data

### Performance Tests
- Concurrent submission handling
- Queue processing under load
- Database performance with large datasets
- Memory usage and resource optimization

## Deployment

### Production Setup
1. Initialize database tables
2. Configure university submission methods
3. Set up monitoring and alerting
4. Start queue processing service
5. Configure load balancing for API endpoints

### Scaling Considerations
- Horizontal scaling of queue processors
- Database read replicas for status queries
- Caching for frequently accessed data
- Load balancing for high availability

## Future Enhancements

### Planned Features
1. **Webhook Support**: Real-time status updates from universities
2. **Batch Submissions**: Bulk processing for multiple recommendations
3. **Advanced Analytics**: Detailed reporting and insights
4. **Machine Learning**: Predictive failure detection and optimization
5. **Multi-tenant Support**: Support for multiple institutions

### Integration Opportunities
1. **University APIs**: Direct integration with more university systems
2. **Document Management**: Enhanced document formatting and templates
3. **Notification Systems**: SMS and push notification support
4. **Analytics Platforms**: Integration with business intelligence tools
5. **Compliance Tools**: Automated compliance checking and reporting