import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli/index.ts"],
  format: ["esm"],
  outDir: "dist/cli",
  target: "node18",
  clean: true,
  dts: true,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
