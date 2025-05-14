#!/bin/bash

# Apply fixes for store settings update issues

echo "Starting to apply fixes for store settings update issues..."

# Connect to the database - replace the information with the correct values
# DB_URL, DB_USER, DB_PASSWORD should be defined according to your settings

# Apply fix for upsert_store_component function
echo "Applying fix for upsert_store_component function..."
psql -h $DB_URL -U $DB_USER -d $DB_NAME -f fix_store_component_order.sql

# Apply fix for organization settings
echo "Applying fix for organization settings..."
psql -h $DB_URL -U $DB_USER -d $DB_NAME -f fix_organization_settings.sql

echo "Fixes applied successfully!"
echo "Please restart the application to apply the changes on the frontend."