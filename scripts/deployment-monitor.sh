#!/bin/bash

# Deployment Monitoring and Rollback Script
# This script monitors deployment health and can trigger rollbacks

set -e

ENVIRONMENT=${1:-staging}
SERVICE_NAME="stellarrec"
HEALTH_CHECK_URL=""
ROLLBACK_IMAGE_TAG=""
MAX_RETRIES=30
RETRY_INTERVAL=10

# Set environment-specific variables
case $ENVIRONMENT in
  "staging")
    HEALTH_CHECK_URL="https://staging.stellarrec.com/health"
    ;;
  "production")
    HEALTH_CHECK_URL="https://stellarrec.com/health"
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    exit 1
    ;;
esac

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Function to check application health
check_health() {
  local url=$1
  local retries=0
  
  while [ $retries -lt $MAX_RETRIES ]; do
    log "Health check attempt $((retries + 1))/$MAX_RETRIES for $url"
    
    if curl -f -s --max-time 10 "$url" > /dev/null; then
      log "Health check passed"
      return 0
    else
      warn "Health check failed, retrying in ${RETRY_INTERVAL}s..."
      sleep $RETRY_INTERVAL
      retries=$((retries + 1))
    fi
  done
  
  error "Health check failed after $MAX_RETRIES attempts"
  return 1
}

# Function to get current deployment version
get_current_version() {
  # This would typically query your deployment system (ECS, Kubernetes, etc.)
  # For now, we'll simulate it
  echo "current-version-placeholder"
}

# Function to get previous deployment version
get_previous_version() {
  # This would query your deployment history
  # For now, we'll simulate it
  echo "previous-version-placeholder"
}

# Function to perform rollback
perform_rollback() {
  local previous_version=$1
  
  error "Initiating rollback to version: $previous_version"
  
  # Send notification about rollback
  send_notification "🚨 ROLLBACK INITIATED" "Rolling back $ENVIRONMENT to version $previous_version due to health check failures"
  
  # Perform the actual rollback
  case $ENVIRONMENT in
    "staging")
      rollback_staging "$previous_version"
      ;;
    "production")
      rollback_production "$previous_version"
      ;;
  esac
  
  # Wait for rollback to complete
  sleep 30
  
  # Verify rollback health
  if check_health "$HEALTH_CHECK_URL"; then
    log "Rollback successful - application is healthy"
    send_notification "✅ ROLLBACK SUCCESSFUL" "Rollback to version $previous_version completed successfully"
    return 0
  else
    error "Rollback failed - application still unhealthy"
    send_notification "❌ ROLLBACK FAILED" "Rollback to version $previous_version failed - manual intervention required"
    return 1
  fi
}

# Function to rollback staging environment
rollback_staging() {
  local version=$1
  log "Rolling back staging to version: $version"
  
  # Example: Update ECS service with previous task definition
  # aws ecs update-service --cluster stellarrec-staging --service stellarrec-backend --task-definition stellarrec-backend:$version
  # aws ecs update-service --cluster stellarrec-staging --service stellarrec-frontend --task-definition stellarrec-frontend:$version
  
  echo "Staging rollback simulation for version: $version"
}

# Function to rollback production environment
rollback_production() {
  local version=$1
  log "Rolling back production to version: $version"
  
  # Example: Blue-green deployment rollback
  # aws elbv2 modify-listener --listener-arn $LISTENER_ARN --default-actions Type=forward,TargetGroupArn=$BLUE_TARGET_GROUP
  
  echo "Production rollback simulation for version: $version"
}

# Function to send notifications
send_notification() {
  local title=$1
  local message=$2
  
  log "Sending notification: $title"
  
  # Send to Slack
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"$title\n$message\"}" \
      "$SLACK_WEBHOOK_URL"
  fi
  
  # Send email notification
  if [ -n "$NOTIFICATION_EMAIL" ]; then
    echo "$message" | mail -s "$title - StellarRec $ENVIRONMENT" "$NOTIFICATION_EMAIL"
  fi
  
  # Log to monitoring system
  log "Notification sent: $title - $message"
}

# Function to monitor deployment
monitor_deployment() {
  local current_version
  current_version=$(get_current_version)
  
  log "Starting deployment monitoring for $ENVIRONMENT (version: $current_version)"
  
  # Initial health check
  if check_health "$HEALTH_CHECK_URL"; then
    log "Initial deployment health check passed"
    send_notification "✅ DEPLOYMENT SUCCESSFUL" "Deployment to $ENVIRONMENT completed successfully (version: $current_version)"
    return 0
  else
    error "Initial deployment health check failed"
    
    # Get previous version for rollback
    local previous_version
    previous_version=$(get_previous_version)
    
    if [ -n "$previous_version" ] && [ "$previous_version" != "$current_version" ]; then
      perform_rollback "$previous_version"
    else
      error "No previous version available for rollback"
      send_notification "❌ DEPLOYMENT FAILED" "Deployment to $ENVIRONMENT failed and no rollback version available - manual intervention required"
      return 1
    fi
  fi
}

# Function to run continuous monitoring
continuous_monitoring() {
  log "Starting continuous monitoring for $ENVIRONMENT"
  
  while true; do
    if ! check_health "$HEALTH_CHECK_URL"; then
      error "Continuous monitoring detected application failure"
      
      # Get previous version for rollback
      local previous_version
      previous_version=$(get_previous_version)
      
      if [ -n "$previous_version" ]; then
        perform_rollback "$previous_version"
        break
      else
        error "No previous version available for rollback"
        send_notification "❌ APPLICATION DOWN" "Application in $ENVIRONMENT is down and no rollback version available"
        break
      fi
    else
      log "Continuous monitoring - application healthy"
    fi
    
    sleep 60 # Check every minute
  done
}

# Function to validate deployment prerequisites
validate_prerequisites() {
  log "Validating deployment prerequisites..."
  
  # Check required environment variables
  local required_vars=("AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY")
  
  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      error "Required environment variable $var is not set"
      return 1
    fi
  done
  
  # Check AWS CLI
  if ! command -v aws &> /dev/null; then
    error "AWS CLI is not installed"
    return 1
  fi
  
  # Check curl
  if ! command -v curl &> /dev/null; then
    error "curl is not installed"
    return 1
  fi
  
  log "Prerequisites validation passed"
  return 0
}

# Main execution
main() {
  local command=${2:-monitor}
  
  if ! validate_prerequisites; then
    exit 1
  fi
  
  case $command in
    "monitor")
      monitor_deployment
      ;;
    "continuous")
      continuous_monitoring
      ;;
    "rollback")
      local version=${3:-$(get_previous_version)}
      perform_rollback "$version"
      ;;
    "health")
      check_health "$HEALTH_CHECK_URL"
      ;;
    *)
      echo "Usage: $0 <environment> <command> [version]"
      echo "Commands:"
      echo "  monitor     - Monitor deployment and rollback if unhealthy"
      echo "  continuous  - Run continuous health monitoring"
      echo "  rollback    - Perform manual rollback to specified version"
      echo "  health      - Run single health check"
      exit 1
      ;;
  esac
}

# Execute main function with all arguments
main "$@"