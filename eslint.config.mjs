import eslintConfigInternxt from '@internxt/eslint-config-internxt';

export default [
  {
    ignores: ['dist', 'build'],
  },
  ...eslintConfigInternxt,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off"
    }
  }
];