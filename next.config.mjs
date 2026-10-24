/** @type {import('next').NextConfig} */
const nextConfig = {
  // Game tetap satu file HTML mandiri di public/. Next.js menyajikannya di "/".
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/bom-air-rimba.html' }],
    };
  },
  async headers() {
    return [
      {
        source: '/bom-air-rimba.html',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
