export default function manifest() {
  return {
    name: 'Unlimited Router - AI Gateway',
    short_name: 'URouter',
    description: 'Route every AI provider through one unlimited endpoint. Multi-account, observable, yours.',
    start_url: '/',
    display: 'standalone',
    background_color: '#101218',
    theme_color: '#101218',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
