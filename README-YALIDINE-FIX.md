# Yalidine Shipping Fees Synchronization Fix

## Problem Description

We identified two main issues with the Yalidine shipping fees synchronization process:

1. **Redirection Trigger**: A database trigger named `yalidine_fees_redirect_trigger` was moving data from the `yalidine_fees` table to the `yalidine_fees_new` table, causing the original table to appear empty.

2. **Direction Swapping**: In the API implementation, the parameters `from_wilaya_id` and `to_wilaya_id` were reversed, causing data to be fetched and stored with incorrect directions.

## Diagnostic Results

During testing, we observed:

- Data was successfully inserted into the database as indicated by the database statistics showing insert operations
- The database tables `yalidine_fees` and `yalidine_fees_new` remained empty despite successful insertions
- Foreign key constraints were causing cascade deletes that removed data unintentionally
- The synchronization process was treating parameters inconsistently across different files

## Solution

Our solution consists of three main components:

### 1. SQL Database Fixes (`fix-yalidine-final.sql`)

- Disable the redirect trigger to prevent data redirection
- Fix foreign key constraints to use `ON DELETE RESTRICT` instead of `CASCADE`
- Create a consistent unique constraint for the fees table
- Add a column synchronization trigger to handle API field name differences
- Recreate the RPC function for inserting fees data with proper error handling
- Add diagnostic functions to monitor table status

### 2. JavaScript Direction Swap Fix (`yalidine-api-fix.js`)

- Provides utilities to disable the redirect trigger programmatically
- Detects the organization's origin wilaya ID
- Corrects existing data by swapping directions when needed
- Processes changes in batches to avoid overwhelming the database

### 3. Diagnostic Tools (`diagnose-yalidine-issue.sql`)

- Comprehensive diagnostic script that checks table existence, trigger status, constraints
- Tests the insert functionality directly to verify the fix
- Checks for duplicate records that might violate constraints
- Provides detailed statistics about both tables

## How to Apply the Fix

1. **Step 1: Run the Diagnostic Script**

```bash
psql -h your-db-host -d your-db-name -U your-username -f diagnose-yalidine-issue.sql
```

This will help you understand the current state of your database.

2. **Step 2: Apply the Database Fix**

```bash
psql -h your-db-host -d your-db-name -U your-username -f fix-yalidine-final.sql
```

3. **Step 3: Apply the JavaScript Direction Swap Fix**

```bash
# Set your Supabase credentials
export SUPABASE_URL="https://your-project-url.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"

# Run the fix script
node yalidine-api-fix.js
```

4. **Step 4: Verify the Fix**

After applying the fixes, run the diagnostic script again to confirm the changes:

```bash
psql -h your-db-host -d your-db-name -U your-username -f diagnose-yalidine-issue.sql
```

You should see that:
- The redirect trigger is disabled
- The foreign key constraints use `ON DELETE RESTRICT`
- Test inserts can be performed successfully
- No duplicate records exist that would violate constraints

## Understanding the Fix

### Database Fix Details

The SQL script performs the following actions:

1. Disables the problematic trigger that was redirecting data
2. Fixes foreign key constraints to prevent cascade deletes
3. Ensures a proper unique constraint is in place
4. Creates a column synchronization trigger to handle API field inconsistencies
5. Recreates the RPC functions with better error handling
6. Adds diagnostic and testing functions

### Direction Swap Fix Details

The JavaScript utility addresses the direction swapping issue by:

1. Identifying records where the direction is incorrect (from/to swapped)
2. Processing them in batches to avoid performance issues
3. Correctly orienting the data based on the organization's origin wilaya

## Troubleshooting

If you continue to experience issues after applying the fix:

1. **Check the database logs**: Look for any error messages during insertions
2. **Verify trigger status**: Make sure the redirect trigger is disabled
3. **Check the API integration**: Ensure the correct API endpoints are being used
4. **Examine the data flow**: Trace through the syncing process to identify any remaining inconsistencies

For additional support, please contact the development team. 