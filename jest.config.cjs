/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/js-with-babel-esm',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.js',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'es2023',
          module: 'esnext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          allowJs: true,
          esModuleInterop: true,
          skipLibCheck: true,
          verbatimModuleSyntax: false,
          types: ['jest', 'node'],
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@bpmn-io|min-dash|diagram-js|feelin|feelers|ids|classnames)/)',
  ],
};
