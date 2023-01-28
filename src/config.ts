import * as dotenv from 'dotenv';
import fs from 'fs';

export const loadConfig = () => {
  const configPaths = ['.env', '.env.local'];
  configPaths.forEach((path) => {
    if (fs.existsSync(path)) {
      dotenv.config({ path });
    }
  });
  loadServiceAccount();
};

export const loadServiceAccount = () => {
  const path = 'serviceAccountKey.json';
  if (!fs.existsSync(path)) {
    return;
  }
  process.env.FIREBASE_SERVICE_ACCOUNT = fs.readFileSync(path, 'utf8');
};
