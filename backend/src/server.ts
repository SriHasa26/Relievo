import { createApp } from "./app";
import { config } from "./config";
import { seedMockRooms } from "./services/rooms";

if (config.mockMode) await seedMockRooms(); // recreate in-memory groups for seeded incidents

createApp().listen(config.port, () => {
  console.log(`ReliefRelay API on http://localhost:${config.port}  (MOCK_MODE=${config.mockMode})`);
  if (config.mockMode) console.log("MOCK MODE: fake AI, in-memory chat and data. Set MOCK_MODE=false for the demo.");
});
