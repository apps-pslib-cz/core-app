import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Native flat-config imports instead of FlatCompat().extends() - the
// FlatCompat legacy bridge crashes ("Converting circular structure to
// JSON") with current eslint-plugin-react, whose flat configs now embed a
// self-reference; eslint-config-next already ships flat-config-native
// entry points that avoid that bridge entirely.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
