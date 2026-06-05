import { defineConfig } from "vitest/config";
import path from "node:path";

const root = process.cwd();

export default defineConfig({
  root,
  test: {
    environment: "jsdom",
    globals: true
  },
  resolve: {
    alias: {
      "@": path.resolve(root)
    }
  }
});
