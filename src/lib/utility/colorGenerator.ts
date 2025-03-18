import crypto from 'crypto';

// Define the color set once, outside the function
const colors = [
    'pink-400',
    'yellow-400',
    'lime-400',
    'teal-400',
    'blue-400',
    'purple-400',
    'orange-400',
    'red-400',
    'green-400',
    'cyan-400',
    'amber-400',
    'emerald-400',
    'fuchsia-400',
    'rose-400',
    'sky-400',
    'violet-400',
    'indigo-400'
];

// Map to keep track of assigned colors
const colorMap = new Map();

function generateHash(input: string): number {
    return parseInt(crypto.createHash('md5').update(input).digest('hex').slice(0, 8), 16);
}

export function getColorFromString(symbol: string) {
    if (colorMap.has(symbol)) {
        return colorMap.get(symbol);
    }

    // If there are available colors, assign the next one without duplication
    if (colorMap.size < colors.length) {
        const color = colors[colorMap.size];
        colorMap.set(symbol, color);
        return color;
    }

    // Use consistent hashing
    const hash = generateHash(symbol);
    const color = colors[hash % colors.length];
    colorMap.set(symbol, color);
    return color;
}