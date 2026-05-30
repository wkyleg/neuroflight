# NeuroFlight Master Polish And Research Plan

Generated: 2026-05-29

This is the canonical implementation blueprint for the next NeuroFlight quality pass. It merges the latest gameplay screenshots, the original user notes, the deep research report, local asset inventory, runtime credits, current source-code shape, and fresh web/source research. The goal is not another asset dump. The goal is to make NeuroFlight feel like a polished, warm, camera-first, family-friendly storybook aviation game that uses biofeedback subtly and looks good despite browser/runtime constraints.

## 0. Decision Locks

- Plan file location: `overhaul-plan/neuroflight-master-polish-and-research-plan.md`.
- Research depth: exhaustive shortlist, not blind scraping.
- First implementation workstream after this plan: UI/rPPG-first polish.
- Asset policy: CC0 and CC-BY only; CC-BY requires attribution captured before runtime use.
- Runtime policy: raw downloads stay in `asset-inbox`; curated runtime assets only move to `public/assets/**` after preview and credit review.
- Medical-language policy: do not claim treatment, diagnosis, ADHD therapy, autism therapy, or clinical improvement. Use "signals", "proxies", "coverage", "composure", "load", "recovery", and "confidence".
- Product direction: camera-first neuroadaptive storybook aviation. EEG remains optional/advanced.
- Default plane direction: biplane or verified biplane-equivalent as the default player aircraft.
- In-flight aircraft switching: remove from user-facing play.

## 1. Executive Diagnosis

NeuroFlight has crossed from a bare prototype into a promising flight game. The current gameplay direction is much better than the initial sterile dogfight demo: there are storybook map names, world-scale landmarks, route/objective structure, weather/VFX, audio hooks, adaptive signals, and a summary screen. The app now has the bones of a real experience.

The remaining problem is visual and interaction hierarchy. The screenshots still read as "prototype cockpit dashboard over a sparse scene". The bottom neuro panel dominates the screen, the UI still overrepresents EEG even when the likely user only has webcam rPPG, the controls are too large and too noisy, and the scene color/atmosphere sometimes makes otherwise good assets feel washed out, foggy, clinical, or empty.

The next pass should not start by adding more random ground props. From flight altitude, small clutter is barely visible. The high-ROI path is:

1. Make the UI smaller, friendlier, and camera-first.
2. Make the render feel warmer, more saturated, more tropical/storybook, and more intentionally photographed.
3. Fix flight/input basics: yaw/turn feel, keyboard reliability, no accidental click-to-fire, no in-flight plane switch, crash/respawn.
4. Replace random-only world filling with authored giant silhouettes plus seeded random living-world events.
5. Make sky traffic alive: balloons upright and bobbing, blimps drifting, planes crossing, rare UFOs with playful behavior.
6. Make gameplay goals obvious in Zen, Expedition, and Dogfight.
7. Use the asset library as curation material, not as a mandate to load everything.

The "cut the knot" choice is to make cheap assets look better with art direction: saturated palettes, color grading, atmospheric perspective, selective bloom, readable silhouettes, authored set pieces, and camera movement. Three.js postprocessing is designed for exactly this class of work: bloom, film/noise, hue/saturation/contrast, vignette, and custom shader passes. Three.js color management also makes it clear that sRGB/Linear-sRGB and `OutputPass` discipline matter when postprocessing is active. The renderer already has an `EffectComposer`; the plan is to make that pipeline do real look development.

## 2. Current-State Evidence

### 2.1 Git/Worktree State

At time of planning, the repo is not clean. There is an earlier checkpoint commit:

- `31e1507 feat: add asset lab and world-scale prototype`

The current dirty worktree includes the story-route/neuroadaptive overhaul plus untracked new systems:

- Modified UI/game/neuro files: `GameScreen.tsx`, `MainMenu.tsx`, `SettingsScreen.tsx`, `SummaryScreen.tsx`, `FlightHud.tsx`, `NeuroConnectBanner.tsx`, `Game.ts`, `ScoreManager.ts`, `SessionRecorder.ts`, `WeaponSystem.ts`, `MapRegistry.ts`, `RingManager.ts`, `WeatherIdentitySystem.ts`, `rppgProvider.ts`, stores, and tests.
- Untracked implementation files: `src/game/gameplay/MissionObjectiveSystem.ts`, `src/game/gameplay/NeuroAdaptationSystem.ts`, `src/game/modes.ts`.
- Untracked planning folder entries: `overhaul-plan/`.

Implementation must begin with a checkpoint/safety pass so the current good work is preserved before further UI/flight/world changes.

### 2.2 Existing Asset Inventory

Local source: `asset-inbox/manifests/source-assets.json`.

Manifest summary:

- Total manifest entries: 394.
- Downloaded: 366.
- Catalog-only: 21.
- Failed: 7.
- CC-BY entries: 234.

Source distribution:

- Poly Pizza: 276.
- Poly Haven: 35.
- OpenGameArt: 27.
- Kenney: 18.
- ambientCG: 17.
- Freesound: 10.
- Quaternius: 5.
- NASA: 2.
- Open HDRI: 2.
- Smithsonian: 2.

Top candidate categories:

- `mega-landmarks`: 139.
- `ocean`: 106.
- `sky-objects`: 103.
- `desert`: 102.
- `world-scale-structures`: 94.
- `props`: 68.
- `distant-ground`: 63.
- `textures`: 52.
- `atmosphere-textures`: 41.
- `sky`: 41.
- `aircraft`: 41.
- `air-traffic`: 38.
- `skyboxes`: 28.
- `lighting-sky`: 23.
- `audio`: 16.
- `weather-vfx`: 13.
- `combat-vfx`: 10.

Format distribution:

- GLB: 276.
- ZIP: 27.
- HDR: 20.
- JPG set: 11.
- PNG: 9.
- JPG: 6.
- Unknown: 45.

This is enough asset mass for the next polish pass. The immediate need is curation, scale/orientation correction, runtime placement, and UI/world systems that make these assets visible.

### 2.3 Existing Runtime Assets

Local source: `public/assets/CREDITS_WORLD_SCALE.md` and `public/assets/**`.

Existing curated runtime categories:

- Desert/world landmarks: ruined temple, Mayan temple, Greek temple, arches, canyon, mesa valley, radar dish, radio towers.
- Ocean/world landmarks: lighthouse, shipping port, docks, shipwreck, cruise ship, seaport.
- Air traffic/world sky assets: floating islands, seaplane, glider, drone, helicopter, parachute, seagull.
- Weather/VFX: sand smoke, mist puff, storm smoke, lightning sheet, muzzle flashes, hit puff, explosion puff, smoke trail.
- Audio: engine low, lasers, explosion, metal impact, radio switch, UI click, thruster/fire.

The screenshots show many of these assets are already useful. The issue is that they are not yet directed strongly enough around player sightlines, altitude bands, color grading, and living behavior.

### 2.4 Screenshot Observations

Screenshots show:

- The bottom neuro dashboard takes roughly a fifth of the screen and shows EEG band power even when the source is rPPG or none.
- The rPPG state is visually subordinate to EEG-style brain UI, despite webcam being the likely default user path.
- The right-side touch/control buttons are oversized and stacked in a way that looks tool-like rather than game-like.
- The `How To Fly` and `End Flight` buttons are visually heavy during gameplay.
- The center signal banner floats over gameplay and can feel modal/noisy.
- Some scenes are too foggy/washed-out, especially ocean high altitude.
- Some desert scenes read flat and tan rather than lush/storybook.
- Large landmarks are promising when close, but many assets disappear into haze from altitude.
- Sky traffic/objects often feel static or visually accidental.
- Hot air balloons appear misoriented/sideways.
- The current HUD still has a cyber/neon terminal feeling rather than warm storybook aviation.
- Dogfight copy includes "Wins/Losses" in one place but prior notes still require full removal of "Kills" language.
- The menu background and cards are improved, but spacing and margins still feel draft-like.

### 2.5 Current Source-Code Shape

Important implementation facts:

- `src/game/flight/FlightModel.ts` starts the plane at `y = 200`, moves forward along local `-Z`, and clamps `y < 5` back to 5. There is no crash/ground-impact system yet.
- `src/game/core/InputManager.ts` uses global `keydown`/`keyup`, maps A/D and arrows to roll, Q/E to yaw, and uses `Space`, `Enter`, or `KeyF` for fire. It does not reset key state on blur/visibility change and does not distinguish UI button clicks from canvas fire intent.
- `src/game/core/Renderer.ts` already uses `EffectComposer`, `RenderPass`, `UnrealBloomPass`, and `OutputPass`, but bloom strength is very low and there is no real color-grade/saturation/vignette pass.
- `src/game/flight/AircraftRegistry.ts` still defaults around Spitfire-style registry data and includes aircraft paths that may not exist in `public/assets/aircraft`. The game store and game class still default to `spitfire`.
- `src/app/ui/hud/NeuroCockpit.tsx` renders the large bottom panel with `BandPowerBars`, `BrainRing`, and `MetricsColumn`; it is not rPPG-first.
- `src/neuro/rppgProvider.ts` has already moved toward SDK `createRppgSession` / `createRppgAppAdapter` use, but the UI still does not exploit the adapter's app-facing snapshot model well.
- `src/game/world/MapRegistry.ts` already has map-specific landmark, sky, weather, world, route, and audio configuration. This should be extended, not replaced.

### 2.6 Verification Baseline

Previous overhaul verification passed:

- `npm run assets:audit`
- `npm run typecheck`
- `npm run test -- --run`
- `npm run build`
- `npm run lint`

Known caveat: gameplay screenshots in headless Chrome can fail because WebGL context creation fails. Use a headed/browser-capable capture path for final screenshots.

## 3. Full Issue Inventory And Implementation Response

| User note / observed issue | Implementation response | Priority |
| --- | --- | --- |
| "We need to att crashed" / app or aircraft crash concern | Add explicit `FlightSafetySystem`; test app runtime errors separately via browser console. | P0 |
| Flight physics need to be more usable | Add Easy/Standard/Ace control profiles, coordinated-turn assist, softer pitch limits, stronger auto-level, and clearer throttle behavior. | P0 |
| Users need horizontal turning without turning/pitching strangely | Rebalance A/D to assisted heading turn in default mode; keep Q/E as advanced yaw; expose advanced roll mode later. | P0 |
| Keyboard inputs sometimes broken | Reset keys on `blur`, `visibilitychange`, route unmount, modal open; add tests for stuck-key prevention. | P0 |
| EEG section too large when only rPPG is used | Replace bottom panel with compact camera-first `RppgFlightPanel`; hide EEG bands unless EEG active/advanced drawer open. | P0 |
| Most users will have webcam, not EEG | Make Camera Biofeedback the primary device flow, primary HUD surface, and summary framing. | P0 |
| Need more current rPPG metrics | Show BPM, signal quality, confidence, warmup/ready, HRV proxy, respiration proxy, coverage; update at 2-4 Hz. | P0 |
| Game feels barren/clinical | Add art-grade renderer, authored set pieces, living sky traffic, richer palettes, and bigger silhouettes. | P0 |
| Hot air balloons are sideways | Add per-asset orientation override and balloon behavior preset; verify in Asset Lab/gameplay. | P0 |
| More balloons/planes flying with behavior | Add `SkyTrafficSystem` controlled by `LivingWorldDirector`. | P1 |
| Map elements should trigger randomly | Add seeded weighted event pools per map/mode. | P1 |
| Change from Spitfire to biplane | Curate or convert biplane; set as default; verify load before exposing. | P0 |
| Add ability to fly different planes with different feels | Add pre-flight aircraft selector with verified available aircraft only; no in-flight switching. | P1 |
| Some map things should be giant | Add giant landmark anchors: pyramid/temple/desert arch/lighthouse/harbor/storm bank/floating island. | P1 |
| UFOs should appear sometimes, weighted low | Add rare UFO event with low probability, playful movement, and map-safe paths. | P1 |
| Need saturated/tropical/friendly/kid-like color | Add renderer presets and map palettes; reduce clinical dark UI. | P0 |
| Postprocessing/lens/photography feel | Add color-grade shader pass, vignette, selective bloom, haze, optional film grain, speed FOV. | P0 |
| UI flickers/blinks too much | Debounce neuro metrics and HUD store updates; reduce transition churn. | P0 |
| Cockpit UI noisy/complicated | Redesign HUD into compact flight ribbon, mission card, tiny signal chip, optional drawers. | P0 |
| Plane should crash when hitting things | Add ground and landmark collision, crash penalty, respawn, invulnerability. | P1 |
| Need better obvious mechanics | Mode-specific objective cards, route markers, discovery prompts, score feedback, end-state messaging. | P1 |
| Expedition waypoints too close | Enforce minimum waypoint distance and route sequence spacing. | P0 |
| Weird colors/atmosphere on spawn | Clamp map visual preset ranges; seed visuals deterministically; test each map/mode start. | P0 |
| "Switch aircraft" click causes fire | Remove in-flight switching; limit fire to canvas/explicit fire control; stop propagation on UI. | P0 |
| Plane selection before flying | Add aircraft selector on menu or preflight panel. | P1 |
| Main title screen needs spacing/margin | Redesign menu layout with better grid, responsive constraints, and safe margins. | P0 |
| Start plane closer to ground | Spawn around 70-120 ft equivalent depending on map, with safe heading and climb path. | P1 |
| "Kills" should be "Wins" | Rename all combat labels to family-friendly terms. | P0 |
| Tone should be kid/family friendly | Replace violent copy with "tag", "duel", "wins", "rival", "ace run". | P0 |
| Better typography | Use fewer fonts, less tracking, stronger hierarchy; keep readable numbers. | P0 |
| Enemy too easy after a bit | Add difficulty profiles, enemy evasiveness scaling, aim assist only for player in Gentle. | P2 |
| Plane render correctly | Audit runtime aircraft paths; hide missing registry entries; verify model scale/rotation. | P0 |
| Difficulty levels | Add Gentle/Standard/Ace with control, enemy, score, crash tuning. | P1 |
| Clicking outside closes modals | Add modal backdrop close and Escape behavior where appropriate. | P1 |
| Pulse sync to heart rate or flight mechanics | Only when rPPG confidence is high; use subtle ring/beacon pulse, not distracting UI blinking. | P2 |
| Affective computing flight cases | Use HR/HRV/respiration as workload/recovery proxies; avoid claims; connect events in summary. | P2 |
| Score may be broken | Add score tests per mode and event-driven scoring checks. | P0 |
| More gamification | Add streaks, discoveries, postcards, clean-turn bonuses, gentle landing, route completion. | P1 |
| Show camera while playing | Add small collapsible preview tile with privacy copy and signal guidance. | P1 |
| Signal strength indicators | Add compact bars and text state: warming, weak, ready, low light, move less. | P0 |
| Neurotech connection best practices | Use local Elata rPPG guide: session/adapter snapshots, normalized errors, trace snapshots, managed restart if needed. | P0 |
| Better vertical space in levels | Route and NPC placement by altitude bands: ground/mid/high. | P1 |
| More animations | Add bobbing balloons, spline NPCs, beacon pulses, clouds, dust, UI transitions. | P1 |
| Cursor thing looks different | Add tasteful custom game reticle/cursor in canvas only. | P2 |
| Need music later | Defer or add optional soft ambience after audio polish; do not block core pass. | P3 |
| Improve heart-rate aspect | Add stable-confidence pulse, recovery moments, and debrief event alignment. | P2 |

## 4. Research Notes And Source Anchors

### 4.1 Three.js Rendering Research

Primary sources:

- Three.js postprocessing manual: https://threejs.org/manual/en/post-processing.html
- Three.js color management manual: https://threejs.org/manual/en/color-management.html
- Three.js FogExp2 docs: https://threejs.org/docs/pages/FogExp2.html
- Three.js GLTFLoader docs: https://threejs.org/docs/#examples/en/loaders/GLTFLoader

Implementation takeaways:

- `EffectComposer` is already the right architecture. NeuroFlight already uses it, but only lightly.
- `RenderPass` -> custom color grade -> selective bloom/VFX -> `OutputPass` should be the default chain.
- `OutputPass` must remain last when using postprocessing so final output color conversion/tone mapping is controlled.
- Color textures from PNG/JPG should be treated as sRGB; non-color maps should not be.
- For custom shader materials/passes, output color conversion must be handled carefully so the game does not become darker, overexposed, or oddly tinted.
- `FogExp2` is appropriate for atmospheric perspective because it allows near clarity and fast distance densening.
- GLTF is still the preferred runtime model path; OBJ/FBX/Blend should be converted or kept raw unless proven easy.
- Future optimization should consider DRACO/KTX2/Meshopt for large GLB bundles, but do not add that before solving visible polish.

### 4.2 Elata rPPG Research

Primary local source:

- `../elata-bio-sdk/docs/guides/using-rppg-in-a-browser-app.md`
- `../elata-bio-sdk/packages/rppg-web/src/rppgSession.ts`
- `../elata-bio-sdk/packages/rppg-web/src/rppgAppAdapter.ts`

Implementation takeaways:

- `createRppgSession()` is the recommended browser integration API.
- `createManagedRppgSession()` is appropriate if the app wants built-in restart behavior after terminal processor failure.
- `createRppgAppAdapter()` is the recommended reference-adapter path for app-facing status, stable messages, publish gating, trace data, and diagnostics.
- `normalizeRppgError()` should replace message-string parsing where practical.
- `getTraceSnapshot()` and `computeTraceWaveformDebug()` are supported public trace/debug paths.
- For NeuroFlight, the UI should be driven by app-facing snapshot concepts: `status`, `ready`, `canPublish`, `publishBpm`, `message`, `guidance`, `metrics`, `diagnostics`, `trace`, and gating state.
- The in-game rPPG panel should use confidence-gated display and should avoid raw unstable values flickering every frame.

### 4.3 Asset Research Anchors

General sources:

- Poly Pizza: https://poly.pizza/
- Poly Pizza hot air balloon search: https://poly.pizza/search/hot%20air%20balloon
- Poly Pizza UFO search: https://poly.pizza/search/UFO
- Poly Pizza pyramid search: https://poly.pizza/search/pyramid
- Poly Pizza lighthouse search: https://poly.pizza/search/lighthouse
- Poly Pizza dirigible/blimp search: https://poly.pizza/search/dirigible
- OpenGameArt low-poly biplane: https://opengameart.org/content/low-poly-biplane
- OpenGameArt low-poly flying saucer: https://opengameart.org/content/low-poly-3d-flying-saucer-model
- Kenney Particle Pack: https://www.kenney.nl/assets/particle-pack
- Kenney Smoke Particles: https://www.kenney.nl/assets/smoke-particles
- Kenney UI Audio: https://www.kenney.nl/assets/ui-audio
- Quaternius Spaceships Pack: https://quaternius.com/packs/spaceships.html
- Poly Haven API: https://polyhaven.com/el/our-api
- ambientCG API v2 docs: https://docs.ambientcg.com/api/v2/
- Tiny Skies inspiration: https://tinyskies.vercel.app/

Source takeaways:

- Poly Pizza is the best source for fast GLB runtime candidates, but many assets are CC-BY 3.0 and need production credits.
- OpenGameArt has useful CC0 fallbacks for biplane and flying saucer, but some assets are OBJ/FBX/Blend and may require conversion.
- Kenney is excellent for CC0 VFX/audio and simple game-ready packs.
- Quaternius is excellent for CC0 low-poly models, especially whimsical and sci-fi packs.
- Poly Haven and ambientCG are better for sky/material look-dev than gameplay object density; keep downloads low-res and practical.
- Tripo3D should be treated as a manual generation option only after license review; do not bulk-ingest generated assets blindly.

## 5. Target Art Direction

### 5.1 Core Vibe

Target phrase:

> Warm storybook aviation with tropical color, gentle biofeedback, and playful sky life.

Reference feel:

- Tiny, friendly, readable aircraft silhouettes.
- Big, simple world landmarks that read from far away.
- Saturated blue sky and ocean, warm desert gold, soft haze, fewer harsh black panels.
- Biplane-first, not military simulator-first.
- UI that feels like a storybook cockpit and modern fitness dashboard, not a hacker terminal.

### 5.2 Palette Direction

Desert/Sunspire Mesa:

- Sky: clear cyan to soft pale blue.
- Ground: warm gold, peach, ochre, rose shadow.
- Accents: turquoise route glow, amber beacons, coral danger/combat.
- Fog/haze: warm cream, not gray.
- Avoid: flat tan world, black silhouettes unless intentionally distant.

Ocean/Stormglass Archipelago:

- Sky: saturated daylight blue with soft storm violet/gray bands.
- Ocean: tropical blue with teal shallows.
- Accents: lighthouse red/white, beacon gold, mist cyan.
- Weather: rain squalls and storm banks should be readable but not whiteout.
- Avoid: overwashed fog that erases all assets.

UI:

- Reduce dark black panels.
- Use translucent navy/charcoal with warm cream text, cyan signal accents, gold objective accents, coral dogfight accents.
- Reduce letter spacing; keep large numbers readable.
- Use compact cards and chips instead of huge dashboard sections.

### 5.3 Rendering Targets

Add or tune:

- `VisualGradeSystem` or renderer preset config.
- Saturation: default +10% to +25% depending on map.
- Contrast: mild S-curve, not crushing shadows.
- Warmth: map-dependent color tint.
- Vignette: subtle edge depth, not tunnel vision.
- Bloom: selective and low, focused on rings, beacons, lightning, UFO beams, muzzle flashes.
- Fog: map-specific `FogExp2` density and color.
- Distance fade: for giant landmarks and NPCs, not just generic fog.
- Camera: small FOV widening with speed/boost, slight shake only during crash/hit/boost.
- Optional film grain: very subtle, disable at low performance or if noisy.

## 6. Asset Research Catalog By Role

This section is an exhaustive shortlist for targeted curation. It is not permission to bulk-download paid, unclear, NoAI-restricted, NC, or SA-only assets.

### 6.1 Player Aircraft

| Role | Candidate/source | License | Format | Action | Notes |
| --- | --- | --- | --- | --- | --- |
| Default biplane | OpenGameArt Low-Poly Biplane by mfep | CC0 | OBJ + texture ZIP | Download/convert to GLB if not already present | Low tris and friendly silhouette. Good default if GLB conversion succeeds. |
| Alternate biplane | OpenGameArt Low poly biplane airplane model by mujtaba-io | CC0 | Blend | Catalog and convert only if needed | Recent candidate; requires Blender conversion. |
| Friendly scout plane | Poly Pizza `airplane`, `biplane`, `aeroplane`, `sea plane` searches | Mixed CC0/CC-BY | Mostly GLB | Prefer GLB already in manifest | Must verify author/license per asset. |
| Seaplane | Existing `traffic-seaplane-01.glb` runtime asset | CC-BY | GLB | Consider as non-player or alternate if scale works | Already credited; might be better as NPC than player. |
| Fast aircraft | Current Spitfire or IL-28 if verified | Existing local | GLTF | Keep only if model loads and tone is acceptable | Do not default to military aircraft. |
| UFO novelty aircraft | OpenGameArt flying saucer or Poly Pizza UFO | CC0/CC-BY | FBX/Blend/GLB | Keep as NPC first, unlockable later | Avoid making UFO default; use for rare whimsy. |

Aircraft acceptance:

- Every exposed aircraft must load in Asset Lab and gameplay.
- Every exposed aircraft must have scale/rotation checked.
- Aircraft selector must show only `available: true` aircraft.
- Default selector value must be biplane or verified biplane-equivalent.
- In-flight switch control must be removed from HUD and input.

### 6.2 Sky NPCs And Whimsical Events

| Role | Candidate/source | License | Runtime action | Behavior |
| --- | --- | --- | --- | --- |
| Hot air balloons | Poly Pizza hot air balloon search; OpenGameArt hot-air-balloon PNG fallback | Mixed | Prefer GLB; use PNG only as distant billboard | Upright, slow drift, vertical bob, rare cluster event. |
| Blimps/airships | Poly Pizza dirigible/blimp/airship search | Mixed | Curate 2-4 GLBs | Slow cross-map spline, visible at high altitude. |
| Friendly biplane traffic | Poly Pizza airplane/biplane searches; Quaternius/OGA fallbacks | Mixed/CC0 | Curate 1-3 GLBs | Non-combat flyby, banking turn around route. |
| Seaplane traffic | Existing `traffic-seaplane-01.glb` | CC-BY | Keep | Ocean patrol and harbor route. |
| Birds/gulls | Existing `traffic-seagull-01.glb` | CC-BY | Keep and multiply carefully | Low-cost flocks near ocean/lighthouse. |
| Glider | Existing `traffic-glider-01.glb` | CC-BY | Keep | Desert ridge or ocean thermals. |
| UFO | OpenGameArt CC0 saucer; Poly Pizza UFO search | CC0/mixed | Curate 1 GLB/converted GLB | Rare, playful zigzag, beam flash, rapid exit. |
| Floating islands | Existing `floating-islands-large-01.glb`; Poly Pizza floating island search | CC-BY/mixed | Keep plus 1-2 variants | Far silhouettes and route landmarks. |
| Parachute/drone/helicopter | Existing runtime assets | CC-BY | Use sparingly | Support background life; avoid busy combat clutter. |

Sky traffic design:

- Use seeded random event weights.
- Use altitude bands: low 80-350, mid 350-1000, high 1000-2600.
- NPC paths must avoid rings/objectives and not block reticles.
- Far NPCs should use simplified movement and lower update frequency.
- Balloons must not rotate sideways; add orientation override by asset id.

### 6.3 Giant Desert Landmarks

| Role | Candidate/source | License | Runtime action | Notes |
| --- | --- | --- | --- | --- |
| Giant pyramid | Poly Pizza pyramid search | Mixed | Curate 1-3 GLBs | Must be huge and readable from altitude. |
| Temple route | Existing desert temples | CC-BY | Keep, rescale, author anchors | Better set-piece clustering around routes. |
| Canyon/mesa wall | Existing canyon/mesa assets; Poly Pizza canyon/mesa search | CC-BY | Keep and enlarge selectively | Create horizon silhouettes and crash-relevant gates. |
| Arch gate | Existing desert arches | CC0/CC-BY | Keep | Use as low-pass challenge and crash object. |
| Radar tower | Existing radar/radio towers | CC-BY | Keep | Add beacon light; make it navigational. |
| Floating rocks/islands | Existing floating islands and rock assets | Mixed | Keep | Place high enough to create vertical interest. |
| Oasis/ruin marker | Poly Pizza/Quaternius ruin/nature assets | Mixed/CC0 | Curate if missing | Optional postcard objective. |

Desert visual goal:

- At high altitude, the player should see 3-5 large silhouettes immediately.
- At low altitude, the player should see arches, temple details, dust, radio beacons, and route gates.
- Desert should not be flat tan. Use warm haze and saturated sky to create storybook depth.

### 6.4 Giant Ocean Landmarks

| Role | Candidate/source | License | Runtime action | Notes |
| --- | --- | --- | --- | --- |
| Giant lighthouse | Existing `ocean-lighthouse-01.glb`; Poly Pizza lighthouse search | CC-BY/mixed | Keep and possibly add variant | Make lighthouse larger, brighter, and route-important. |
| Harbor/docks | Existing port/dock/seaport assets | CC0/CC-BY | Keep | Author visible harbor silhouette. |
| Shipwreck | Existing `ocean-shipwreck-01.glb` | CC0 | Keep | Use for discovery/postcard. |
| Cruise/large ship | Existing `ocean-cruise-ship-01.glb` | CC-BY | Keep | Large moving/static silhouette, avoid overuse. |
| Oil rig/sea tower | Poly Pizza oil rig/tower/industrial search | Mixed | Research if current ocean lacks verticality | Useful from altitude. |
| Storm cloud bank | Existing weather sprites + cloud system | CC0/curated | Build procedurally | Strong map identity. |
| Floating island/cloud arch | Existing floating island | CC-BY | Keep | High-altitude route landmark. |

Ocean visual goal:

- The lighthouse should be a first-glance landmark, not a small prop.
- The harbor should read as a coherent destination, not scattered docks.
- Rain/mist should create depth but not erase the playable world.
- Ocean high-altitude shots should show traffic and large silhouettes, not only water haze.

### 6.5 Atmosphere, Weather, VFX

| Role | Candidate/source | License | Runtime action | Notes |
| --- | --- | --- | --- | --- |
| Smoke/dust puffs | Kenney Smoke Particles | CC0 | Already curated | Use for sand, crash, hit, explosion, smoke trail. |
| Generic particles | Kenney Particle Pack | CC0 | Curate additional sprites | Rain, spark, soft glow, route polish. |
| Lightning | OpenGameArt lightning; existing sheet | CC0 | Already curated | Ocean storms and rare desert thunder. |
| Clouds | Existing cloud system + OpenGameArt cloud PNG candidates | CC0/mixed | Use sprites and procedural billboards | Puffy, soft, not black silhouettes. |
| Skyboxes | OpenGameArt Cloudy Skyboxes; Poly Haven HDRIs | CC0 | Catalog/low-res preview | Use for menu or background if practical. |
| Sandstorm curtain | Kenney/OpenGameArt/ambient sprites | CC0/mixed | Build as layered translucent planes | Desert identity and adaptive haze. |
| Rain squall | Particle pack/weather sprites | CC0 | Build as local weather band | Ocean identity. |
| Muzzle/hit/explosion | Existing VFX + Kenney/OpenGameArt candidates | CC0 | Keep and tune opacity/additive blend | Family-friendly visual feedback. |

VFX constraints:

- Transparent sprites must be authored with correct blending and depth settings.
- VFX should never hide rings, route markers, or enemy target readability.
- Weather clarity can respond subtly to rPPG confidence/composure but must never punish weak signals.

### 6.6 Audio

| Role | Candidate/source | License | Runtime action | Notes |
| --- | --- | --- | --- | --- |
| UI click/switch | Existing Kenney UI Audio | CC0 | Keep | Use for menu, selector, dismiss, confirm. |
| Engine loop | Existing `engine-low-01.ogg` | CC0 | Keep and tune volume | Add speed/pitch modulation. |
| Wind/ambience | Freesound CC0/CC-BY catalog; Kenney if available | Mixed | Curate carefully | Need gentle ambience, not harsh wind. |
| Ocean ambience | Freesound catalog-only unless key present | Mixed | Optional | Use if attribution and license clear. |
| Thunder/rain | Freesound/OpenGameArt/Kenney | Mixed | Optional | Useful for ocean storm identity. |
| Flyby whoosh | Freesound/Kenney/custom synth | Mixed/CC0 | Curate or synthesize | Important for NPC life. |
| Dogfight one-shots | Existing lasers/explosion/impact | CC0 | Keep, soften if too sci-fi | Family-friendly "tag" feedback. |
| Ring/objective complete | UI Audio + generated synth | CC0 | Add | Positive feedback for Zen/Expedition. |

Audio constraints:

- Default volume must be soft.
- Combat one-shots can be punchy but not harsh.
- All audio must be optional/mutable and not block user gesture browser policy.
- CC-BY audio must have credits in runtime credits and summary/about area if shipped.

### 6.7 HDRIs, Materials, And Look-Dev Assets

| Role | Candidate/source | License/API | Runtime action | Notes |
| --- | --- | --- | --- | --- |
| Sky HDRIs | Poly Haven API | API requires unique User-Agent; commercial API use requires attention | Catalog low-res only unless practical | Use for menu/look-dev or environment lighting if performance permits. |
| Tropical/overcast/sunset skies | Poly Haven search/API | Same | Catalog candidates | Avoid huge downloads. |
| Sand/rock/cliff materials | ambientCG API | API v2 docs note v3 preferred for new projects | Use 1K/2K JPG only | Helpful for terrain/walls if implemented. |
| Water/shore/foam | ambientCG/Poly Haven | CC0 | Use 1K/2K only | Might improve ocean surface/shore details. |
| Concrete/metal/runway | ambientCG | CC0 | Already some inbox candidates | Useful for harbor/radar/airstrip set pieces. |

Material constraints:

- Do not texture every low-poly prop. Use materials where they help broad surfaces: terrain, water, runway, cliff, lighthouse/harbor.
- Keep material complexity low for browser performance.
- Annotate color textures as sRGB when loaded directly.

## 7. Runtime Curation Table

This table identifies likely runtime assets and exact intended use. "Candidate" means preview first in Asset Lab, then copy to `public/assets/**` only if it loads cleanly and credits are complete.

| Asset/use | Source path or URL | License | Author | Destination | Map | Visibility | Priority | Risk/action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Default biplane | https://opengameart.org/content/low-poly-biplane | CC0 | mfep | `public/assets/aircraft/biplane-default/` | All | Player | P0 | OBJ conversion and scale/rotation required. |
| Alternate biplane | https://opengameart.org/content/low-poly-biplane-airplane-model | CC0 | mujtaba-io | `public/assets/aircraft/biplane-alt/` | All | Player | P1 | Blend conversion required. |
| UFO rare event | https://opengameart.org/content/low-poly-3d-flying-saucer-model | CC0 | Agile Reaction | `public/assets/world/traffic-ufo-01.glb` | All | High/mid | P1 | Convert FBX/Blend to GLB or use Poly Pizza GLB alternative. |
| Hot air balloon GLB | https://poly.pizza/search/hot%20air%20balloon | Mixed | Per asset | `public/assets/world/traffic-balloon-*.glb` | All | Mid/high | P0 | Must verify license, orientation, scale. |
| Blimp/airship GLB | https://poly.pizza/search/dirigible | Mixed | Per asset | `public/assets/world/traffic-blimp-*.glb` | Ocean/desert | High | P1 | Must not block route. |
| Giant pyramid | https://poly.pizza/search/pyramid | Mixed | Per asset | `public/assets/world/desert-pyramid-*.glb` | Desert | Far/mid | P1 | Needs huge scale and collision proxy. |
| Giant lighthouse variant | https://poly.pizza/search/lighthouse | Mixed | Per asset | `public/assets/world/ocean-lighthouse-02.glb` | Ocean | Far/mid | P1 | Existing lighthouse may be enough after rescale. |
| Existing lighthouse | `public/assets/world/ocean-lighthouse-01.glb` | CC-BY | CG ART Creation | Existing | Ocean | Far/mid | P0 | Enlarge, beacon glow, route anchor. |
| Existing floating island | `public/assets/world/floating-islands-large-01.glb` | CC-BY | vanAchen | Existing | All | High/far | P0 | Tune fog/scale; can become sky route anchor. |
| Existing seaplane | `public/assets/world/traffic-seaplane-01.glb` | CC-BY | Neil M | Existing | Ocean | Mid/high | P0 | Convert from static scatter to NPC path. |
| Existing glider | `public/assets/world/traffic-glider-01.glb` | CC-BY | Poly by Google | Existing | Desert/ocean | Mid/high | P1 | NPC spline traffic. |
| Existing seagull | `public/assets/world/traffic-seagull-01.glb` | CC-BY | Poly by Google | Existing | Ocean | Low/mid | P1 | Flock behavior; low count. |
| Existing radar tower | `public/assets/world/desert-radar-01.glb` | CC-BY | Paul Spooner | Existing | Desert | Mid/far | P0 | Add blinking beacon and objective use. |
| Existing canyon/mesa | `public/assets/world/desert-canyon-01.glb`, `desert-mesa-valley-01.glb` | CC-BY | Maciek Krol, Nathan DiPietro | Existing | Desert | Far/mid | P0 | Increase silhouette value and crash/route relevance. |
| Existing docks/port | `public/assets/world/ocean-*.glb` | Mixed | Credited | Existing | Ocean | Mid/low | P0 | Author into coherent harbor set piece. |
| Smoke/dust/weather | `public/assets/weather/*.png` | CC0 | Kenney/OpenGameArt | Existing | All | Near/mid | P0 | Use for crash/weather/atmosphere. |
| Muzzle/hit/explosion | `public/assets/vfx/*.png` | CC0 | Kenney/OpenGameArt | Existing | Dogfight | Near | P0 | Rebalance to friendly "tag" tone. |
| UI/radio sounds | `public/assets/audio/ui-click-01.ogg`, `radio-switch-01.ogg` | CC0 | Kenney | Existing | All | None | P0 | Wire into menu and controls. |

## 8. Implementation Roadmap

### Phase 0 - Checkpoint And Safety

Goal: preserve the current good overhaul before changing fundamentals.

Tasks:

1. Run:
   - `npm run assets:audit`
   - `npm run typecheck`
   - `npm run test -- --run`
   - `npm run build`
   - `npm run lint`
2. Inspect dirty files and verify they belong to the story-route/neuroadaptive overhaul.
3. Commit current code/scripts/manifests/credits/runtime assets with a clear checkpoint message.
4. Do not commit raw/extracted/candidate inbox files or screenshot PNG/WEBP captures unless explicitly intended.
5. Keep this plan file tracked as the canonical next-pass plan.

Acceptance:

- Clean or intentionally staged post-commit baseline.
- Current game still launches.
- Existing Asset Lab remains intact.

### Phase 1 - rPPG-First UI And HUD

Goal: make the app feel camera-first and remove the oversized EEG cockpit.

Tasks:

1. Replace the bottom `NeuroCockpit` default with `RppgFlightPanel`.
2. Default state when source is `rppg`:
   - Small left or bottom-left panel, no huge bottom dashboard.
   - Show camera biofeedback label, signal quality, confidence, BPM, HRV proxy, respiration proxy, coverage/warmup, and a stable status message.
   - Optional camera preview tile, collapsed by default after first use.
3. Default state when source is `none`:
   - Tiny "Signals optional" chip or no panel unless user opens it.
   - Do not show empty EEG band bars.
4. Default state when source is `eeg`:
   - Show EEG as an advanced drawer or compact secondary panel.
   - Band power bars only visible when EEG connected or advanced drawer open.
5. Debounce neuro/HUD visual updates:
   - Numeric rPPG metrics at 2-4 Hz.
   - Smooth progress bars with CSS/React transitions.
   - Avoid per-frame React state churn for signal panel.
6. Update connection copy:
   - "Camera Biofeedback" primary.
   - "Optional EEG Headband" secondary.
   - "Sensors optional; flight works without devices."
   - "Data stays on this device" where appropriate.
7. Use rPPG adapter concepts:
   - `status`, `ready`, `canPublish`, `publishBpm`, `message`, `guidance`, `metrics`, `diagnostics`, `trace`, confidence/gating.

Acceptance:

- rPPG-only screenshot no longer shows a large EEG band section.
- No-sensor screenshot does not look broken or empty.
- Camera permission denied has a friendly message and does not block play.
- Low-confidence camera state gives guidance without alarming the user.

### Phase 2 - Menu, Typography, Controls, And Family Tone

Goal: remove the "AI slop dashboard" feel and make the app welcoming.

Tasks:

1. Rework menu spacing:
   - Balanced top/bottom margins.
   - No oversized title clipping.
   - Responsive mode/map grid.
   - Aircraft selector integrated below or beside mode/map selection.
2. Add preflight aircraft selector:
   - Show only verified `available: true` aircraft.
   - Default to biplane.
   - Display handling tags, not dense stats.
3. Remove in-flight switch aircraft:
   - Remove HUD hint.
   - Disable `BracketRight` switch behavior in normal gameplay.
   - Keep dev-only switch behind explicit debug flag if needed.
4. Reduce control button size:
   - Smaller right-side control cluster.
   - Hide touch controls on desktop unless useful.
   - Keep keyboard controls in `How To Fly`, but auto-dismiss and remember dismissal.
5. Prevent UI controls from firing weapons:
   - Stop propagation on buttons.
   - Only canvas pointer/fire target triggers click-to-fire in dogfight.
   - Consider removing click-to-fire entirely from desktop and using Space/F only.
6. Replace wording:
   - "Kills" -> "Wins", "Tags", or "Duel Wins".
   - "Enemy" can stay for reticle if needed, but prefer "Rival" in copy.
   - "Dogfight" can remain as mode name, but copy should be playful and non-violent.
7. Modal behavior:
   - Escape closes non-critical modals.
   - Clicking backdrop closes modals.
   - Buttons have clear focus states.

Acceptance:

- Menu looks intentionally spaced at desktop and laptop aspect ratios.
- In-flight HUD has no aircraft-switch hint.
- Clicking aircraft/UI buttons never fires.
- No visible "Kills" label remains.

### Phase 3 - Input And Flight Feel

Goal: make flying more usable without rewriting the engine.

Tasks:

1. Add input lifecycle hardening:
   - Clear key set on `window.blur`.
   - Clear key set on `document.visibilitychange` hidden.
   - Clear key set on component unmount/game destroy.
   - Ignore gameplay keys when focus is in input/button/modal unless explicitly intended.
2. Add control profiles:
   - Gentle: assisted heading turn, strong auto-level, soft pitch/altitude guard, slower roll.
   - Standard: current arcade flight plus better yaw/turn assist.
   - Ace: more direct roll/yaw, less assistance.
3. Improve horizontal turning:
   - In Gentle/Standard, A/D should create a coordinated heading turn with visual bank, not force the user to manage roll-only flight.
   - Q/E remain explicit yaw.
   - ArrowLeft/ArrowRight match A/D.
4. Improve pitch:
   - Reduce accidental steep pitch.
   - Add stronger horizon recovery when not actively pitching.
   - Add low-altitude recovery assist in Gentle/Standard.
5. Improve throttle:
   - Default cruise should feel stable.
   - Boost should temporarily widen FOV and add audio/visual feedback.
   - Brake should slow without making controls feel dead.
6. Start lower:
   - Desert and ocean spawn around 70-120 ft equivalent.
   - Ensure spawn path avoids immediate collision.

Acceptance:

- New users can turn horizontally with A/D without diving/climbing wildly.
- No stuck-key behavior after tab switch.
- Gentle flight feels playable with minimal instruction.

### Phase 4 - Aircraft Registry And Model Reliability

Goal: expose only aircraft that actually work.

Tasks:

1. Audit all `AircraftRegistry` paths against `public/assets/aircraft`.
2. Add intended fields:
   - `displayRole`
   - `handlingLabel`
   - `difficulty`
   - `available`
   - `previewImage?`
3. Hide unavailable aircraft from menu.
4. Add biplane candidate:
   - Download/convert OpenGameArt CC0 biplane if not already available.
   - Normalize GLB orientation and scale.
   - Add credits even for CC0.
5. Keep Spitfire only if it loads and fits tone as an alternate, not default.
6. Add plane-specific tuning:
   - Biplane: stable, low speed, friendly.
   - Scout/seaplane: stable, slightly heavier, exploration.
   - Fast plane: quicker, less forgiving, dogfight.
7. Add tests:
   - Available aircraft paths exist or are explicitly mocked.
   - Default aircraft id is available.

Acceptance:

- No player sees a missing model/fallback cone for selectable aircraft.
- Biplane is default.
- Aircraft selector works before launch and not during flight.

### Phase 5 - Crash, Collision, And Respawn

Goal: make the plane able to crash without making the game frustrating.

Tasks:

1. Add `FlightSafetySystem`.
2. Detect:
   - Ground/sea impact below altitude threshold with downward velocity or unsafe attitude.
   - Collision with large landmark proxies.
   - Optional enemy collision in Dogfight.
3. Add simple collision proxies:
   - Spheres/boxes/cylinders for giant landmarks.
   - Route arches and lighthouse/pyramid collision volumes.
   - Do not attempt precise mesh collision.
4. Crash response:
   - Short visual flash and sound.
   - Record `crash`, `near_miss`, or `hard_landing` event.
   - Score penalty or health penalty depending on mode.
   - Respawn at last safe route point or map spawn.
   - 2 second invulnerability/ghost period.
5. Mode tuning:
   - Zen: "Bumpy landing" with gentle respawn and small score impact.
   - Expedition: lose discovery streak or time.
   - Dogfight: lose health/time/score.

Acceptance:

- Flying into ground no longer silently clamps altitude.
- Crash feels clear but forgiving.
- Crash event appears in summary/debrief.

### Phase 6 - Visual Grade And Atmosphere

Goal: make the game look lush, saturated, warm, and intentional.

Tasks:

1. Add `VisualGradeSystem` or renderer preset config.
2. Renderer pass order:
   - `RenderPass`
   - custom color grade shader pass
   - selective/low bloom pass
   - optional vignette/film grain pass or combined shader
   - `OutputPass`
3. Color grade uniforms:
   - saturation
   - contrast
   - warmth/tint
   - exposure bias
   - vignette strength
   - haze color influence if needed
4. Map presets:
   - Sunspire Mesa: warm gold, cyan sky, rose shadows, turquoise route glow.
   - Stormglass Archipelago: tropical blue, teal shallows, lighthouse red, violet storm edges.
5. Clamp atmospheric randomness:
   - No spawn should produce black clouds, blown-out white haze, or unreadable horizon.
   - Use deterministic seed per map/mode/session.
6. Selective bloom:
   - Rings, route beacons, lighthouse, radar beacon, lightning, UFO beam, muzzle flashes.
   - Avoid global bloom that washes out the entire scene.
7. Improve fog:
   - Use map-specific `FogExp2`.
   - Tune density separately for low and high altitude if practical.
   - Do not hide all high-altitude landmarks.
8. Add camera polish:
   - FOV widens with speed/boost.
   - Mild speed shake only at high speed.
   - Crash/hit shake brief and small.

Acceptance:

- Screenshots look warmer and more saturated without losing readability.
- Ocean no longer becomes empty white fog at altitude.
- Desert no longer reads as flat beige.

### Phase 7 - Authored World Layout And Giant Landmarks

Goal: make both maps readable from high and low altitude.

Tasks:

1. Build authored set-piece anchors per map.
2. Desert required anchors:
   - Giant pyramid or temple silhouette.
   - Canyon/mesa wall.
   - Arch gate route.
   - Radar/radio tower beacon.
   - Floating island/rock.
   - Dust curtain/dust devil zone.
3. Ocean required anchors:
   - Giant lighthouse route.
   - Harbor/dock cluster.
   - Shipwreck discovery.
   - Storm bank/rain lane.
   - Floating island/cloud arch.
   - Blimp/seaplane route.
4. Route design:
   - Put route rings/objectives near landmarks.
   - Ensure Expedition waypoints are at least 600-1000 world units apart unless intentionally grouped.
   - Use altitude bands for route variety.
5. Performance budget:
   - 50-80 visible GLB instances max per map target.
   - Repeated clutter remains instanced/procedural.
   - Far objects can use simpler material/low update.

Acceptance:

- Each map has at least 3 immediately readable silhouettes from high altitude.
- Low altitude has clear near-field detail and risk/reward.
- Expedition route does not spawn tiny waypoint hops.

### Phase 8 - Living World And NPC Sky Traffic

Goal: make the map feel alive and variable.

Tasks:

1. Add `LivingWorldDirector`.
2. Use seeded run state:
   - `mapId`
   - `mode`
   - date/session seed
   - difficulty
3. Add event pools:
   - `ambientAlways`: low-count birds/cloud drift/beacons.
   - `common`: balloon drift, seaplane patrol, glider.
   - `uncommon`: blimp crossing, dust devil, rain squall.
   - `rare`: UFO, multiple balloons, lightning burst.
4. Add `SkyTrafficSystem`.
5. NPC behavior presets:
   - Balloon: upright, slow drift, vertical bob, rotation sway.
   - Blimp: long slow spline, high visibility.
   - Plane: banked spline flyby, speed matched to distance.
   - Bird flock: small offsets around leader, ocean/lighthouse affinity.
   - UFO: hover, sudden zigzag, beam flicker, fast exit.
6. Safety:
   - NPCs never spawn inside objective rings.
   - NPCs avoid direct collision path with player unless intentionally harmless/ghosted.
   - Rare events do not dominate every run.
7. Debug:
   - Add dev overlay or console flags to force event type for testing.

Acceptance:

- Balloons are upright and bob.
- At least one visible living-world event appears in a 2-3 minute run.
- UFO appears rarely under normal randomness but can be forced in dev/testing.

### Phase 9 - Gameplay, Scoring, And Objectives

Goal: make each mode intentionally playable.

Tasks:

1. Score audit:
   - Verify all modes increment score correctly.
   - Add tests for ring, objective, discovery, dogfight events.
2. Zen Flight:
   - Route rings through landmarks.
   - Score: route completion, smoothness, stable altitude, composure multiplier.
   - No weapons.
   - Weather response calming and subtle.
3. Expedition:
   - 3-5 route objectives per run.
   - Discovery/postcard set pieces.
   - Low-pass arches and climb beacons.
   - Minimum objective spacing.
4. Dogfight:
   - Preserve combat core.
   - Rename kill language.
   - Add readable hit feedback and rival state.
   - Improve enemy difficulty scaling.
   - Use landmarks as combat spaces.
5. Gamification:
   - Streaks.
   - Clean turn.
   - Smooth climb.
   - Discovery found.
   - Gentle landing.
   - Route complete.
6. Session events:
   - `objective_complete`
   - `discovery_found`
   - `near_miss`
   - `crash`
   - `hard_landing`
   - `clean_turn`
   - `route_streak`
   - `rival_tag`
   - `rival_win`
   - `recovery_window`

Acceptance:

- Every mode can start, produce meaningful score/progress, end, and show a useful summary.
- Expedition no longer feels like random close markers.
- Dogfight is family-friendly but still exciting.

### Phase 10 - Neuroadaptive Polish And Summary

Goal: make biofeedback useful, soft, and trustworthy.

Tasks:

1. Keep `NeuroState` public shape stable unless unavoidable.
2. Use derived adaptation only:
   - composure
   - load
   - recovery
   - flow
   - confidence
   - coverage
3. Do not map raw EEG/rPPG directly to pitch/roll/throttle.
4. rPPG-first live effects:
   - High confidence calm/composure: ring glow stability, slight score multiplier, clearer haze.
   - High load: gentle recovery prompt, softer weather, no punishment.
   - Low confidence: no adaptive gameplay effects; show guidance.
5. Summary:
   - Flight events aligned with signal windows.
   - Coverage and confidence clearly shown.
   - Plain-language insights without medical claims.
   - Separate "what happened in the flight" from "what signals were available".
6. Add scenarios:
   - No device.
   - Mock calm.
   - Mock high load.
   - Camera denied.
   - Camera active low confidence.
   - rPPG warmup.
   - EEG unavailable.

Acceptance:

- Users understand sensors are optional.
- Weak/no sensor state does not make the app feel broken.
- Summary feels like a debrief, not a medical report.

### Phase 11 - Audio And Feel

Goal: add life and feedback without making the game harsh.

Tasks:

1. Wire audio hooks:
   - menu click
   - mode select
   - aircraft select
   - launch
   - ring pass
   - objective complete
   - discovery
   - crash/hard landing
   - boost
   - brake
   - flyby
   - weather
   - rival tag
   - hit/explosion
2. Engine:
   - Volume soft by default.
   - Pitch/volume follows speed.
3. Wind:
   - Subtle, increases with speed/altitude.
4. Weather:
   - Rain/thunder/dust only when weather event active.
5. UI:
   - Use Kenney UI audio sparingly.
6. Dogfight:
   - Hits and tags readable but not militaristic/harsh.

Acceptance:

- Game feels more responsive.
- Audio can be muted.
- No browser autoplay issue blocks gameplay.

## 9. Technical Interfaces And Type Changes

### 9.1 `AircraftDefinition`

Documented intended additions:

```ts
type AircraftDifficulty = 'gentle' | 'standard' | 'ace';

interface AircraftDefinition {
  id: string;
  name: string;
  displayRole?: 'default' | 'exploration' | 'speed' | 'novelty' | 'dev';
  handlingLabel?: string;
  difficulty?: AircraftDifficulty;
  available?: boolean;
  previewImage?: string;
}
```

Rules:

- `available` defaults to `false` for any aircraft with uncertain asset path.
- Selector displays only `available === true`.
- Default aircraft must be available.
- In-flight switch is removed for users.

### 9.2 `RppgFlightPanel`

Minimum props/data:

```ts
interface RppgFlightPanelViewModel {
  source: 'none' | 'rppg' | 'eeg' | 'mock';
  status: 'idle' | 'starting' | 'running' | 'ready' | 'degraded' | 'failed' | 'stopped';
  ready: boolean;
  canPublish: boolean;
  bpm: number | null;
  hrvRmssd: number | null;
  respirationRate: number | null;
  signalQuality: number;
  confidence: number;
  coverage: number;
  guidance: string;
  cameraActive: boolean;
  hasVideoPreview: boolean;
}
```

Rules:

- Update visible values at 2-4 Hz.
- Hide EEG bars unless EEG active or advanced drawer open.
- Show "Signals optional" when source is none.
- Show stable low-confidence guidance without scary language.

### 9.3 `FlightSafetySystem`

Minimum responsibilities:

- Read plane position, velocity/speed, attitude, current map collision proxies, and mode.
- Emit events: `near_miss`, `hard_landing`, `crash`.
- Apply mode-specific penalty.
- Request respawn at last safe point.
- Provide short invulnerability window.

### 9.4 `LivingWorldDirector`

Minimum responsibilities:

- Build seeded run config from map/mode/difficulty/session seed.
- Choose event schedule from weighted map pools.
- Own high-level lifetime of sky/world events.
- Coordinate with `SkyTrafficSystem`, weather system, and world landmarks.
- Expose dev force-event hooks.

### 9.5 `SkyTrafficSystem`

Minimum responsibilities:

- Load/clone selected GLB/GLTF sky traffic assets.
- Apply per-asset orientation/scale overrides.
- Update spline/bob/drift movement.
- Fade or despawn based on distance.
- Keep traffic away from rings/objectives.

### 9.6 `VisualGradeSystem`

Minimum responsibilities:

- Provide map/mode grade presets.
- Configure renderer postprocessing uniforms.
- Clamp fog/exposure/saturation ranges on map load.
- Support a dev tuning mode for screenshots.

## 10. Implementation Order Summary

1. Commit/checkpoint current overhaul.
2. Build rPPG-first compact HUD and remove default EEG cockpit.
3. Fix menu spacing, family-friendly copy, controls, modal behavior, and no in-flight plane switching.
4. Harden input and improve Gentle/Standard flight feel.
5. Audit aircraft registry, curate biplane, add preflight selector.
6. Add crash/collision/respawn.
7. Add renderer color grade and map visual presets.
8. Author giant landmarks and route spacing.
9. Add living-world director and sky traffic behavior.
10. Fix scoring/objective loops and summary event windows.
11. Wire audio and polish feedback.
12. Full browser verification and screenshot pass.
13. Revisit original notes line by line until all are done, deferred, or rejected with reason.

## 11. Verification Commands

Run after each major phase when practical, and always before final acceptance:

```bash
npm run assets:audit
npm run typecheck
npm run test -- --run
npm run build
npm run lint
```

For markdown-only edits, `npm run typecheck`/build are not mandatory, but this plan is for the implementation pass and must keep these commands as the final gate.

## 12. Browser Verification Scenarios

### 12.1 Menu

- Main menu loads without layout clipping.
- Mode cards are equal and readable.
- Map cards have clear storybook copy.
- Aircraft selector appears before launch.
- Biplane/default aircraft is selected.
- Camera Biofeedback is primary; EEG is optional.
- Clicking outside settings/modal closes it.

### 12.2 Sensors

- No sensor: game playable, tiny optional signal state, no huge empty dashboard.
- Camera permission denied: friendly guidance, game playable.
- Camera active warming up: shows warmup/coverage guidance.
- Camera active low confidence: shows signal guidance and gates adaptive effects.
- Camera ready: shows BPM/HRV/respiration proxies without flicker.
- Mock calm: adaptive UI/effects visible but subtle.
- Mock high load: recovery prompt visible; no punishment.
- EEG unavailable: app still works.
- EEG connected: advanced EEG view available but not default.

### 12.3 Gameplay

- Zen, Expedition, Dogfight launch on `desert_expanse`.
- Zen, Expedition, Dogfight launch on `ocean_islands`.
- End Flight works in every mode.
- Summary opens with useful debrief.
- Waypoints in Expedition are spaced and understandable.
- Dogfight labels use Wins/Tags/Rivals, not Kills.
- Score changes correctly in each mode.
- Crash/respawn works and records event.
- No accidental click-to-fire from UI controls.
- Keyboard controls reset after tab switch/window blur.

### 12.4 Visuals

- Desert low-altitude screenshot.
- Desert high-altitude screenshot.
- Ocean low-altitude screenshot.
- Ocean high-altitude screenshot.
- Menu screenshot.
- Asset Lab screenshot.
- Summary screenshot with mock data.
- Balloon upright/bobbing screenshot.
- Rare UFO forced-dev screenshot.
- Lighthouse/pyramid giant landmark screenshot.
- No WebGL blank canvas.
- No missing public asset 404s.
- No unhandled runtime errors.

### 12.5 Performance

- Keep desktop gameplay smooth with target visible runtime assets.
- No uncontrolled GLB instance explosion.
- Weather/VFX does not block visibility.
- React HUD updates do not stutter from per-frame metric updates.

## 13. Acceptance Checklist Against User Notes

Use this table after implementation. Mark each row `done`, `deferred`, or `rejected with reason`.

| Item | Required final state | Status |
| --- | --- | --- |
| Improve crashes | Aircraft crash/respawn implemented. | pending |
| Better flight physics | Gentle/Standard/Ace or equivalent control profiles implemented. | pending |
| Horizontal turning | A/D assisted heading turn works. | pending |
| Keyboard broken | Blur/visibility/modal stuck-key bugs fixed. | pending |
| Remove EEG dominance | EEG hidden unless active/advanced. | pending |
| rPPG-first metrics | Compact camera panel with BPM/HRV/respiration/confidence. | pending |
| Lush vibe | Saturated visual grade and authored landmarks. | pending |
| Hot air balloons sideways | Orientation fixed. | pending |
| More sky life | NPC traffic and living-world events. | pending |
| Random map changes | Seeded random event pools. | pending |
| Biplane default | Default aircraft is biplane/biplane-equivalent. | pending |
| Plane choice | Preflight aircraft selector. | pending |
| Giant landmarks | Pyramid/lighthouse/large silhouettes. | pending |
| Rare UFOs | Low-weight rare UFO behavior. | pending |
| Postprocessing | Color grade/vignette/bloom/fog tuned. | pending |
| UI flicker | Debounced signal/HUD updates. | pending |
| Cockpit noisy | HUD reduced and reorganized. | pending |
| Plane can crash | Ground/landmark crash works. | pending |
| Better mechanics | Clear objectives and score per mode. | pending |
| Expedition waypoints close | Minimum spacing enforced. | pending |
| Weird spawn colors | Visual presets clamped and deterministic. | pending |
| Switch aircraft bug | In-flight switch removed; no click-to-fire leak. | pending |
| General flight best practices | Camera, controls, feedback, crash, score improved. | pending |
| Main title spacing | Menu spacing fixed. | pending |
| Start closer to ground | Spawn altitude reduced safely. | pending |
| "Kills" -> "Wins" | Violent labels removed. | pending |
| Better typography | Reduced tracking and clearer hierarchy. | pending |
| Enemy too easy | Difficulty/enemy scaling tuned. | pending |
| Plane render correctly | Available aircraft load reliably. | pending |
| Difficulty levels | Gentle/Standard/Ace or equivalent. | pending |
| Click outside modal | Modal close behavior implemented. | pending |
| Heart-rate pulse | Subtle confidence-gated pulse only. | pending |
| Affective computing cases | Summary uses workload/recovery proxies carefully. | pending |
| Score broken | Score tests and mode scoring fixed. | pending |
| More gamification | Streaks/discoveries/postcards/clean-turn rewards. | pending |
| Camera while playing | Optional collapsible preview. | pending |
| Signal indicators | Good/low/warmup states visible. | pending |
| Neurotech connection best practices | SDK adapter/error guidance used. | pending |
| Vertical level space | Ground/mid/high altitude bands used. | pending |
| More animations | NPC/balloon/beacon/weather animations. | pending |
| Cursor thing | Optional game reticle/cursor polish. | pending |
| Music later | Deferred unless core pass finishes early. | deferred |
| Better heart-rate aspect | rPPG pulse/recovery/debrief alignment. | pending |

## 14. Rejection Criteria

Reject or defer an idea only if at least one is true:

- It breaks CC0/CC-BY asset policy.
- It requires unclear, paid, NC, SA-only, personal-use, or NoAI-restricted assets.
- It makes sensor use punitive or medically overclaiming.
- It creates a large new engine/dependency rewrite.
- It harms readability of rings, route objectives, enemies/rivals, or safety.
- It drops frame pacing below acceptable browser performance.
- It cannot be verified in headed browser screenshots.

## 15. Final Implementation Exit Criteria

The next implementation pass is complete only when:

- All verification commands pass.
- Browser verification matrix is complete.
- Menu, rPPG-only HUD, desert/ocean low/high screenshots, all modes, crash, aircraft selector, and summary are captured.
- Runtime assets used in `public/assets/**` have credits.
- Raw harvested assets remain out of tracked runtime/public folders unless curated.
- The acceptance checklist is updated with done/deferred/rejected statuses.
- The original inspiration and notes have been re-read and any missed item has been intentionally addressed.

