# NeuroFlight

[![Deploy](https://github.com/wkyleg/neuroflight/actions/workflows/deploy.yml/badge.svg)](https://github.com/wkyleg/neuroflight/actions/workflows/deploy.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](tsconfig.json)

**[Play Now](https://wkyleg.github.io/neuroflight/)** | [Elata Biosciences](https://elata.bio) | [Elata SDK Docs](https://docs.elata.bio/sdk/overview)

A neuroadaptive 3D flight simulator built with Three.js and React. Engage in AI dogfights while EEG and webcam heart rate biofeedback track your cognitive state in real time. After each session, review an in-depth neurological performance analysis correlated with in-game flight activity.

## Features

- **AI Dogfighting** -- Chase and shoot down an AI opponent in procedurally generated environments (desert, ocean, clouds)
- **Real-time EEG integration** via Muse headband (Web Bluetooth) using the [Elata SDK](https://docs.elata.bio/sdk/overview)
- **Webcam heart rate (rPPG)** -- heart rate and HRV via facial video analysis, no wearables needed
- **Session analytics** -- post-flight reports with time-series charts correlating neural state (calm, arousal, heart rate, brain waves) with flight metrics (altitude, speed, combat events)
- **Procedural environments** -- dynamically generated terrain and sky conditions across desert, ocean, and cloud biomes
- **Browser native** -- runs entirely in the browser with Three.js rendering, bloom post-processing, and Web Audio spatial sound

## How It Works

1. **Connect** -- Pair an EEG headband or webcam for biofeedback (optional)
2. **Fly** -- Take off and engage the AI opponent in a procedurally generated sky
3. **Fight** -- Track down and shoot the enemy while managing throttle, positioning, and combat timing
4. **Review** -- Post-flight analytics correlate your neural state with every maneuver, showing when calm dropped during tight turns or focus peaked before a kill shot

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

## Tech Stack

- **Three.js** -- 3D rendering with Sky addon, bloom post-processing
- **React 19** + **TypeScript** (strict mode) -- component-based UI
- **React Router** + **Zustand** -- navigation and state management
- **Tailwind CSS 4** -- utility-first responsive styling
- **Recharts** -- data visualization for post-flight analysis
- **Web Audio API** -- spatial audio for engine sounds and weapon effects
- **Vite 8** + **TypeScript 5.9** -- fast build tooling
- **Biome** -- formatting and linting
- **Vitest** + **Testing Library** -- unit tests
- **Elata SDK** -- `@elata-biosciences/eeg-web`, `eeg-web-ble`, `rppg-web`

## Quick Start

```bash
pnpm install
pnpm dev          # dev server on http://localhost:3010
pnpm build        # tsc + vite build -> dist/
pnpm preview      # serve production build
pnpm test         # vitest (watch mode)
pnpm typecheck    # tsc --noEmit
pnpm lint         # biome check (read-only)
pnpm format       # biome format --write
```

## Neurotech Devices

| Device | Protocol | Browser Support |
|--------|----------|----------------|
| Webcam (rPPG heart rate) | getUserMedia | All modern browsers |
| Muse S headband (EEG) | Web Bluetooth | Chrome, Edge, Brave |

Both sensors are optional. You can fly and fight without any hardware. Add biometrics to unlock neural analytics.

## Deployment

Pushes to `main` trigger the CI/CD pipeline which runs lint, typecheck, and tests, then deploys to GitHub Pages.

## Related Projects

NeuroFlight is part of the [Elata Biosciences](https://elata.bio) neurotech app ecosystem. Other apps in the series:

- **[Monkey Mind: Inner Invaders](https://github.com/wkyleg/monkey-mind)** -- Brain-reactive arcade game with 140+ levels and EEG-driven gameplay
- **[Neuro Chess](https://github.com/wkyleg/neuro-chess)** -- Chess vs Stockfish with real-time neural composure tracking
- **[Reaction Trainer](https://github.com/wkyleg/reaction-trainer)** -- Stress-modulated reaction speed game with biometric difficulty scaling
- **[Breathwork Trainer](https://github.com/wkyleg/breathwork-trainer)** -- Guided breathing with live EEG and heart rate biofeedback

All apps use the [Elata Bio SDK](https://github.com/Elata-Biosciences/elata-bio-sdk) for EEG and rPPG integration.

## License

[ISC](LICENSE) -- Copyright (c) 2024-2026 Elata Biosciences
