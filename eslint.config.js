import js from '@eslint/js';

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { ecmaVersion: 2020, ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
