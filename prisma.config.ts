import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Load .env.local so DATABASE_URL is available to Prisma CLI
loadEnvConfig(path.resolve(__dirname));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
