#!/bin/bash

# StellarRec Infrastructure Update Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TERRAFORM_DIR="$(dirname "$0")/../terraform"
ENVIRONMENT=${1:-production}

echo -e "${GREEN}🔄 Updating StellarRec Infrastructure${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"

# Change to Terraform directory
cd "${TERRAFORM_DIR}"

# Refresh Terraform state
echo -e "${YELLOW}🔄 Refreshing Terraform state...${NC}"
terraform refresh -var="environment=${ENVIRONMENT}"

# Plan updates
echo -e "${YELLOW}📋 Planning infrastructure updates...${NC}"
terraform plan -var="environment=${ENVIRONMENT}" -out=update_plan

# Check if there are changes
if terraform show -no-color update_plan | grep -q "No changes"; then
    echo -e "${GREEN}✅ No infrastructure changes needed${NC}"
    rm -f update_plan
    exit 0
fi

# Show what will be changed
echo -e "${YELLOW}📊 The following changes will be applied:${NC}"
terraform show update_plan

# Ask for confirmation
read -p "Do you want to apply these changes? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏸️  Update cancelled${NC}"
    rm -f update_plan
    exit 0
fi

# Apply updates
echo -e "${YELLOW}🚀 Applying infrastructure updates...${NC}"
terraform apply update_plan

# Clean up
rm -f update_plan

echo -e "${GREEN}✅ Infrastructure update completed successfully!${NC}"

# Output updated information
echo -e "${YELLOW}📊 Updated Infrastructure Information:${NC}"
terraform output