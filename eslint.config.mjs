import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The React Compiler is not enabled in next.config.ts, so this rule is
    // a static suggestion only. It flags the standard "fetch on dependency
    // change" useEffect pattern we rely on for date-based data fetching.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Old prototype kept for reference only, not part of the Next.js app.
    "legacy-prototype/**",
  ]),
]);

export default eslintConfig;
