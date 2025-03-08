import globals from 'globals';
import react from 'eslint-plugin-react';
import ts from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  react.configs.flat.recommended,
  ...ts.configs.recommended,
  { files: ['**/*.{mjs,cjs,ts,jsx,tsx}'] },
  { ignores: ['**/*.js'] },
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    settings: {
      react: {
        version: '16.8',
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
