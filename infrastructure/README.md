# StellarRec™ Production Infrastructure

This directory contains the Terraform configuration and deployment scripts for the StellarRec production infrastructure on AWS with CloudFlare CDN.

## Architecture Overview

The infrastructure is designed for high availability, scalability, and security:

- **AWS EC2 Auto Scaling Groups** for application servers
- **AWS RDS PostgreSQL** with read replicas for database
- **AWS ElastiCache Redis** cluster for caching and sessions
- **AWS S3** for file storage and backups
- **AWS Application Load Balancer** for traffic distribution
- **CloudFlare CDN** for global content delivery and security

## Prerequisites

Before deploying the infrastructure, ensure you have:

1. **AWS CLI** installed and configured with appropriate permissions
2. **Terraform** v1.0+ installed
3. **CloudFlare account** with API token and zone ID
4. **Domain name** registered and managed by CloudFlare

### Required AWS Permissions

Your AWS user/role needs the following permissions:
- EC2 (full access)
- RDS (full access)
- ElastiCache (full access)
- S3 (full access)
- IAM (full access)
- VPC (full access)
- CloudWatch (full access)
- Systems Manager (Parameter Store)
- Certificate Manager (ACM)

## Configuration

1. **Copy the example variables file:**
   ```bash
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   ```

2. **Update terraform.tfvars with your values:**
   ```hcl
   # AWS Configuration
   aws_region = "us-east-1"
   environment = "production"
   project_name = "stellarrec"

   # Domain Configuration
   domain_name = "your-domain.com"

   # CloudFlare Configuration
   cloudflare_api_token = "your-cloudflare-api-token"
   cloudflare_zone_id = "your-cloudflare-zone-id"

   # Database Configuration
   db_username = "stellarrec_admin"
   db_password = "your-secure-database-password"

   # EC2 Configuration
   instance_type = "t3.medium"
   min_size = 2
   max_size = 10
   desired_capacity = 3

   # Redis Configuration
   redis_node_type = "cache.t3.micro"
   redis_num_cache_nodes = 2
   ```

## Deployment

### Initial Deployment

1. **Run the deployment script:**
   ```bash
   ./scripts/deploy.sh production
   ```

   This script will:
   - Check prerequisites
   - Initialize Terraform
   - Plan the deployment
   - Apply the infrastructure changes
   - Output important connection information

2. **Review the outputs:**
   The script will save all Terraform outputs to `outputs/production_outputs.json`

### Updates

To update existing infrastructure:

```bash
./scripts/update.sh production
```

### Destruction

⚠️ **WARNING: This will destroy all infrastructure and data!**

```bash
./scripts/destroy.sh production
```

## Infrastructure Components

### Networking (VPC)

- **VPC**: 10.0.0.0/16 CIDR block
- **Public Subnets**: 2 subnets across AZs for load balancer
- **Private Subnets**: 2 subnets across AZs for application servers
- **Database Subnets**: 2 subnets across AZs for RDS
- **NAT Gateways**: 2 NAT gateways for private subnet internet access

### Compute (EC2)

- **Auto Scaling Group**: 2-10 instances based on CPU utilization
- **Launch Template**: Amazon Linux 2 with Docker and Node.js
- **Instance Type**: t3.medium (configurable)
- **Security Groups**: Restricted access from load balancer only

### Database (RDS)

- **Engine**: PostgreSQL 15.4
- **Instance Class**: db.t3.medium
- **Storage**: 100GB GP3 with auto-scaling to 1TB
- **Backup**: 7-day retention with automated backups
- **Read Replica**: For read-heavy workloads
- **Encryption**: At rest and in transit

### Caching (ElastiCache)

- **Engine**: Redis 7.0
- **Node Type**: cache.t3.micro
- **Cluster**: 2 nodes with replication
- **Security**: AUTH token and encryption
- **Backup**: 5-day snapshot retention

### Storage (S3)

- **App Storage Bucket**: For application files
- **Backup Bucket**: For database and application backups
- **Lifecycle Policies**: Automatic transition to cheaper storage classes
- **Encryption**: AES-256 server-side encryption
- **Versioning**: Enabled for data protection

### Load Balancing (ALB)

- **Application Load Balancer**: Internet-facing with SSL termination
- **Target Groups**: Separate groups for frontend and API
- **Health Checks**: Automated health monitoring
- **SSL Certificate**: Managed by AWS Certificate Manager
- **Access Logs**: Stored in S3 for analysis

### CDN & Security (CloudFlare)

- **Global CDN**: Caching and acceleration
- **DDoS Protection**: Automatic DDoS mitigation
- **Web Application Firewall**: Rate limiting and security rules
- **SSL/TLS**: End-to-end encryption with TLS 1.3
- **Security Headers**: Added via CloudFlare Workers

## Monitoring & Logging

### CloudWatch

- **Application Logs**: Centralized logging from EC2 instances
- **Metrics**: Custom metrics for application performance
- **Alarms**: Auto-scaling triggers and error alerts
- **Dashboards**: Infrastructure and application monitoring

### Performance Insights

- **RDS Performance Insights**: Database performance monitoring
- **ElastiCache Metrics**: Redis performance and memory usage

## Security Features

### Network Security

- **Private Subnets**: Application servers not directly accessible
- **Security Groups**: Least privilege access rules
- **NACLs**: Additional network-level security
- **VPC Flow Logs**: Network traffic monitoring

### Data Security

- **Encryption at Rest**: All data encrypted in databases and S3
- **Encryption in Transit**: TLS 1.3 for all communications
- **IAM Roles**: Least privilege access for resources
- **Parameter Store**: Secure storage for sensitive configuration

### Application Security

- **Security Headers**: Added via CloudFlare Workers
- **Rate Limiting**: API and application rate limiting
- **DDoS Protection**: CloudFlare DDoS mitigation
- **WAF Rules**: Web Application Firewall protection

## Backup & Disaster Recovery

### Automated Backups

- **RDS Backups**: 7-day automated backups with point-in-time recovery
- **Redis Snapshots**: 5-day snapshot retention
- **S3 Versioning**: Object-level versioning and lifecycle management

### Disaster Recovery

- **Multi-AZ Deployment**: Resources distributed across availability zones
- **Auto Scaling**: Automatic replacement of failed instances
- **Database Failover**: Automatic failover to read replica if needed
- **Infrastructure as Code**: Complete infrastructure reproducible via Terraform

## Cost Optimization

### Resource Optimization

- **Auto Scaling**: Scale resources based on demand
- **Reserved Instances**: Use reserved instances for predictable workloads
- **S3 Lifecycle**: Automatic transition to cheaper storage classes
- **CloudWatch Monitoring**: Monitor and optimize resource usage

### Estimated Monthly Costs

Based on moderate usage (estimates may vary):

- **EC2 Instances**: $150-300/month (3 t3.medium instances)
- **RDS**: $100-150/month (primary + read replica)
- **ElastiCache**: $50-75/month (2 cache.t3.micro nodes)
- **S3 Storage**: $20-50/month (depending on usage)
- **Data Transfer**: $50-100/month (depending on traffic)
- **CloudFlare**: $20/month (Pro plan recommended)

**Total Estimated**: $390-695/month

## Troubleshooting

### Common Issues

1. **Terraform State Lock**: If deployment fails, unlock state:
   ```bash
   terraform force-unlock <lock-id>
   ```

2. **SSL Certificate Validation**: Ensure DNS records are properly configured in CloudFlare

3. **Auto Scaling Issues**: Check CloudWatch logs and security group rules

4. **Database Connection**: Verify security groups allow connections from application servers

### Support

For infrastructure issues:
1. Check CloudWatch logs
2. Review Terraform state and outputs
3. Verify AWS service limits
4. Check CloudFlare configuration

## Maintenance

### Regular Tasks

- **Security Updates**: Apply OS and application updates monthly
- **Backup Verification**: Test backup restoration quarterly
- **Performance Review**: Monitor and optimize resource usage monthly
- **Cost Review**: Review and optimize costs monthly
- **Security Audit**: Conduct security reviews quarterly

### Scaling Considerations

- **Database Scaling**: Consider read replicas or sharding for high load
- **Cache Scaling**: Add more Redis nodes for increased memory needs
- **CDN Optimization**: Optimize CloudFlare rules for better performance
- **Monitoring**: Add more detailed monitoring as the application grows

## Next Steps

After infrastructure deployment:

1. **Deploy Application**: Use CI/CD pipeline to deploy application code
2. **Configure Monitoring**: Set up detailed application monitoring
3. **Performance Testing**: Conduct load testing to validate scaling
4. **Security Testing**: Perform security audits and penetration testing
5. **Documentation**: Update operational procedures and runbooks