import { generate } from 'generate-password';

const setup = async () => {
  // Use temporary random database for e2e tests - it's going to be destroyed in teardown.ts
  const randomSuffix = generate({ length: 6 });
  const prefix = process.env.MONGODB_DB ?? 'tf2pickuppl-e2e';
  process.env.MONGODB_DB = `${prefix}-${randomSuffix}`;
  console.log(`Using ${process.env.MONGODB_DB} as a test database`);
};

export default setup;
