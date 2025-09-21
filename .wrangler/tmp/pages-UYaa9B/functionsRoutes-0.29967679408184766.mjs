import { onRequest as __api_cloudflare_config_js_onRequest } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/cloudflare-config.js"
import { onRequest as __api_cloudflare_domains_js_onRequest } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/cloudflare-domains.js"
import { onRequest as __api_env_check_js_onRequest } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/env-check.js"
import { onRequest as __api_test_js_onRequest } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/test.js"

export const routes = [
    {
      routePath: "/api/cloudflare-config",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_cloudflare_config_js_onRequest],
    },
  {
      routePath: "/api/cloudflare-domains",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_cloudflare_domains_js_onRequest],
    },
  {
      routePath: "/api/env-check",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_env_check_js_onRequest],
    },
  {
      routePath: "/api/test",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_test_js_onRequest],
    },
  ]