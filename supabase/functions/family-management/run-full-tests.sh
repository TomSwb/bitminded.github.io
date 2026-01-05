#!/bin/bash

# Full test suite for Family Management API
# Uses PROD environment and test family group

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/family-management"
FAMILY_GROUP_ID="6821b67e-8b9b-4227-81c1-b588a1e658d3"
TARGET_USER_ID="a1630ce1-8be8-4884-bbd8-e185ef31ac1c"  # contact@bitminded.ch
JWT_TOKEN="${1:-eyJhbGciOiJIUzI1NiIsImtpZCI6IkFldUxwYXB4Qk4zSjJrYzgiLCJ0eXAiOiJKV1QifQ}"

if [ -z "$1" ]; then
    echo -e "${YELLOW}Using default token. If it fails, provide full JWT token as argument.${NC}"
    echo "Usage: $0 [JWT_TOKEN]"
    echo ""
fi

PASSED=0
FAILED=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Family Management API - Full Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Family Group ID: ${FAMILY_GROUP_ID}"
echo "Target User ID: ${TARGET_USER_ID} (contact@bitminded.ch)"
echo ""

# Test 1: GET /family-status
echo -e "${YELLOW}Test 1: GET /family-status${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    
    AVAILABLE_SLOTS=$(echo "$body" | jq -r '.available_slots // 0' 2>/dev/null || echo "0")
    MEMBER_COUNT=$(echo "$body" | jq -r '.members | length' 2>/dev/null || echo "0")
    echo -e "${BLUE}Available slots: ${AVAILABLE_SLOTS}${NC}"
    echo -e "${BLUE}Active members: ${MEMBER_COUNT}${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL - Status: ${http_code}${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    ((FAILED++))
    echo -e "${YELLOW}⚠️  Token might be invalid or incomplete. Please provide full JWT token.${NC}"
fi
echo ""

# Test 2: POST /add-member
echo -e "${YELLOW}Test 2: POST /add-member (Adding contact@bitminded.ch)${NC}"
add_member_data=$(jq -n \
    --arg fg_id "$FAMILY_GROUP_ID" \
    --arg user_id "$TARGET_USER_ID" \
    '{family_group_id: $fg_id, user_id: $user_id, role: "member", relationship: "colleague"}')

response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/add-member" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$add_member_data")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    MEMBER_ID=$(echo "$body" | jq -r '.member_id // ""' 2>/dev/null || echo "")
    ACCESS_GRANTED=$(echo "$body" | jq -r '.access_granted // false' 2>/dev/null || echo "false")
    QUANTITY_UPDATED=$(echo "$body" | jq -r '.subscription_quantity_updated // false' 2>/dev/null || echo "false")
    
    if [ "$ACCESS_GRANTED" = "true" ]; then
        echo -e "${GREEN}✅ Access granted immediately!${NC}"
    fi
    if [ "$QUANTITY_UPDATED" = "true" ]; then
        echo -e "${BLUE}ℹ️  Stripe subscription quantity was updated${NC}"
    fi
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL - Status: ${http_code}${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    ((FAILED++))
fi
echo ""

# Test 3: GET /family-status (verify member was added)
echo -e "${YELLOW}Test 3: GET /family-status (Verify member added)${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    NEW_MEMBER_COUNT=$(echo "$body" | jq -r '.members | length' 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
    echo -e "${BLUE}New member count: ${NEW_MEMBER_COUNT}${NC}"
    if [ "$NEW_MEMBER_COUNT" -gt "$MEMBER_COUNT" ]; then
        echo -e "${GREEN}✅ Member count increased!${NC}"
    fi
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL - Status: ${http_code}${NC}"
    ((FAILED++))
fi
echo ""

# Test 4: POST /update-member-role
echo -e "${YELLOW}Test 4: POST /update-member-role${NC}"
update_role_data=$(jq -n \
    --arg fg_id "$FAMILY_GROUP_ID" \
    --arg user_id "$TARGET_USER_ID" \
    '{family_group_id: $fg_id, user_id: $user_id, new_role: "parent"}')

response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/update-member-role" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$update_role_data")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL - Status: ${http_code}${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    ((FAILED++))
fi
echo ""

# Test 5: POST /remove-member
echo -e "${YELLOW}Test 5: POST /remove-member${NC}"
read -p "Remove the member we just added? (y/n): " CONFIRM_REMOVE

if [ "$CONFIRM_REMOVE" = "y" ]; then
    remove_member_data=$(jq -n \
        --arg fg_id "$FAMILY_GROUP_ID" \
        --arg user_id "$TARGET_USER_ID" \
        '{family_group_id: $fg_id, user_id: $user_id}')
    
    response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/remove-member" \
        -H "Authorization: Bearer ${JWT_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$remove_member_data")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL - Status: ${http_code}${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        ((FAILED++))
    fi
else
    echo -e "${YELLOW}⏭️  Skipped${NC}"
fi
echo ""

# Test 6: Error Handling - Unauthorized
echo -e "${YELLOW}Test 6: Error Handling - Unauthorized (No Token)${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
    -H "Content-Type: application/json")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL - Expected: 401, Got: ${http_code}${NC}"
    ((FAILED++))
fi
echo ""

# Test 7: Validation Error
echo -e "${YELLOW}Test 7: Validation Error (Missing user_id)${NC}"
invalid_data=$(jq -n --arg fg_id "$FAMILY_GROUP_ID" '{family_group_id: $fg_id}')
response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/add-member" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$invalid_data")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✅ PASS - Status: ${http_code}${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL - Expected: 400, Got: ${http_code}${NC}"
    ((FAILED++))
fi
echo ""

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

