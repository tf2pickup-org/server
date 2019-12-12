import { query } from 'gamedig';

export async function isServerOnline(address: string, port: number): Promise<boolean> {
  try {
    await query({ type: 'tf2', host: address, port });
    return true;
  } catch (error) {
    return false;
  }
}
