/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://intelliforge-complianceforge-api.fly.dev',
  },
}

export default nextConfig
