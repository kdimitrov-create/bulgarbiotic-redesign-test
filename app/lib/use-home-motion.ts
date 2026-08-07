import {useEffect} from 'react';

/**
 * The homepage's page-wide motion: scroll progress bar, reveal-on-scroll and
 * the magnetic buttons.
 *
 * It lives here because the homepage is no longer the only route that renders
 * those sections — a composition built in the panel can be previewed at its own
 * address before it is switched in, and without this hook everything below the
 * fold stayed at opacity 0 and read as "the sections are missing".
 */
export function useHomeMotion(dep?: unknown) {
  useEffect(() => {
    const prog = document.getElementById('bb-page-progress');
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = (window.scrollY / Math.max(docH, 1)) * 100;
      if (prog) prog.style.width = pct + '%';
    };
    window.addEventListener('scroll', onScroll, {passive: true});
    onScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      {threshold: 0.12},
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    const cleanups: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>('.magnetic, .btn-primary, .bb-cta-btn').forEach((btn) => {
      const onMove = (e: MouseEvent) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
      };
      const onLeave = () => {
        btn.style.transform = '';
      };
      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        btn.removeEventListener('mousemove', onMove);
        btn.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
      cleanups.forEach((c) => c());
    };
  }, [dep]);
}
