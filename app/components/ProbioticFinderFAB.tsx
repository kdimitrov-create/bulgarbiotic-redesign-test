import {useEffect, useState} from 'react';
import {FINDER_OPEN_EVENT, ProbioticFinderModal} from './ProbioticFinderModal';

/**
 * Floating Action Button that opens the Probiotic Finder quiz in a modal —
 * visible on every page so visitors can re-run the wizard from anywhere.
 *
 * Lives in PageLayout.tsx (mounted once globally). The actual modal
 * presentation is in <ProbioticFinderModal /> so other surfaces (listing
 * sidebar etc.) can share the same UI.
 */
export function ProbioticFinderFAB() {
  const [open, setOpen] = useState(false);

  // Модалът е един за целия сайт, затова отварянето му е събитие: менюто и
  // всяка друга повърхност само го вдигат, без да носят свое копие.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(FINDER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(FINDER_OPEN_EVENT, onOpen);
  }, []);

  return (
    <>
      <button
        type="button"
        className="bb-finder-fab"
        onClick={() => setOpen(true)}
        aria-label="Намери своя пробиотик за 30 секунди"
      >
        <span className="bb-finder-fab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M15.5 15.5l4 4" />
            <path d="M11 8v3l2 1.2" opacity="0.6" />
          </svg>
        </span>
        <span className="bb-finder-fab-label">
          <span className="bb-finder-fab-line1">Намери своя</span>
          <span className="bb-finder-fab-line2">пробиотик</span>
        </span>
        <span className="bb-finder-fab-pulse" aria-hidden="true" />
      </button>

      <ProbioticFinderModal open={open} onClose={() => setOpen(false)} />

      <style>{`
        /* ─── FAB (floating button) ─── */
        .bb-finder-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 90;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px 12px 14px;
          background: var(--color-ink);
          color: var(--color-cream-1);
          border: 0;
          border-radius: 999px;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.2px;
          cursor: pointer;
          box-shadow: 0 18px 36px -10px rgba(10, 37, 64, 0.4), 0 6px 14px -4px rgba(10, 37, 64, 0.2);
          transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.18s;
        }
        .bb-finder-fab:hover {
          background: var(--color-brand-pink);
          transform: translateY(-2px) scale(1.02);
        }
        .bb-finder-fab-icon {
          width: 32px; height: 32px;
          border-radius: 999px;
          background: var(--color-brand-pink);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.18s;
        }
        .bb-finder-fab:hover .bb-finder-fab-icon {
          background: white;
          color: var(--color-brand-pink);
        }
        .bb-finder-fab-icon svg { width: 18px; height: 18px; }
        .bb-finder-fab-label {
          display: inline-flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .bb-finder-fab-line1 {
          font-size: 10.5px;
          font-weight: 600;
          opacity: 0.72;
          letter-spacing: 0.3px;
        }
        .bb-finder-fab-line2 {
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.1px;
        }
        .bb-finder-fab-pulse {
          position: absolute;
          inset: -3px;
          border-radius: 999px;
          border: 2px solid var(--color-brand-pink);
          opacity: 0;
          animation: bb-fab-pulse 2.4s ease-out infinite;
          pointer-events: none;
        }
        @keyframes bb-fab-pulse {
          0%   { opacity: 0.45; transform: scale(0.96); }
          70%  { opacity: 0;    transform: scale(1.18); }
          100% { opacity: 0;    transform: scale(1.18); }
        }
        @media (max-width: 720px) {
          /* Default mobile FAB position. App-wide CSS lifts it to bottom:100px
             when MobileStickyCart is visible (body.bb-pdp-sticky-active). */
          .bb-finder-fab {
            bottom: 16px; right: 16px;
            padding: 10px 16px 10px 12px;
          }
          .bb-finder-fab-label { display: none; }
          .bb-finder-fab-icon { width: 28px; height: 28px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bb-finder-fab-pulse { animation: none; display: none; }
        }

        /* ─── Modal ─── */
        .bb-finder-modal {
          position: fixed; inset: 0;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 18px;
          animation: bb-finder-modal-fade 0.18s ease-out;
        }
        @keyframes bb-finder-modal-fade {
          from { opacity: 0; } to { opacity: 1; }
        }
        .bb-finder-modal-backdrop {
          position: absolute; inset: 0;
          background: rgba(10, 37, 64, 0.55);
          backdrop-filter: blur(8px) saturate(160%);
          -webkit-backdrop-filter: blur(8px) saturate(160%);
          border: 0; padding: 0; cursor: pointer;
        }
        .bb-finder-modal-shell {
          position: relative;
          width: min(620px, calc(100vw - 32px));
          max-height: calc(100vh - 64px);
          overflow-y: auto;
          background: var(--color-cream-1);
          border-radius: 22px;
          box-shadow: 0 36px 80px -12px rgba(10, 37, 64, 0.4), 0 12px 24px -8px rgba(10, 37, 64, 0.2);
          padding: 28px 28px 32px;
          animation: bb-finder-modal-pop 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        @keyframes bb-finder-modal-pop {
          from { transform: translateY(-12px) scale(0.985); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @media (max-width: 540px) {
          .bb-finder-modal-shell { padding: 22px 18px 24px; border-radius: 18px; }
        }
        .bb-finder-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 22px;
        }
        .bb-finder-modal-tag {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: var(--color-brand-pink);
          margin-bottom: 6px;
        }
        .bb-finder-modal-title {
          font-size: clamp(22px, 3vw, 28px);
          font-weight: 800;
          letter-spacing: -0.6px;
          line-height: 1.15;
          color: var(--color-ink);
          margin: 0;
        }
        .bb-finder-modal-title .accent {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 400;
          color: var(--color-brand-pink);
        }
        .bb-finder-modal-close {
          width: 36px; height: 36px;
          border-radius: 999px;
          background: white;
          border: 1px solid rgba(10, 37, 64, 0.1);
          color: var(--color-ink);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.18s;
          flex-shrink: 0;
        }
        .bb-finder-modal-close:hover {
          background: var(--color-ink);
          color: var(--color-cream-1);
          border-color: var(--color-ink);
        }
        .bb-finder-modal-close svg { width: 14px; height: 14px; }

        /* Override panel styles inside the modal — already has its own
           padding via .bb-finder-modal-shell, so panel is flat. */
        .bb-finder-modal-shell .bb-finder-panel {
          background: transparent;
          padding: 0;
          box-shadow: none;
          min-height: 0;
        }
      `}</style>
    </>
  );
}
