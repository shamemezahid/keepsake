import { Newsreader } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { APP_NAME, STORAGE_KEY } from '@/lib/config';

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const metadata = {
  title: APP_NAME,
  description: 'Your personal bookmark board. Save and organize your favorite links.',
};

// Inline script to set theme before paint (prevents flash)
const themeScript = `
(function() {
  try {
    var raw = localStorage.getItem('${STORAGE_KEY}');
    var theme = 'system';
    if (raw) {
      var data = JSON.parse(raw);
      if (data && data.settings && data.settings.theme) {
        theme = data.settings.theme;
      }
    }
    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={newsreader.variable}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        style={{
          fontFamily: "var(--font-newsreader), 'Georgia', 'Times New Roman', serif",
          backgroundColor: 'var(--bg)',
          color: 'var(--text)',
          minHeight: '100vh',
        }}
      >
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--surface-border)',
              fontFamily: "var(--font-newsreader), 'Georgia', 'Times New Roman', serif",
            },
          }}
        />
      </body>
    </html>
  );
}
