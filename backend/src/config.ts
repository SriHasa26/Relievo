import "dotenv/config";

// A value still set to the placeholder text counts as "not configured".
const real = (v: string | undefined) => (v && !v.startsWith("paste") ? v : undefined);

export const config = {
  port: Number(process.env.PORT ?? 4000),
  // MOCK_MODE=true: fake AI + in-memory chat stub + in-memory data. Must be false for the demo.
  mockMode: (process.env.MOCK_MODE ?? "true") === "true",
  nexconnAppKey: real(process.env.NEXCONN_APP_KEY),
  nexconnAppSecret: real(process.env.NEXCONN_APP_SECRET), // backend only
  geminiApiKey: real(process.env.GEMINI_API_KEY),
  supabaseUrl: real(process.env.SUPABASE_URL),
  supabaseServiceRoleKey: real(process.env.SUPABASE_SERVICE_ROLE_KEY), // backend only
};
