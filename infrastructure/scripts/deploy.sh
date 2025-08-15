#!/bin/bash

# StellarRec Infrastructure Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TERRAFORM_DIR="$(dirname "$0")/../terraform"
ENVIRONMENT=${1:-production}

echo -e "${GREEN}🚀 Starting StellarRec Infrastructure Deployment${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}❌ Terraform is not installed${NC}"
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed${NC}"
        exit 1
    fi
    
    # Check if terraform.tfvars exists
    if [ ! -f "${TERRAFORM_DIR}/terraform.tfvars" ]; then
        echo -e "${RED}❌ terraform.tfvars file not found${NC}"
        echo -e "${YELLOW}Please copy terraform.tfvars.example to terraform.tfvars and update with your values${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Initialize Terraform
init_terraform() {
    echo -e "${YELLOW}🔧 Initializing Terraform...${NC}"
    cd "${TERRAFORM_DIR}"
    
    terraform init
    
    echo -e "${GREEN}✅ Terraform initialized${NC}"
}

# Plan Terraform deployment
plan_terraform() {
    echo -e "${YELLOW}📋 Planning Terraform deployment...${NC}"
    
    terraform plan -var="environment=${ENVIRONMENT}" -out=tfplan
    
    echo -e "${GREEN}✅ Terraform plan completed${NC}"
}

# Apply Terraform deployment
apply_terraform() {
    echo -e "${YELLOW}🚀 Applying Terraform deployment...${NC}"
    
    # Ask for confirmation
    read -p "Do you want to apply the Terraform plan? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⏸️  Deployment cancelled${NC}"
        exit 0
    fi
    
    terraform apply tfplan
    
    echo -e "${GREEN}✅ Terraform deployment completed${NC}"
}

# Output important information
output_info() {
    echo -e "${YELLOW}📊 Deployment Information:${NC}"
    
    # Get outputs
    LOAD_BALANCER_DNS=$(terraform output -raw load_balancer_dns_name)
    DOMAIN_NAME=$(terraform output -raw domain_name)
    S3_BUCKET=$(terraform output -raw s3_app_storage_bucket)
    
    echo -e "${GREEN}Load Balancer DNS: ${LOAD_BALANCER_DNS}${NC}"
    echo -e "${GREEN}Domain Name: ${DOMAIN_NAME}${NC}"
    echo -e "${GREEN}S3 Storage Bucket: ${S3_BUCKET}${NC}"
    
    # Save outputs to file
    terraform output -json > ../outputs/${ENVIRONMENT}_outputs.json
    
    echo -e "${GREEN}✅ Outputs saved to ../outputs/${ENVIRONMENT}_outputs.json${NC}"
}

# Create outputs directory
mkdir -p "${TERRAFORM_DIR}/../outputs"

# Main deployment flow
main() {
    check_prerequisites
    init_terraform
    plan_terraform
    apply_terraform
    output_info
    
    echo -e "${GREEN}🎉 StellarRec infrastructure deployment completed successfully!${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "1. Update your DNS settings to point to the load balancer"
    echo -e "2. Deploy your application code to the EC2 instances"
    echo -e "3. Configure monitoring and alerting"
}

# Run main function
main