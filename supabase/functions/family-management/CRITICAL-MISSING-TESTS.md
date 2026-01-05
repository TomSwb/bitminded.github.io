# Critical Missing Tests for Family Management API

## Priority 1: Critical Business Logic Tests

### 1. POST /remove-member ⚠️ **HIGH PRIORITY**
**Why it's critical:**
- Tests the reverse operation of add-member
- Verifies access revocation works correctly
- Verifies Stripe subscription quantity decreases with proration
- Ensures cleanup happens properly

**What to verify:**
- ✅ Member status updated to 'removed'
- ✅ Service purchase status updated to 'cancelled'
- ✅ Stripe subscription quantity decreased (3→2)
- ✅ Proration credit created in Stripe
- ✅ Member can be re-added later

**Current status:** Member `contact@bitminded.ch` is ready to be removed for testing

---

### 2. POST /add-member (Sufficient Quantity) ⚠️ **HIGH PRIORITY**
**Why it's critical:**
- Tests the path where subscription quantity >= member count + 1
- Verifies NO Stripe update is needed (different code path)
- Tests immediate access without Stripe API call

**What to verify:**
- ✅ Member added successfully
- ✅ Access granted immediately
- ✅ **NO Stripe subscription update** (subscription_quantity_updated: false)
- ✅ No proration invoice created

**How to test:**
- Need to increase Stripe subscription quantity to 4+ first
- Then add a member (should not trigger Stripe update)

---

### 3. Per-Member Pricing Verification ⚠️ **MEDIUM PRIORITY**
**Why it's important:**
- Verifies financial calculations are correct
- Ensures billing is fair (total amount divided by member count)
- Critical for customer trust

**What to verify:**
- ✅ Total subscription amount = sum of all per-member amounts
- ✅ Per-member amount = total_amount / active_member_count
- ✅ All active members have same per-member amount
- ✅ Amounts update correctly when members added/removed

**SQL to verify:**
```sql
SELECT 
    sp.user_id,
    u.email,
    sp.amount_paid as per_member_amount,
    (SELECT SUM(amount_paid) FROM service_purchases sp2 
     WHERE sp2.stripe_subscription_id = sp.stripe_subscription_id 
     AND sp2.status = 'active') as total_amount,
    (SELECT COUNT(*) FROM service_purchases sp3 
     WHERE sp3.stripe_subscription_id = sp.stripe_subscription_id 
     AND sp3.status = 'active') as member_count
FROM service_purchases sp
JOIN user_profiles u ON u.id = sp.user_id
WHERE sp.stripe_subscription_id = 'sub_1Sm6wbPBAwkcNEBl3BHwR9wV'
AND sp.status = 'active'
ORDER BY sp.user_id;
```

---

## Priority 2: Edge Cases & Error Handling

### 4. Add Already Active Member
**Why it's useful:**
- Prevents duplicate members
- Tests idempotency

**Expected:** 400 error - "User is already an active member"

**Current status:** Can test by trying to add `contact@bitminded.ch` again

---

### 5. Re-activate Removed Member
**Why it's useful:**
- Tests that removed members can be re-added
- Verifies status transitions work correctly

**Expected:** Should work - member status changes from 'removed' to 'active'

**How to test:**
1. Remove a member (Test 1)
2. Add the same member again
3. Verify status is 'active' and access is granted

---

### 6. Cannot Remove Admin
**Why it's useful:**
- Prevents accidental admin removal
- Tests business rule enforcement

**Expected:** 400 error - "Cannot remove family admin. Transfer admin role first."

**How to test:**
- Try to remove the admin user (`dev@bitminded.ch`)

---

## Priority 3: Integration & Workflow Tests

### 7. Complete Workflow Test
**Why it's useful:**
- Tests end-to-end user journey
- Verifies all operations work together
- Catches integration issues

**Steps:**
1. Get family status (baseline)
2. Add member A
3. Verify member A has access
4. Add member B
5. Update member A's role
6. Remove member B
7. Verify final state matches expectations

---

### 8. Stripe Proration Verification
**Why it's useful:**
- Verifies financial accuracy
- Ensures customers are billed correctly

**What to verify:**
- ✅ When quantity increases: Proration invoice created in Stripe
- ✅ When quantity decreases: Proration credit created in Stripe
- ✅ Invoice/credit amounts are correct

**How to verify:**
```bash
# Check Stripe for proration invoices/credits
stripe invoices list --subscription sub_1Sm6wbPBAwkcNEBl3BHwR9wV
```

---

## Priority 4: Authorization Tests

### 9. Forbidden - Non-Admin User
**Why it's useful:**
- Tests authorization enforcement
- Prevents unauthorized access

**Expected:** 403 error - "Only family admin can add members"

**How to test:**
- Get JWT token for a non-admin family member
- Try to add/remove/update members

---

### 10. Forbidden - Non-Member User
**Why it's useful:**
- Tests that only members can view family status
- Prevents information leakage

**Expected:** 403 error - "Only family members can view family status"

**How to test:**
- Get JWT token for a user not in the family
- Try to GET /family-status

---

## Recommended Test Execution Order

1. **POST /remove-member** (Test 4) - Clean up test member
2. **Per-Member Pricing** (Test 15) - Verify calculations
3. **Add Already Active Member** (Test 11) - Test duplicate prevention
4. **Re-activate Removed Member** (Test 12) - Test re-adding
5. **Complete Workflow** (Test 14) - End-to-end validation
6. **Stripe Proration Verification** - Financial accuracy

---

## Quick Test Commands

### Remove Member
```bash
curl -X POST 'https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/family-management/remove-member' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "family_group_id": "6821b67e-8b9b-4227-81c1-b588a1e658d3",
    "user_id": "a1630ce1-8be8-4884-bbd8-e185ef31ac1c"
  }'
```

### Try Adding Already Active Member
```bash
curl -X POST 'https://dynxqnrkmjcvgzsugxtm.supabase.co/functions/v1/family-management/add-member' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "family_group_id": "6821b67e-8b9b-4227-81c1-b588a1e658d3",
    "user_id": "a1630ce1-8be8-4884-bbd8-e185ef31ac1c",
    "role": "member"
  }'
```

### Verify Per-Member Pricing
Run the SQL query above in Supabase SQL Editor.

