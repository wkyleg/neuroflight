import { useNavigate } from 'react-router';

const sections = [
  {
    icon: 'FLY',
    title: 'How to fly',
    body: 'Use W/S or the arrow keys to pitch, A/D to bank, Shift/Ctrl for throttle, and Space/F/click to fire in Dogfight. Small held inputs are easier than taps: hold, watch the aircraft settle, then release.',
  },
  {
    icon: 'FLOW',
    title: 'Waves and recovery',
    body: 'A scored session starts with readiness, then warmup, three focus waves, recovery breaks, a final recovery, and a debrief. Waves coach performance; recovery coaches breathing and settling. The report compares how you flew in each state.',
  },
  {
    icon: 'CAM',
    title: 'Camera pulse estimates',
    body: 'If you enable the webcam, rPPG estimates pulse trends locally from tiny color changes in the face video. It works best with steady light and low motion. When the signal is weak, the app says so and falls back to behavior-only scoring.',
  },
  {
    icon: 'GUIDE',
    title: 'Focus and calm practice',
    body: 'Focus guidance comes from behavior such as route progress, smoothness, and staying on task. Calm guidance appears during recovery and can include signal confidence or pulse settling when the camera signal is good. Neither meter changes score, aim, damage, or difficulty.',
  },
  {
    icon: 'MUSIC',
    title: 'Adaptive music',
    body: 'The music uses slow generative patterns. Heart-rate estimates can gently pull tempo into a musical range, and recovery phases quiet the texture. The binaural layer is an optional stereo ambience, not a medical effect.',
  },
  {
    icon: 'REPORT',
    title: 'What the debrief means',
    body: 'The debrief is a fitness-style reflection on flight behavior: completion, control, pressure handling, and recovery-window behavior. Low camera coverage is handled gracefully with behavior-based labels and confidence notes.',
  },
];

const sources = [
  {
    title: 'Anguera et al., Nature 2013',
    summary: 'A video-game cognitive-control study showing how adaptive game tasks can train attention-like skills.',
    href: 'https://doi.org/10.1038/nature12486',
  },
  {
    title: 'Lehrer & Gevirtz, Frontiers in Psychology 2014',
    summary: 'A peer-reviewed overview of HRV biofeedback and paced-breathing mechanisms.',
    href: 'https://doi.org/10.3389/fpsyg.2014.00756',
  },
  {
    title: 'Webcam rPPG review, arXiv 2020',
    summary: 'A technical review of camera-based pulse estimation and its limitations.',
    href: 'https://arxiv.org/abs/2012.15846',
  },
  {
    title: 'Verkruysse et al., Optics Express 2008',
    summary: 'A foundational remote photoplethysmography paper using ambient light and ordinary cameras.',
    href: 'https://doi.org/10.1364/OE.16.021434',
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

      <section className="relative z-10 mx-auto w-[min(1120px,calc(100vw-36px))] py-28">
        <div className="max-w-4xl">
          <p className="menu-card-kicker">How it works</p>
          <h1
            className="mt-3 text-4xl font-black leading-tight md:text-5xl"
            style={{ color: 'var(--color-accent-gold)' }}
          >
            Flight practice for focus waves and calm recovery
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8" style={{ color: 'rgba(240,236,224,0.78)' }}>
            NeuroFlight is a browser flight game. It uses behavior-first scoring and optional webcam pulse estimates to
            make the session feel responsive. It is not a medical device, diagnostic tool, treatment, or claim about
            your health.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <article
              key={section.title}
              className="premium-glass rounded-lg border p-6"
              style={{ borderColor: 'rgba(255,255,255,0.13)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-12 shrink-0 place-items-center rounded-lg border text-[10px] font-black"
                  style={{ borderColor: 'rgba(94,234,212,0.28)', color: '#5eead4' }}
                >
                  {section.icon}
                </div>
                <h2 className="text-lg font-black" style={{ color: '#fff0c2' }}>
                  {section.title}
                </h2>
              </div>
              <p className="mt-4 text-sm leading-7" style={{ color: 'rgba(240,236,224,0.74)' }}>
                {section.body}
              </p>
            </article>
          ))}
        </div>

        <section className="premium-glass mt-6 rounded-lg border p-6" style={{ borderColor: 'rgba(255,255,255,0.13)' }}>
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-lg border"
              style={{ borderColor: 'rgba(255,184,107,0.34)', color: '#ffb86b' }}
            >
              REF
            </div>
            <div>
              <p className="menu-card-kicker">Evidence boundary</p>
              <h2 className="text-xl font-black" style={{ color: '#ffb86b' }}>
                Conservative by design
              </h2>
            </div>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7" style={{ color: 'rgba(240,236,224,0.74)' }}>
            The app borrows ideas from digital attention-training research, workload framing, HRV biofeedback, and
            camera rPPG measurement. Those sources support cautious design choices: transparent signal quality,
            behavior-first scoring, no medical claims, and optional physiology used only for presentation and
            reflection.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {sources.map((source) => (
              <a
                key={source.href}
                className="glass-button rounded-lg px-4 py-4 text-left"
                href={source.href}
                target="_blank"
                rel="noreferrer"
              >
                <span className="block text-sm font-black" style={{ color: '#fff0c2' }}>
                  {source.title}
                </span>
                <span className="mt-1 block text-xs leading-5" style={{ color: 'rgba(240,236,224,0.64)' }}>
                  {source.summary}
                </span>
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
