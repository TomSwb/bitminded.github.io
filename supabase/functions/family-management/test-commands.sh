#!/bin/bash

# Manual test commands for Family Management API
# Replace YOUR_JWT_TOKEN with actual token from dev@bitminded.ch

FAMILY_GROUP_ID="6821b67e-8b9b-4227-81c1-b588a1e658d3"
BASE_URL="https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/family-management"
JWT_TOKEN="YOUR_JWT_TOKEN"  # Replace this!

echo "=== Test 1: GET /family-status ==="
curl -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "=== Test 2: Error - No Token ==="
curl -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "=== Test 3: Error - Invalid Token ==="
curl -X GET "${BASE_URL}/family-status?family_group_id=${FAMILY_GROUP_ID}" \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "=== Test 4: Validation Error - Missing user_id ==="
curl -X POST "${BASE_URL}/add-member" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"family_group_id\": \"${FAMILY_GROUP_ID}\"}" | jq '.'

echo ""
echo "To test adding a member, first find a user_id not in the family:"
echo "Run query 3 from find-test-data.sql in Supabase SQL Editor"
echo ""
echo "Then run:"
echo "curl -X POST '${BASE_URL}/add-member' \\"
echo "  -H 'Authorization: Bearer ${JWT_TOKEN}' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"family_group_id\": \"${FAMILY_GROUP_ID}\", \"user_id\": \"TARGET_USER_ID\", \"role\": \"member\"}'"

