export function generateRangeRegex(min: number, max: number): string {
    if (min > max) throw new Error("Min must be less than or equal to Max");

    if (min <= 0 && max <= 0) {
        return `^(?!.*).*$`; // A regex that never matches anything
    }

    // Ensure min is at least 1 to prevent 0 from being included
    const validMin = Math.max(min, 1);
    const range = Array.from({ length: max - validMin + 1 }, (_, i) => i + validMin);
    
    return `^(${range.join("|")})$`;
}