import { createApp } from "./app";
import { config } from "./config";
import { registerAllUsers, restoreRooms } from "./services/rooms";

// MOCK_DB=true: the in-memory seed has rooms, so make sure their groups exist. With Supabase the stored room ids are
// reused as they are (nothing is re-created at start-up).
if (config.mockDb) {
  await restoreRooms().catch((e: Error) => console.warn("Seeded rooms not created:", e.message));
}
// Register every user with Nexconn, so a direct message to someone who never logged in still works.
await registerAllUsers()
  .then(() => console.log("Chat users registered"))
  .catch((e: Error) => console.warn("Chat user registration failed:", e.message));

createApp().listen(config.port, () => {
  console.log(`ReliefRelay API on http://localhost:${config.port}  (MOCK_CHAT=${config.mockChat} MOCK_AI=${config.mockAi} MOCK_DB=${config.mockDb})`);
  if (config.mockChat || config.mockAi || config.mockDb) console.log("MOCK flags are on. Set MOCK_CHAT, MOCK_AI and MOCK_DB to false for the demo.");
});
