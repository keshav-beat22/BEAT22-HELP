import next from 'eslint-config-next';

/** Flat config. eslint-config-next exports the rule array directly. */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts'] },
  ...next,
];

export default config;
