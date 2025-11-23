# Trigger Comparison Summary

**Date:** 2025-11-23  
**Dev Triggers:** 18  
**Prod Triggers:** 18

## Status: ✅ ALL TRIGGERS MATCH

All 18 triggers are present in both dev and prod databases.

### Trigger List (by table):

1. **account_deletion_requests**
   - `sync_deletion_to_profile` (AFTER INSERT OR UPDATE)
   - `update_deletion_request_timestamp` (BEFORE UPDATE)

2. **admin_notes**
   - `update_admin_notes_updated_at_trigger` (BEFORE UPDATE)

3. **communication_signatures**
   - `update_communication_signatures_updated_at` (BEFORE UPDATE)

4. **discount_codes**
   - `update_discount_codes_updated_at` (BEFORE UPDATE)

5. **maintenance_settings**
   - `maintenance_settings_set_updated_at` (BEFORE UPDATE)

6. **product_bundles**
   - `update_product_bundles_updated_at` (BEFORE UPDATE)

7. **product_categories**
   - `update_product_categories_updated_at` (BEFORE UPDATE)

8. **product_maintenance**
   - `update_product_maintenance_updated_at` (BEFORE UPDATE)

9. **product_purchases**
   - `update_product_purchases_updated_at` (BEFORE UPDATE)

10. **product_reviews**
    - `update_product_reviews_updated_at` (BEFORE UPDATE)

11. **products**
    - `update_products_updated_at` (BEFORE UPDATE)

12. **services**
    - `update_services_updated_at` (BEFORE UPDATE)

13. **support_tickets**
    - `update_support_tickets_updated_at` (BEFORE UPDATE)

14. **user_2fa**
    - `update_user_2fa_updated_at` (BEFORE UPDATE)

15. **user_communications**
    - `update_user_communications_updated_at` (BEFORE UPDATE)

16. **user_consents**
    - `consent_audit_trigger` (AFTER INSERT OR UPDATE)

17. **user_profiles**
    - `update_user_profiles_updated_at` (BEFORE UPDATE)

## Notes

- All triggers are functionally equivalent
- Trigger definitions match between dev and prod
- All triggers are enabled and active

## Next Steps

- Compare RLS policies
- Compare indexes

