var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/cloudflare-config.ts
async function onRequestGet(context) {
  const { env } = context;
  try {
    const hasConfig = !!(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ZONE_ID && env.VITE_CLOUDFLARE_PROJECT_NAME);
    return new Response(JSON.stringify({
      success: true,
      hasConfig,
      projectName: env.VITE_CLOUDFLARE_PROJECT_NAME || "stockiha",
      apiTokenLength: env.CLOUDFLARE_API_TOKEN?.length || 0,
      zoneIdLength: env.CLOUDFLARE_ZONE_ID?.length || 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A API Route:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0645\u064A\u0644 \u0625\u0639\u062F\u0627\u062F\u0627\u062A Cloudflare",
      hasConfig: false
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}
__name(onRequestGet, "onRequestGet");

// api/cloudflare-domains.ts
var getCloudflareApiUrl = /* @__PURE__ */ __name(() => {
  return "https://api.cloudflare.com/client/v4";
}, "getCloudflareApiUrl");
async function makeCloudflareRequest(endpoint, token, method = "GET", data) {
  const url = `${getCloudflareApiUrl()}${endpoint}`;
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };
  if (data && method !== "GET") {
    options.body = JSON.stringify(data);
  }
  const response = await fetch(url, options);
  return await response.json();
}
__name(makeCloudflareRequest, "makeCloudflareRequest");
async function onRequestPost(context) {
  const { env, request } = context;
  try {
    if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ZONE_ID) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u0645\u062A\u063A\u064A\u0631\u0627\u062A Cloudflare API \u063A\u064A\u0631 \u0645\u0643\u0648\u0646\u0629 \u0628\u0634\u0643\u0644 \u0635\u062D\u064A\u062D"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const requestData = await request.json();
    const { action, domain } = requestData;
    let result;
    switch (action) {
      case "verify-domain":
        result = await makeCloudflareRequest(
          `/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames?hostname=${domain}`,
          env.CLOUDFLARE_API_TOKEN
        );
        break;
      case "add-domain":
        result = await makeCloudflareRequest(
          `/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames`,
          env.CLOUDFLARE_API_TOKEN,
          "POST",
          {
            hostname: domain,
            ssl: {
              method: "http",
              type: "dv",
              settings: {
                http2: "on",
                min_tls_version: "1.2",
                tls_1_3: "on"
              }
            }
          }
        );
        break;
      case "get-domains":
        result = await makeCloudflareRequest(
          `/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames`,
          env.CLOUDFLARE_API_TOKEN
        );
        break;
      case "remove-domain":
        const searchResult = await makeCloudflareRequest(
          `/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames?hostname=${domain}`,
          env.CLOUDFLARE_API_TOKEN
        );
        if (searchResult.success && searchResult.result?.length > 0) {
          const hostnameId = searchResult.result[0].id;
          result = await makeCloudflareRequest(
            `/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${hostnameId}`,
            env.CLOUDFLARE_API_TOKEN,
            "DELETE"
          );
        } else {
          result = { success: false, errors: [{ message: "\u0627\u0644\u0646\u0637\u0627\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" }] };
        }
        break;
      case "get-cname-target":
        const cnameResult = await makeCloudflareRequest(
          `/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames?hostname=${domain}`,
          env.CLOUDFLARE_API_TOKEN
        );
        if (cnameResult.success && cnameResult.result?.length > 0) {
          const hostname = cnameResult.result[0];
          result = {
            success: true,
            result: {
              cname_target: hostname.ownership_verification?.value || `${env.VITE_CLOUDFLARE_PROJECT_NAME}.pages.dev`,
              ssl_status: hostname.ssl?.status,
              verification_status: hostname.status
            }
          };
        } else {
          result = { success: false, errors: [{ message: "\u0627\u0644\u0646\u0637\u0627\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" }] };
        }
        break;
      default:
        return new Response(JSON.stringify({
          success: false,
          error: "\u0625\u062C\u0631\u0627\u0621 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }
    return new Response(JSON.stringify({
      success: result.success,
      data: result.result,
      errors: result.errors,
      action
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0646\u0637\u0627\u0642\u0627\u062A:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0637\u0644\u0628 \u0627\u0644\u0646\u0637\u0627\u0642",
      details: error instanceof Error ? error.message : "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost, "onRequestPost");

// api/csp-report.ts
var SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};
function categorizeSeverity(violation) {
  const directive = violation["violated-directive"];
  const blockedUri = violation["blocked-uri"];
  if (directive.includes("script-src")) {
    if (blockedUri.includes("javascript:") || blockedUri.includes("data:")) {
      return { severity: "critical", category: "inline-script-injection" };
    }
    if (blockedUri.includes("eval") || violation["script-sample"]?.includes("eval")) {
      return { severity: "critical", category: "eval-usage" };
    }
    return { severity: "high", category: "script-violation" };
  }
  if (directive.includes("object-src") || directive.includes("frame-src")) {
    return { severity: "high", category: "embedding-violation" };
  }
  if (directive.includes("style-src")) {
    return { severity: "medium", category: "style-violation" };
  }
  if (directive.includes("img-src") || directive.includes("font-src")) {
    return { severity: "low", category: "resource-violation" };
  }
  return { severity: "medium", category: "unknown-violation" };
}
__name(categorizeSeverity, "categorizeSeverity");
function processViolation(report, userAgent, clientIP) {
  const violation = report["csp-report"];
  const { severity, category } = categorizeSeverity(violation);
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    documentUri: violation["document-uri"] || "unknown",
    violatedDirective: violation["violated-directive"] || "unknown",
    blockedUri: violation["blocked-uri"] || "unknown",
    sourceFile: violation["source-file"] || "unknown",
    lineNumber: violation["line-number"] || 0,
    columnNumber: violation["column-number"] || 0,
    scriptSample: violation["script-sample"]?.substring(0, 200) || "",
    // تقييد الطول
    userAgent: userAgent.substring(0, 500),
    // تقييد الطول
    clientIP,
    severity,
    category
  };
}
__name(processViolation, "processViolation");
function shouldIgnoreViolation(violation) {
  const ignoredPatterns = [
    // Browser extensions
    "chrome-extension:",
    "moz-extension:",
    "safari-extension:",
    // Known safe violations
    "about:blank",
    "about:srcdoc",
    // Development tools
    "webpack-dev-server",
    "localhost:24678",
    // HMR port
    // Safe inline styles (Tailwind, etc.)
    "tailwind",
    "style-src"
  ];
  return ignoredPatterns.some(
    (pattern) => violation.blockedUri.includes(pattern) || violation.sourceFile.includes(pattern) || violation.documentUri.includes(pattern)
  );
}
__name(shouldIgnoreViolation, "shouldIgnoreViolation");
async function logViolation(violation) {
  try {
    const logEntry = {
      level: violation.severity === "critical" ? "ERROR" : violation.severity === "high" ? "WARN" : "INFO",
      message: `CSP Violation: ${violation.violatedDirective}`,
      details: violation,
      tags: ["csp", "security", violation.category]
    };
    console.log(`[CSP-VIOLATION] ${JSON.stringify(logEntry)}`);
    if (violation.severity === "critical") {
      console.error(`\u{1F6A8} CRITICAL CSP VIOLATION: ${violation.violatedDirective} - ${violation.blockedUri}`);
    }
  } catch (error) {
    console.error("Failed to log CSP violation:", error);
  }
}
__name(logViolation, "logViolation");
async function onRequestPost2(context) {
  const { request } = context;
  try {
    const contentType = request.headers.get("Content-Type");
    if (!contentType?.includes("application/csp-report") && !contentType?.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Invalid Content-Type for CSP report" }),
        {
          status: 400,
          headers: SECURITY_HEADERS
        }
      );
    }
    const body = await request.text();
    if (!body) {
      return new Response(
        JSON.stringify({ error: "Empty request body" }),
        {
          status: 400,
          headers: SECURITY_HEADERS
        }
      );
    }
    let report;
    try {
      report = JSON.parse(body);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: SECURITY_HEADERS
        }
      );
    }
    if (!report["csp-report"]) {
      return new Response(
        JSON.stringify({ error: "Missing csp-report field" }),
        {
          status: 400,
          headers: SECURITY_HEADERS
        }
      );
    }
    const userAgent = request.headers.get("User-Agent") || "unknown";
    const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
    const processedViolation = processViolation(report, userAgent, clientIP);
    if (shouldIgnoreViolation(processedViolation)) {
      return new Response(
        JSON.stringify({
          status: "ignored",
          reason: "Known safe violation"
        }),
        {
          status: 200,
          headers: SECURITY_HEADERS
        }
      );
    }
    await logViolation(processedViolation);
    return new Response(
      JSON.stringify({
        status: "received",
        severity: processedViolation.severity,
        category: processedViolation.category,
        timestamp: processedViolation.timestamp
      }),
      {
        status: 200,
        headers: SECURITY_HEADERS
      }
    );
  } catch (error) {
    console.error("CSP report endpoint error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        status: 500,
        headers: SECURITY_HEADERS
      }
    );
  }
}
__name(onRequestPost2, "onRequestPost");
async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      ...SECURITY_HEADERS,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}
__name(onRequestOptions, "onRequestOptions");
async function onRequest(context) {
  const { request } = context;
  if (request.method === "POST") {
    return onRequestPost2(context);
  } else if (request.method === "OPTIONS") {
    return onRequestOptions();
  } else {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...SECURITY_HEADERS,
          "Allow": "POST, OPTIONS"
        }
      }
    );
  }
}
__name(onRequest, "onRequest");

// api/health-check.ts
async function onRequestGet2() {
  const healthCheck = {
    status: "healthy",
    platform: "cloudflare-pages",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: "2.0.0",
    services: {
      api: "operational",
      database: "checking...",
      functions: "operational"
    },
    deployment: {
      platform: "cloudflare",
      environment: "production",
      functions_enabled: true,
      subdomain_support: true
    }
  };
  return new Response(JSON.stringify(healthCheck, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    }
  });
}
__name(onRequestGet2, "onRequestGet");

// api/verify-domain.ts
async function onRequestPost3(context) {
  const { request, env } = context;
  try {
    const { customDomain, organizationId, action } = await request.json();
    if (!customDomain || !organizationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629. \u064A\u0631\u062C\u0649 \u062A\u0648\u0641\u064A\u0631 customDomain \u0648 organizationId."
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    const cleanDomain = customDomain.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
    if (action === "verify") {
      return await verifyDomain(cleanDomain, organizationId, env);
    } else if (action === "setup") {
      return await setupDomain(cleanDomain, organizationId, env);
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "\u0646\u0648\u0639 \u0627\u0644\u0639\u0645\u0644\u064A\u0629 \u063A\u064A\u0631 \u0645\u062F\u0639\u0648\u0645. \u0627\u0633\u062A\u062E\u062F\u0645 verify \u0623\u0648 setup"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0646\u0637\u0627\u0642:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0637\u0644\u0628",
        details: error instanceof Error ? error.message : "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
__name(onRequestPost3, "onRequestPost");
async function verifyDomain(domain, organizationId, env) {
  try {
    const dnsCheck = await checkDNSRecords(domain);
    if (dnsCheck.isValid) {
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/organizations?id=eq.${organizationId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "apikey": env.SUPABASE_SERVICE_ROLE_KEY
          },
          body: JSON.stringify({
            domain,
            domain_verified: true,
            domain_verified_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        });
        if (!supabaseResponse.ok) {
          throw new Error("\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u062F\u064A\u062B \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
        }
      }
      return new Response(
        JSON.stringify({
          success: true,
          message: "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0646\u0637\u0627\u0642 \u0628\u0646\u062C\u0627\u062D",
          domain,
          verified: true,
          dns_records: dnsCheck.records
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "\u0641\u0634\u0644 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0646\u0637\u0627\u0642",
          message: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A DNS \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629",
          required_records: [
            {
              type: "CNAME",
              name: domain,
              value: "stockiha.pages.dev",
              note: "\u0623\u0636\u0641 \u0647\u0630\u0627 \u0627\u0644\u0633\u062C\u0644 \u0641\u064A \u0625\u0639\u062F\u0627\u062F\u0627\u062A DNS \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0643"
            }
          ],
          current_records: dnsCheck.records
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    throw error;
  }
}
__name(verifyDomain, "verifyDomain");
async function setupDomain(domain, organizationId, env) {
  try {
    if (env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ZONE_ID) {
      const dnsRecord = {
        type: "CNAME",
        name: domain,
        content: "stockiha.pages.dev",
        ttl: 1,
        // Auto TTL
        proxied: true
      };
      const cloudflareResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/dns_records`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(dnsRecord)
        }
      );
      const cloudflareData = await cloudflareResponse.json();
      if (cloudflareResponse.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "\u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0646\u0637\u0627\u0642 \u0628\u0646\u062C\u0627\u062D \u0641\u064A Cloudflare",
            domain,
            dns_record: cloudflareData.result
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      } else {
        throw new Error(`Cloudflare API Error: ${cloudflareData.errors?.[0]?.message || "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"}`);
      }
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          message: "\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0625\u0639\u062F\u0627\u062F \u0627\u0644\u0646\u0637\u0627\u0642",
          domain,
          instructions: [
            {
              step: 1,
              title: "\u0625\u0636\u0627\u0641\u0629 \u0633\u062C\u0644 CNAME",
              description: "\u0641\u064A \u0625\u0639\u062F\u0627\u062F\u0627\u062A DNS \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0645\u0632\u0648\u062F \u0627\u0644\u0646\u0637\u0627\u0642",
              record: {
                type: "CNAME",
                name: domain,
                value: "stockiha.pages.dev"
              }
            },
            {
              step: 2,
              title: "\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0646\u062A\u0634\u0627\u0631 DNS",
              description: "\u0642\u062F \u064A\u0633\u062A\u063A\u0631\u0642 \u0627\u0644\u0623\u0645\u0631 \u062D\u062A\u0649 24 \u0633\u0627\u0639\u0629"
            },
            {
              step: 3,
              title: "\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0646\u0637\u0627\u0642",
              description: "\u0627\u0633\u062A\u062E\u062F\u0645 API \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0639\u062F \u0627\u0646\u062A\u0634\u0627\u0631 DNS"
            }
          ]
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    throw error;
  }
}
__name(setupDomain, "setupDomain");
async function checkDNSRecords(domain) {
  try {
    const dnsResponse = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=CNAME`,
      {
        headers: {
          "Accept": "application/dns-json"
        }
      }
    );
    const dnsData = await dnsResponse.json();
    let isValid = false;
    const records = [];
    if (dnsData.Answer) {
      for (const record of dnsData.Answer) {
        records.push({
          type: record.type === 5 ? "CNAME" : "A",
          name: record.name,
          value: record.data
        });
        if (record.type === 5 && record.data.includes("stockiha.pages.dev")) {
          isValid = true;
        }
      }
    }
    return {
      isValid,
      records
    };
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A \u0641\u062D\u0635 DNS:", error);
    return {
      isValid: false,
      records: [],
      error: error instanceof Error ? error.message : "\u062E\u0637\u0623 \u0641\u064A \u0641\u062D\u0635 DNS"
    };
  }
}
__name(checkDNSRecords, "checkDNSRecords");
async function onRequestOptions2() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    }
  });
}
__name(onRequestOptions2, "onRequestOptions");

// api/yalidine-fees-proxy.ts
async function onRequestGet3(context) {
  const { request } = context;
  const url = new URL(request.url);
  try {
    const fromWilayaId = url.searchParams.get("from_wilaya_id");
    const toWilayaId = url.searchParams.get("to_wilaya_id");
    const apiId = url.searchParams.get("api_id");
    const apiToken = url.searchParams.get("api_token");
    if (!fromWilayaId || !toWilayaId || !apiId || !apiToken) {
      return new Response(
        JSON.stringify({
          error: true,
          message: "\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629: from_wilaya_id, to_wilaya_id, api_id, api_token"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-API-ID, X-API-TOKEN"
          }
        }
      );
    }
    const yalidineUrl = new URL("https://api.yalidine.app/v1/deliveryfees");
    yalidineUrl.searchParams.set("from_wilaya_id", fromWilayaId);
    yalidineUrl.searchParams.set("to_wilaya_id", toWilayaId);
    const yalidineResponse = await fetch(yalidineUrl.toString(), {
      method: "GET",
      headers: {
        "X-API-ID": apiId,
        "X-API-TOKEN": apiToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      }
    });
    const data = await yalidineResponse.json();
    return new Response(JSON.stringify(data), {
      status: yalidineResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-API-ID, X-API-TOKEN",
        "Access-Control-Expose-Headers": "day-quota-left, hour-quota-left, minute-quota-left, second-quota-left",
        // نسخ headers الخاصة بـ rate limiting
        ...yalidineResponse.headers.get("day-quota-left") && {
          "day-quota-left": yalidineResponse.headers.get("day-quota-left")
        },
        ...yalidineResponse.headers.get("hour-quota-left") && {
          "hour-quota-left": yalidineResponse.headers.get("hour-quota-left")
        },
        ...yalidineResponse.headers.get("minute-quota-left") && {
          "minute-quota-left": yalidineResponse.headers.get("minute-quota-left")
        },
        ...yalidineResponse.headers.get("second-quota-left") && {
          "second-quota-left": yalidineResponse.headers.get("second-quota-left")
        }
      }
    });
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A Yalidine API Proxy:", error);
    return new Response(
      JSON.stringify({
        error: true,
        message: "\u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 API \u064A\u0627\u0644\u064A\u062F\u064A\u0646",
        details: error instanceof Error ? error.message : "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPost4(context) {
  const { request } = context;
  try {
    const body = await request.json();
    const { from_wilaya_id, to_wilaya_id, api_id, api_token } = body;
    if (!from_wilaya_id || !to_wilaya_id || !api_id || !api_token) {
      return new Response(
        JSON.stringify({
          error: true,
          message: "\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0645\u0641\u0642\u0648\u062F\u0629 \u0641\u064A body"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
    const yalidineUrl = new URL("https://api.yalidine.app/v1/deliveryfees");
    yalidineUrl.searchParams.set("from_wilaya_id", from_wilaya_id);
    yalidineUrl.searchParams.set("to_wilaya_id", to_wilaya_id);
    const yalidineResponse = await fetch(yalidineUrl.toString(), {
      method: "GET",
      headers: {
        "X-API-ID": api_id,
        "X-API-TOKEN": api_token,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
    const data = await yalidineResponse.json();
    return new Response(JSON.stringify(data), {
      status: yalidineResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-API-ID, X-API-TOKEN"
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: true,
        message: "\u062E\u0637\u0623 \u0641\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0637\u0644\u0628",
        details: error instanceof Error ? error.message : "\u062E\u0637\u0623 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestPost4, "onRequestPost");
async function onRequestOptions3() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-ID, X-API-TOKEN",
      "Access-Control-Max-Age": "86400"
    }
  });
}
__name(onRequestOptions3, "onRequestOptions");

// api/secure-yalidine-proxy.ts
async function checkRateLimit(request, env, limit = 100, window = 60) {
  if (!env.RATE_LIMIT_KV) return true;
  const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `rate_limit:${clientIP}`;
  const current = await env.RATE_LIMIT_KV.get(key);
  const count = current ? parseInt(current) : 0;
  if (count >= limit) {
    return false;
  }
  await env.RATE_LIMIT_KV.put(key, (count + 1).toString(), { expirationTtl: window });
  return true;
}
__name(checkRateLimit, "checkRateLimit");
function validateCredentials(apiId, apiToken) {
  if (!apiId || !apiToken) return false;
  if (apiId.length < 10 || apiToken.length < 20) return false;
  const validApiIdPattern = /^[a-zA-Z0-9_-]+$/;
  const validTokenPattern = /^[a-zA-Z0-9_-]+$/;
  return validApiIdPattern.test(apiId) && validTokenPattern.test(apiToken);
}
__name(validateCredentials, "validateCredentials");
var SECURITY_HEADERS2 = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Type": "application/json",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};
var onRequest2 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  try {
    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: SECURITY_HEADERS2
      });
    }
    const rateLimitPassed = await checkRateLimit(request, env, 50, 60);
    if (!rateLimitPassed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...SECURITY_HEADERS2, "Retry-After": "60" }
      });
    }
    const url = new URL(request.url);
    const from_wilaya_id = url.searchParams.get("from_wilaya_id");
    const to_wilaya_id = url.searchParams.get("to_wilaya_id");
    const api_id = url.searchParams.get("api_id");
    const api_token = url.searchParams.get("api_token");
    if (!from_wilaya_id || !to_wilaya_id || !api_id || !api_token) {
      return new Response(JSON.stringify({
        error: "Missing required parameters",
        required: ["from_wilaya_id", "to_wilaya_id", "api_id", "api_token"]
      }), {
        status: 400,
        headers: SECURITY_HEADERS2
      });
    }
    if (!validateCredentials(api_id, api_token)) {
      return new Response(JSON.stringify({ error: "Invalid credentials format" }), {
        status: 400,
        headers: SECURITY_HEADERS2
      });
    }
    const fromWilayaId = parseInt(from_wilaya_id);
    const toWilayaId = parseInt(to_wilaya_id);
    if (isNaN(fromWilayaId) || isNaN(toWilayaId) || fromWilayaId < 1 || fromWilayaId > 58 || toWilayaId < 1 || toWilayaId > 58) {
      return new Response(JSON.stringify({
        error: "Invalid wilaya IDs. Must be between 1 and 58"
      }), {
        status: 400,
        headers: SECURITY_HEADERS2
      });
    }
    const yalidineUrl = `https://api.yalidine.app/v1/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${toWilayaId}`;
    const yalidineResponse = await fetch(yalidineUrl, {
      method: "GET",
      headers: {
        "X-API-ID": api_id,
        "X-API-TOKEN": api_token,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Stockiha-Secure/1.0",
        "X-Forwarded-For": request.headers.get("CF-Connecting-IP") || "unknown"
      },
      // إضافة timeout للأمان
      signal: AbortSignal.timeout(1e4)
      // 10 seconds timeout
    });
    if (!yalidineResponse.ok) {
      const errorText = await yalidineResponse.text();
      console.error("Yalidine API error:", {
        status: yalidineResponse.status,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        from_wilaya: fromWilayaId,
        to_wilaya: toWilayaId
      });
      return new Response(JSON.stringify({
        error: "External service unavailable",
        status: yalidineResponse.status,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }), {
        status: yalidineResponse.status === 404 ? 404 : 502,
        headers: SECURITY_HEADERS2
      });
    }
    const data = await yalidineResponse.json();
    if (!data || typeof data !== "object" || !data.per_commune) {
      return new Response(JSON.stringify({
        error: "Invalid response from external service",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }), {
        status: 502,
        headers: SECURITY_HEADERS2
      });
    }
    const communeData = data.per_commune;
    const communeValues = Object.values(communeData);
    const firstCommune = communeValues.length > 0 ? communeValues[0] : {};
    const secureResponse = {
      success: true,
      from_wilaya_id: fromWilayaId,
      to_wilaya_id: toWilayaId,
      data: {
        from_wilaya: {
          id: fromWilayaId,
          name: data.from_wilaya_name || `Wilaya ${fromWilayaId}`
        },
        to_wilaya: {
          id: toWilayaId,
          name: data.to_wilaya_name || `Wilaya ${toWilayaId}`
        },
        fees: {
          home_delivery: {
            price: firstCommune?.express_home || 500,
            currency: "DZD",
            description: "\u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u0644\u0644\u0645\u0646\u0632\u0644"
          },
          stopdesk_delivery: {
            price: firstCommune?.express_desk || 350,
            currency: "DZD",
            description: "\u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u0644\u0645\u0643\u062A\u0628 \u0627\u0644\u062A\u0648\u0642\u0641"
          }
        },
        zone: data.zone || 1,
        estimated_delivery_days: "1-3",
        insurance_rate: data.insurance_percentage ? `${data.insurance_percentage}%` : "1%",
        max_weight: "30kg",
        max_dimensions: "100x100x100cm",
        per_commune: communeData,
        cod_percentage: data.cod_percentage,
        retour_fee: data.retour_fee,
        oversize_fee: data.oversize_fee
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      source: "yalidine_api_secure",
      request_id: crypto.randomUUID()
    };
    return new Response(JSON.stringify(secureResponse), {
      status: 200,
      headers: {
        ...SECURITY_HEADERS2,
        "Access-Control-Allow-Origin": request.headers.get("Origin") || "https://stockiha.com",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
        "X-Request-ID": secureResponse.request_id
      }
    });
  } catch (error) {
    console.error("Secure proxy error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      url: request.url
    });
    return new Response(JSON.stringify({
      error: "Internal server error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      request_id: crypto.randomUUID()
    }), {
      status: 500,
      headers: SECURITY_HEADERS2
    });
  }
}, "onRequest");

// robots.txt.ts
async function fetchOrganizationIdForHost(host, env) {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
    const isStockihaSub = /\.stockiha\.[a-z]+$/i.test(host);
    const parts = host.split(".");
    const subdomain = isStockihaSub && parts.length > 2 ? parts[0] : void 0;
    const domain = isStockihaSub ? void 0 : host;
    const headers = {
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json"
    };
    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_organization_by_domain`, {
      method: "POST",
      headers,
      body: JSON.stringify({ p_domain: domain, p_subdomain: subdomain })
    });
    if (!resp.ok) return null;
    const orgId = await resp.json();
    if (typeof orgId === "string" && orgId.length > 10) return orgId;
    return null;
  } catch {
    return null;
  }
}
__name(fetchOrganizationIdForHost, "fetchOrganizationIdForHost");
async function buildRobotsContent(host, env, orgId) {
  const lines = [];
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const headers = {
        "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY
      };
      let url = `${env.SUPABASE_URL}/rest/v1/seo_robots_rules?is_active=eq.true&select=*`;
      if (orgId) {
        url = `${env.SUPABASE_URL}/rest/v1/seo_robots_rules?organization_id=eq.${encodeURIComponent(orgId)}&is_active=eq.true&select=*`;
      }
      const resp = await fetch(url, { headers });
      if (resp.ok) {
        const rules = await resp.json();
        if (Array.isArray(rules) && rules.length > 0) {
          for (const rule of rules) {
            const userAgent = rule.user_agent || "*";
            lines.push(`User-agent: ${userAgent}`);
            if (Array.isArray(rule.disallow_paths)) {
              for (const p of rule.disallow_paths) lines.push(`Disallow: ${p}`);
            }
            if (Array.isArray(rule.allow_paths)) {
              for (const p of rule.allow_paths) lines.push(`Allow: ${p}`);
            }
            if (rule.crawl_delay) lines.push(`Crawl-delay: ${rule.crawl_delay}`);
            lines.push("");
          }
        }
      }
    } catch {
    }
  }
  if (lines.length === 0) {
    lines.push("User-agent: *");
    lines.push("Allow: /");
    lines.push("");
  }
  lines.push(`Sitemap: https://${host}/sitemap.xml`);
  return lines.join("\n");
}
__name(buildRobotsContent, "buildRobotsContent");
async function onRequest3(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const host = request.headers.get("Host") || url.hostname;
  const orgId = await fetchOrganizationIdForHost(host, env);
  const content = await buildRobotsContent(host, env, orgId);
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
      "X-Robots-Tag": "none"
      // header won't affect indexing of pages, only this file
    }
  });
}
__name(onRequest3, "onRequest");

// sitemap.xml.ts
async function fetchOrganizationIdForHost2(host, env) {
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
    const isStockihaSub = /\.stockiha\.[a-z]+$/i.test(host);
    const parts = host.split(".");
    const subdomain = isStockihaSub && parts.length > 2 ? parts[0] : void 0;
    const domain = isStockihaSub ? void 0 : host;
    const headers = {
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json"
    };
    const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_organization_by_domain`, {
      method: "POST",
      headers,
      body: JSON.stringify({ p_domain: domain, p_subdomain: subdomain })
    });
    if (!resp.ok) return null;
    const orgId = await resp.json();
    if (typeof orgId === "string" && orgId.length > 10) return orgId;
    return null;
  } catch {
    return null;
  }
}
__name(fetchOrganizationIdForHost2, "fetchOrganizationIdForHost");
async function fetchSitemapEntries(env, orgId) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const headers = {
    "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "apikey": env.SUPABASE_SERVICE_ROLE_KEY
  };
  let url = `${env.SUPABASE_URL}/rest/v1/seo_sitemap_entries?include_in_sitemap=eq.true&select=*`;
  if (orgId) {
    url = `${env.SUPABASE_URL}/rest/v1/seo_sitemap_entries?organization_id=eq.${encodeURIComponent(orgId)}&include_in_sitemap=eq.true&select=*`;
  }
  const resp = await fetch(url, { headers });
  if (!resp.ok) return [];
  const data = await resp.json();
  return Array.isArray(data) ? data : [];
}
__name(fetchSitemapEntries, "fetchSitemapEntries");
function xmlEscape(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
__name(xmlEscape, "xmlEscape");
function buildSitemap(host, entries) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const e of entries) {
    const loc = e.url && typeof e.url === "string" ? e.url : `https://${host}/`;
    const lastmod = e.last_modified ? new Date(e.last_modified).toISOString() : void 0;
    const changefreq = e.change_frequency || void 0;
    const priority = typeof e.priority === "number" ? e.priority : void 0;
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(loc)}</loc>`);
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
    if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
    if (priority !== void 0) lines.push(`    <priority>${priority}</priority>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return lines.join("\n");
}
__name(buildSitemap, "buildSitemap");
async function onRequest4(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const host = request.headers.get("Host") || url.hostname;
  const orgId = await fetchOrganizationIdForHost2(host, env);
  let entries = await fetchSitemapEntries(env, orgId);
  if ((!orgId || entries.length === 0) && /stockiha\.(com|pages\.dev)$/i.test(host)) {
    const base = `https://${host}`;
    entries = [
      { url: `${base}/`, change_frequency: "weekly", priority: 1 },
      { url: `${base}/features`, change_frequency: "monthly", priority: 0.8 },
      { url: `${base}/pricing`, change_frequency: "monthly", priority: 0.8 },
      { url: `${base}/contact`, change_frequency: "yearly", priority: 0.6 }
    ];
  }
  const xml = buildSitemap(host, entries);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600"
    }
  });
}
__name(onRequest4, "onRequest");

// _middleware.ts
function getSecurityHeaders(nonce) {
  return {
    // CSP سيتم تعيينها لاحقاً بشكل منفصل
    // Security Headers الأساسية
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()",
    // HSTS للأمان
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    // Cross-Origin Headers محسنة لدعم الصور الخارجية
    "Cross-Origin-Embedder-Policy": "unsafe-none",
    // السماح بتحميل الموارد الخارجية
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "cross-origin",
    // السماح بالموارد من مصادر مختلفة
    // Additional Security Headers
    "X-Robots-Tag": "index, follow",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Expect-CT": "max-age=86400, enforce",
    "X-DNS-Prefetch-Control": "on"
    // إزالة Feature-Policy لتجنب التضارب مع Permissions-Policy
  };
}
__name(getSecurityHeaders, "getSecurityHeaders");
var PERFORMANCE_HEADERS = {
  "Vary": "Accept-Encoding, Accept, User-Agent",
  "Accept-CH": "DPR, Width, Viewport-Width",
  "Server-Timing": 'cf-cache;desc="Cloudflare Cache Status"'
};
var SUSPICIOUS_USER_AGENTS = [
  "curl",
  "wget",
  "python-requests",
  "scrapy",
  "bot",
  "crawler"
];
function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, "");
}
__name(generateNonce, "generateNonce");
async function onRequest5(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const nonce = generateNonce();
  const userAgent = request.headers.get("User-Agent")?.toLowerCase() || "";
  const isSuspicious = SUSPICIOUS_USER_AGENTS.some(
    (agent) => userAgent.includes(agent.toLowerCase())
  );
  if (isSuspicious && !url.pathname.startsWith("/api/")) {
    return new Response("Access Denied", {
      status: 403,
      headers: { "Content-Type": "text/plain" }
    });
  }
  if (url.pathname.startsWith("/api/")) {
    const origin = request.headers.get("Origin");
    const referer = request.headers.get("Referer");
    const allowedOrigins = [
      "https://stockiha.com",
      "https://www.stockiha.com",
      "https://stockiha.pages.dev",
      "http://localhost:8080",
      "http://localhost:3000"
    ];
    const isAllowedOrigin = origin && allowedOrigins.some(
      (allowed) => origin.startsWith(allowed)
    );
    const isAllowedReferer = referer && allowedOrigins.some(
      (allowed) => referer.startsWith(allowed)
    );
    const isDevelopment = url.hostname.includes("localhost") || url.hostname.includes("127.0.0.1");
    if (!isDevelopment && !isAllowedOrigin && !isAllowedReferer) {
      return new Response("Unauthorized Origin", {
        status: 403,
        headers: { "Content-Type": "text/plain" }
      });
    }
  }
  const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
  const getRateLimitForPath = /* @__PURE__ */ __name((pathname) => {
    if (pathname.startsWith("/api/auth/login")) {
      return { requests: 5, window: 3e5 };
    } else if (pathname.startsWith("/api/auth/register")) {
      return { requests: 3, window: 36e5 };
    } else if (pathname.startsWith("/api/auth/reset")) {
      return { requests: 3, window: 36e5 };
    } else if (pathname.startsWith("/api/orders")) {
      return { requests: 10, window: 3e5 };
    } else if (pathname.startsWith("/api/users")) {
      return { requests: 2, window: 36e5 };
    } else if (pathname.startsWith("/api/")) {
      return { requests: 60, window: 6e4 };
    } else {
      return { requests: 200, window: 6e4 };
    }
  }, "getRateLimitForPath");
  const rateLimit = getRateLimitForPath(url.pathname);
  const rateLimitKey = `${clientIP}:${url.pathname.split("/")[1]}:${Math.floor(Date.now() / rateLimit.window)}`;
  const rateLimitMap = globalThis.rateLimitMap || /* @__PURE__ */ new Map();
  globalThis.rateLimitMap = rateLimitMap;
  const currentRequests = rateLimitMap.get(rateLimitKey) || 0;
  if (currentRequests >= rateLimit.requests) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        type: url.pathname.startsWith("/api/auth/") ? "authentication" : "general",
        retryAfter: Math.ceil(rateLimit.window / 1e3)
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": rateLimit.requests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(Date.now() / 1e3) + Math.ceil(rateLimit.window / 1e3)),
          "Retry-After": Math.ceil(rateLimit.window / 1e3).toString(),
          "X-RateLimit-Source": "memory-fallback"
        }
      }
    );
  }
  rateLimitMap.set(rateLimitKey, currentRequests + 1);
  if (Math.random() < 1e-3) {
    const cutoff = Date.now() - 36e5;
    let cleaned = 0;
    for (const [key] of rateLimitMap.entries()) {
      const parts = key.split(":");
      const keyTime = parseInt(parts[parts.length - 1]) * rateLimit.window;
      if (keyTime < cutoff) {
        rateLimitMap.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`Rate limiter cleanup: removed ${cleaned} old entries`);
    }
  }
  const response = await next(request);
  let body = response.body;
  const contentType = response.headers.get("Content-Type");
  if (contentType && contentType.includes("text/html") && response.body) {
    const htmlText = await new Response(response.body).text();
    const transformedHtml = htmlText.replace(/\{\{CSP_NONCE\}\}/g, nonce).replace(/\{\{nonce\}\}/g, nonce);
    body = transformedHtml;
  }
  const newResponse = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
  const securityHeaders = getSecurityHeaders(nonce);
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (key === "Content-Security-Policy") {
      return;
    } else {
      newResponse.headers.set(key, value);
    }
  });
  Object.entries(PERFORMANCE_HEADERS).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });
  newResponse.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com 'unsafe-inline'; script-src-elem 'self' https://static.cloudflareinsights.com 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss: https://*.supabase.co wss://*.supabase.co; frame-src 'self'; object-src 'none';"
  );
  newResponse.headers.set("X-Robots-Tag", "index, follow");
  newResponse.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  newResponse.headers.set("Expect-CT", "max-age=86400, enforce");
  const remainingRequests = Math.max(0, rateLimit.requests - currentRequests - 1);
  newResponse.headers.set("X-RateLimit-Limit", rateLimit.requests.toString());
  newResponse.headers.set("X-RateLimit-Remaining", remainingRequests.toString());
  newResponse.headers.set("X-RateLimit-Reset", String(Math.floor(Date.now() / 1e3) + Math.ceil(rateLimit.window / 1e3)));
  newResponse.headers.set("X-RateLimit-Window", Math.ceil(rateLimit.window / 1e3).toString());
  newResponse.headers.set("X-RateLimit-Source", "memory-fallback");
  if (url.pathname.startsWith("/assets/") || url.pathname.match(/\.(js|css|woff2|woff|png|jpg|jpeg|webp|svg)$/)) {
    newResponse.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (url.pathname.startsWith("/api/")) {
    newResponse.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    newResponse.headers.set("Pragma", "no-cache");
    newResponse.headers.set("Expires", "0");
  } else {
    newResponse.headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
  }
  if (url.pathname.startsWith("/api/")) {
    const origin = request.headers.get("Origin");
    const allowedOrigins = [
      "https://stockiha.com",
      "https://www.stockiha.com",
      "https://stockiha.pages.dev",
      "https://aaa75b28.stockiha.pages.dev"
    ];
    const isDev = url.hostname.includes("localhost") || url.hostname.includes("127.0.0.1");
    if (origin && (allowedOrigins.includes(origin) || isDev)) {
      newResponse.headers.set("Access-Control-Allow-Origin", origin);
    } else if (isDev) {
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
    }
    newResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    newResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-ID, X-API-TOKEN");
    newResponse.headers.set("Access-Control-Allow-Credentials", "true");
    newResponse.headers.set("Access-Control-Max-Age", "86400");
  }
  const cfCacheStatus = response.headers.get("CF-Cache-Status");
  if (cfCacheStatus) {
    newResponse.headers.set(
      "Server-Timing",
      `cf-cache;desc="${cfCacheStatus}", cf-ray;desc="${response.headers.get("CF-Ray")}"`
    );
  }
  return newResponse;
}
__name(onRequest5, "onRequest");
async function onRequestOptions4(context) {
  const { request } = context;
  const origin = request.headers.get("Origin");
  const nonce = generateNonce();
  const allowedOrigins = [
    "https://stockiha.com",
    "https://www.stockiha.com",
    "https://stockiha.pages.dev",
    "https://aaa75b28.stockiha.pages.dev"
  ];
  const corsHeaders = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-ID, X-API-TOKEN",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400"
  };
  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  }
  return new Response(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      ...getSecurityHeaders(nonce)
    }
  });
}
__name(onRequestOptions4, "onRequestOptions");

// ../.wrangler/tmp/pages-L8kwRy/functionsRoutes-0.23770203635187082.mjs
var routes = [
  {
    routePath: "/api/cloudflare-config",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/cloudflare-domains",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/csp-report",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/csp-report",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/health-check",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/verify-domain",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/api/verify-domain",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/yalidine-fees-proxy",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/yalidine-fees-proxy",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions3]
  },
  {
    routePath: "/api/yalidine-fees-proxy",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/csp-report",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/secure-yalidine-proxy",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/robots.txt",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/sitemap.xml",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "OPTIONS",
    middlewares: [onRequestOptions4],
    modules: []
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest5],
    modules: []
  }
];

// ../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../../opt/homebrew/lib/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
