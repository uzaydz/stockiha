-- Unified RPC to create or delete an employee and handle permissions
-- Provides a single entry point for AddEmployeeDialog and admin tools

-- Safety: drop any previous definitions
DROP FUNCTION IF EXISTS manage_employee(text, jsonb);

CREATE OR REPLACE FUNCTION manage_employee(
  p_action TEXT,
  p_payload JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT := lower(trim(p_action));
  v_current_user_id UUID := auth.uid();
  v_org_id UUID;
  v_current_user_role TEXT;
  v_employee_id UUID;
  v_email TEXT;
  v_result JSON;
  v_perms JSONB;
  v_create_auth BOOLEAN := false;
  v_http_status INT;
  v_http_content JSONB;
  v_auth_user_id UUID;
  v_full_permissions JSONB := jsonb_build_object(
    'accessPOS', true,
    'manageOrders', true,
    'processPayments', true,
    'manageUsers', true,
    'viewReports', true,
    'manageProducts', true,
    'manageServices', true,
    'manageEmployees', true,
    'viewProducts', true,
    'addProducts', true,
    'editProducts', true,
    'deleteProducts', true,
    'manageProductCategories', true,
    'manageInventory', true,
    'viewInventory', true,
    'viewServices', true,
    'addServices', true,
    'editServices', true,
    'deleteServices', true,
    'trackServices', true,
    'viewOrders', true,
    'updateOrderStatus', true,
    'cancelOrders', true,
    'viewCustomers', true,
    'manageCustomers', true,
    'viewDebts', true,
    'recordDebtPayments', true,
    'viewCustomerDebtHistory', true,
    'viewSuppliers', true,
    'manageSuppliers', true,
    'managePurchases', true,
    'viewEmployees', true,
    'viewFinancialReports', true,
    'viewSalesReports', true,
    'viewInventoryReports', true,
    'viewCustomerReports', true,
    'exportReports', true,
    'viewSettings', true,
    'manageProfileSettings', true,
    'manageAppearanceSettings', true,
    'manageSecuritySettings', true,
    'manageNotificationSettings', true,
    'manageOrganizationSettings', true,
    'manageBillingSettings', true,
    'manageIntegrations', true,
    'manageAdvancedSettings', true,
    'manageFlexi', true,
    'manageFlexiAndDigitalCurrency', true,
    'sellFlexiAndDigitalCurrency', true,
    'viewFlexiAndDigitalCurrencySales', true
  );
BEGIN
  -- Require authenticated user
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'NOT_AUTHENTICATED', 'error', 'المستخدم غير مصادق عليه');
  END IF;

  -- Determine organization and role of the current user (from users table)
  SELECT organization_id, role
  INTO v_org_id, v_current_user_role
  FROM public.users
  WHERE auth_user_id = v_current_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'NO_ORGANIZATION', 'error', 'لم يتم العثور على معرف المؤسسة');
  END IF;

  -- Only admins can manage employees
  IF v_current_user_role NOT IN ('admin', 'super_admin') THEN
    RETURN json_build_object('success', false, 'code', 'NOT_ADMIN', 'error', 'ليس لديك صلاحية لإدارة الموظفين');
  END IF;

  IF v_action = 'create' OR v_action = 'upsert' THEN
    -- Resolve create_auth flag from payload
    IF (p_payload ? 'create_auth') THEN
      BEGIN
        v_create_auth := (p_payload->>'create_auth')::boolean;
      EXCEPTION WHEN OTHERS THEN
        v_create_auth := false;
      END;
    ELSIF (p_payload ? 'create_auth_user') THEN
      BEGIN
        v_create_auth := (p_payload->>'create_auth_user')::boolean;
      EXCEPTION WHEN OTHERS THEN
        v_create_auth := false;
      END;
    END IF;
    -- Compute permissions: if payload.permissions is provided use it; otherwise grant all
    v_perms := COALESCE(p_payload->'permissions', 'null'::jsonb);
    IF v_perms IS NULL OR v_perms = 'null'::jsonb THEN
      v_perms := v_full_permissions;
    END IF;

    -- Call the existing unified creator to leverage RLS/validations
    BEGIN
      SELECT create_employee_unified(
        (p_payload->>'email'),
        COALESCE(p_payload->>'password', NULL),
        (p_payload->>'name'),
        COALESCE(p_payload->>'phone', NULL),
        COALESCE(p_payload->>'job_title', NULL),
        v_perms,
        v_org_id
      ) INTO v_result;

      -- After create via unified function, optionally create Auth user and link it
      BEGIN
        v_employee_id := NULLIF((v_result->'employee'->>'id'), '')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_employee_id := NULL;
      END;

      -- If unified function indicates existing active email, resolve employee id by email
      IF (COALESCE((v_result->>'success')::boolean, false) = false)
         AND (upper(COALESCE(v_result->>'code','')) IN ('EMAIL_EXISTS_ACTIVE','EMAIL_DUPLICATE')) THEN
        SELECT id INTO v_employee_id
        FROM public.users
        WHERE email = (p_payload->>'email') AND organization_id = v_org_id AND role = 'employee'
        LIMIT 1;
      END IF;

      IF v_create_auth AND v_employee_id IS NOT NULL AND COALESCE(p_payload->>'password','') <> '' THEN
        BEGIN
          SELECT status, content
            INTO v_http_status, v_http_content
          FROM net.http_post(
            url := concat(current_setting('app.settings.supabase_url', true), '/auth/v1/admin/users'),
            headers := jsonb_build_object(
              'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true)),
              'apikey', current_setting('app.settings.service_role_key', true),
              'Content-Type', 'application/json'
            ),
            body := jsonb_build_object(
              'email', (p_payload->>'email'),
              'password', (p_payload->>'password'),
              'email_confirm', true,
              'user_metadata', jsonb_build_object(
                'role', 'employee',
                'name', (p_payload->>'name')
              )
            )
          );

          IF v_http_status BETWEEN 200 AND 299 THEN
            BEGIN
              v_auth_user_id := NULLIF(v_http_content->>'id','')::uuid;
            EXCEPTION WHEN OTHERS THEN
              v_auth_user_id := NULL;
            END;
            IF v_auth_user_id IS NOT NULL THEN
              UPDATE public.users SET auth_user_id = v_auth_user_id WHERE id = v_employee_id;
            END IF;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- ignore auth creation errors to avoid breaking core flow
          PERFORM 1;
        END;
      END IF;

      -- Rebuild result from users to reflect latest state
      SELECT json_build_object(
        'success', true,
        'employee', json_build_object(
          'id', u.id,
          'user_id', COALESCE(u.auth_user_id, u.id),
          'name', u.name,
          'email', u.email,
          'phone', u.phone,
          'role', u.role,
          'is_active', u.is_active,
          'job_title', u.job_title,
          'created_at', u.created_at,
          'updated_at', u.updated_at,
          'organization_id', u.organization_id,
          'permissions', COALESCE(u.permissions, '{}'::jsonb)
        ),
        'action', 'created'
      )
      INTO v_result
      FROM public.users u
      WHERE u.id = v_employee_id;

      RETURN v_result;
    EXCEPTION
      WHEN undefined_function THEN
        -- Fallback inline creation if create_employee_unified is not available
        -- Check existing employee in the same organization
        SELECT id INTO v_employee_id
        FROM public.users
        WHERE email = (p_payload->>'email')
          AND organization_id = v_org_id
          AND role = 'employee'
        LIMIT 1;

        IF FOUND THEN
          -- If exists and inactive, reactivate and update basic fields
          UPDATE public.users
          SET is_active = true,
              name = (p_payload->>'name'),
              phone = COALESCE(p_payload->>'phone', NULL),
              job_title = COALESCE(p_payload->>'job_title', NULL),
              permissions = v_perms,
              updated_at = NOW()
          WHERE id = v_employee_id;
        ELSE
          -- Insert new employee
          v_employee_id := gen_random_uuid();
          INSERT INTO public.users (
            id, email, name, phone, role, is_active, organization_id, permissions, job_title, created_at, updated_at
          ) VALUES (
            v_employee_id,
            (p_payload->>'email'),
            (p_payload->>'name'),
            COALESCE(p_payload->>'phone', NULL),
            'employee', true, v_org_id, v_perms,
            COALESCE(p_payload->>'job_title', NULL), NOW(), NOW()
          );
        END IF;

        -- Optionally create Auth user for fallback path, then return fresh row
        IF v_create_auth AND COALESCE(p_payload->>'password','') <> '' THEN
          BEGIN
            SELECT status, content
              INTO v_http_status, v_http_content
            FROM net.http_post(
              url := concat(current_setting('app.settings.supabase_url', true), '/auth/v1/admin/users'),
              headers := jsonb_build_object(
                'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key', true)),
                'apikey', current_setting('app.settings.service_role_key', true),
                'Content-Type', 'application/json'
              ),
              body := jsonb_build_object(
                'email', (p_payload->>'email'),
                'password', (p_payload->>'password'),
                'email_confirm', true,
                'user_metadata', jsonb_build_object(
                  'role', 'employee',
                  'name', (p_payload->>'name')
                )
              )
            );
            IF v_http_status BETWEEN 200 AND 299 THEN
              BEGIN
                v_auth_user_id := NULLIF(v_http_content->>'id','')::uuid;
              EXCEPTION WHEN OTHERS THEN
                v_auth_user_id := NULL;
              END;
              IF v_auth_user_id IS NOT NULL THEN
                UPDATE public.users SET auth_user_id = v_auth_user_id WHERE id = v_employee_id;
              END IF;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            PERFORM 1;
          END;
        END IF;

        SELECT json_build_object(
          'success', true,
          'employee', json_build_object(
            'id', u2.id,
            'user_id', COALESCE(u2.auth_user_id, u2.id),
            'name', u2.name,
            'email', u2.email,
            'phone', u2.phone,
            'role', u2.role,
            'is_active', u2.is_active,
            'job_title', u2.job_title,
            'created_at', u2.created_at,
            'updated_at', u2.updated_at,
            'organization_id', u2.organization_id,
            'permissions', COALESCE(u2.permissions, '{}'::jsonb)
          ),
          'action', 'created'
        )
        INTO v_result
        FROM public.users u2
        WHERE u2.id = v_employee_id;

        RETURN v_result;
    END;

  ELSIF v_action = 'delete' OR v_action = 'remove' THEN
    -- Identify employee by id or email within same organization
    v_employee_id := NULL;
    v_email := NULL;

    IF (p_payload ? 'id') THEN
      v_employee_id := (p_payload->>'id')::uuid;
    END IF;
    IF v_employee_id IS NULL AND (p_payload ? 'employee_id') THEN
      v_employee_id := (p_payload->>'employee_id')::uuid;
    END IF;
    IF v_employee_id IS NULL AND (p_payload ? 'email') THEN
      v_email := (p_payload->>'email');
      SELECT id INTO v_employee_id
      FROM public.users
      WHERE email = v_email AND organization_id = v_org_id AND role = 'employee'
      LIMIT 1;
    END IF;

    IF v_employee_id IS NULL THEN
      RETURN json_build_object('success', false, 'code', 'EMPLOYEE_NOT_FOUND', 'error', 'لم يتم العثور على الموظف للحذف');
    END IF;

    -- Ensure employee belongs to same org
    PERFORM 1 FROM public.users WHERE id = v_employee_id AND organization_id = v_org_id AND role = 'employee';
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'لا يمكن حذف موظف من مؤسسة أخرى');
    END IF;

    -- Try to use helper if available to delete both DB and Auth user
    BEGIN
      PERFORM public.delete_user_safely(v_employee_id);
    EXCEPTION
      WHEN undefined_function THEN
        -- Fallback: delete from local users table only
        DELETE FROM public.users WHERE id = v_employee_id AND role = 'employee';
      WHEN OTHERS THEN
        -- If helper failed, still attempt local delete
        DELETE FROM public.users WHERE id = v_employee_id AND role = 'employee';
    END;

    RETURN json_build_object('success', true, 'action', 'deleted', 'employee_id', v_employee_id);

  ELSE
    RETURN json_build_object('success', false, 'code', 'INVALID_ACTION', 'error', 'الإجراء غير معروف. استخدم create أو delete');
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'code', 'UNKNOWN_ERROR', 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION manage_employee(text, jsonb) TO authenticated;

COMMENT ON FUNCTION manage_employee(text, jsonb) IS 'Unified RPC: create or delete employee. On create, grants all permissions by default.';
