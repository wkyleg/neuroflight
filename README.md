# NeuroFlight

A neuroadaptive flight experience built with Three.js and React. Engage in AI dogfights while EEG and rPPG biofeedback track your cognitive state in real time. After each session, review an in-depth neurological performance analysis correlated with in-game activity.

## Features

- **AI Dogfighting** -- Chase and shoot down an AI opponent in procedurally generated environments (desert, ocean, clouds)
- **Neurotech Integration** -- Connect an EEG headband or webcam (rPPG) for live biofeedback during gameplay
- **Session Analytics** -- Post-flight reports with time-series charts correlating neural state (calm, arousal, heart rate, brain waves) with flight metrics (altitude, speed, combat events)
- **Browser Native** -- Runs entirely in the browser with Three.js rendering and Web Audio

## Getting Started

```bash
pnpm install
pnpm dev
```

The app opens at `http://localhost:3010`.

## Controls

| Key | Action |
|-----|--------|
| W / Arrow Up | Pitch up |
| S / Arrow Down | Pitch down |
| A / Arrow Left | Roll left |
| D / Arrow Right | Roll right |
| Q / E | Yaw left / right |
| Shift | Throttle up |
| Ctrl | Throttle down |
| B | Brake |
| **Space / Enter / Click** | **Fire** |
| R | Restart |

On-screen buttons are also available for throttle, brake, and firing.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Type-check and build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run tests with Vitest |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Auto-format with Biome |
| `pnpm typecheck` | TypeScript type checking |

## Tech Stack

- **Renderer**: Three.js with Sky addon, post-processing (Bloom)
- **UI**: React 19, React Router, Zustand
- **Styling**: Tailwind CSS 4
- **Neurotech**: @elata-biosciences/eeg-web, eeg-web-ble, rppg-web
- **Charts**: Recharts
- **Build**: Vite 8, TypeScript 5.9
- **Quality**: Biome (lint + format), Vitest + Testing Library
- **CI/CD**: GitHub Actions with GitHub Pages deploy

## Deployment

Pushes to `main` trigger the CI/CD pipeline which runs lint, typecheck, and tests, then deploys to GitHub Pages.

## License

ISC
