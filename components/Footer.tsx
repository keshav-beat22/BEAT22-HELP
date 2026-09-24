import Link from 'next/link';
import Image from 'next/image';
import BackToTop from './BackToTop';
import SocialLinks from './SocialLinks';
import { site, footerNav, paymentIcons } from '@/lib/site';

/** Internal paths route through next/link; anything else is a plain anchor. */
function FooterLink({ href, label }: { href: string; label: string }) {
  if (href.startsWith('/')) {
    return <Link href={href}>{label}</Link>;
  }
  const isWhatsApp = href.includes('wa.me');
  return (
    <a
      href={href}
      rel="noopener"
      {...(isWhatsApp ? { target: '_blank' } : {})}
    >
      {label}
    </a>
  );
}

/**
 * Footer chrome:
 *
 *   [logo + Sign Up]  [Company]  [Support]  [Explore]  [payment marks]
 *   -------------------------------------------------------------------
 *                      (c) year, company, mark
 *
 * The link lists and payment marks come from lib/site.ts, so changing them
 * never requires touching this file.
 */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Link
            href="/"
            className="footer-logo"
            aria-label={`${site.name} home`}
          >
            <Image
              src={site.logo.src}
              alt={site.logo.alt}
              width={site.logo.width}
              height={site.logo.height}
              unoptimized
            />
          </Link>
          <a
            className="footer-signup"
            href={site.footer.signUp.href}
            rel="noopener"
            target="_blank"
          >
            {site.footer.signUp.label}
          </a>
          <SocialLinks />
        </div>

        {footerNav.map((column) => (
          <nav
            key={column.heading}
            className="footer-col"
            aria-label={column.heading}
          >
            <h2>{column.heading}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="footer-col footer-payments">
          <h2>We accept following payment systems</h2>
          <ul>
            {paymentIcons.map((icon) => (
              <li key={icon.src}>
                <Image
                  src={icon.src}
                  alt={icon.alt}
                  width={56}
                  height={36}
                  unoptimized
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>
          &copy; {year} {site.footer.company}. {site.footer.copyright}
        </p>
        <Image
          className="footer-mark"
          src={site.logo.src}
          alt=""
          width={site.logo.width}
          height={site.logo.height}
          unoptimized
          aria-hidden="true"
        />
      </div>

      <BackToTop />
    </footer>
  );
}
