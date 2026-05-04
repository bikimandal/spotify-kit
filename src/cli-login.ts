#!/usr/bin/env node
import { login } from "./auth/login";
import { requireOAuthConfigFromEnv } from "./auth/config";

void (async () => {
  const config = requireOAuthConfigFromEnv();
  await login(config);
  console.log(`\nSaved tokens to ${config.tokenPath}\n`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
