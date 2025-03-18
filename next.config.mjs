/** @type {import('next').NextConfig} */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: ['@react-pdf/renderer'],
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                pathname: '**'
            }
        ]
    },
    webpack: (config, { isServer }) => {
        config.resolve.fallback = { child_process: false, path: false, fs: false };
        if (isServer) {
            config.plugins.push(
                new CopyWebpackPlugin({
                    patterns: [
                        {
                            from: path.resolve(__dirname, 'src/fonts'),
                            to: path.resolve(__dirname, '.next/server/fonts'),
                        },
                        {
                            from: path.resolve(__dirname, 'src/images'),
                            to: path.resolve(__dirname, '.next/server/images'),
                        }
                    ],
                }),
            );
        }
        return config;
    },
};

export default nextConfig;