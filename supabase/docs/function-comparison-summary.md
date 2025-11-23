# Function Comparison Summary

**Date:** 2025-11-23  
**Dev Functions:** 50  
**Prod Functions:** 50

## Status: ✅ ALL FUNCTIONS MATCH

All 50 functions are present in both dev and prod databases.

### Function List (alphabetical):
1. check_compliance_status
2. cleanup_expired_auth_sessions
3. cleanup_expired_email_change_tokens
4. cleanup_old_2fa_attempts
5. cleanup_old_failed_attempts
6. cleanup_old_login_activity
7. cleanup_old_notifications
8. count_failed_logins
9. delete_user_data
10. export_user_data
11. get_2fa_failed_attempts
12. get_active_auth_sessions
13. get_consent_report
14. get_deletion_request
15. get_failed_attempt_count
16. get_last_successful_login
17. get_recent_login_activity
18. get_unread_notification_count
19. get_user_active_session_count
20. get_user_consents
21. get_users_needing_suspension_followup
22. get_user_statistics
23. get_user_total_login_count
24. handle_avatar_delete
25. handle_avatar_update
26. handle_avatar_upload
27. handle_new_user
28. has_app_access
29. has_consent
30. has_pending_deletion
31. increment_failed_attempt
32. is_2fa_account_locked
33. is_account_locked
34. is_admin
35. is_admin_safe
36. log_consent_changes
37. maintenance_settings_touch
38. mark_all_notifications_read
39. mark_suspension_followup_sent
40. record_consent
41. reset_failed_attempts
42. send_suspension_followup_emails
43. sync_deletion_to_profile
44. trigger_suspension_followup
45. update_admin_notes_updated_at
46. update_deletion_request_timestamp
47. update_password_last_changed
48. update_updated_at_column
49. user_has_2fa_enabled
50. validate_signup_consents

## Notes

- Function definitions may have minor formatting differences (e.g., nested DECLARE blocks)
- All function signatures match
- All functions are functionally equivalent

## Next Steps

- Compare triggers
- Compare RLS policies
- Compare indexes

