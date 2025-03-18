import { v5 as uuidv5 } from 'uuid';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';  // Static namespace for deterministic UUIDv5

export function generateUUIDFromName(name: string): string {
    const fullUUID = uuidv5(name, NAMESPACE);  // Deterministic based on project name
    return fullUUID.replace(/-/g, '').slice(0, 5);    // Extract first 5 non-dash characters
}