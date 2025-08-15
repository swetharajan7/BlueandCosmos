#!/bin/bash

# StellarRec Performance Monitoring Script
# This script continuously monitors system performance and generates alerts

set -e

# Configuration
MONITORING_INTERVAL=${1:-60}  # Default 60 seconds
LOG_FILE="performance-monitor-$(date +%Y%m%d).log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_RESPONSE_TIME=2000

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

alert() {
    echo -e "${RED}[ALERT]${NC} $1" | tee -a "$LOG_FILE"
    send_alert "$1"
}

# Send alert notification
send_alert() {
    local message="$1"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Send email alert if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "Performance Alert: $message at $timestamp" | \
        mail -s "StellarRec Performance Alert" "$ALERT_EMAIL" 2>/dev/null || \
        warning "Failed to send email alert"
    fi
    
    # Send Slack alert if configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
             -H 'Content-type: application/json' \
             --data "{\"text\":\"🚨 Performance Alert: $message at $timestamp\"}" \
             > /dev/null 2>&1 || warning "Failed to send Slack alert"
    fi
}

# Get system metrics
get_system_metrics() {
    # CPU usage
    CPU_USAGE=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' | cut -d'.' -f1)
    
    # Memory usage
    MEMORY_USAGE=$(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
    MEMORY_TOTAL=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    MEMORY_PERCENT=$(echo "scale=0; ($MEMORY_USAGE * 100) / ($MEMORY_USAGE + $MEMORY_TOTAL)" | bc -l 2>/dev/null || echo "0")
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    # Load average
    LOAD_AVG=$(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    
    echo "$CPU_USAGE,$MEMORY_PERCENT,$DISK_USAGE,$LOAD_AVG"
}

# Get application metrics
get_app_metrics() {
    local response_time=""
    local error_rate=""
    local active_users=""
    
    # Try to get metrics from API
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        # Get response time
        response_time=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:3001/api/health | awk '{print int($1*1000)}')
        
        # Get application metrics if available
        local metrics=$(curl -s "http://localhost:3001/api/launch/metrics" \
                       -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo "{}")
        
        error_rate=$(echo "$metrics" | jq -r '.data.errorRate // 0' 2>/dev/null || echo "0")
        active_users=$(echo "$metrics" | jq -r '.data.activeUsers // 0' 2>/dev/null || echo "0")
    else
        response_time="0"
        error_rate="0"
        active_users="0"
    fi
    
    echo "$response_time,$error_rate,$active_users"
}

# Check Docker containers
check_containers() {
    local containers=("backend" "frontend" "postgres" "redis")
    local failed_containers=()
    
    for container in "${containers[@]}"; do
        if ! docker-compose ps "$container" | grep -q "Up"; then
            failed_containers+=("$container")
        fi
    done
    
    if [ ${#failed_containers[@]} -gt 0 ]; then
        alert "Containers not running: ${failed_containers[*]}"
        return 1
    fi
    
    return 0
}

# Monitor performance
monitor_performance() {
    log "Starting performance monitoring (interval: ${MONITORING_INTERVAL}s)"
    
    while true; do
        # Get system metrics
        local sys_metrics=$(get_system_metrics)
        local cpu_usage=$(echo "$sys_metrics" | cut -d',' -f1)
        local memory_usage=$(echo "$sys_metrics" | cut -d',' -f2)
        local disk_usage=$(echo "$sys_metrics" | cut -d',' -f3)
        local load_avg=$(echo "$sys_metrics" | cut -d',' -f4)
        
        # Get application metrics
        local app_metrics=$(get_app_metrics)
        local response_time=$(echo "$app_metrics" | cut -d',' -f1)
        local error_rate=$(echo "$app_metrics" | cut -d',' -f2)
        local active_users=$(echo "$app_metrics" | cut -d',' -f3)
        
        # Log current metrics
        log "Metrics - CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%, Load: ${load_avg}, Response: ${response_time}ms, Errors: ${error_rate}, Users: ${active_users}"
        
        # Check thresholds and send alerts
        if [ "$cpu_usage" -gt "$ALERT_THRESHOLD_CPU" ]; then
            alert "High CPU usage: ${cpu_usage}%"
        fi
        
        if [ "$memory_usage" -gt "$ALERT_THRESHOLD_MEMORY" ]; then
            alert "High memory usage: ${memory_usage}%"
        fi
        
        if [ "$disk_usage" -gt "90" ]; then
            alert "High disk usage: ${disk_usage}%"
        fi
        
        if [ "$response_time" -gt "$ALERT_THRESHOLD_RESPONSE_TIME" ]; then
            alert "Slow response time: ${response_time}ms"
        fi
        
        # Check container health
        check_containers || warning "Some containers are not running properly"
        
        # Save metrics to CSV for analysis
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ),$cpu_usage,$memory_usage,$disk_usage,$load_avg,$response_time,$error_rate,$active_users" >> "metrics-$(date +%Y%m%d).csv"
        
        sleep "$MONITORING_INTERVAL"
    done
}

# Generate performance report
generate_report() {
    log "Generating performance report..."
    
    local report_file="performance-report-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>StellarRec Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .alert { color: red; font-weight: bold; }
        .warning { color: orange; font-weight: bold; }
        .good { color: green; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>StellarRec Performance Report</h1>
        <p>Generated: $(date)</p>
    </div>
    
    <h2>Current System Status</h2>
EOF
    
    # Add current metrics to report
    local sys_metrics=$(get_system_metrics)
    local app_metrics=$(get_app_metrics)
    
    echo "    <div class=\"metric\">CPU Usage: $(echo "$sys_metrics" | cut -d',' -f1)%</div>" >> "$report_file"
    echo "    <div class=\"metric\">Memory Usage: $(echo "$sys_metrics" | cut -d',' -f2)%</div>" >> "$report_file"
    echo "    <div class=\"metric\">Disk Usage: $(echo "$sys_metrics" | cut -d',' -f3)%</div>" >> "$report_file"
    echo "    <div class=\"metric\">Response Time: $(echo "$app_metrics" | cut -d',' -f1)ms</div>" >> "$report_file"
    
    # Add recent alerts
    echo "    <h2>Recent Alerts</h2>" >> "$report_file"
    echo "    <table>" >> "$report_file"
    echo "    <tr><th>Timestamp</th><th>Alert</th></tr>" >> "$report_file"
    
    # Get last 10 alerts from log
    grep "\[ALERT\]" "$LOG_FILE" | tail -10 | while read -r line; do
        local timestamp=$(echo "$line" | grep -o '\[.*\]' | head -1 | sed 's/\[//g' | sed 's/\]//g')
        local alert_msg=$(echo "$line" | sed 's/.*\[ALERT\]//')
        echo "    <tr><td>$timestamp</td><td class=\"alert\">$alert_msg</td></tr>" >> "$report_file"
    done
    
    echo "    </table>" >> "$report_file"
    echo "</body></html>" >> "$report_file"
    
    success "Performance report generated: $report_file"
}

# Show usage
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  monitor [interval]  - Start continuous monitoring (default: 60 seconds)"
    echo "  report             - Generate performance report"
    echo "  status             - Show current system status"
    echo "  help               - Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  ALERT_EMAIL        - Email address for alerts"
    echo "  SLACK_WEBHOOK_URL  - Slack webhook URL for alerts"
    echo "  ADMIN_TOKEN        - Admin token for API access"
    echo ""
}

# Show current status
show_status() {
    log "Current system status:"
    
    local sys_metrics=$(get_system_metrics)
    local app_metrics=$(get_app_metrics)
    
    echo "System Metrics:"
    echo "  CPU Usage: $(echo "$sys_metrics" | cut -d',' -f1)%"
    echo "  Memory Usage: $(echo "$sys_metrics" | cut -d',' -f2)%"
    echo "  Disk Usage: $(echo "$sys_metrics" | cut -d',' -f3)%"
    echo "  Load Average: $(echo "$sys_metrics" | cut -d',' -f4)"
    echo ""
    echo "Application Metrics:"
    echo "  Response Time: $(echo "$app_metrics" | cut -d',' -f1)ms"
    echo "  Error Rate: $(echo "$app_metrics" | cut -d',' -f2)"
    echo "  Active Users: $(echo "$app_metrics" | cut -d',' -f3)"
    echo ""
    
    # Check container status
    echo "Container Status:"
    docker-compose ps
}

# Main execution
case "${1:-monitor}" in
    "monitor")
        # Load environment variables
        if [ -f ".env" ]; then
            export $(cat .env | grep -v '^#' | xargs)
        fi
        monitor_performance
        ;;
    "report")
        generate_report
        ;;
    "status")
        show_status
        ;;
    "help")
        show_usage
        ;;
    *)
        echo "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac