import getAdminClient from '../../_supabase-admin';

// Create or continue tenant creation securely using Service Role on server
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Optional: authenticate caller (bearer user token) and authorize role/claims
    // In production, replace with strict checks (e.g., verify user is creating own org)

    const admin = getAdminClient();
    const body = req.body || {};

    const { step, payload } = body;
    if (!step || typeof step !== 'string') {
      return res.status(400).json({ error: 'Missing step' });
    }

    // Step router: perform limited server-side actions required by registration flow
    if (step === 'create_trial_subscription') {
      const { organizationId, trialPlanId, trialEndDateISO } = payload || {};
      if (!organizationId || !trialPlanId || !trialEndDateISO) {
        return res.status(400).json({ error: 'Missing organizationId/trialPlanId/trialEndDateISO' });
      }

      const { error } = await admin
        .from('organization_subscriptions')
        .insert({
          organization_id: organizationId,
          plan_id: trialPlanId,
          status: 'trial',
          billing_cycle: 'monthly',
          start_date: new Date().toISOString(),
          end_date: trialEndDateISO,
          amount_paid: 0,
          currency: 'DZD',
          payment_method: 'free_trial',
          is_auto_renew: false,
        });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (step === 'insert_admin_user') {
      const { user } = payload || {};
      if (!user || !user.id || !user.email || !user.organization_id) {
        return res.status(400).json({ error: 'Invalid user payload' });
      }
      const { error } = await admin.from('users').insert(user);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (step === 'create_organization_simple') {
      const { name, subdomain, ownerId, settings } = payload || {};
      if (!name || !subdomain || !ownerId) {
        return res.status(400).json({ error: 'Missing name/subdomain/ownerId' });
      }
      const insertData = {
        name,
        subdomain: subdomain.toLowerCase().trim(),
        owner_id: ownerId,
        subscription_tier: 'trial',
        subscription_status: 'trial',
        settings: settings || {},
      };

      const { data, error } = await admin
        .from('organizations')
        .insert(insertData)
        .select('id')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, organizationId: data.id });
    }

    if (step === 'rpc_create_organization') {
      const { org_data, user_id } = payload || {};
      if (!org_data || !user_id) return res.status(400).json({ error: 'Missing org_data/user_id' });
      const { data, error } = await admin.rpc('create_organization_with_audit', { org_data, user_id });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, organizationId: data });
    }

    return res.status(400).json({ error: 'Unknown step' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
