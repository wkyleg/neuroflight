import { useNavigate } from 'react-router';

const sources = [
  {
    label: 'FDA De Novo summary for EndeavorRx / AKL-T01',
    href: 'https://www.accessdata.fda.gov/cdrh_docs/reviews/DEN200026.pdf',
  },
  {
    label: 'NeuroRacer cognitive-control study',
    href: 'https://doi.org/10.1038/nature12486',
  },
  {
    label: 'NASA TLX workload resource',
    href: 'https://humansystems.arc.nasa.gov/groups/TLX/',
  },
  {
    label: 'Lehrer and Gevirtz HRV biofeedback review',
    href: 'https://doi.org/10.3389/fpsyg.2014.00756',
  },
  {
    label: 'Webcam heart-rate and variability estimation limits',
    href: 'https://arxiv.org/abs/2012.15846',
  },
  {
    label: 'FTC Lumosity claim-boundary reference',
    href: 'https://www.ftc.gov/news-events/news/press-releases/2016/01/lumosity-pay-2-million-settle-ftc-deceptive-advertising-charges-its-brain-training-program',
  },
];

const cards = [
  {
    title: 'Game Modes',
    body: 'Zen Flight rewards smooth route gates, Expedition rewards landmarks and beacons, and Dogfight rewards playful rival outcomes. The score is built from behavior: completion, control, safety, and recovery-window flying.',
  },
  {
    title: 'Session Protocol',
    body: 'A scored run moves through readiness, warmup, pressure waves, short recovery windows, and debrief. Recovery windows soften the action so the report can compare pressure and reset periods without changing the rules.',
  },
  {
    title: 'Camera Biofeedback',
    body: 'The webcam can estimate pulse trends locally through rPPG when the signal is usable. It contributes readiness, coverage, optional BPM display, and insight confidence. It does not decide focus, stress, aim assist, damage, difficulty, or score.',
  },
  {
    title: 'Adaptive Music',
    body: 'Heart-rate estimates can nudge the music tempo into a musical range, while composure/load signals shape filter, ambience, weather clarity, and HUD glow. The optional binaural layer is off by default and is only a quiet stereo texture.',
  },
];

export function HowItWorksScreen() {
  const navigate = useNavigate();

  return (
    <main className="neuroflight-menu neuroflight-menu-wizard">
      <div className="neuroflight-menu-bg" />
      <div className="neuroflight-menu-vignette" />

      <header className="menu-topbar premium-glass-strong">
        <button type="button" className="menu-logo" onClick={() => navigate('/')} aria-label="NeuroFlight home">
          NeuroFlight
        </button>
        <div className="menu-topbar-actions">
          <button type="button" onClick={() => navigate('/')} className="glass-button menu-utility-button">
            Fly
          </button>
          <button type="button" onClick={() => navigate('/settings')} className="glass-button menu-utility-button">
            Settings
          </button>
        </div>
      </header>

      <section
        className="relative z-10 mx-auto grid w-[min(1120px,calc(100vw-40px))] gap-5"
        style={{ paddingTop: 126, paddingBottom: 64 }}
      >
        <div className="premium-glass-strong rounded-xl border p-8" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>
          <p className="menu-card-kicker">How it works</p>
          <h1 className="mt-2 text-4xl font-black tracking-wide" style={{ color: 'var(--color-accent-gold)' }}>
            A camera-first flight practice session
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7" style={{ color: 'rgba(240,236,224,0.76)' }}>
            NeuroFlight is a browser flight game for practicing steady performance under pressure and clean recovery
            after pressure. It is not a medical device, diagnostic tool, or treatment.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <article
              key={card.title}
              className="premium-glass rounded-lg border p-6"
              style={{ borderColor: 'rgba(255,255,255,0.13)' }}
            >
              <h2 className="text-xl font-black" style={{ color: '#5eead4' }}>
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.74)' }}>
                {card.body}
              </p>
            </article>
          ))}
        </div>

        <section className="premium-glass rounded-lg border p-6" style={{ borderColor: 'rgba(255,255,255,0.13)' }}>
          <h2 className="text-xl font-black" style={{ color: '#ffb86b' }}>
            Evidence Boundary
          </h2>
          <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(240,236,224,0.74)' }}>
            The design borrows from digital attention-training games, workload research, HRV biofeedback literature, and
            webcam rPPG measurement work. Those sources support a conservative build: behavior-first scoring,
            transparent signal quality, and camera data used only for context and ambience.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {sources.map((source) => (
              <a
                key={source.href}
                className="glass-button rounded-lg px-4 py-3 text-left text-xs font-bold leading-5"
                href={source.href}
                target="_blank"
                rel="noreferrer"
              >
                {source.label}
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
