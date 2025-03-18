export function parsePrismaJson<T>(json: string | T ): T {
    return typeof json === 'string' ? JSON.parse(json) : json;
}