import { useNavigate } from 'react-router';

const sections = [
  {
    icon: 'FLY',
    title: 'How to fly',
    body: 'W/S (or ↑/↓) pitches the nose up and down. A/D banks and turns. Shift increases throttle; Ctrl reduces it. Hold inputs gently — a small held pitch brings you to a steady climb. In Dogfight, F or click fires. Space boosts. B brakes. Try Tutorial for a step-by-step walkthrough.',
  },
  {
    icon: 'FLOW',
    title: 'Waves and recovery',
    body: 'Each scored session runs a structured protocol: readiness check → warmup → three focus waves → two recovery breaks → final recovery → debrief (~7 minutes). Waves are about performance. Recovery phases are calm intervals — the app plays a breathing pacer and hides any rivals so you can settle before the next wave.',
  },
  {
    icon: 'CAM',
    title: 'Camera pulse estimates',
    body: 'Remote photoplethysmography (rPPG) detects the faint color shift in your face as blood pulses under the skin. The webcam captures this signal; all processing stays in your browser — nothing is sent to a server. Pulse estimates work best with steady front lighting, a still head, and minimal motion. When the signal is weak, the app labels it honestly and switches to behavior-only mode.',
  },
  {
    icon: 'GUIDE',
    title: 'Focus and calm guidance',
    body: 'During waves a Focus meter shows steadiness, route progress, and smoothness — not score. During recovery a Calm meter responds to the breathing pacer and, when camera signal is available, to settling pulse trends. Both meters are guidance only: they never affect your session score, aim, damage, or difficulty.',
  },
  {
    icon: 'MUSIC',
    title: 'Adaptive ambient music',
    body: 'The generative music uses slow-evolving pads and sparse phrases inspired by ambient composers. The tempo gently tracks your rolling heart-rate estimate, keeping the beat musical. Recovery phases quiet the texture. The optional binaural layer adds two detuned tones panned left/right; it is a personal aesthetic choice, not a medical or cognitive claim — best with headphones.',
  },
  {
    icon: 'REPORT',
    title: 'What the debrief means',
    body: 'The debrief scores four behavior dimensions — Focus, Control, Pressure, and Recovery — then combines them into a Session Score. rPPG never influences scoring. A Signal Quality card shows how much camera coverage was available. Low-coverage sessions get behavior-based labels; the score is unaffected.',
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

      <section className="relative z-10 mx-auto w-[min(1120px,calc(100vw-36px))] py-24">
        <div className="max-w-3xl">
          <p className="menu-card-kicker">How it works</p>
          <h1
            className="mt-3 text-4xl font-black leading-tight md:text-5xl"
            style={{ color: 'var(--color-accent-gold)' }}
          >
            Focus waves and calm recovery, scored by behavior
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8" style={{ color: 'rgba(240,236,224,0.78)' }}>
            NeuroFlight is a browser flight game with a structured session and optional webcam biofeedback. Your score
            comes from flight behavior — not physiology. It is not a medical device, diagnostic tool, or treatment.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <article
              key={section.title}
              className="premium-glass rounded-lg border"
              style={{ borderColor: 'rgba(255,255,255,0.13)', padding: '28px 28px 24px' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid h-9 w-11 shrink-0 place-items-center rounded border text-[10px] font-black tracking-wider"
                  style={{
                    borderColor: 'rgba(94,234,212,0.32)',
                    color: '#5eead4',
                    background: 'rgba(94,234,212,0.07)',
                  }}
                >
                  {section.icon}
                </div>
                <h2 className="text-base font-black leading-tight" style={{ color: '#fff0c2' }}>
                  {section.title}
                </h2>
              </div>
              <p className="mt-4 text-sm leading-7" style={{ color: 'rgba(240,236,224,0.72)' }}>
                {section.body}
              </p>
            </article>
          ))}
        </div>

        <section
          className="premium-glass mt-6 rounded-lg border"
          style={{ borderColor: 'rgba(255,255,255,0.13)', padding: '28px 28px 24px' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="grid h-9 w-11 place-items-center rounded border text-[9px] font-black tracking-wider"
              style={{ borderColor: 'rgba(255,184,107,0.34)', color: '#ffb86b', background: 'rgba(255,184,107,0.07)' }}
            >
              REF
            </div>
            <div>
              <p className="menu-card-kicker" style={{ color: '#ffb86b' }}>
                Evidence boundary
              </p>
              <h2 className="mt-0.5 text-lg font-black" style={{ color: '#ffb86b' }}>
                Conservative by design
              </h2>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-7" style={{ color: 'rgba(240,236,224,0.72)' }}>
            NeuroFlight draws on research in digital attention training, HRV biofeedback, and camera-based pulse
            estimation to inform cautious design: transparent signal quality, behavior-first scoring, no medical claims,
            and physiology used only for presentation and reflection. The four papers below are the primary
            peer-reviewed sources.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {sources.map((source) => (
              <a
                key={source.href}
                className="glass-button rounded-lg text-left"
                href={source.href}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '14px 16px' }}
              >
                <span className="block text-sm font-black" style={{ color: '#fff0c2' }}>
                  {source.title}
                </span>
                <span className="mt-1.5 block text-xs leading-5" style={{ color: 'rgba(240,236,224,0.62)' }}>
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
