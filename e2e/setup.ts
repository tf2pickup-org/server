import { promises as fs } from 'fs';

const setup = async () => {
  try {
    await fs.unlink('.keystore.e2e-test');
  // eslint-disable-next-line no-empty
  } catch (error) { }
};

export default setup;
