import { createApp } from "./app";
import { config } from "./config";
import { seedMockRooms } from "./services/rooms";

// Make sure the groups for seeded incidents exist (in-memory stub, or real Nexconn). A failure here must not stop the API.
await seedMockRooms().catch((e: Error) => console.warn("Seeded rooms not created:", e.message));

createApp().listen(config.port, () => {
  console.log(`ReliefRelay API on http://localhost:${config.port}  (MOCK_CHAT=${config.mockChat} MOCK_AI=${config.mockAi} MOCK_DB=${config.mockDb})`);
  if (config.mockChat || config.mockAi || config.mockDb) console.log("MOCK flags are on. Set MOCK_CHAT, MOCK_AI and MOCK_DB to false for the demo.");
});
