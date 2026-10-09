import { Newsreader } from "next/font/google";
import { Toaster } from "sonner";
import { APP_NAME, STORAGE_KEY } from "@/lib/config";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  fallback: ["Georgia", "Cambria", "Times New Roman", "Times", "serif"],
  display: "swap",
});

export const metadata = {
  title: APP_NAME,
  description: "A minimal, personal bookmark board",
};

export default function RootLayout({ children }) {
  const themeInitScript = `
    (function() {
      try {
        var raw = localStorage.getItem("${STORAGE_KEY}");
        var theme = "system";
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && parsed.settings && parsed.settings.theme) {
            theme = parsed.settings.theme;
          }
        }
        var isDark = false;
        if (theme === "dark") {
          isDark = true;
        } else if (theme === "light") {
          isDark = false;
        } else {
          isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        if (isDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning className={newsreader.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="min-h-screen bg-bg text-text antialiased">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--surface-border)",
              fontFamily: "var(--font-newsreader), Georgia, Cambria, 'Times New Roman', Times, serif",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            },
            className: "keepsake-toast",
          }}
        />
      </body>
    </html>
  );
}
