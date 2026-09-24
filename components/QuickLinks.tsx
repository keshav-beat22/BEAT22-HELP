import Link from 'next/link';
import { site } from '@/lib/site';

/** The three portrait cards that overlap the hero banner. */
export default function QuickLinks() {
  return (
    <div className="quick-links portrait-cards">
      {site.quickLinks.map((card) => {
        const inner = (
          <>
            <div className="card-overlay" />
            <div className="card-content">
              <h3>{card.title}</h3>
            </div>
          </>
        );
        const style = { backgroundImage: `url('${card.image}')` };

        return card.external ? (
          <a key={card.title} href={card.href} className="card-link" style={style} rel="noopener">
            {inner}
          </a>
        ) : (
          <Link key={card.title} href={card.href} className="card-link" style={style}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
