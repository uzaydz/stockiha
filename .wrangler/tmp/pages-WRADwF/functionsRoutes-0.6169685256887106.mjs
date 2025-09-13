import { onRequestGet as __api__rpc_get_product_complete_data_ts_onRequestGet } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/_rpc/get_product_complete_data.ts"
import { onRequestGet as __api__rpc_get_store_init_data_ts_onRequestGet } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/_rpc/get_store_init_data.ts"
import { onRequestGet as __api_conversion_events_health_ts_onRequestGet } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/conversion-events/health.ts"
import { onRequestPost as __api_conversion_events_tiktok_ts_onRequestPost } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/conversion-events/tiktok.ts"
import { onRequestGet as __api_cloudflare_config_ts_onRequestGet } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/cloudflare-config.ts"
import { onRequestPost as __api_cloudflare_domains_ts_onRequestPost } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/cloudflare-domains.ts"
import { onRequestPost as __api_cloudflare_webhook_ts_onRequestPost } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/cloudflare-webhook.ts"
import { onRequestGet as __api_conversion_events_ts_onRequestGet } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/conversion-events.ts"
import { onRequestPost as __api_conversion_events_ts_onRequestPost } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/conversion-events.ts"
import { onRequestOptions as __api_csp_report_ts_onRequestOptions } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/csp-report.ts"
import { onRequestPost as __api_csp_report_ts_onRequestPost } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/csp-report.ts"
import { onRequestGet as __api_health_check_ts_onRequestGet } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/health-check.ts"
import { onRequestOptions as __api_verify_domain_ts_onRequestOptions } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/verify-domain.ts"
import { onRequestPost as __api_verify_domain_ts_onRequestPost } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/verify-domain.ts"
import { onRequestGet as __api_yalidine_fees_proxy_ts_onRequestGet } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/yalidine-fees-proxy.ts"
import { onRequestOptions as __api_yalidine_fees_proxy_ts_onRequestOptions } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/yalidine-fees-proxy.ts"
import { onRequestPost as __api_yalidine_fees_proxy_ts_onRequestPost } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/yalidine-fees-proxy.ts"
import { onRequest as __api_csp_report_ts_onRequest } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/csp-report.ts"
import { onRequest as __api_secure_yalidine_proxy_ts_onRequest } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/api/secure-yalidine-proxy.ts"
import { onRequest as __robots_txt_ts_onRequest } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/robots.txt.ts"
import { onRequest as __sitemap_xml_ts_onRequest } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/sitemap.xml.ts"
import { onRequestOptions as ___middleware_ts_onRequestOptions } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/_middleware.ts"
import { onRequest as ___middleware_ts_onRequest } from "/Users/gherbitravel/Downloads/bazaar-console-connect-main/functions/_middleware.ts"

export const routes = [
    {
      routePath: "/api/_rpc/get_product_complete_data",
      mountPath: "/api/_rpc",
      method: "GET",
      middlewares: [],
      modules: [__api__rpc_get_product_complete_data_ts_onRequestGet],
    },
  {
      routePath: "/api/_rpc/get_store_init_data",
      mountPath: "/api/_rpc",
      method: "GET",
      middlewares: [],
      modules: [__api__rpc_get_store_init_data_ts_onRequestGet],
    },
  {
      routePath: "/api/conversion-events/health",
      mountPath: "/api/conversion-events",
      method: "GET",
      middlewares: [],
      modules: [__api_conversion_events_health_ts_onRequestGet],
    },
  {
      routePath: "/api/conversion-events/tiktok",
      mountPath: "/api/conversion-events",
      method: "POST",
      middlewares: [],
      modules: [__api_conversion_events_tiktok_ts_onRequestPost],
    },
  {
      routePath: "/api/cloudflare-config",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_cloudflare_config_ts_onRequestGet],
    },
  {
      routePath: "/api/cloudflare-domains",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_cloudflare_domains_ts_onRequestPost],
    },
  {
      routePath: "/api/cloudflare-webhook",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_cloudflare_webhook_ts_onRequestPost],
    },
  {
      routePath: "/api/conversion-events",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_conversion_events_ts_onRequestGet],
    },
  {
      routePath: "/api/conversion-events",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_conversion_events_ts_onRequestPost],
    },
  {
      routePath: "/api/csp-report",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_csp_report_ts_onRequestOptions],
    },
  {
      routePath: "/api/csp-report",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_csp_report_ts_onRequestPost],
    },
  {
      routePath: "/api/health-check",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_health_check_ts_onRequestGet],
    },
  {
      routePath: "/api/verify-domain",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_verify_domain_ts_onRequestOptions],
    },
  {
      routePath: "/api/verify-domain",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_verify_domain_ts_onRequestPost],
    },
  {
      routePath: "/api/yalidine-fees-proxy",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_yalidine_fees_proxy_ts_onRequestGet],
    },
  {
      routePath: "/api/yalidine-fees-proxy",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_yalidine_fees_proxy_ts_onRequestOptions],
    },
  {
      routePath: "/api/yalidine-fees-proxy",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_yalidine_fees_proxy_ts_onRequestPost],
    },
  {
      routePath: "/api/csp-report",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_csp_report_ts_onRequest],
    },
  {
      routePath: "/api/secure-yalidine-proxy",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_secure_yalidine_proxy_ts_onRequest],
    },
  {
      routePath: "/robots.txt",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__robots_txt_ts_onRequest],
    },
  {
      routePath: "/sitemap.xml",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__sitemap_xml_ts_onRequest],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "OPTIONS",
      middlewares: [___middleware_ts_onRequestOptions],
      modules: [],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_ts_onRequest],
      modules: [],
    },
  ]