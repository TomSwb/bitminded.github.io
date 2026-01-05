#!/bin/bash

# Family Management API Test Script
# Usage: ./test-api.sh <JWT_TOKEN> [FAMILY_GROUP_ID]
#
# If FAMILY_GROUP_ID is not provided, the script will try to find one from the database
# or you can set it manually after the first test

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEV_URL="https://eygpejbljuqpxwwoawkn.supabase.co/functions/v1/family-management"
PROD_URL="https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/family-management"
BASE_URL="${DEV_URL}"  # Default to DEV

# Check if JWT token is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: JWT token is required${NC}"
    echo "Usage: $0 <JWT_TOKEN> [FAMILY_GROUP_ID] [ENV]"
    echo "  JWT_TOKEN: Your authentication token"
    echo "  FAMILY_GROUP_ID: (Optional) Family group ID to test with"
    echo "  ENV: (Optional) 'dev' or 'prod' (default: dev)"
    exit 1
fi

JWT_TOKEN="$1"
FAMILY_GROUP_ID="$2"
ENV="${3:-dev}"

# Set base URL based on environment
if [ "$ENV" = "prod" ]; then
    BASE_URL="${PROD_URL}"
    echo -e "${YELLOW}⚠️  Testing in PRODUCTION environment${NC}"
else
    BASE_URL="${DEV_URL}"
    echo -e "${BLUE}ℹ️  Testing in DEV environment${NC}"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Family Management API Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test counter
PASSED=0
FAILED=0

# Function to make API call and check response
test_endpoint() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -e "${BLUE}Testing: ${test_name}${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${JWT_TOKEN}" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${BASE_URL}${endpoint}" \
            -H "Authorization: Bearer ${JWT_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Status: ${http_code}"
        echo -e "${GREEN}Response:${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        ((PASSED++))
        echo ""
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - Expected: ${expected_status}, Got: ${http_code}"
        echo -e "${RED}Response:${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        ((FAILED++))
        echo ""
        return 1
    fi
}

# Test 1: GET /family-status
echo -e "${YELLOW}=== Test 1: GET /family-status ===${NC}"
if [ -z "$FAMILY_GROUP_ID" ]; then
    echo -e "${YELLOW}⚠️  No family_group_id provided. Please provide one or check the database.${NC}"
    echo "You can find family groups with:"
    echo "  SELECT id, family_name, admin_user_id FROM family_groups LIMIT 1;"
    read -p "Enter family_group_id (or press Enter to skip): " FAMILY_GROUP_ID
fi

if [ -n "$FAMILY_GROUP_ID" ]; then
    test_endpoint "GET /family-status" "GET" "/family-status?family_group_id=${FAMILY_GROUP_ID}" "" "200"
    
    # Extract available_slots from response for later tests
    AVAILABLE_SLOTS=$(echo "$body" | jq -r '.available_slots // 0' 2>/dev/null || echo "0")
    echo -e "${BLUE}Available slots: ${AVAILABLE_SLOTS}${NC}"
    echo ""
fi

# Test 2: POST /add-member (if we have a family group)
if [ -n "$FAMILY_GROUP_ID" ]; then
    echo -e "${YELLOW}=== Test 2: POST /add-member ===${NC}"
    echo -e "${YELLOW}⚠️  This test requires a target user_id.${NC}"
    echo "You can find users with:"
    echo "  SELECT id, email FROM user_profiles WHERE email != (SELECT email FROM user_profiles WHERE id = (SELECT admin_user_id FROM family_groups WHERE id = '${FAMILY_GROUP_ID}')) LIMIT 1;"
    read -p "Enter target user_id to add as member (or press Enter to skip): " TARGET_USER_ID
    
    if [ -n "$TARGET_USER_ID" ]; then
        ADD_MEMBER_DATA=$(jq -n \
            --arg fg_id "$FAMILY_GROUP_ID" \
            --arg user_id "$TARGET_USER_ID" \
            '{family_group_id: $fg_id, user_id: $user_id, role: "member", relationship: "child"}')
        
        test_endpoint "POST /add-member" "POST" "/add-member" "$ADD_MEMBER_DATA" "200"
        
        if [ $? -eq 0 ]; then
            MEMBER_ID=$(echo "$body" | jq -r '.member_id // ""' 2>/dev/null || echo "")
            echo -e "${GREEN}Member added successfully. Member ID: ${MEMBER_ID}${NC}"
        fi
        echo ""
    fi
fi

# Test 3: POST /update-member-role (if we have a member)
if [ -n "$FAMILY_GROUP_ID" ] && [ -n "$TARGET_USER_ID" ]; then
    echo -e "${YELLOW}=== Test 3: POST /update-member-role ===${NC}"
    UPDATE_ROLE_DATA=$(jq -n \
        --arg fg_id "$FAMILY_GROUP_ID" \
        --arg user_id "$TARGET_USER_ID" \
        '{family_group_id: $fg_id, user_id: $user_id, new_role: "parent"}')
    
    test_endpoint "POST /update-member-role" "POST" "/update-member-role" "$UPDATE_ROLE_DATA" "200"
    echo ""
fi

# Test 4: POST /remove-member (if we have a member)
if [ -n "$FAMILY_GROUP_ID" ] && [ -n "$TARGET_USER_ID" ]; then
    echo -e "${YELLOW}=== Test 4: POST /remove-member ===${NC}"
    read -p "Remove the member we just added? (y/n): " CONFIRM_REMOVE
    
    if [ "$CONFIRM_REMOVE" = "y" ]; then
        REMOVE_MEMBER_DATA=$(jq -n \
            --arg fg_id "$FAMILY_GROUP_ID" \
            --arg user_id "$TARGET_USER_ID" \
            '{family_group_id: $fg_id, user_id: $user_id}')
        
        test_endpoint "POST /remove-member" "POST" "/remove-member" "$REMOVE_MEMBER_DATA" "200"
        echo ""
    fi
fi

# Test 5: Error Handling - Unauthorized (No Token)
echo -e "${YELLOW}=== Test 5: Unauthorized (No Token) ===${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
    -H "Content-Type: application/json")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: ${http_code}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} - Expected: 401, Got: ${http_code}"
    ((FAILED++))
fi
echo ""

# Test 6: Error Handling - Invalid Token
echo -e "${YELLOW}=== Test 6: Unauthorized (Invalid Token) ===${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
    -H "Authorization: Bearer invalid_token_here" \
    -H "Content-Type: application/json")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Status: ${http_code}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} - Expected: 401, Got: ${http_code}"
    ((FAILED++))
fi
echo ""

# Test 7: Validation Error - Missing Fields
echo -e "${YELLOW}=== Test 7: Validation Error (Missing Fields) ===${NC}"
if [ -n "$FAMILY_GROUP_ID" ]; then
    INVALID_DATA='{"family_group_id": "'"${FAMILY_GROUP_ID}"'"}'
    test_endpoint "POST /add-member (missing user_id)" "POST" "/add-member" "$INVALID_DATA" "400"
fi

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo -e "${BLUE}Total: $((PASSED + FAILED))${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

