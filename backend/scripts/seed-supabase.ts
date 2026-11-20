// Seeds a real Supabase project with the same synthetic data the mock store uses.
// Usage: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in backend/.env, run migrations, then:
//   npm run seed:supabase -w backend
// NOTE: written but not yet run against a real project (no Supabase project exists yet).
import { createClient } from "@supabase/supabase-js";
import { config } from "../src/config";
import { buildSeed } from "../src/store/seedData";

async function main() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env first.");
  }
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const seed = buildSeed();

  // 1. Create Auth users. Supabase assigns the ids, so remember old -> new.
  const idMap = new Map<string, string>();
  for (const u of seed.users) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email, password: u.password, email_confirm: true,
    });
    if (error || !data.user) throw new Error(`createUser ${u.email}: ${error?.message}`);
    idMap.set(u.id, data.user.id);
  }
  // 2. Rewrite every seeded id that refers to a user (simple text replace is fine for demo data).
  let json = JSON.stringify(seed);
  for (const [oldId, newId] of idMap) json = json.split(oldId).join(newId);
  const data = JSON.parse(json) as typeof seed;

  const insert = async (table: string, rows: object[]) => {
    const { error } = await sb.from(table).insert(rows);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`seeded ${table}: ${rows.length}`);
  };

  // Passwords never go into the users table.
  await insert("users", data.users.map(({ password: _p, email: _e, ...u }) => u));
  await insert("volunteer_profiles", data.volunteerProfiles);
  await insert("organisations", data.organisations);
  await insert("incidents", data.incidents);
  await insert("incident_ai_analysis", data.analyses);
  await insert("assignments", data.assignments);
  await insert("resources", data.resources);
  await insert("resource_allocations", data.allocations);
  await insert("incident_events", data.events);
  await insert("incident_channels", data.channels);
  console.log(`Done. Demo accounts use password "demo1234". All rows are synthetic.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
