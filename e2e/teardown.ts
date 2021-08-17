import { config } from 'dotenv';

const teardown = async () => {
  config();
};

export default teardown;
