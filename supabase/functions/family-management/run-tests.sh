#!/bin/bash

# Quick test script for Family Management API
# Usage: ./run-tests.sh <JWT_TOKEN>

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration - Using PROD as per user request
BASE_URL="https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/family-management"
FAMILY_GROUP_ID="6821b67e-8b9b-4227-81c1-b588a1e658d3"

if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <JWT_TOKEN>${NC}"
    echo ""
    echo "To get a JWT token:"
    echo "1. Log in to https://bitminded.ch as dev@bitminded.ch"
    echo "2. Open browser DevTools → Application → Local Storage"
    echo "3. Find 'sb-dynxqnrkmjcvgzsugxtm-auth-token'"
    echo "4. Copy the 'access_token' value"
    echo ""
    echo "Or use Supabase Dashboard → Authentication → Users → dev@bitminded.ch → Create session"
    exit 1
fi

JWT_TOKEN="$1"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Family Management API Tests${NC}"
echo -e "${BLUE}Using PROD environment${NC}"
echo -e "${BLUE}Family Group: ${FAMILY_GROUP_ID}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: GET /family-status
echo -e "${YELLOW}Test 1: GET /family-status${NC}"
response=$(curl -s -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    
    # Extract values for next tests
    AVAILABLE_SLOTS=$(echo "$body" | jq -r '.available_slots // 0' 2>/dev/null || echo "0")
    MEMBER_COUNT=$(echo "$body" | jq -r '.members | length' 2>/dev/null || echo "0")
    echo ""
    echo -e "${BLUE}Available slots: ${AVAILABLE_SLOTS}${NC}"
    echo -e "${BLUE}Active members: ${MEMBER_COUNT}${NC}"
else
    echo -e "${RED}❌ FAIL - Status: ${http_code}${NC}"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    exit 1
fi

echo ""
echo -e "${YELLOW}Test 2: Error Handling - Unauthorized (No Token)${NC}"
response=$(curl -s -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
else
    echo -e "${RED}❌ FAIL - Expected: 401, Got: ${http_code}${NC}"
fi

echo ""
echo -e "${YELLOW}Test 3: Error Handling - Invalid Token${NC}"
response=$(curl -s -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
    -H "Authorization: Bearer invalid_token_here" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
else
    echo -e "${RED}❌ FAIL - Expected: 401, Got: ${http_code}${NC}"
fi

echo ""
echo -e "${YELLOW}Test 4: Validation Error - Missing Fields${NC}"
response=$(curl -s -X POST "${BASE_URL}/add-member" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"family_group_id": "'"${FAMILY_GROUP_ID}"'"}' \
    -w "\n%{http_code}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    echo -e "${RED}❌ FAIL - Expected: 400, Got: ${http_code}${NC}"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Basic tests completed!${NC}"
echo ""
echo "To test adding/removing members, you'll need:"
echo "1. A target user_id (not already in the family)"
echo "2. Run: curl -X POST '${BASE_URL}/add-member' \\"
echo "     -H 'Authorization: Bearer ${JWT_TOKEN}' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"family_group_id\": \"${FAMILY_GROUP_ID}\", \"user_id\": \"TARGET_USER_ID\", \"role\": \"member\"}'"
echo ""
echo "Check find-test-data.sql for SQL queries to find test users."

