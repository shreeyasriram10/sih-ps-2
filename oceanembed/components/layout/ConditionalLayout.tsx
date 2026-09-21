'use client';
import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import Footer from './Footer';

// Pages that should NOT have the sidebar layout (full-screen pages)
const FULL_SCREEN_ROUTES = ['/login', '/'];

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullScreen = FULL_SCREEN_ROUTES.includes(pathname);

  if (isFullScreen) {
    // Login/entry pages: full screen, no sidebar, no footer
    return <>{children}</>;
  }

  return (
    <div className="layout-shell">
      <Navigation />
      <div className="main-content">
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
