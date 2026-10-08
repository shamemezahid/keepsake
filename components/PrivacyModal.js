'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export default function PrivacyModal({ open, onClose }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 50,
            animation: 'fadeIn 150ms ease',
          }}
        />
        <Dialog.Content
          aria-describedby="privacy-desc"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--surface)',
            border: '1px solid var(--surface-border)',
            borderRadius: '12px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            zIndex: 51,
            animation: 'modalIn 150ms ease',
            outline: 'none',
          }}
        >
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modalIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.97); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
          `}</style>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <Dialog.Title style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
              Privacy note
            </Dialog.Title>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: '6px',
                color: 'var(--text-faint)',
              }}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div
            id="privacy-desc"
            style={{ fontSize: '14px', color: 'var(--text-subtle)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <p style={{ margin: 0 }}>
              Your bookmarks stay on this device. They are saved in your browser&apos;s localStorage and are never sent to a server. This app has no backend, no accounts, and no analytics.
            </p>
            <p style={{ margin: 0 }}>
              That also means they won&apos;t follow you to another browser or device, and clearing your browser&apos;s site data will erase them. Use Export JSON to keep a backup.
            </p>
            <p style={{ margin: 0 }}>
              One exception: to show each site&apos;s icon, your browser requests it from DuckDuckGo&apos;s icon service, which receives the domain of each saved site and your IP address. It does not receive page titles, descriptions, or anything else. If an icon can&apos;t be loaded, a generic globe is shown.
            </p>
            <p style={{ margin: 0 }}>
              The font is bundled with the app and loaded from this site.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                background: 'var(--text)',
                color: 'var(--bg)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
