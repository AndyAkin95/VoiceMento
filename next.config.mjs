const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
const repo = 'VoiceMento'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isGitHubActions
    ? {
        basePath: `/${repo}`,
        assetPrefix: `/${repo}/`,
      }
    : {}),
}

export default nextConfig
