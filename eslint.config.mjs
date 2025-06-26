// eslint.config.mjs
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // Reglas JS por defecto
  tseslint.configs.recommended,
  // Reglas TS strict (opcional)
  tseslint.configs.strictTypeChecked,
  // Plugin prettier
  {
    plugins: { prettier: prettierPlugin },
    rules: { 'prettier/prettier': 'error' },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { project: './tsconfig.json' },
    },
  },
];
