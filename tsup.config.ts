import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli-login.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
});
