'use client';
import { useState } from 'react';
import { Globe } from 'lucide-react';
import { getFaviconUrl, getHostname } from '@/lib/url';
import { GripVertical, Ellipsis } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function BookmarkCard({
  bookmark,
  containerId,
  onEdit,
  onDelete,
  isDragging = false,
  isOverlay = false,
}) {
  const [faviconError, setFaviconError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `b_${bookmark.id}`,
    data: { type: 'bookmark', bookmarkId: bookmark.id, containerId },
  });

  const style = isOverlay ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const hostname = getHostname(bookmark.url);
  const faviconUrl = getFaviconUrl(bookmark.url);
  const subtitle = bookmark.description?.trim() || hostname;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className="group relative rounded-lg"
    >
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: isOverlay ? 'var(--hover)' : 'transparent',
          transition: 'background 150ms',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
        className="hover:[background:var(--hover)]"
      >
        {/* Drag handle / favicon */}
        <button
          {...(isOverlay ? {} : listeners)}
          {...(isOverlay ? {} : attributes)}
          aria-label={`Drag to reorder ${bookmark.title}`}
          style={{
            width: '20px',
            height: '20px',
            minWidth: '20px',
            border: 'none',
            background: 'transparent',
            cursor: isSortableDragging ? 'grabbing' : 'grab',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '3px',
            touchAction: 'none',
            position: 'relative',
            zIndex: 10,
            flexShrink: 0,
            marginTop: '1px',
          }}
          className="favicon-btn"
        >
          {/* Favicon (hidden on hover, shown by default) */}
          <span
            className="favicon-img"
            style={{
              position: 'absolute',
              transition: 'opacity 120ms',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {faviconError ? (
              <Globe size={16} strokeWidth={1} style={{ color: 'var(--text-faint)' }} />
            ) : (
              <img
                src={faviconUrl}
                alt=""
                width={16}
                height={16}
                style={{ borderRadius: '2px', display: 'block' }}
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setFaviconError(true)}
              />
            )}
          </span>
          {/* Grip (shown on hover) */}
          <span
            className="grip-icon"
            style={{
              position: 'absolute',
              opacity: 0,
              transition: 'opacity 120ms',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GripVertical size={16} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
          </span>
        </button>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text)',
              textDecoration: 'none',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            className="stretched-link"
          >
            {bookmark.title}
          </a>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--text-subtle)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Card menu */}
        <div style={{ position: 'relative', zIndex: 10, flexShrink: 0, marginTop: '1px' }}>
          <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenu.Trigger asChild>
              <button
                aria-label="Bookmark options"
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  color: 'var(--text-faint)',
                  opacity: 0,
                  transition: 'opacity 120ms',
                }}
                className="card-menu-btn"
              >
                <Ellipsis size={16} strokeWidth={1.5} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '8px',
                  padding: '4px',
                  minWidth: '140px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  zIndex: 100,
                }}
              >
                <DropdownMenu.Item
                  onSelect={onEdit}
                  style={menuItemStyle}
                  className="menu-item"
                >
                  Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={onDelete}
                  style={menuItemStyle}
                  className="menu-item"
                >
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <style>{`
        .group:hover .favicon-img,
        .group:focus-within .favicon-img {
          opacity: 0;
        }
        .group:hover .grip-icon,
        .group:focus-within .grip-icon {
          opacity: 1;
        }
        .group:hover .card-menu-btn,
        .group:focus-within .card-menu-btn {
          opacity: 1 !important;
        }
        @media (hover: none) {
          .favicon-img { opacity: 1 !important; }
          .grip-icon { opacity: 0 !important; }
          .card-menu-btn { opacity: 1 !important; }
        }
        .stretched-link::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: 8px;
        }
        .menu-item {
          padding: 7px 10px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text);
          outline: none;
          user-select: none;
        }
        .menu-item:hover,
        .menu-item[data-highlighted] {
          background: var(--hover);
        }
      `}</style>
    </div>
  );
}

// Overlay version (no sortable hook, just visual)
export function BookmarkCardOverlay({ bookmark }) {
  const [faviconError, setFaviconError] = useState(false);
  const hostname = getHostname(bookmark.url);
  const faviconUrl = getFaviconUrl(bookmark.url);
  const subtitle = bookmark.description?.trim() || hostname;

  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: '8px',
        background: 'var(--hover)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        cursor: 'grabbing',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
        <GripVertical size={16} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {bookmark.title}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-subtle)', marginTop: '1px' }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}
