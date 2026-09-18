module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true }
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  },
  overrides: [
    {
      // Context + Provider + companion hook colocated in one file is the
      // standard React pattern for this (and is what the React docs
      // themselves recommend) — the fast-refresh warning doesn't apply.
      files: ['src/services/SimulationContext.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off'
      }
    }
  ]
}
