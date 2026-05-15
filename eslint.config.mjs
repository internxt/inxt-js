import eslintConfigInternxt from '@internxt/eslint-config-internxt';

export default [
  {
    ignores: ['build'],
  },
  ...eslintConfigInternxt,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      'no-undef': 'off',
    },
  },
];
