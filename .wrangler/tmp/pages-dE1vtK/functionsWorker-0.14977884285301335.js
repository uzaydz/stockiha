var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/cloudflare-config.js
async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET") {
    return new Response(JSON.stringify({
      success: false,
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  try {
    const CLOUDFLARE_API_TOKEN = env.CF_API_TOKEN || env.CLOUDFLARE_API_TOKEN || env.VITE_CLOUDFLARE_API_TOKEN;
    const CLOUDFLARE_ZONE_ID = env.CF_ZONE_ID || env.CLOUDFLARE_ZONE_ID || env.VITE_CLOUDFLARE_ZONE_ID;
    const CLOUDFLARE_PROJECT_NAME = env.CF_PROJECT_NAME || env.CLOUDFLARE_PROJECT_NAME || env.VITE_CLOUDFLARE_PROJECT_NAME;
    const hasConfig = !!(CLOUDFLARE_API_TOKEN && CLOUDFLARE_ZONE_ID && CLOUDFLARE_PROJECT_NAME);
    return new Response(JSON.stringify({
      success: true,
      hasConfig,
      config: {
        hasToken: !!CLOUDFLARE_API_TOKEN,
        hasZoneId: !!CLOUDFLARE_ZONE_ID,
        hasProjectName: !!CLOUDFLARE_PROJECT_NAME,
        projectName: CLOUDFLARE_PROJECT_NAME || null
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A Cloudflare Pages Function cloudflare-config:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error",
      hasConfig: false
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
}
__name(onRequest, "onRequest");

// api/cloudflare-domains.js
async function onRequest2(context) {
  const { request, env } = context;
  if (request.method !== "POST") {
    return new Response(JSON.stringify({
      success: false,
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  try {
    const { action, domain } = await request.json();
    if (!action) {
      return new Response(JSON.stringify({
        success: false,
        error: "Action parameter is required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    const CLOUDFLARE_API_TOKEN = env.CF_API_TOKEN || env.CLOUDFLARE_API_TOKEN || env.VITE_CLOUDFLARE_API_TOKEN;
    const CLOUDFLARE_ZONE_ID = env.CF_ZONE_ID || env.CLOUDFLARE_ZONE_ID || env.VITE_CLOUDFLARE_ZONE_ID;
    const CLOUDFLARE_PROJECT_NAME = env.CF_PROJECT_NAME || env.CLOUDFLARE_PROJECT_NAME || env.VITE_CLOUDFLARE_PROJECT_NAME;
    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID || !CLOUDFLARE_PROJECT_NAME) {
      return new Response(JSON.stringify({
        success: false,
        error: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A Cloudflare \u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631\u0629. \u064A\u0631\u062C\u0649 \u0625\u0636\u0627\u0641\u0629 VITE_CLOUDFLARE_API_TOKEN \u0648 VITE_CLOUDFLARE_PROJECT_NAME \u0648 VITE_CLOUDFLARE_ZONE_ID."
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    const CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4";
    switch (action) {
      case "add-domain":
        return await handleAddDomain(request, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL, domain);
      case "remove-domain":
        return await handleRemoveDomain(request, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL, domain);
      case "verify-domain":
        return await handleVerifyDomain(request, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL, domain);
      case "get-cname-target":
        return await handleGetCnameTarget(request, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID, CLOUDFLARE_PROJECT_NAME, CLOUDFLARE_API_URL, domain);
      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}`
        }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });
    }
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A Cloudflare Pages Function cloudflare-domains:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
}
__name(onRequest2, "onRequest");
async function handleAddDomain(request, token, zoneId, projectName, apiUrl, domain) {
  if (!domain) {
    return new Response(JSON.stringify({
      success: false,
      error: "Domain parameter is required"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  try {
    const response = await fetch(`${apiUrl}/accounts/${zoneId}/pages/projects/${projectName}/domains`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: domain
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Cloudflare API Error (add-domain):", data);
      return new Response(JSON.stringify({
        success: false,
        error: data.errors?.[0]?.message || "\u0641\u0634\u0644 \u0641\u064A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0646\u0637\u0627\u0642 \u0625\u0644\u0649 Cloudflare",
        details: data
      }), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      data: data.result,
      message: "\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0646\u0637\u0627\u0642 \u0628\u0646\u062C\u0627\u062D"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("Error adding domain:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0646\u0637\u0627\u0642"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
}
__name(handleAddDomain, "handleAddDomain");
async function handleRemoveDomain(request, token, zoneId, projectName, apiUrl, domain) {
  if (!domain) {
    return new Response(JSON.stringify({
      success: false,
      error: "Domain parameter is required"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  try {
    const response = await fetch(`${apiUrl}/accounts/${zoneId}/pages/projects/${projectName}/domains/${domain}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    if (!response.ok) {
      console.warn("\u26A0\uFE0F \u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0646\u0637\u0627\u0642 \u0645\u0646 Cloudflare (\u0631\u0628\u0645\u0627 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F):", data);
      return new Response(JSON.stringify({
        success: true,
        message: "\u0627\u0644\u0646\u0637\u0627\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A Cloudflare (\u0631\u0628\u0645\u0627 \u062A\u0645 \u062D\u0630\u0641\u0647 \u0645\u0633\u0628\u0642\u0627\u064B)"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      data: data.result,
      message: "\u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0646\u0637\u0627\u0642 \u0628\u0646\u062C\u0627\u062D"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("Error removing domain:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u0646\u0637\u0627\u0642"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
}
__name(handleRemoveDomain, "handleRemoveDomain");
async function handleVerifyDomain(request, token, zoneId, projectName, apiUrl, domain) {
  if (!domain) {
    return new Response(JSON.stringify({
      success: false,
      error: "Domain parameter is required"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  try {
    const response = await fetch(`${apiUrl}/accounts/${zoneId}/pages/projects/${projectName}/domains/${domain}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Cloudflare API Error (verify-domain):", data);
      return new Response(JSON.stringify({
        success: false,
        error: data.errors?.[0]?.message || "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0627\u0644\u0629 \u0627\u0644\u0646\u0637\u0627\u0642",
        details: data
      }), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    const domainData = data.result;
    const isVerified = domainData.status === "active";
    const sslStatus = domainData.ssl_status || "pending";
    return new Response(JSON.stringify({
      success: true,
      data: {
        domain,
        status: domainData.status,
        verified: isVerified,
        ssl_status: sslStatus,
        verification_data: domainData.verification_data,
        cname_target: domainData.cname_target
      },
      message: isVerified ? "\u0627\u0644\u0646\u0637\u0627\u0642 \u0645\u0641\u0639\u0644 \u0648\u064A\u0639\u0645\u0644 \u0628\u0634\u0643\u0644 \u0635\u062D\u064A\u062D" : "\u0627\u0644\u0646\u0637\u0627\u0642 \u0642\u064A\u062F \u0627\u0644\u0645\u0639\u0627\u0644\u062C\u0629"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("Error verifying domain:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u062D\u0627\u0644\u0629 \u0627\u0644\u0646\u0637\u0627\u0642"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
}
__name(handleVerifyDomain, "handleVerifyDomain");
async function handleGetCnameTarget(request, token, zoneId, projectName, apiUrl, domain) {
  if (!domain) {
    return new Response(JSON.stringify({
      success: false,
      error: "Domain parameter is required"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
  try {
    const response = await fetch(`${apiUrl}/accounts/${zoneId}/pages/projects/${projectName}/domains/${domain}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Cloudflare API Error (get-cname-target):", data);
      return new Response(JSON.stringify({
        success: false,
        error: data.errors?.[0]?.message || "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 CNAME target",
        details: data
      }), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    const domainData = data.result;
    return new Response(JSON.stringify({
      success: true,
      data: {
        cname_target: domainData.cname_target,
        domain,
        status: domainData.status
      },
      message: "\u062A\u0645 \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 CNAME target \u0628\u0646\u062C\u0627\u062D"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("Error getting CNAME target:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "\u0641\u0634\u0644 \u0641\u064A \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 CNAME target"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
}
__name(handleGetCnameTarget, "handleGetCnameTarget");

// api/env-check.js
async function onRequest3(context) {
  const { request, env } = context;
  try {
    const response = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      environment: {
        CF_API_TOKEN: env.CF_API_TOKEN ? "***" + env.CF_API_TOKEN.slice(-4) : null,
        CF_ZONE_ID: env.CF_ZONE_ID,
        CF_PROJECT_NAME: env.CF_PROJECT_NAME,
        CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_API_TOKEN ? "***" + env.CLOUDFLARE_API_TOKEN.slice(-4) : null,
        CLOUDFLARE_ZONE_ID: env.CLOUDFLARE_ZONE_ID,
        CLOUDFLARE_PROJECT_NAME: env.CLOUDFLARE_PROJECT_NAME,
        VITE_CLOUDFLARE_API_TOKEN: env.VITE_CLOUDFLARE_API_TOKEN ? "***" + env.VITE_CLOUDFLARE_API_TOKEN.slice(-4) : null,
        VITE_CLOUDFLARE_ZONE_ID: env.VITE_CLOUDFLARE_ZONE_ID,
        VITE_CLOUDFLARE_PROJECT_NAME: env.VITE_CLOUDFLARE_PROJECT_NAME
      },
      hasConfig: !!((env.CF_API_TOKEN || env.CLOUDFLARE_API_TOKEN || env.VITE_CLOUDFLARE_API_TOKEN) && (env.CF_ZONE_ID || env.CLOUDFLARE_ZONE_ID || env.VITE_CLOUDFLARE_ZONE_ID) && (env.CF_PROJECT_NAME || env.CLOUDFLARE_PROJECT_NAME || env.VITE_CLOUDFLARE_PROJECT_NAME)),
      request: {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
      }
    };
    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    console.error("\u062E\u0637\u0623 \u0641\u064A Cloudflare Pages Function env-check:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
}
__name(onRequest3, "onRequest");

// api/test.js
async function onRequest4(context) {
  const { request } = context;
  return new Response(JSON.stringify({
    success: true,
    message: "Test function works!",
    method: request.method,
    url: request.url,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequest4, "onRequest");

// ../.wrangler/tmp/pages-dE1vtK/functionsRoutes-0.7600335620377255.mjs
var routes = [
  {
    routePath: "/api/cloudflare-config",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/cloudflare-domains",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/env-check",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/test",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest4]
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
