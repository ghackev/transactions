// eslint.config.mjs
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-plugin-prettier';

export default [
  /* ───────────── Archivos a ignorar ───────────── */
  { ignores: ['dist', 'node_modules', 'coverage'] },

  /* ───────────── Lint JS ───── */
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: { ...globals.es2021, ...globals.node },
    },
  },

  /* ───────────── Lint TypeScript ──────────────── */
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname, // si tu tsconfig está en la raíz
      },
      globals: { ...globals.es2021, ...globals.node },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier, // quítalo si no usas Prettier
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'prettier/prettier': 'error',
    },
  },

  /* ───────────── Overrides para tests ─────────── */
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
    languageOptions: { globals: globals.jest },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];
