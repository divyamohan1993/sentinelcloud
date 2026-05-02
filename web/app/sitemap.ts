import type { MetadataRoute } from 'next';
import { SCENARIOS } from '@/lib/scenarios';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://sentinelcloud.dmj.one';
  const lastModified = new Date();
  const routes = ['/', '/demo', '/console', '/architecture', '/research', '/docs'];
  const scenarioRoutes = SCENARIOS.map(s => `/demo/${s.id}`);
  return [...routes, ...scenarioRoutes].map(path => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1.0 : 0.7,
  }));
}
