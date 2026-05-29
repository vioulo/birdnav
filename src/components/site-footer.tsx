import { appVersion } from "@/lib/app-version";

type SiteFooterProps = {
  copyright: string;
  links: Array<{
    label: string;
    href: string;
  }>;
  meta?: string;
};

export function SiteFooter({
  copyright,
  links,
  meta = "UNIFIED INTERACTION · DUAL THEME",
}: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="copyright">
          {copyright}
          <br />
          {meta} · {appVersion}
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
