import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: 'https://sentinelcloud.dmj.one/sitemap.xml',
    host: 'https://sentinelcloud.dmj.one',
  };
}
