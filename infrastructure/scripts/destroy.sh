#!/bin/bash

# StellarRec Infrastructure Destruction Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TERRAFORM_DIR="$(dirname "$0")/../terraform"
ENVIRONMENT=${1:-production}

echo -e "${RED}🔥 StellarRec Infrastructure Destruction${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"

# Warning message
echo -e "${RED}⚠️  WARNING: This will destroy ALL infrastructure resources!${NC}"
echo -e "${RED}This action cannot be undone!${NC}"
echo

# Multiple confirmations for safety
read -p "Are you absolutely sure you want to destroy the infrastructure? Type 'yes' to continue: " -r
if [[ ! $REPLY == "yes" ]]; then
    echo -e "${YELLOW}⏸️  Destruction cancelled${NC}"
    exit 0
fi

read -p "This will delete databases, storage, and all data. Type 'DESTROY' to confirm: " -r
if [[ ! $REPLY == "DESTROY" ]]; then
    echo -e "${YELLOW}⏸️  Destruction cancelled${NC}"
    exit 0
fi

echo -e "${RED}🔥 Starting infrastructure destruction...${NC}"

# Change to Terraform directory
cd "${TERRAFORM_DIR}"

# Disable deletion protection on RDS
echo -e "${YELLOW}🔧 Disabling RDS deletion protection...${NC}"
terraform apply -var="environment=${ENVIRONMENT}" -target=aws_db_instance.main -var="deletion_protection=false" -auto-approve

# Plan destruction
echo -e "${YELLOW}📋 Planning infrastructure destruction...${NC}"
terraform plan -destroy -var="environment=${ENVIRONMENT}" -out=destroy_plan

# Apply destruction
echo -e "${RED}🔥 Destroying infrastructure...${NC}"
terraform apply destroy_plan

# Clean up Terraform state
echo -e "${YELLOW}🧹 Cleaning up Terraform files...${NC}"
rm -f tfplan destroy_plan terraform.tfstate.backup

echo -e "${GREEN}✅ Infrastructure destruction completed${NC}"
echo -e "${YELLOW}Note: Some resources like S3 buckets may need manual cleanup if they contain data${NC}"