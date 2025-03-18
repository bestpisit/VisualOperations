import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'PIMS',
        short_name: 'PIMS',
        description: 'Pimandek Integrated Management System',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
            {
                src: '/static/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/static/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}