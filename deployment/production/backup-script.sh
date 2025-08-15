#!/bin/bash

# Production Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backup"
POSTGRES_HOST="postgres"
POSTGRES_PORT="5432"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
S3_BUCKET=${S3_BACKUP_BUCKET:-"stellarrec-backups-production"}

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

# Function to create database backup
create_backup() {
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="${BACKUP_DIR}/stellarrec_backup_${timestamp}.sql"
  local compressed_file="${backup_file}.gz"
  
  log "Starting database backup..."
  
  # Wait for PostgreSQL to be ready
  until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER"; do
    log "Waiting for PostgreSQL to be ready..."
    sleep 5
  done
  
  # Create backup
  if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$backup_file"; then
    log "Database backup created: $backup_file"
    
    # Compress backup
    if gzip "$backup_file"; then
      log "Backup compressed: $compressed_file"
      
      # Upload to S3 if configured
      if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        upload_to_s3 "$compressed_file"
      fi
      
      # Clean up old backups
      cleanup_old_backups
      
      log "Backup process completed successfully"
      return 0
    else
      error "Failed to compress backup"
      return 1
    fi
  else
    error "Failed to create database backup"
    return 1
  fi
}

# Function to upload backup to S3
upload_to_s3() {
  local file_path=$1
  local file_name=$(basename "$file_path")
  local s3_key="database-backups/$(date +%Y/%m/%d)/$file_name"
  
  log "Uploading backup to S3: s3://$S3_BUCKET/$s3_key"
  
  if aws s3 cp "$file_path" "s3://$S3_BUCKET/$s3_key"; then
    log "Backup uploaded to S3 successfully"
    
    # Set lifecycle policy for automatic cleanup
    aws s3api put-object-tagging \
      --bucket "$S3_BUCKET" \
      --key "$s3_key" \
      --tagging "TagSet=[{Key=Type,Value=DatabaseBackup},{Key=Environment,Value=Production}]"
  else
    error "Failed to upload backup to S3"
  fi
}

# Function to clean up old local backups
cleanup_old_backups() {
  log "Cleaning up backups older than $RETENTION_DAYS days..."
  
  find "$BACKUP_DIR" -name "stellarrec_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
  
  local remaining_backups=$(find "$BACKUP_DIR" -name "stellarrec_backup_*.sql.gz" -type f | wc -l)
  log "Cleanup completed. $remaining_backups backup files remaining."
}

# Function to restore from backup
restore_backup() {
  local backup_file=$1
  
  if [ ! -f "$backup_file" ]; then
    error "Backup file not found: $backup_file"
    return 1
  fi
  
  warn "This will restore the database from backup. All current data will be lost!"
  read -p "Are you sure you want to continue? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    log "Restore cancelled"
    return 0
  fi
  
  log "Starting database restore from: $backup_file"
  
  # Drop existing database and recreate
  dropdb -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" "$POSTGRES_DB" || true
  createdb -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" "$POSTGRES_DB"
  
  # Restore from backup
  if [ "${backup_file##*.}" = "gz" ]; then
    gunzip -c "$backup_file" | psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB"
  else
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$backup_file"
  fi
  
  log "Database restore completed"
}

# Function to list available backups
list_backups() {
  log "Available local backups:"
  find "$BACKUP_DIR" -name "stellarrec_backup_*.sql.gz" -type f -exec ls -lh {} \; | sort -k9
  
  if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
    log "Available S3 backups:"
    aws s3 ls "s3://$S3_BUCKET/database-backups/" --recursive --human-readable
  fi
}

# Function to verify backup integrity
verify_backup() {
  local backup_file=$1
  
  if [ ! -f "$backup_file" ]; then
    error "Backup file not found: $backup_file"
    return 1
  fi
  
  log "Verifying backup integrity: $backup_file"
  
  # Test if the backup file can be read
  if [ "${backup_file##*.}" = "gz" ]; then
    if gunzip -t "$backup_file"; then
      log "Backup file integrity verified"
      return 0
    else
      error "Backup file is corrupted"
      return 1
    fi
  else
    if head -n 1 "$backup_file" | grep -q "PostgreSQL database dump"; then
      log "Backup file integrity verified"
      return 0
    else
      error "Backup file appears to be corrupted"
      return 1
    fi
  fi
}

# Main execution
main() {
  local command=${1:-backup}
  
  # Create backup directory if it doesn't exist
  mkdir -p "$BACKUP_DIR"
  
  case $command in
    "backup")
      create_backup
      ;;
    "restore")
      restore_backup "$2"
      ;;
    "list")
      list_backups
      ;;
    "verify")
      verify_backup "$2"
      ;;
    "cleanup")
      cleanup_old_backups
      ;;
    "continuous")
      log "Starting continuous backup mode..."
      while true; do
        create_backup
        log "Sleeping for 24 hours until next backup..."
        sleep 86400 # 24 hours
      done
      ;;
    *)
      echo "Usage: $0 <command> [options]"
      echo "Commands:"
      echo "  backup          - Create a new backup"
      echo "  restore <file>  - Restore from backup file"
      echo "  list            - List available backups"
      echo "  verify <file>   - Verify backup integrity"
      echo "  cleanup         - Clean up old backups"
      echo "  continuous      - Run continuous backup mode"
      exit 1
      ;;
  esac
}

# Execute main function with all arguments
main "$@"