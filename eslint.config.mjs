import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts'] },
  {
    files: ['apps/api/src/**/*.ts', 'packages/contracts/src/**/*.ts'],
    languageOptions: { parser: tsParser, parserOptions: { sourceType: 'module', ecmaVersion: 'latest' }, globals: globals.node },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    files: ['apps/web/src/**/*.ts', 'apps/web/src/**/*.vue', 'apps/admin/src/**/*.ts', 'apps/admin/src/**/*.vue', 'packages/ui/src/**/*.ts', 'packages/ui/src/**/*.vue'],
    languageOptions: { parser: vueParser, parserOptions: { parser: tsParser, sourceType: 'module', ecmaVersion: 'latest', extraFileExtensions: ['.vue'] }, globals: globals.browser },
    plugins: { vue: vuePlugin, '@typescript-eslint': tsPlugin },
    rules: {
      ...vuePlugin.configs.essential.rules,
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
]
