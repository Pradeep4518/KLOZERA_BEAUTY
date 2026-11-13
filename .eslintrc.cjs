module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  env: { browser: true, es2022: true, node: true },
  rules: { '@typescript-eslint/no-explicit-any': 'off' },
  overrides: [
    // The Beauty UI modules are the original KLOZEVA_Beauty_Intelligence_Platform code, kept unchanged.
    { files: ['*.js', '*.jsx'], rules: { '@typescript-eslint/no-unused-vars': 'warn' } },
  ],
  ignorePatterns: ['dist', 'supabase/functions'],
}
