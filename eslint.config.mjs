import eslintConfigInternxt from '@internxt/eslint-config-internxt';

export default [
  {
    ignores: ['build'],
  },
  ...eslintConfigInternxt,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'linebreak-style': ['error', 'windows'],
      'no-console': 'off',
    },
  },
];
