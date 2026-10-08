'use client';
import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { normalizeUrl, normalizeForDupe } from '@/lib/url';
import { generateId } from '@/lib/storage';

export default function BookmarkModal({
  open,
  onClose,
  onSave,
  containers,
  defaultContainerId,
  editBookmark,
  editContainerId,
  findDuplicate,
}) {
  const isEdit = !!editBookmark;

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [containerId, setContainerId] = useState('');
  const [urlError, setUrlError] = useState('');
  const [titleError, setTitleError] = useState('');

  const urlInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (isEdit) {
        setUrl(editBookmark.url || '');
        setTitle(editBookmark.title || '');
        setDescription(editBookmark.description || '');
        setContainerId(editContainerId || containers[0]?.id || '');
      } else {
        setUrl('');
        setTitle('');
        setDescription('');
        setContainerId(defaultContainerId || containers[0]?.id || '');
      }
      setUrlError('');
      setTitleError('');
    }
  }, [open, isEdit, editBookmark, editContainerId, defaultContainerId, containers]);

  function handleSubmit(e) {
    e?.preventDefault();
    let hasError = false;

    // Validate title
    if (!title.trim()) {
      setTitleError('Title is required.');
      hasError = true;
    } else {
      setTitleError('');
    }

    // Validate and normalize URL
    const { url: normalized, error: urlErr } = normalizeUrl(url);
    if (urlErr || !normalized) {
      setUrlError(urlErr || 'Please enter a valid URL.');
      hasError = true;
    } else {
      setUrlError('');
      // Check for duplicates
      const dupe = findDuplicate(normalized, isEdit ? editBookmark.id : null);
      if (dupe) {
        setUrlError(`Already saved in "${dupe.container.title}".`);
        hasError = true;
      }
    }

    if (hasError) return;

    const targetContainerId = containerId || containers[0]?.id;

    if (isEdit) {
      onSave({
        type: 'edit',
        bookmarkId: editBookmark.id,
        fromContainerId: editContainerId,
        toContainerId: targetContainerId,
        updates: {
          url: normalizeUrl(url).url,
          title: title.trim(),
          description: description.trim(),
        },
      });
    } else {
      onSave({
        type: 'add',
        containerId: targetContainerId,
        bookmark: {
          id: generateId(),
          url: normalizeUrl(url).url,
          title: title.trim(),
          description: description.trim(),
          createdAt: new Date().toISOString(),
        },
      });
    }
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit();
    }
  }

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
          aria-describedby={undefined}
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
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        >
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modalIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.97); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
          `}</style>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <Dialog.Title style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
              {isEdit ? 'Edit bookmark' : 'Add bookmark'}
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

          <form onSubmit={handleSubmit} noValidate>
            <Field label="URL" required error={urlError}>
              <input
                ref={urlInputRef}
                id="bm-url"
                type="url"
                autoFocus={!isEdit}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com"
                style={inputStyle(!!urlError)}
              />
            </Field>

            <Field label="Title" required error={titleError}>
              <input
                id="bm-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="My favorite site"
                style={inputStyle(!!titleError)}
              />
            </Field>

            <Field label="Description" error="">
              <input
                id="bm-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Optional description"
                style={inputStyle(false)}
              />
            </Field>

            <Field label="Container" error="">
              <select
                id="bm-container"
                value={containerId}
                onChange={(e) => setContainerId(e.target.value)}
                style={{
                  ...inputStyle(false),
                  cursor: 'pointer',
                }}
              >
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </Field>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={secondaryBtnStyle}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={primaryBtnStyle}
              >
                {isEdit ? 'Save' : 'Add'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label
        htmlFor={children?.props?.id}
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-subtle)',
          marginBottom: '6px',
        }}
      >
        {label}{required && <span style={{ color: 'var(--text-faint)', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#b45309' }}>{error}</p>
      )}
    </div>
  );
}

function inputStyle(hasError) {
  return {
    width: '100%',
    padding: '8px 10px',
    fontSize: '14px',
    background: 'var(--bg)',
    color: 'var(--text)',
    border: `1px solid ${hasError ? '#b45309' : 'var(--surface-border)'}`,
    borderRadius: '6px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };
}

const primaryBtnStyle = {
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 500,
  background: 'var(--text)',
  color: 'var(--bg)',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const secondaryBtnStyle = {
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 500,
  background: 'transparent',
  color: 'var(--text-subtle)',
  border: '1px solid var(--surface-border)',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
