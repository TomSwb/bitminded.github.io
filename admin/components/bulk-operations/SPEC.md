# Bulk Operations Component Specification

## Overview
Powerful bulk operations tool for managing multiple users, subscriptions, and data at scale. Import/export data and perform batch actions.

## Responsibilities
- Import users from CSV/Excel
- Export user data in various formats
- Bulk grant/revoke access
- Bulk email operations
- Bulk user updates
- Data migration and backups
- Batch processing with progress tracking

## UI Components

### Header Section
- Title: "Bulk Operations"
- **Import Data** button
- **Export Data** button
- **Batch Actions** button
- **Operation History** button

### Tab Navigation
1. **Import** - Import users and data
2. **Export** - Export and download data
3. **Batch Actions** - Perform bulk operations
4. **History** - View past operations

## Tab 1: Import Data

### Import Wizard

**Step 1: Select Import Type**
- ○ Import Users (CSV)
- ○ Import Subscriptions (CSV)
- ○ Import Access Grants (CSV)
- ○ Import Products (CSV)

**Step 2: Upload File**
- Drag & drop area
- Or click to browse
- File format requirements displayed
- Sample CSV download link

**Step 3: Map Columns**
- Auto-detect columns
- Manual mapping interface
- Required fields highlighted
- Optional fields shown
- Preview mapping

**Step 4: Validate Data**
- Validation results table
- ✓ Valid rows (count)
- ⚠ Warnings (list with details)
- ✗ Errors (list with details)
- **Fix Issues** inline editor
- **Skip Invalid** checkbox
- **Download Errors** CSV

**Step 5: Import Options**
- **If User Exists**:
  - Skip
  - Update
  - Create duplicate
- **Send Notifications**:
  - ☑ Email new users
  - ☑ Notify on access grant
- **Batch Size**: 10, 50, 100, 500
- **Run in Background**: (for large imports)

**Step 6: Execute Import**
- Progress bar
- Current status
- Rows processed: X/Y
- Success count
- Error count
- Estimated time remaining
- **Pause** / **Resume** / **Cancel** buttons

**Step 7: Import Summary**
- Total rows processed
- Successful imports
- Failed imports
- Warnings count
- **Download Report** (detailed log)
- **View Imported Users** button

### CSV Format Templates

**Users Import Template**:
```csv
email,username,role,send_welcome_email
user@example.com,johndoe,user,true
admin@example.com,admin,admin,false
```

**Access Grants Template**:
```csv
user_email,product_id,grant_type,expiration_date,reason
user@example.com,converter,lifetime,,Beta tester
test@example.com,measure-mate,trial,2025-03-01,Trial user
```

**Subscriptions Template**:
```csv
user_email,product_id,plan,status,start_date,end_date
user@example.com,converter,monthly,active,2025-01-01,2025-02-01
```

## Tab 2: Export Data

### Export Configuration

**Data to Export**:
- ☑ Users
  - Basic info (email, username)
  - Extended (all profile fields)
  - Include roles
  - Include 2FA status
  
- ☑ Subscriptions
  - Active only
  - All (including cancelled)
  - Include payment info
  
- ☑ Access Grants
  - Active only
  - All (including revoked)
  - Include reasons/notes
  
- ☑ Payments
  - Include refunds
  - Include failed payments
  
- ☑ Analytics Events
  - Event types to include
  - Date range

**Filter Options**:
- Date range
- User status (active, suspended, etc.)
- Subscription status
- Product filter
- Custom SQL filter (advanced)

**Export Format**:
- ○ CSV (Excel compatible)
- ○ JSON (developer friendly)
- ○ Excel (.xlsx)
- ○ PDF (formatted report)
- ○ SQL (database dump)

**Export Options**:
- **Include Headers**: ☑
- **Delimiter**: Comma, Semicolon, Tab
- **Encoding**: UTF-8, UTF-16, ASCII
- **Date Format**: ISO 8601, DD/MM/YYYY, etc.
- **Compress**: ☑ ZIP file

**Privacy Options**:
- ☑ Anonymize personal data
- ☑ Hash email addresses
- ☑ Remove payment details
- GDPR compliance preset

**Actions**:
- **Preview** (first 10 rows)
- **Schedule Export** (recurring)
- **Export Now**

### Recent Exports
- Export name/type
- Created date
- File size
- Status (ready, expired)
- **Download** button (if available)
- **Re-run Export** button

## Tab 3: Batch Actions

### Batch Operations Panel

**Select Users**:
- **Selection Method**:
  - ○ Upload CSV (user emails)
  - ○ Select from list (with filters)
  - ○ Use saved segment
  - ○ Custom SQL query

**Available Actions**:

1. **Access Management**
   - Grant access to product
   - Revoke access from product
   - Extend expiration
   - Change access type

2. **User Management**
   - Update user role
   - Suspend accounts
   - Reactivate accounts
   - Delete accounts (⚠ dangerous)

3. **Communication**
   - Send bulk email
   - Create bulk notifications
   - Schedule messages

4. **Subscription Actions**
   - Cancel subscriptions
   - Change plans
   - Apply discounts
   - Extend subscriptions

### Batch Action Configuration

**Action Form** (example: Bulk Grant Access):
- **Product**: Dropdown
- **Access Type**: Trial / Time-limited / Lifetime
- **Expiration**: Date picker (if applicable)
- **Reason/Note**: Text field
- **Notification**: ☑ Email users

**Safety Checks**:
- Preview affected users count
- Require confirmation
- Require admin password for destructive actions
- **Dry Run** option (preview without executing)

**Execution**:
- Progress tracking
- Success/failure count
- Detailed log
- **Pause** / **Resume** options
- Rollback capability (where applicable)

### Batch Action Preview
- Table showing affected users
- What will change for each
- Potential issues highlighted
- **Confirm & Execute** button

## Tab 4: Operation History

### Operations Log Table

**Columns**:
1. **Date/Time**
2. **Operation Type** (Import, Export, Batch Action)
3. **Performed By** (admin user)
4. **Target** (users, subscriptions, etc.)
5. **Records Affected** (count)
6. **Status** (Completed, Failed, In Progress)
7. **Duration**
8. **Actions** (View Log, Download Report, Revert)

**Filters**:
- Date range
- Operation type
- Performed by
- Status

### Operation Detail View
- Complete operation log
- Input parameters
- Results summary
- Detailed errors (if any)
- Affected entities list
- **Revert Operation** (if possible)
- **Re-run Operation**

## Functionality

### Import Users from CSV
```javascript
async importUsers(csvData, options) {
    // 1. Parse CSV file
    const rows = this.parseCSV(csvData);
    
    // 2. Validate all rows
    const { valid, invalid, warnings } = this.validateRows(rows);
    
    // 3. Show validation results
    if (invalid.length > 0 && !options.skipInvalid) {
        return { error: 'Invalid rows found', invalid };
    }
    
    // 4. Process valid rows in batches
    const results = [];
    for (const batch of this.batchRows(valid, options.batchSize)) {
        const batchResults = await this.processBatch(batch, options);
        results.push(...batchResults);
        
        // Update progress
        this.updateProgress(results.length, valid.length);
    }
    
    // 5. Log operation
    await this.logOperation('import_users', results);
    
    // 6. Return summary
    return {
        total: rows.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
    };
}
```

### Batch Grant Access
```javascript
async batchGrantAccess(userIds, productId, accessType, expiration, options) {
    // 1. Validate parameters
    this.validateBatchAction(userIds, productId, accessType);
    
    // 2. Preview affected users (dry run)
    if (options.dryRun) {
        return await this.previewGrantAccess(userIds, productId);
    }
    
    // 3. Execute batch operation
    const results = [];
    for (const userId of userIds) {
        try {
            await this.grantAccess(userId, productId, accessType, expiration);
            results.push({ userId, success: true });
            
            // Send notification if requested
            if (options.sendNotification) {
                await this.notifyUser(userId, 'access_granted', { product: productId });
            }
        } catch (error) {
            results.push({ userId, success: false, error: error.message });
        }
        
        // Update progress
        this.updateProgress(results.length, userIds.length);
    }
    
    // 4. Log operation
    await this.logBatchOperation('grant_access', {
        userIds,
        productId,
        accessType,
        results
    });
    
    return results;
}
```

### Export Data
```javascript
async exportData(config) {
    // 1. Build query based on config
    const query = this.buildExportQuery(config);
    
    // 2. Fetch data
    const data = await supabase.rpc('export_data', { query });
    
    // 3. Apply privacy filters if requested
    if (config.anonymize) {
        data = this.anonymizeData(data, config);
    }
    
    // 4. Format data based on export format
    let exportFile;
    switch (config.format) {
        case 'csv':
            exportFile = this.generateCSV(data, config);
            break;
        case 'json':
            exportFile = JSON.stringify(data, null, 2);
            break;
        case 'excel':
            exportFile = this.generateExcel(data, config);
            break;
        case 'pdf':
            exportFile = await this.generatePDF(data, config);
            break;
    }
    
    // 5. Compress if requested
    if (config.compress) {
        exportFile = await this.compressFile(exportFile);
    }
    
    // 6. Log export
    await this.logExport(config, data.length);
    
    // 7. Trigger download
    this.downloadFile(exportFile, `export_${Date.now()}.${config.format}`);
}
```

### Revert Operation
```javascript
async revertOperation(operationId) {
    // 1. Load operation details
    const operation = await this.getOperation(operationId);
    
    // 2. Check if revertible
    if (!operation.revertible) {
        throw new Error('This operation cannot be reverted');
    }
    
    // 3. Build revert actions
    const revertActions = this.buildRevertActions(operation);
    
    // 4. Confirm with admin
    const confirmed = await this.confirmRevert(operation);
    if (!confirmed) return;
    
    // 5. Execute revert
    for (const action of revertActions) {
        await this.executeRevertAction(action);
    }
    
    // 6. Log revert
    await this.logOperation('revert', {
        original_operation_id: operationId,
        actions: revertActions
    });
}
```

## Database Schema

### Bulk Operations Log
```sql
CREATE TABLE bulk_operations_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type TEXT NOT NULL, -- import, export, batch_action
    performed_by UUID REFERENCES auth.users(id),
    operation_name TEXT,
    parameters JSONB,
    records_affected INTEGER,
    success_count INTEGER,
    failure_count INTEGER,
    status TEXT DEFAULT 'in_progress', -- in_progress, completed, failed, cancelled
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    detailed_log JSONB,
    is_revertible BOOLEAN DEFAULT false,
    reverted_at TIMESTAMP,
    reverted_by UUID REFERENCES auth.users(id)
);
```

## API Methods

```javascript
class BulkOperations {
    async init()
    
    // Import
    async importUsers(csvData, options)
    async importSubscriptions(csvData, options)
    async importAccessGrants(csvData, options)
    async validateCSV(csvData, type)
    async parseCSV(fileData)
    
    // Export
    async exportData(config)
    async generateCSV(data, config)
    async generateExcel(data, config)
    async generatePDF(data, config)
    async scheduleExport(config, schedule)
    
    // Batch Actions
    async batchGrantAccess(userIds, productId, accessType, expiration, options)
    async batchRevokeAccess(userIds, productId, reason)
    async batchUpdateUsers(userIds, updates)
    async batchSuspendUsers(userIds, reason)
    async batchEmail(userIds, emailData)
    
    // Operations
    async getOperations(filters)
    async getOperationDetails(operationId)
    async revertOperation(operationId)
    async logOperation(type, data)
    
    // Utilities
    updateProgress(current, total)
    validateBatchAction(params)
    anonymizeData(data, config)
}
```

## Translations Keys
- `bulk_operations`: "Bulk Operations"
- `import_data`: "Import Data"
- `export_data`: "Export Data"
- `batch_actions`: "Batch Actions"
- `operation_history`: "Operation History"
- `upload_file`: "Upload File"
- `validate_data`: "Validate Data"
- `execute_import`: "Execute Import"
- `import_summary`: "Import Summary"
- `export_format`: "Export Format"
- `select_users`: "Select Users"
- `grant_access`: "Grant Access"
- `revoke_access`: "Revoke Access"
- `bulk_email`: "Bulk Email"
- `dry_run`: "Dry Run (Preview)"
- `confirm_execute`: "Confirm & Execute"
- `operation_log`: "Operation Log"
- `revert_operation`: "Revert Operation"
- `records_affected`: "Records Affected"
- `success_count`: "Success Count"
- `failure_count`: "Failure Count"

## Styling Requirements
- Drag-and-drop file upload
- Multi-step wizard interface
- Progress bars for long operations
- Validation results table with color coding
- Preview panels
- Confirmation modals for destructive actions

## Dependencies
- CSV parser library (Papa Parse)
- Excel library (SheetJS/xlsx)
- PDF generator (jsPDF)
- Compression library (JSZip)
- Supabase client
- Translation system
- Admin layout component

## Security Considerations
- Validate all imported data
- Sanitize user inputs
- Require admin password for destructive batch operations
- Log all bulk operations
- Rate limit bulk operations
- Confirm before executing dangerous operations
- Implement rollback for critical operations

## Performance Considerations
- Process in batches (avoid overwhelming server)
- Show progress for long operations
- Run large imports in background
- Stream large exports (don't load all in memory)
- Queue bulk operations
- Optimize database queries for bulk operations

## Testing Checklist
- [ ] CSV import works correctly
- [ ] Data validation works
- [ ] Column mapping works
- [ ] Export works (all formats)
- [ ] Batch grant access works
- [ ] Batch revoke access works
- [ ] Bulk email works
- [ ] Progress tracking accurate
- [ ] Error handling works
- [ ] Revert operation works
- [ ] Operation logging works
- [ ] Large datasets handled properly

## Implementation Priority
**Phase 3** - Efficiency and scale operations

## Future Enhancements
- Scheduled recurring exports
- API-based bulk operations
- Webhook integration for external systems
- Custom batch operation scripts
- Data transformation pipelines
- Automated data quality checks
- Bulk operations templates (save/reuse)
- Collaborative bulk operations (multiple admins)
- Real-time collaboration on imports
- Integration with external data sources

