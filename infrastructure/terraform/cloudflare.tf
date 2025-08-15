# CloudFlare CDN and DNS Configuration

# CloudFlare Zone data source
data "cloudflare_zone" "main" {
  zone_id = var.cloudflare_zone_id
}

# DNS record for the main domain
resource "cloudflare_record" "main" {
  zone_id = data.cloudflare_zone.main.id
  name    = "@"
  value   = aws_lb.main.dns_name
  type    = "CNAME"
  proxied = true
  
  comment = "Main domain pointing to AWS ALB"
}

# DNS record for www subdomain
resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.main.id
  name    = "www"
  value   = aws_lb.main.dns_name
  type    = "CNAME"
  proxied = true
  
  comment = "WWW subdomain pointing to AWS ALB"
}

# DNS record for API subdomain
resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.main.id
  name    = "api"
  value   = aws_lb.main.dns_name
  type    = "CNAME"
  proxied = true
  
  comment = "API subdomain pointing to AWS ALB"
}

# SSL certificate validation records
resource "cloudflare_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  zone_id = data.cloudflare_zone.main.id
  name    = each.value.name
  value   = each.value.record
  type    = each.value.type
  proxied = false
  
  comment = "SSL certificate validation for ${each.key}"
}

# CloudFlare Page Rules for optimization
resource "cloudflare_page_rule" "cache_static_assets" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "${var.domain_name}/static/*"
  priority = 1
  
  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 2592000  # 30 days
    browser_cache_ttl = 2592000  # 30 days
  }
}

resource "cloudflare_page_rule" "cache_api_responses" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "${var.domain_name}/api/universities"
  priority = 2
  
  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 3600  # 1 hour
    browser_cache_ttl = 1800  # 30 minutes
  }
}

# CloudFlare Security Settings
resource "cloudflare_zone_settings_override" "main" {
  zone_id = data.cloudflare_zone.main.id
  
  settings {
    # Security settings
    security_level = "medium"
    challenge_ttl  = 1800
    
    # SSL settings
    ssl                      = "strict"
    min_tls_version         = "1.2"
    tls_1_3                 = "on"
    automatic_https_rewrites = "on"
    always_use_https        = "on"
    
    # Performance settings
    brotli               = "on"
    minify {
      css  = "on"
      js   = "on"
      html = "on"
    }
    
    # Caching settings
    browser_cache_ttl = 14400  # 4 hours
    cache_level       = "aggressive"
    
    # Other settings
    development_mode    = "off"
    rocket_loader      = "on"
    server_side_exclude = "on"
    sort_query_string_for_cache = "on"
  }
}

# CloudFlare Firewall Rules
resource "cloudflare_filter" "rate_limit_api" {
  zone_id     = data.cloudflare_zone.main.id
  description = "Rate limit API endpoints"
  expression  = "(http.request.uri.path matches \"^/api/.*\" and rate(1m) > 100)"
}

resource "cloudflare_firewall_rule" "rate_limit_api" {
  zone_id     = data.cloudflare_zone.main.id
  description = "Rate limit API requests"
  filter_id   = cloudflare_filter.rate_limit_api.id
  action      = "challenge"
  priority    = 1
}

# CloudFlare Access Application (for admin panel)
resource "cloudflare_access_application" "admin" {
  zone_id          = data.cloudflare_zone.main.id
  name             = "StellarRec Admin Panel"
  domain           = "admin.${var.domain_name}"
  type             = "self_hosted"
  session_duration = "24h"
  
  cors_headers {
    allowed_methods = ["GET", "POST", "OPTIONS"]
    allowed_origins = ["https://${var.domain_name}"]
    allow_credentials = true
    max_age = 600
  }
}

# CloudFlare Workers for additional functionality
resource "cloudflare_worker_script" "security_headers" {
  name    = "security-headers"
  content = file("${path.module}/workers/security-headers.js")
}

resource "cloudflare_worker_route" "security_headers" {
  zone_id     = data.cloudflare_zone.main.id
  pattern     = "${var.domain_name}/*"
  script_name = cloudflare_worker_script.security_headers.name
}

# CloudFlare Analytics and Monitoring
resource "cloudflare_logpush_job" "http_requests" {
  enabled          = true
  zone_id          = data.cloudflare_zone.main.id
  name             = "stellarrec-http-requests"
  logpull_options  = "fields=ClientIP,ClientRequestHost,ClientRequestMethod,ClientRequestURI,EdgeEndTimestamp,EdgeResponseBytes,EdgeResponseStatus,EdgeStartTimestamp,RayID&timestamps=rfc3339"
  destination_conf = "s3://${aws_s3_bucket.cloudflare_logs.bucket}/http_requests?region=${var.aws_region}"
  dataset          = "http_requests"
  frequency        = "high"
}

# S3 bucket for CloudFlare logs
resource "aws_s3_bucket" "cloudflare_logs" {
  bucket = "${var.project_name}-cloudflare-logs-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name = "${var.project_name}-cloudflare-logs"
  }
}