// Puts the demo back to its original state. Run it before recording the video and before submitting:
//   npm run reset:demo -w backend
// It REMOVES everything created after the seed (incidents, SOS recordings, assignments, resource allocations, events,
// extra chat-room rows and ALL notifications) and RESTORES the seeded rows (statuses, volunteers' availability, stock, timeline,
// and fresh "minutes ago" times). Stored AI analyses are kept: nothing is sent to the AI. Existing Nexconn rooms are reused
// (nothing is deleted in Nexconn; stored room ids are kept and their members are re-checked).
// Supabase Auth accounts are not touched. Never prints keys.
export {}; // module (top-level await)

const { config } = await import("../src/config");

if (config.mockDb) {
  console.log("MOCK_DB=true: the in-memory demo data resets by itself every time the backend restarts. Nothing to do.");
  process.exit(0);
}
const { createServiceClient } = await import("../src/store/supabaseRepo");
const { buildSeed } = await import("../src/store/seedData");

if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
  console.log("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env. Nothing was changed.");
  process.exit(2);
}
const sb = createServiceClient();
const seed = buildSeed();
const list = (ids: string[]) => `(${ids.join(",")})`;
const ok = (msg: string) => console.log(`done  ${msg}`);
const warn = (msg: string) => console.log(`warn  ${msg}`);
const check = (what: string, error: { message: string } | null) => { if (error) throw new Error(`${what}: ${error.message}`); };

// Did the v3 migration run? (decides whether the new columns exist)
const probe = await sb.from("incidents").select("is_sos").limit(1);
const migrated = !probe.error;
if (!migrated) warn("the v3 migration (0003) is not applied yet: restoring the original tables only. Run `npm run verify:schema -w backend`.");

// 1. notifications: all of them (they only describe activity that is being reset)
if (migrated) {
  const { error } = await sb.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  check("notifications", error);
  ok("notifications cleared");
}

// 2. incidents created after the seed (their assignments, events, allocations, analyses, SOS audio and room rows cascade)
const seedIncidentIds = seed.incidents.map((i) => i.id);
{
  const { data, error } = await sb.from("incidents").delete().not("id", "in", list(seedIncidentIds)).select("id");
  check("incidents", error);
  ok(`removed ${data?.length ?? 0} incident(s) created after the seed`);
}

// 3. extra rows on the seeded incidents
async function prune(table: string, keep: string[], what: string) {
  const { data, error } = await sb.from(table).delete().in("incident_id", seedIncidentIds).not("id", "in", list(keep)).select("id");
  check(table, error);
  ok(`removed ${data?.length ?? 0} extra ${what}`);
}
await prune("assignments", seed.assignments.map((a) => a.id), "assignment(s) on seeded incidents");
await prune("resource_allocations", seed.allocations.map((a) => a.id), "allocation(s)");
await prune("incident_events", seed.events.map((e) => e.id), "timeline event(s)");
if (migrated) {
  const { data, error } = await sb.from("incident_channels").delete().neq("kind", "operations").select("incident_id");
  check("incident_channels", error);
  ok(`removed ${data?.length ?? 0} citizen chat room row(s) (the Nexconn groups are left alone)`);
  await sb.from("sos_audio").delete().in("incident_id", seedIncidentIds); // none expected
}

// 4. restore the seeded rows
const upsert = async (table: string, rows: object[], onConflict?: string) => {
  const { error } = await sb.from(table).upsert(rows, onConflict ? { onConflict } : undefined);
  check(table, error);
  ok(`restored ${table}: ${rows.length}`);
};
await upsert("users", seed.users.map(({ password: _p, ...u }) => u));
await upsert("volunteer_profiles", seed.volunteerProfiles);
await upsert("organisations", seed.organisations);
const incidents = migrated
  ? seed.incidents.map((i) => ({ ...i, is_sos: false, sos_status: null, sos_approximate: false, priority_override: null }))
  : seed.incidents;
await upsert("incidents", incidents);
await upsert("assignments", seed.assignments);
await upsert("resources", seed.resources);
await upsert("resource_allocations", seed.allocations);
await upsert("incident_events", seed.events);

// stored AI analyses stay as they are; only a missing one is restored (from the seed, without calling the AI)
{
  const { data, error } = await sb.from("incident_ai_analysis").select("incident_id");
  check("incident_ai_analysis", error);
  const have = new Set((data ?? []).map((r) => String(r.incident_id)));
  const missing = seed.analyses.filter((a) => !have.has(a.incident_id));
  if (missing.length) await upsert("incident_ai_analysis", missing);
  else ok("kept the stored AI analyses (no AI calls)");
}

// room ids: keep the ones already stored (they point at existing Nexconn groups); add a seeded one only if its row is missing
{
  const { data, error } = await sb.from("incident_channels").select("incident_id").in("incident_id", seedIncidentIds);
  check("incident_channels", error);
  const have = new Set((data ?? []).map((r) => String(r.incident_id)));
  const missing = seed.channels.filter((c) => !have.has(c.incident_id)).map((c) => (migrated ? { ...c, kind: "operations" } : c));
  if (missing.length) { const { error: e } = await sb.from("incident_channels").insert(missing); check("incident_channels", e); }
  ok(`kept ${have.size} stored room id(s)${missing.length ? `, added ${missing.length}` : ""}`);
}

// 5. Nexconn: reuse the existing rooms and the Volunteer Hub (re-checks members; creates nothing that already exists)
if (!config.mockChat) {
  try {
    const { restoreRooms, ensureVolunteerHub } = await import("../src/services/rooms");
    await restoreRooms();
    await ensureVolunteerHub();
    ok("Nexconn rooms and the Volunteer Hub re-checked (existing ones reused)");
  } catch (e) {
    warn(`Nexconn check skipped: ${(e as Error).message}`);
  }
}
console.log("\nDemo reset. All data is synthetic. Supabase Auth accounts were not touched.");
