module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'next/core-web-vitals'
  ],
  plugins: ['react'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
