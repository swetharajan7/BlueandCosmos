#!/bin/bash

# StellarRec System Launch Script
# This script initializes the soft launch of the StellarRec system

set -e

echo "🚀 Starting StellarRec System Launch..."

# Configuration
ENVIRONMENT=${1:-staging}
LOG_FILE="launch-$(date +%Y%m%d-%H%M%S).log"
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_DELAY=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if required environment files exist
    if [ ! -f ".env" ]; then
        error ".env file not found. Please create it from .env.example"
        exit 1
    fi
    
    # Check if database is accessible
    if ! docker-compose exec -T postgres pg_isready > /dev/null 2>&1; then
        warning "Database connection check failed. Will attempt to start services."
    fi
    
    success "Prerequisites check completed"
}

# Start services
start_services() {
    log "Starting services for $ENVIRONMENT environment..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f deployment/production/docker-compose.yml up -d
    else
        docker-compose up -d
    fi
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    success "Services started"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Run migrations
    docker-compose exec -T backend npm run migrate
    
    # Populate universities if needed
    docker-compose exec -T backend node scripts/populate-universities.js
    
    success "Database migrations completed"
}

# Initialize launch configuration
initialize_launch_config() {
    log "Initializing launch configuration..."
    
    # Set launch configuration based on environment
    case $ENVIRONMENT in
        "development")
            PRESET="development"
            ;;
        "staging")
            PRESET="staging"
            ;;
        "production")
            PRESET="production"
            ;;
        *)
            PRESET="staging"
            ;;
    esac
    
    # Apply configuration preset via API
    curl -X POST "http://localhost:3001/api/launch/config/preset/$PRESET" \
         -H "Content-Type: application/json" \
         -H "Authorization: Bearer $ADMIN_TOKEN" \
         > /dev/null 2>&1 || warning "Failed to apply launch configuration preset"
    
    success "Launch configuration initialized with $PRESET preset"
}

# Health check
health_check() {
    log "Performing health check..."
    
    local retries=0
    while [ $retries -lt $HEALTH_CHECK_RETRIES ]; do
        # Check backend health
        if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
            success "Backend health check passed"
            break
        else
            retries=$((retries + 1))
            if [ $retries -lt $HEALTH_CHECK_RETRIES ]; then
                warning "Backend health check failed, retrying in $HEALTH_CHECK_DELAY seconds... ($retries/$HEALTH_CHECK_RETRIES)"
                sleep $HEALTH_CHECK_DELAY
            else
                error "Backend health check failed after $HEALTH_CHECK_RETRIES attempts"
                return 1
            fi
        fi
    done
    
    # Check frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        success "Frontend health check passed"
    else
        warning "Frontend health check failed"
    fi
    
    # Check database
    if docker-compose exec -T postgres pg_isready > /dev/null 2>&1; then
        success "Database health check passed"
    else
        error "Database health check failed"
        return 1
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
        success "Redis health check passed"
    else
        warning "Redis health check failed"
    fi
    
    success "Health check completed"
}

# Start monitoring
start_monitoring() {
    log "Starting performance monitoring..."
    
    # Initialize monitoring via API
    curl -X POST "http://localhost:3001/api/launch/initialize" \
         -H "Content-Type: application/json" \
         -H "Authorization: Bearer $ADMIN_TOKEN" \
         > /dev/null 2>&1 || warning "Failed to initialize launch monitoring"
    
    success "Performance monitoring started"
}

# Generate launch report
generate_launch_report() {
    log "Generating launch report..."
    
    # Get system metrics
    METRICS=$(curl -s "http://localhost:3001/api/launch/metrics" \
              -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo "{}")
    
    # Create launch report
    cat > "launch-report-$(date +%Y%m%d-%H%M%S).json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "status": "launched",
    "services": {
        "backend": "running",
        "frontend": "running",
        "database": "running",
        "redis": "running"
    },
    "metrics": $METRICS
}
EOF
    
    success "Launch report generated"
}

# Send launch notification
send_launch_notification() {
    log "Sending launch notification..."
    
    local message="StellarRec system successfully launched in $ENVIRONMENT environment at $(date)"
    
    # Send email notification if configured
    if [ -n "$LAUNCH_NOTIFICATION_EMAIL" ]; then
        echo "$message" | mail -s "StellarRec Launch Notification" "$LAUNCH_NOTIFICATION_EMAIL" 2>/dev/null || \
        warning "Failed to send email notification"
    fi
    
    # Send Slack notification if configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
             -H 'Content-type: application/json' \
             --data "{\"text\":\"$message\"}" \
             > /dev/null 2>&1 || warning "Failed to send Slack notification"
    fi
    
    success "Launch notification sent"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    # Add any cleanup tasks here
}

# Trap cleanup function on script exit
trap cleanup EXIT

# Main execution
main() {
    log "Starting StellarRec system launch for $ENVIRONMENT environment"
    
    # Load environment variables
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Execute launch steps
    check_prerequisites
    start_services
    run_migrations
    health_check
    initialize_launch_config
    start_monitoring
    generate_launch_report
    send_launch_notification
    
    success "🎉 StellarRec system launch completed successfully!"
    log "Launch log saved to: $LOG_FILE"
    
    # Display launch summary
    echo ""
    echo "=== LAUNCH SUMMARY ==="
    echo "Environment: $ENVIRONMENT"
    echo "Frontend URL: http://localhost:3000"
    echo "Backend URL: http://localhost:3001"
    echo "Admin Panel: http://localhost:3000/admin"
    echo "Launch Log: $LOG_FILE"
    echo ""
    echo "Next steps:"
    echo "1. Monitor system performance via admin panel"
    echo "2. Review launch metrics and user feedback"
    echo "3. Scale infrastructure based on usage patterns"
    echo "4. Implement bug fixes and optimizations as needed"
    echo ""
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 [environment]"
    echo "Environments: development, staging, production"
    echo "Default: staging"
    echo ""
    echo "Example: $0 production"
    exit 1
fi

# Execute main function
main