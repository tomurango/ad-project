module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "max-len": "off",
    "no-unused-vars": "off",
    "no-case-declarations": "off",
    "padded-blocks": "off",
    "comma-dangle": "off",
    "eol-last": "off",
    "no-trailing-spaces": "off",
    "valid-jsdoc": "off",
    "require-jsdoc": "off",
    "indent": "off",
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
