import {useEffect} from 'react';
import {ProbioticFinderForm} from './home/ProbioticFinder';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Reusable modal that hosts the <ProbioticFinderForm /> quiz.
 *
 * Owns: backdrop, panel chrome, ESC/click-outside close, body scroll lock.
 * Used by:
 *   • <ProbioticFinderFAB />  — global floating button (PageLayout)
 *   • Listing-page sidebar    — quiz CTA card in /products + /collections
 *
 * Each caller owns its own `open` state — modal is just presentational.
 */
export function ProbioticFinderModal({open, onClose}: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="bb-finder-modal" role="dialog" aria-modal="true" aria-label="Намери своя пробиотик">
      <button
        type="button"
        className="bb-finder-modal-backdrop"
        onClick={onClose}
        aria-label="Затвори"
      />
      <div className="bb-finder-modal-shell">
        <div className="bb-finder-modal-head">
          <div>
            <span className="bb-finder-modal-tag">30 секунди · 2 въпроса</span>
            <h2 className="bb-finder-modal-title">
              Намери своя <span className="accent">пробиотик</span>
            </h2>
          </div>
          <button
            type="button"
            className="bb-finder-modal-close"
            onClick={onClose}
            aria-label="Затвори"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <ProbioticFinderForm onPick={onClose} />
      </div>
    </div>
  );
}
