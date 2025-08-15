#!/bin/bash

# StellarRec Application Server User Data Script
# This script sets up the EC2 instance for running the StellarRec application

set -e

# Update system
yum update -y

# Install required packages
yum install -y docker git htop

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install PM2 globally
npm install -g pm2

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Create application directory
mkdir -p /opt/stellarrec
chown ec2-user:ec2-user /opt/stellarrec

# Create environment file
cat > /opt/stellarrec/.env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=${db_host}
DB_NAME=${db_name}
DB_USER=stellarrec_admin
REDIS_HOST=${redis_host}
REDIS_PORT=6379
S3_BUCKET=${s3_bucket}
AWS_REGION=${AWS::Region}
PROJECT_NAME=${project_name}
ENVIRONMENT=${environment}
EOF

# Create systemd service for the application
cat > /etc/systemd/system/stellarrec.service << EOF
[Unit]
Description=StellarRec Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/stellarrec
Environment=NODE_ENV=production
ExecStart=/usr/bin/pm2-runtime start ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create PM2 ecosystem configuration
cat > /opt/stellarrec/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'stellarrec-backend',
    script: './backend/dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/stellarrec/error.log',
    out_file: '/var/log/stellarrec/out.log',
    log_file: '/var/log/stellarrec/combined.log',
    time: true
  }]
};
EOF

# Create log directory
mkdir -p /var/log/stellarrec
chown ec2-user:ec2-user /var/log/stellarrec

# Create CloudWatch agent configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/stellarrec/error.log",
            "log_group_name": "/aws/ec2/stellarrec/error",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/stellarrec/out.log",
            "log_group_name": "/aws/ec2/stellarrec/application",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "StellarRec/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait",
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "diskio": {
        "measurement": [
          "io_time"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s

# Create deployment script
cat > /opt/stellarrec/deploy.sh << 'EOF'
#!/bin/bash

# StellarRec Deployment Script
set -e

echo "Starting deployment..."

# Pull latest code (this would be replaced with proper CI/CD)
cd /opt/stellarrec

# Stop application
pm2 stop all || true

# Install dependencies and build
npm ci --production
npm run build

# Start application
pm2 start ecosystem.config.js
pm2 save

echo "Deployment completed successfully"
EOF

chmod +x /opt/stellarrec/deploy.sh
chown ec2-user:ec2-user /opt/stellarrec/deploy.sh

# Enable and start the service
systemctl daemon-reload
systemctl enable stellarrec

# Signal that the instance is ready
/opt/aws/bin/cfn-signal -e $? --stack ${AWS::StackName} --resource AutoScalingGroup --region ${AWS::Region}

echo "User data script completed successfully"