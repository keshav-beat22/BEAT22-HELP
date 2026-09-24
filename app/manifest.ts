import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/**
 * Web app manifest. Gives the help centre a proper name and icons when it is
 * saved to a home screen, and is one of the signals Lighthouse checks.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: site.name,
    description: site.description,
    start_url: '/',
    display: 'browser',
    background_color: '#1e1e1e',
    theme_color: '#1e1e1e',
    icons: [
      { src: site.favicon, sizes: '192x192', type: 'image/png' },
      { src: site.appleIcon, sizes: '180x180', type: 'image/png' },
    ],
  };
}
