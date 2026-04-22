import PocketBase from 'pocketbase';

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';

if (!pocketbaseUrl) {
  console.warn('PocketBase URL not configured. Using local-only mode.');
}

export const pocketbase = new PocketBase(pocketbaseUrl);

export function isPocketBaseConfigured(): boolean {
  return !!pocketbaseUrl;
}

export default pocketbase;
