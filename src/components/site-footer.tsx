import { appVersion } from "@/lib/app-version";

type SiteFooterProps = {
  copyright: string;
  links: Array<{
    label: string;
    href: string;
  }>;
};

export function SiteFooter({
  copyright,
  links,
}: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="copyright">
          {copyright}
          <br />
          {appVersion}
        </div>
        <div className="footer-links">
          {links.map((link) => (
            <a
              key={`${link.label}-${link.href}`}
              href={link.href}
              target="_blank"
              rel="noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
