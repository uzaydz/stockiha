const DEFAULT_NAMESERVERS = ['marty.ns.cloudflare.com', 'sue.ns.cloudflare.com'];
const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';
const FALLBACK_BASE_DOMAIN = 'stockiha.com';

const normalizeDomain = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/#.*/, '')
    .replace(/\?.*/, '')
    .replace(/:.*/, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');

const resolveEnvValue = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return '';
};

const getEnvConfig = () => {
  const token = resolveEnvValue(
    'CLOUDFLARE_API_TOKEN',
    'CF_API_TOKEN',
    'CLOUDFLARE_TOKEN',
    'VITE_CLOUDFLARE_API_TOKEN',
    'VITE_CF_API_TOKEN'
  );
  const zoneId = resolveEnvValue(
    'CLOUDFLARE_ZONE_ID',
    'CF_ZONE_ID',
    'VITE_CLOUDFLARE_ZONE_ID',
    'VITE_CF_ZONE_ID'
  );
  const baseDomain = resolveEnvValue(
    'CLOUDFLARE_SAAS_BASE_DOMAIN',
    'CF_BASE_DOMAIN',
    'CLOUDFLARE_PROJECT_DOMAIN',
    'VITE_CLOUDFLARE_SAAS_BASE_DOMAIN',
    'VITE_CF_BASE_DOMAIN'
  ) || FALLBACK_BASE_DOMAIN;

  if (!token || !zoneId) {
    const missing = [];
    if (!token) missing.push('CLOUDFLARE_API_TOKEN');
    if (!zoneId) missing.push('CLOUDFLARE_ZONE_ID');
    throw new Error(`Cloudflare API credentials are missing (${missing.join(', ')}).`);
  }

  return { token, zoneId, baseDomain };
};

const fetchCloudflare = async (token, path, options = {}) => {
  const response = await fetch(`${CLOUDFLARE_API_URL}${path}`, {
    method: 'GET',
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    // Ignore JSON parse errors; data stays null
  }

  return { response, data };
};

const getZoneDetails = async (token, zoneId) => {
  const { response, data } = await fetchCloudflare(token, `/zones/${zoneId}`);
  if (!response.ok || !data?.success) {
    const message = data?.errors?.[0]?.message || 'Failed to load zone details';
    return { success: false, error: message, data: null };
  }

  return {
    success: true,
    data: {
      nameservers: data.result?.name_servers || DEFAULT_NAMESERVERS,
      zone: data.result
    }
  };
};

const checkDomainDelegation = async (domain, expectedNameservers = DEFAULT_NAMESERVERS) => {
  const normalized = normalizeDomain(domain);

  try {
    const response = await fetch(`https://dns.google.com/resolve?name=${normalized}&type=NS`, {
      headers: { Accept: 'application/json' }
    });
    const data = await response.json();
    const answers = Array.isArray(data?.Answer) ? data.Answer : [];
    const foundNameservers = answers.map((answer) => answer.data?.toLowerCase().replace(/\.$/, '')).filter(Boolean);

    const expected = expectedNameservers.map((ns) => ns.toLowerCase());
    const hasCloudflareNs = foundNameservers.some((ns) => ns.includes('cloudflare.com'));
    const hasExactMatch = expected.every((ns) => foundNameservers.includes(ns));

    return {
      success: true,
      data: {
        domain: normalized,
        status: hasExactMatch ? 'active' : hasCloudflareNs ? 'pending' : 'pending',
        nameservers_configured: hasCloudflareNs,
        ssl_status: hasExactMatch ? 'active' : 'pending',
        verification_errors: hasCloudflareNs
          ? undefined
          : foundNameservers.length
            ? [`النطاق يستخدم: ${foundNameservers.join(', ')}. يجب استخدام: ${expected.join(', ')}`]
            : ['لم يتم العثور على سجلات Nameserver لهذا النطاق حتى الآن.'],
        last_checked: new Date().toISOString(),
        detected_nameservers: foundNameservers
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'فشل في التحقق من تفويض النطاق',
      data: {
        domain: normalized,
        status: 'error',
        nameservers_configured: false,
        verification_errors: [error instanceof Error ? error.message : 'حدث خطأ غير متوقع'],
        last_checked: new Date().toISOString()
      }
    };
  }
};

const findCustomHostname = async (token, zoneId, hostname) => {
  const query = encodeURIComponent(hostname);
  const { response, data } = await fetchCloudflare(token, `/zones/${zoneId}/custom_hostnames?hostname=${query}`);

  if (!response.ok || !data?.success) {
    const message = data?.errors?.[0]?.message || 'Failed to query custom hostname';
    return { success: false, error: message };
  }

  const record = Array.isArray(data.result) ? data.result.find((entry) => entry.hostname === hostname) : null;

  if (!record) {
    return { success: false, error: 'Custom hostname not found' };
  }

  return { success: true, data: record };
};

const createCustomHostname = async (token, zoneId, hostname, organizationId) => {
  const payload = {
    hostname,
    ssl: {
      method: 'http',
      type: 'dv',
      settings: {
        http2: 'on',
        min_tls_version: '1.2',
        tls_1_3: 'on'
      }
    },
    custom_metadata: {
      organization_id: organizationId,
      created_by: 'stockiha_auto',
      created_at: new Date().toISOString()
    }
  };

  const { response, data } = await fetchCloudflare(token, `/zones/${zoneId}/custom_hostnames`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (response.ok && data?.success) {
    return { success: true, data: data.result };
  }

  const message = data?.errors?.[0]?.message || 'Failed to create custom hostname';
  return { success: false, error: message, details: data };
};

const deleteCustomHostname = async (token, zoneId, hostnameId) => {
  const { response, data } = await fetchCloudflare(token, `/zones/${zoneId}/custom_hostnames/${hostnameId}`, {
    method: 'DELETE'
  });

  if (response.ok && data?.success) {
    return { success: true };
  }

  if (response.status === 404) {
    return { success: true, message: 'Custom hostname already removed' };
  }

  const message = data?.errors?.[0]?.message || 'Failed to remove custom hostname';
  return { success: false, error: message, details: data };
};

const createCnameRecord = async (token, zoneId, name, target) => {
  const payload = {
    type: 'CNAME',
    name,
    content: target,
    ttl: 1,
    proxied: true
  };

  const { response, data } = await fetchCloudflare(token, `/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (response.ok && data?.success) {
    return { success: true, data: data.result };
  }

  const message = data?.errors?.[0]?.message || 'Failed to create CNAME record';

  if (message.toLowerCase().includes('already exists')) {
    return { success: true, message };
  }

  return { success: false, error: message, details: data };
};

const autoSetupDomainHandler = async (req, res, env) => {
  const { domain, organizationId } = req.body || {};

  if (!domain || !organizationId) {
    return res.status(400).json({
      success: false,
      error: 'Both domain and organizationId are required'
    });
  }

  const normalizedDomain = normalizeDomain(domain);
  const nameserverInfo = await getZoneDetails(env.token, env.zoneId);

  if (!nameserverInfo.success) {
    return res.status(500).json({
      success: false,
      error: nameserverInfo.error || 'Unable to load Cloudflare zone information'
    });
  }

  const expectedNameservers = nameserverInfo.data.nameservers?.length
    ? nameserverInfo.data.nameservers
    : DEFAULT_NAMESERVERS;

  const delegation = await checkDomainDelegation(normalizedDomain, expectedNameservers);

  if (!delegation.success || !delegation.data?.nameservers_configured) {
    return res.status(200).json({
      success: false,
      error: 'الـ Nameservers لم يتم تكوينها بعد',
      message: 'قم بتحديث الـ Nameservers إلى قيم Cloudflare ثم أعد المحاولة.',
      data: delegation.data || null
    });
  }

  const rootHostname = await createCustomHostname(env.token, env.zoneId, normalizedDomain, organizationId);
  if (!rootHostname.success) {
    return res.status(200).json({ success: false, error: rootHostname.error, details: rootHostname.details });
  }

  const wwwHostname = await createCustomHostname(env.token, env.zoneId, `www.${normalizedDomain}`, organizationId);
  if (!wwwHostname.success) {
    return res.status(200).json({ success: false, error: wwwHostname.error, details: wwwHostname.details });
  }

  const cnameTarget = `${organizationId}.${env.baseDomain}`;
  const rootCname = await createCnameRecord(env.token, env.zoneId, normalizedDomain, cnameTarget);
  const wwwCname = await createCnameRecord(env.token, env.zoneId, `www.${normalizedDomain}`, cnameTarget);

  if (!rootCname.success) {
    return res.status(200).json({ success: false, error: rootCname.error, details: rootCname.details });
  }

  if (!wwwCname.success) {
    return res.status(200).json({ success: false, error: wwwCname.error, details: wwwCname.details });
  }

  return res.status(200).json({
    success: true,
    message: 'تم إعداد النطاق تلقائياً بنجاح',
    data: {
      primary_hostname: rootHostname.data,
      www_hostname: wwwHostname.data,
      delegation_status: delegation.data,
      cname_records: {
        root: rootCname.data || null,
        www: wwwCname.data || null
      }
    }
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { action } = req.body || {};

  if (!action) {
    return res.status(400).json({ success: false, error: 'Action parameter is required' });
  }

  let env;
  try {
    env = getEnvConfig();
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  try {
    switch (action) {
      case 'get-nameservers': {
        const nameservers = await getZoneDetails(env.token, env.zoneId);
        return res.status(200).json(nameservers);
      }
      case 'check-hostname': {
        const { hostname } = req.body || {};
        if (!hostname) {
          return res.status(400).json({ success: false, error: 'hostname is required' });
        }
        const result = await findCustomHostname(env.token, env.zoneId, normalizeDomain(hostname));
        return res.status(200).json(result);
      }
      case 'add-hostname': {
        const { domain, organizationId } = req.body || {};
        if (!domain || !organizationId) {
          return res.status(400).json({ success: false, error: 'domain and organizationId are required' });
        }
        const hostname = normalizeDomain(domain);
        const result = await createCustomHostname(env.token, env.zoneId, hostname, organizationId);
        return res.status(200).json(result);
      }
      case 'remove-hostname': {
        const { hostnameId } = req.body || {};
        if (!hostnameId) {
          return res.status(400).json({ success: false, error: 'hostnameId is required' });
        }
        const result = await deleteCustomHostname(env.token, env.zoneId, hostnameId);
        return res.status(200).json(result);
      }
      case 'create-cname': {
        const { name, target } = req.body || {};
        if (!name || !target) {
          return res.status(400).json({ success: false, error: 'name and target are required' });
        }
        const normalizedName = normalizeDomain(name);
        const result = await createCnameRecord(env.token, env.zoneId, normalizedName, target);
        return res.status(200).json(result);
      }
      case 'auto-setup': {
        return autoSetupDomainHandler(req, res, env);
      }
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('cloudflare-saas handler error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
