/**
 * Converts dotted-decimal IP to a 32-bit unsigned integer
 */
function ipToUint32(ip: string): number {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255)) {
        throw new Error(`Invalid IP address: ${ip}`);
    }
    return (
        (parts[0] << 24) +
        (parts[1] << 16) +
        (parts[2] << 8) +
        parts[3]
    ) >>> 0; // ensure unsigned
}

/**
 * Return an IP [start, end] inclusive for a given CIDR (e.g. "10.0.0.0/8")
 */
function cidrRange(cidr: string): [number, number] {
    const [ip, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);

    if (prefix < 0 || prefix > 32) {
        throw new Error(`Invalid prefix in CIDR: ${cidr}`);
    }

    const ipNum = ipToUint32(ip);
    // Construct the netmask
    const mask = prefix === 0 ? 0 : 0xffffffff << (32 - prefix);
    // Network address (lower bound) is ipNum & mask
    const network = ipNum & mask;
    // Broadcast (upper bound) is network + (2^(32 - prefix) - 1)
    const numHosts = 2 ** (32 - prefix);
    const start = network >>> 0;        // lower bound
    const end = (network + numHosts - 1) >>> 0; // upper bound
    return [start, end];
}

/**
 * Builds a small regex that matches any decimal number from `start` to `end` (each between 0 and 255).
 *
 * For big ranges, this naive approach simply enumerates all possibilities
 * (e.g., "200|201|202|...|255") which can get big but is guaranteed correct.
 *
 * For the *full* 0..255 range, we substitute a more concise pattern:
 *   (25[0-5]|2[0-4]\d|[01]?\d?\d)
 */
function buildOctetRegex(start: number, end: number): string {
    if (start === end) {
        // Single fixed value
        return `${start}`;
    }
    if (start === 0 && end === 255) {
        // The classic "match any valid octet" pattern
        return '(25[0-5]|2[0-4]\\d|[01]?\\d?\\d)';
    }

    // Naive enumeration of all values in [start..end]
    // This can produce large patterns but is straightforward
    const parts: string[] = [];
    for (let i = start; i <= end; i++) {
        parts.push(String(i));
    }
    return `(?:${parts.join('|')})`;
}

/**
 * Creates a single regex that matches ALL IPs from `start32` to `end32` inclusive.
 *
 * - We slice the range into octets: [startIP[0]..endIP[0]], etc.
 * - If those ranges are the same across the entire range, that octet is a single fixed value.
 * - If it’s a full 0–255 span, we use the classic 0–255 sub-regex.
 * - Otherwise, enumerate all possible values in that octet range.
 *
 * NOTE: This simplistic approach DOES handle partial octet boundaries:
 *       e.g., if start=10.0.0.0 and end=10.255.255.255, octet #1 is always 10,
 *             and octets #2..#4 are 0..255 each. 
 *
 *       For a narrower range like 10.2.3.4..10.2.3.7, the last octet
 *       enumerates "4|5|6|7"; the others remain fixed. If you have
 *       differences across multiple octets, each octet simply spans
 *       from the min in that octet to the max in that octet over the
 *       entire IP range. This *is* correct for the inclusive bounding
 *       box but *does* allow combos that might exceed the exact start–end
 *       boundary in the higher octets. 
 * 
 *       Example:
 *          Range: 10.2.3.4..10.2.5.7
 *          2nd octet min = 2, max = 2 (so it's always 2)
 *          3rd octet min = 3, max = 5
 *          4th octet min = 4, max = 7
 *          This pattern would match 10.2.(3|4|5).(4|5|6|7), which DOES allow 10.2.4.99,
 *          which is outside of 10.2.5.7 if you consider a strict linear range.
 *
 * In other words, this approach matches the entire "bounding box" from
 * min-of-each-octet to max-of-each-octet. It is what your original code
 * effectively did with `[start–end]` character classes but now done
 * properly for decimal digits. 
 *
 * If you truly need a strict start–end *lexicographical* range, you must
 * do more advanced splitting. But for “CIDR-based bounding” (like /8), the
 * bounding box is exactly correct.
 */
function rangeToRegex(start32: number, end32: number): string {
    // Extract the 4-octet arrays for start and end
    const startOctets = [
        (start32 >>> 24) & 0xff,
        (start32 >>> 16) & 0xff,
        (start32 >>> 8) & 0xff,
        start32 & 0xff,
    ];
    const endOctets = [
        (end32 >>> 24) & 0xff,
        (end32 >>> 16) & 0xff,
        (end32 >>> 8) & 0xff,
        end32 & 0xff,
    ];

    // For each octet, find min & max for that octet within the entire range
    // (This will create a bounding rectangle in the 4D space of octets.)
    const octetPatterns = [0, 1, 2, 3].map((i) => {
        const minVal = Math.min(startOctets[i], endOctets[i]);
        const maxVal = Math.max(startOctets[i], endOctets[i]);
        return buildOctetRegex(minVal, maxVal);
    });

    // Join with dots, anchor
    return '^' + octetPatterns.join('\\.') + '$';
}

/**
 * Main function that, given a CIDR like "10.0.0.0/8", returns
 * a single regex string matching all IPs within that CIDR.
 */
export function cidrToRegex(cidr: string): string {
    const [start, end] = cidrRange(cidr);
    return rangeToRegex(start, end);
}