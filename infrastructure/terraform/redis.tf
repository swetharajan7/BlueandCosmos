# Redis ElastiCache Configuration

# Redis Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  
  tags = {
    Name = "${var.project_name}-redis-subnet-group"
  }
}

# Redis Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7.x"
  name   = "${var.project_name}-redis-params"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  parameter {
    name  = "timeout"
    value = "300"
  }
  
  tags = {
    Name = "${var.project_name}-redis-params"
  }
}

# Redis Replication Group (Cluster)
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.project_name}-redis"
  description                = "Redis cluster for StellarRec session management and caching"
  
  # Node configuration
  node_type               = var.redis_node_type
  port                    = 6379
  parameter_group_name    = aws_elasticache_parameter_group.main.name
  
  # Cluster configuration
  num_cache_clusters      = var.redis_num_cache_nodes
  
  # Network configuration
  subnet_group_name       = aws_elasticache_subnet_group.main.name
  security_group_ids      = [aws_security_group.redis.id]
  
  # Engine configuration
  engine_version          = "7.0"
  
  # Backup configuration
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  maintenance_window      = "sun:05:00-sun:07:00"
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth.result
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }
  
  tags = {
    Name = "${var.project_name}-redis-cluster"
  }
}

# Random password for Redis AUTH
resource "random_password" "redis_auth" {
  length  = 32
  special = true
}

# CloudWatch Log Group for Redis
resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/redis/${var.project_name}/slow-log"
  retention_in_days = 7
  
  tags = {
    Name = "${var.project_name}-redis-logs"
  }
}

# Store Redis auth token in AWS Systems Manager Parameter Store
resource "aws_ssm_parameter" "redis_auth_token" {
  name  = "/${var.project_name}/redis/auth_token"
  type  = "SecureString"
  value = random_password.redis_auth.result
  
  tags = {
    Name = "${var.project_name}-redis-auth-token"
  }
}