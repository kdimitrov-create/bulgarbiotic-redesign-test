import {Link} from 'react-router';

export function BrandStory() {
  return (
    <section className="bb-brand-story">
      <img className="bb-brand-bg" src="/images/generated-v2/brand-story.png" alt="Bulgarian mountain landscape" />
      <div className="bb-brand-content reveal">
        <div className="section-tag" style={{justifyContent: 'center'}}>Българска традиция</div>
        <h3 className="bb-brand-h3">От киселото мляко<br /><span className="accent">до грижата за микробиома.</span></h3>
        <p className="bb-brand-p">Всичко ценно от българското кисело мляко е събрано в една малка капсула. Същите „добри“ бактерии, с които сме израснали, днес са прецизно подбрани и концентрирани, за да носят полза за червата, имунитета и цялостното усещане за лекота.</p>
        <Link to="/page/about-us" className="btn-primary magnetic">
          Прочети историята
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </Link>
      </div>

      <style>{`
        .bb-brand-story {
          position: relative; min-height: 540px;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
        }
        .bb-brand-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .bb-brand-story::before {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(245, 239, 227, 0.5) 0%, rgba(253, 238, 243, 0.4) 100%);
        }
        .bb-brand-content {
          position: relative; z-index: 2; text-align: center;
          padding: 60px 32px; max-width: 760px;
        }
        .bb-brand-h3 {
          font-size: clamp(36px, 5vw, 60px);
          font-weight: 700; letter-spacing: -1.4px; line-height: 1.05;
          color: var(--color-ink); margin-bottom: 22px;
        }
        .bb-brand-h3 .accent { font-family: var(--font-serif); font-style: italic; font-weight: 400; color: var(--color-brand-pink); }
        .bb-brand-p { font-size: 16px; line-height: 1.8; color: rgba(10, 37, 64, 0.78); max-width: 560px; margin: 0 auto 28px; }
      `}</style>
    </section>
  );
}
