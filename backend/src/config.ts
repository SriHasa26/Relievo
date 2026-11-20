import "dotenv/config";

// A value still set to the placeholder text counts as "not configured".
const real = (v: string | undefined) => (v && !v.startsWith("paste") ? v : undefined);

export const config = {
  port: Number(process.env.PORT ?? 4000),
  // Each flag defaults to true (safe for dev with no keys). ALL must be false for the demo.
  mockChat: (process.env.MOCK_CHAT ?? "true") === "true", // in-memory chat stub instead of Nexconn
  mockAi: (process.env.MOCK_AI ?? "true") === "true", // keyword "AI" instead of Gemini
  mockDb: (process.env.MOCK_DB ?? "true") === "true", // in-memory data + demo logins instead of Supabase
  nexconnApiDomain: real(process.env.NEXCONN_API_DOMAIN), // data-center host, e.g. api.sg-light-api.com
  nexconnApiDomainBackup: real(process.env.NEXCONN_API_DOMAIN_BACKUP), // optional failover host
  nexconnAppKey: real(process.env.NEXCONN_APP_KEY),
  nexconnAppSecret: real(process.env.NEXCONN_APP_SECRET), // backend only
  geminiApiKey: real(process.env.GEMINI_API_KEY),
  supabaseUrl: real(process.env.SUPABASE_URL),
  supabaseServiceRoleKey: real(process.env.SUPABASE_SERVICE_ROLE_KEY), // backend only
};
