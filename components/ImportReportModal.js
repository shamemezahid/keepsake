'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export default function ImportReportModal({ open, onClose, report }) {
  if (!report) return null;

  const title = report.success ? 'Import complete' : 'Import failed';

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
          aria-describedby="import-report-desc"
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
              {title}
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

          <div id="import-report-desc">
            {!report.success ? (
              <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-subtle)' }}>
                {report.error}
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <StatRow label="Bookmarks added" value={report.added} />
                  <StatRow label="Duplicates skipped" value={report.duplicates} />
                  <StatRow label="Invalid entries skipped" value={report.invalid} />
                  <StatRow label="Containers created" value={report.containersCreated} />
                  <StatRow label="Containers merged into" value={report.containersMerged} />
                </div>

                {report.skippedItems && report.skippedItems.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 500, color: 'var(--text-subtle)' }}>
                      Skipped items:
                    </p>
                    <div
                      style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid var(--surface-border)',
                        borderRadius: '6px',
                        padding: '8px',
                      }}
                    >
                      {report.skippedItems.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '6px 4px',
                            borderBottom: i < report.skippedItems.length - 1 ? '1px solid var(--surface-border)' : 'none',
                          }}
                        >
                          <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
                            {item.title || '(no title)'}
                          </div>
                          {item.url && (
                            <div style={{ fontSize: '12px', color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.url}
                            </div>
                          )}
                          <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '2px' }}>
                            Reason: {item.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
      <span style={{ color: 'var(--text-subtle)' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
