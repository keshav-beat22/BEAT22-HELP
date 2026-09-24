'use client';

import { useEffect } from 'react';

/**
 * Upgrades YouTube placeholders inside article bodies.
 *
 * Article HTML is injected with dangerouslySetInnerHTML, so embeds are written
 * in the Markdown as a plain placeholder:
 *
 *   <div class="yt-embed" data-video-id="ABC123" data-title="How to upload"></div>
 *
 * This swaps that for a thumbnail with a play button, and only loads the real
 * YouTube iframe once someone clicks. A bare <iframe> costs roughly a megabyte
 * of third-party JavaScript on every page view whether or not the video is
 * watched, which is the single easiest way to lose the Core Web Vitals scores
 * the rest of the site is tuned for.
 *
 * youtube-nocookie.com is used so no tracking cookie is set until playback.
 */
export default function YouTubeEmbeds() {
  useEffect(() => {
    const nodes =
      document.querySelectorAll<HTMLElement>('.yt-embed[data-video-id]');

    nodes.forEach((node) => {
      // Placeholders are replaced in place; never process one twice.
      if (node.dataset.ytReady === 'true') return;
      node.dataset.ytReady = 'true';

      const id = node.dataset.videoId?.trim();
      if (!id || !/^[\w-]{11}$/.test(id)) {
        // Not a valid YouTube id — leave the placeholder inert rather than
        // rendering a broken player.
        return;
      }

      const title = node.dataset.title?.trim() || 'YouTube video';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'yt-embed-poster';
      button.setAttribute('aria-label', `Play video: ${title}`);

      const thumb = document.createElement('img');
      thumb.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      thumb.alt = '';
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.width = 480;
      thumb.height = 360;

      const play = document.createElement('span');
      play.className = 'yt-embed-play';
      play.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = 'yt-embed-title';
      label.textContent = title;

      button.append(thumb, play, label);

      button.addEventListener('click', () => {
        const frame = document.createElement('iframe');
        frame.src =
          `https://www.youtube-nocookie.com/embed/${id}` +
          '?autoplay=1&rel=0&modestbranding=1';
        frame.title = title;
        frame.allow =
          'accelerometer; autoplay; clipboard-write; encrypted-media; ' +
          'gyroscope; picture-in-picture; web-share';
        frame.allowFullscreen = true;
        frame.setAttribute('loading', 'lazy');
        node.replaceChildren(frame);
      });

      node.replaceChildren(button);
    });
  }, []);

  return null;
}
