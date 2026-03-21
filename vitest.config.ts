import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    exclude: [
      "node_modules",
      "tests/e2e",
      "tests/unit/setup.ts",
      "**/*.d.ts",
      "**/*.config.*",
      "**/.*",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Only measure coverage for files that have tests
      include: [
        "lib/utils.ts",
        "lib/validation/schemas.ts",
        "components/ui/button.tsx",
        "components/ui/card.tsx",
        "components/ui/input.tsx",
        "components/ui/badge.tsx",
        "components/shared/progress-bar.tsx",
        "components/shared/stat-card.tsx",
        "components/shared/status-badge.tsx",
      ],
      exclude: ["node_modules", "tests", "**/*.d.ts", "**/*.config.*"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
