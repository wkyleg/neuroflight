# NeuroFlight Next Gameplay Productization Plan

Generated: 2026-06-01

This document is the canonical next-phase execution plan for turning the current
NeuroFlight branch from a strong-looking prototype into a more complete playable
product. The previous polish work made the game dramatically more attractive:
storybook maps, richer cockpit UI, aircraft selection, moving world objects,
music, camera-first HUD direction, and family-friendly Dogfight language are now
in place. The next work should focus on why a player keeps playing and why the
biofeedback matters.

The first implementation priority after this file is committed is:

1. rPPG-first flight UX.
2. Friendlier, more useful debrief/report.
3. Zen and Expedition reward loops.
4. Aircraft personality and progression feel.
5. Game-feel feedback and final QA.

Use incremental commits. Do not make a giant end-only commit. Each phase below
includes a recommended commit name, scope, verification, and acceptance criteria.

---

## 0. Locked Decisions

- Plan file path: `overhaul-plan/neuroflight-next-gameplay-productization-plan.md`.
- Do not overwrite `overhaul-plan/neuroflight-master-polish-and-research-plan.md`.
- No broad new asset harvest in this pass.
- Keep map IDs stable: `desert_expanse` and `ocean_islands`.
- Keep public mode IDs stable: `zen`, `free`, and `dogfight`.
- Keep Expedition implemented through the existing `free` mode ID.
- Keep biplane as default aircraft.
- Keep Dogfight public name, but continue using family-friendly language:
  `tag`, `rival`, `wins`, `resets`, `route`, `ace score`.
- Keep neuro language non-medical:
  `signals`, `proxies`, `coverage`, `confidence`, `composure`, `load`,
  `flow`, `recovery`.
- Treat webcam/rPPG as the default user path.
- Treat EEG as optional advanced support.
- Runtime assets already curated in `public/assets/**` remain usable.
- Raw `asset-inbox/**` stays isolated.
- Dev server should remain available during implementation, preferably
  `http://127.0.0.1:3011/`.

---

## 1. Executive Diagnosis

NeuroFlight now looks much closer to the target art direction. The worlds have
storybook landmarks, stronger atmosphere, island/temple focal points, sky
objects, moving traffic, fuzzy clouds, cockpit glass, and warmer colors. The
remaining product gap is not mostly about adding more objects. The remaining
gap is about making the game explain itself, reward the player, and turn the
camera signal into a meaningful part of the session.

Current strengths:

- The two maps now have a recognizable identity:
  Sunspire Mesa and Stormglass Archipelago.
- The bottom cockpit direction is much better than the earlier scattered HUD.
- Camera biofeedback is visible in flight.
- Aircraft selection exists and the biplane is default.
- Dogfight has been softened into aerial tagging.
- The summary screen already has charts, session samples, events, and mode
  metadata.
- The code already has useful extension points:
  `MissionObjectiveSystem`, `ScoreManager`, `SessionRecorder`,
  `NeuroAdaptationSystem`, `AudioPolishSystem`, `MapRegistry`, and mode metadata.

Current product gaps:

- rPPG still feels like a telemetry panel, not a friendly flight instrument.
- The debrief is analytics-heavy at the top and needs a stronger plain-language
  "what happened" layer.
- Zen has a route, but not enough reward language around smooth flying,
  streaks, completion, and calm flow.
- Expedition has objectives, but needs stronger discovery pacing, postcard
  moments, and completion payoff.
- Aircraft can be selected, but the UI does not yet sell their personalities
  strongly enough.
- Dogfight has better labels, but its debrief and reward feedback should read
  like playful tag instead of combat telemetry.
- The session loop needs more obvious completion moments so players understand
  what they accomplished.

The next pass should therefore make the experience feel complete:

- Before flight: choose a mode, map, aircraft, and signal state confidently.
- During flight: understand the current goal without reading a manual.
- After flight: get a useful, friendly debrief whether or not sensors were on.
- Across modes: each mode should have a reason to exist and a different reward
  rhythm.

---

## 2. Current Code State

This section anchors the plan in the current implementation so the next agent or
engineer does not need to rediscover the basic shape.

### 2.1 Menu And Preflight

Relevant code:

- `src/app/screens/MainMenu.tsx`
- `src/game/modes.ts`
- `src/game/flight/AircraftRegistry.ts`
- `src/neuro/hooks.ts`
- `src/neuro/store.ts`

Current behavior:

- Menu offers three mode cards in order:
  `Zen Flight`, `Expedition`, and `Dogfight`.
- Mode IDs are `zen`, `free`, and `dogfight`.
- Difficulty options are `rookie`, `pilot`, and `ace`.
- Aircraft selection is present and uses `getAvailableAircraft()`.
- Biofeedback actions are present:
  Camera, EEG, and Simulate.
- Launch URL includes mode, map, aircraft, and difficulty.

Known next-step needs:

- Make Camera/rPPG the visibly preferred path.
- Add more useful aircraft personality copy.
- Make no-sensor and simulated-signal choices feel intentional, not secondary.
- Avoid implying EEG is required.

### 2.2 Flight Runtime

Relevant code:

- `src/game/Game.ts`
- `src/game/gameplay/MissionObjectiveSystem.ts`
- `src/game/gameplay/ScoreManager.ts`
- `src/game/gameplay/SessionRecorder.ts`
- `src/game/gameplay/NeuroAdaptationSystem.ts`
- `src/game/gameplay/DogfightManager.ts`
- `src/game/world/MapRegistry.ts`
- `src/game/world/RingManager.ts`

Current behavior:

- `Game.init()` loads sky, clouds, sky objects, atmosphere, world landmarks,
  sea traffic, weather identity, living-world events, audio polish, procedural
  world, and mode-specific systems.
- Zen uses `RingManager` with `map.missionRoutes.zen`.
- Expedition uses `MissionObjectiveSystem` with `map.missionRoutes.expedition`.
- Dogfight uses `WeaponSystem`, `CombatVfxSystem`, `DogfightManager`, and
  `AIController`.
- `ScoreManager` supports rings, objectives, bonuses, combo, elapsed time, and
  average speed.
- `SessionRecorder` records samples and events for summary analytics.
- `NeuroAdaptationSystem` derives composure/load/recovery/flow/coverage.

Known next-step needs:

- Record route-gate events consistently for Zen.
- Record mode completion moments.
- Add smooth-flight/composure reward events.
- Add stronger Expedition event semantics: discovery, postcard, low-pass,
  climb, complete.
- Make summary data line up with player-facing mode goals.

### 2.3 Cockpit HUD And rPPG Panel

Relevant code:

- `src/app/ui/hud/FlightHud.tsx`
- `src/app/ui/hud/NeuroCockpit.tsx`
- `src/app/ui/hud/NeuroConnectBanner.tsx`
- `src/neuro/rppgProvider.ts`
- `src/neuro/neuroManager.ts`

Current behavior:

- HUD is now bottom-heavy with a cockpit console.
- Flight values are throttled for readability.
- `NeuroCockpit` is embedded in the cockpit and shows:
  camera preview, primary source, signal bars, BPM, HRV, respiration, signal %.
- The rPPG provider already attempts `createRppgSession()` and
  `createRppgAppAdapter()` before falling back.
- The cockpit can show Camera, EEG, and simulated signals.

Known next-step needs:

- Add clearer display-state mapping:
  no camera, permission denied, warming up, low confidence, ready, simulated,
  EEG active.
- Make the camera panel more instructional and less telemetry-like.
- Add session coverage language directly in the flight panel.
- Make expanded/advanced state clearly optional.

### 2.4 Summary / Debrief

Relevant code:

- `src/app/screens/SummaryScreen.tsx`
- `src/stores/gameStore.ts`
- `src/game/gameplay/SessionRecorder.ts`
- `src/game/Game.ts`

Current behavior:

- Summary shows score, flight performance, signal performance, mission log, and
  charts.
- It already supports mode-aware titles and leads.
- It includes charts for altitude, speed/throttle, heading, calm/arousal, BPM,
  HRV, EEG bands, load proxy, alpha peak, and respiration when data is present.
- It already avoids direct medical claims in some explanatory copy.

Known next-step needs:

- Add a stronger debrief hero before charts:
  "What happened", "Best moments", "Signal coverage", "Next flight idea".
- Add no-sensor and low-confidence variants.
- Prefer camera/rPPG language when source is rPPG.
- Hide or de-emphasize EEG charts when EEG data is absent.
- Rename any remaining combat wording to tag/win language.

---

## 3. Target User Experience

### 3.1 First-Time Player

The first-time player should understand these points without help text:

- They can play without sensors.
- Camera biofeedback is optional and friendly.
- EEG is not required.
- Zen is calm route flying.
- Expedition is landmark discovery.
- Dogfight is playful aerial tag.
- The biplane is the easiest default.
- Finishing a session produces a useful debrief.

### 3.2 Returning Player

A returning player should have reasons to replay:

- Try a different aircraft.
- Complete more route gates.
- Discover all Expedition postcards.
- Improve smooth-flight streaks.
- Improve signal coverage.
- Try a higher Dogfight difficulty.
- Compare debrief moments across runs.

### 3.3 Parent / Clinician / Educator Viewer

The experience should feel:

- Safe and family-friendly.
- Playful rather than militaristic.
- Biofeedback-aware but not medicalized.
- Transparent about signal confidence.
- Useful even without a device.

---

## 4. Exact Incremental Commit Sequence

### Commit 1: `docs: add next productization plan`

Scope:

- Add this file.
- Do not modify runtime code.
- Do not overwrite previous plan files.

Verification:

- `git diff --check`
- Confirm only this markdown file is staged.

Acceptance:

- File exists at `overhaul-plan/neuroflight-next-gameplay-productization-plan.md`.
- Worktree is clean after commit.

---

### Commit 2: `feat: make cockpit rppg states clearer`

Scope:

- Refactor `NeuroCockpit` display-state logic into a small pure helper.
- States:
  - `none`: no camera/EEG/mock source active.
  - `permission-denied`: camera request failed due to browser permission.
  - `warming`: camera active but warmup incomplete or signal confidence low.
  - `low-confidence`: camera active with weak signal after warmup.
  - `ready`: camera active with usable signal.
  - `simulated`: mock signals active.
  - `eeg-active`: EEG source active.
- Display source-specific copy:
  - No camera: "Signals optional".
  - Permission denied: "Camera blocked in browser settings".
  - Warming: "Camera warming up".
  - Low confidence: "More light or steadier face".
  - Ready: "Camera signal ready".
  - Simulated: "Simulated flight signals".
  - EEG active: "EEG connected".
- Keep EEG advanced content hidden unless EEG source is active or user opens
  the advanced drawer.

Implementation notes:

- Prefer a helper like `getBiofeedbackDisplayState(...)`.
- Keep `useThrottledDisplayValue` behavior.
- Keep camera preview opt-in.
- Do not change `rppgProvider` unless a state cannot be derived from current
  store fields.

Tests:

- Add or expand `NeuroCockpit` helper tests.
- Test all display states above.
- Test EEG is not shown as primary when camera is active and EEG is absent.

Target checks before commit:

- `npm run test -- --run <new-or-updated-neurocockpit-test>`
- `npm run typecheck`

Acceptance:

- rPPG-only flight reads as camera-first.
- No-sensor flight does not look broken.
- EEG remains available but secondary.

---

### Commit 3: `feat: improve rppg cockpit guidance`

Scope:

- Add plain-language camera guidance to the cockpit:
  - "Face camera"
  - "Need more light"
  - "Hold steady"
  - "Signal ready"
  - "Signals optional"
- Add coverage/quality microcopy:
  - "Coverage builds during the flight"
  - "Debrief uses flight events when signal is low"
- Make the panel feel like a flight instrument:
  - Keep BPM, HRV proxy, respiration proxy, signal quality.
  - Add a small "coverage" indicator if current store/session state exposes it,
    otherwise show "coverage tracked after flight" copy only.

Implementation notes:

- Use current `neuro.signalQuality`, `neuro.bpmQuality`, `neuro.source`,
  `connection.cameraActive`, and provider error state if exposed.
- If permission-denied is not exposed cleanly, add a minimal non-breaking field
  in neuro state rather than string-parsing UI copy.
- Keep CSS animations calm; no blinking.

Tests:

- Test text for no camera, weak signal, ready signal, simulated source.
- Test advanced drawer still reveals EEG details when EEG source is active.

Target checks:

- `npm run typecheck`
- Relevant component/helper tests.

Acceptance:

- The cockpit tells a player what to do with the camera.
- The player is not punished or shamed for no/weak signal.
- The panel remains compact in the bottom cockpit.

---

### Commit 4: `feat: add debrief insight model`

Scope:

- Add a pure summary helper that derives insight cards from `SessionSummary`.
- Derive at least:
  - Session headline.
  - Mode completion status.
  - Best moment.
  - Signal coverage summary.
  - One next-flight suggestion.
  - Optional event-window highlights.
- Support variants:
  - no sensor data.
  - low signal coverage.
  - camera/rPPG data.
  - EEG data.
  - Dogfight tag session.
  - Expedition discovery session.
  - Zen route session.

Implementation notes:

- Put helper near `SummaryScreen` or in a small local summary module.
- Keep it pure and testable.
- Use no medical claims.
- Use event types currently available:
  `ring_hit`, `objective_complete`, `landmark_discovered`, `postcard`,
  `near_miss`, `hard_landing`, `crash`, `neuro_recovery`, `kill`,
  `death`, `shot_fired`, `shot_hit`, `respawn`.
- Translate `kill` event display to "Rival tagged" / "Tag win" in UI.

Tests:

- No-sensor session returns useful flight-only cards.
- Low-coverage rPPG session explains limits.
- Dogfight session uses "tag" and "wins", not "kills".
- Expedition session surfaces discoveries/postcards.
- Zen session surfaces route/ring completion.

Target checks:

- `npm run test -- --run <summary-helper-test>`
- `npm run typecheck`

Acceptance:

- Summary has a useful plain-language layer independent of charts.
- Summary avoids diagnosis/treatment language.

---

### Commit 5: `feat: redesign summary top debrief`

Scope:

- Update the top of `SummaryScreen` to show:
  - Score and mode title.
  - "Flight story" card.
  - "Best moments" card/list.
  - "Signal coverage" card.
  - "Next flight" suggestion.
- Keep existing charts below this new top section.
- Move heavy analytics lower.
- Make no-sensor summary explicitly useful:
  "No camera signal was used; this debrief focuses on flight events."

Implementation notes:

- Reuse existing colors and font variables.
- Avoid adding a new chart library.
- Keep responsive behavior: readable at desktop and laptop widths.
- Keep route replay button behavior.

Tests:

- Render summary with no `lastSession`.
- Render no-sensor summary.
- Render camera/rPPG summary.
- Render Dogfight summary and assert no "Kills" label in visible copy.

Target checks:

- `npm run test -- --run <summary-screen-test>`
- `npm run typecheck`
- `npm run lint`

Acceptance:

- A player can understand the session in under 10 seconds.
- Charts remain available but no longer dominate first impression.

---

### Commit 6: `feat: record zen route events and completion`

Scope:

- Record `ring_hit` events when Zen rings are passed.
- Add route completion state when all route gates have been passed.
- Add a Zen completion bonus and completion event.
- Add a simple smooth-flight streak metric if feasible from existing sample
  data:
  - count sustained periods without crash/hard landing and with stable speed.
  - keep implementation simple and deterministic.

Implementation notes:

- `ScoreManager.addRing()` already increments rings and combo.
- `Game` should record a `ring_hit` event for each ring hit.
- Add one route-complete event when `ringsPassed >= zenGoal`.
- Avoid infinite repeated completion events.

Tests:

- Zen ring hit records event.
- Route completion records once.
- Score increases on route completion.
- Summary objective count matches route gate count.

Target checks:

- `npm run test -- --run src/game/gameplay/ScoreManager.test.ts src/game/gameplay/SessionRecorder.test.ts`
- Add new test coverage as needed.
- `npm run typecheck`

Acceptance:

- Zen has a clear route completion payoff.
- Summary can list route moments.

---

### Commit 7: `feat: deepen expedition rewards`

Scope:

- Make Expedition objectives read as a 3-5 step journey.
- Add completion event when all Expedition objectives are done.
- Add "postcard" reward copy for postcard waypoints.
- Add score/feedback differences:
  - landmark discovery.
  - low-pass challenge.
  - climb challenge.
  - postcard moment.
  - full route complete.

Implementation notes:

- `MissionObjectiveSystem` already returns completion with waypoint kind.
- Add richer event detail in `Game` when objective completes.
- Keep existing mission route data unless spacing needs light tuning.
- Do not rewrite map system.

Tests:

- Completion event includes waypoint label and score.
- `landmark_discovered` fires for landmark/low-pass as intended.
- All-objectives-complete event fires once.
- Summary helper surfaces Expedition discoveries.

Target checks:

- `npm run test -- --run src/game/gameplay/SessionRecorder.test.ts`
- `npm run typecheck`

Acceptance:

- Expedition feels like discovery, not just flying through markers.
- The debrief can tell the story of what was visited.

---

### Commit 8: `feat: clarify mode scoring constants`

Scope:

- Centralize or document scoring constants for:
  - Zen ring.
  - Zen route complete.
  - Expedition objective.
  - Expedition route complete.
  - Dogfight tag.
  - Crash/reset penalty.
  - Composure/flow multiplier.
- Keep existing `ScoreManager` APIs compatible unless adding a small helper is
  clearly cleaner.

Implementation notes:

- Avoid hidden magic numbers in `Game.ts`.
- If adding a config object, keep it small and exported for tests.
- Continue applying difficulty multipliers where they already exist.

Tests:

- Score constants are applied by mode.
- Difficulty multiplier still affects intended score paths.
- Score never goes below zero after penalties.

Target checks:

- `npm run test -- --run src/game/gameplay/ScoreManager.test.ts`
- `npm run typecheck`

Acceptance:

- Mode scoring is explainable and reliable.

---

### Commit 9: `feat: strengthen aircraft personality in menu`

Scope:

- Improve aircraft cards in `MainMenu`.
- Add or use existing fields for:
  - handling label.
  - best-for copy.
  - difficulty.
  - speed/control/stability feel.
- Keep biplane default.
- Keep only verified available aircraft visible.

Implementation notes:

- Prefer existing `AircraftDefinition` fields first:
  `displayRole`, `handlingLabel`, `difficulty`, `available`.
- Add minimal fields only if needed:
  `bestFor?: string`
  `statBars?: { speed: number; handling: number; stability: number }`
- If adding fields, update tests and all available aircraft.
- Do not expose unavailable aircraft unless verified.

Tests:

- Default aircraft is biplane.
- Every available aircraft has display/handling copy.
- Menu renders available aircraft.
- Unavailable aircraft are hidden.

Target checks:

- `npm run test -- --run src/game/flight/AircraftRegistry.test.ts`
- `npm run typecheck`
- `npm run lint`

Acceptance:

- Aircraft selection feels intentional and fun.
- Each available aircraft has a clear reason to pick it.

---

### Commit 10: `feat: tune dogfight tag feedback`

Scope:

- Make Dogfight feedback even more tag-like:
  - "Rival tagged"
  - "You reset"
  - "Tag streak"
  - "Wins"
- Ensure no visible "kill" labels remain, except internal event type if not
  worth migrating.
- Add a clearer tag completion moment in HUD and summary.

Implementation notes:

- Internal `kill` event type may remain for compatibility, but visible copy
  must translate it.
- Avoid adding violent audio or visuals.
- Keep existing Dogfight manager behavior.

Tests:

- Summary visible copy does not contain "Kill" or "Kills".
- HUD score labels use "Wins".
- Tag event helper translates internal event names.

Target checks:

- Relevant summary/HUD tests.
- `npm run typecheck`

Acceptance:

- Parents should read the mode as playful aerial tag.

---

### Commit 11: `feat: improve objective and route feedback`

Scope:

- Tighten feedback when a player completes a route gate/objective:
  - small visual pulse.
  - sound cue.
  - HUD message.
  - event recorded.
- Add a clearer route/objective indicator when objective is off-screen.
- Keep UI compact and avoid new clutter.

Implementation notes:

- Reuse `DirectionIndicator` and existing audio polish where possible.
- Use existing `audioPolishSystem.playUi()` and chime paths where appropriate.
- Avoid adding heavy new VFX systems.

Tests:

- Objective completion invokes score and event recording.
- Off-screen route direction still available when objective/ring exists.

Target checks:

- `npm run test -- --run src/game/gameplay/MissionObjectiveSystem.test.ts` if created.
- `npm run typecheck`

Acceptance:

- Goals feel obvious during flight.
- Completion is satisfying but not noisy.

---

### Commit 12: `test: add productization regression coverage`

Scope:

- Add/expand tests across the final productization pass:
  - rPPG display states.
  - no-sensor summary.
  - low-confidence summary.
  - event-window insight derivation.
  - Zen route completion.
  - Expedition completion.
  - Dogfight family-friendly labels.
  - aircraft menu metadata.
  - UI controls do not trigger fire input.

Target checks:

- `npm run assets:audit`
- `npm run typecheck`
- `npm run test -- --run`
- `npm run build`
- `npm run lint`

Acceptance:

- Full gate passes.
- Worktree is clean.

---

## 5. rPPG-First Flight UX Specification

### 5.1 Display States

The cockpit biofeedback panel must map raw neuro connection data into one
friendly display state.

| State | Trigger | Primary label | Guidance |
| --- | --- | --- | --- |
| `none` | no EEG, no camera, no mock | Optional | Fly normally; camera can add debrief notes. |
| `permission-denied` | camera permission denied | Camera blocked | Enable camera in browser settings. |
| `warming` | camera active but warmup not complete | Camera warming | Face camera; signal is settling. |
| `low-confidence` | camera active but signal below usable threshold | Low signal | More light or steadier face. |
| `ready` | camera active and quality/confidence usable | Camera ready | Signal proxies are tracking. |
| `simulated` | mock source active | Simulated | Mock signals are driving ambience. |
| `eeg-active` | EEG source active | EEG ready | Advanced headset signals are connected. |

Implementation default:

- If both camera and EEG are active, show camera first unless `neuro.source` is
  explicitly `eeg`.
- If mock is active, show simulated state because it is test-only and should be
  clear.
- If no clean permission-denied field exists, expose one through neuro store or
  manager with minimal type churn.

### 5.2 Metrics To Show

Always show:

- Signal state.
- Signal quality bars.
- Short guidance sentence.

When camera/rPPG active:

- BPM when confidence allows.
- HRV proxy when confidence allows.
- Respiration proxy when confidence allows.
- Signal percentage or quality label.
- Camera preview toggle.

When no sensor:

- Do not show blank-looking metric boxes as failure.
- Use placeholders with friendly text:
  "Optional", "No signal", or "Flight only".

When EEG active:

- Show advanced EEG content only in expanded mode or EEG source.
- Do not dominate the default cockpit with EEG bands.

### 5.3 Copy Rules

Allowed:

- "Camera signal ready"
- "More light or steadier face"
- "Signals optional"
- "Coverage was limited"
- "HRV proxy"
- "Respiration proxy"
- "Composure proxy"

Avoid:

- "diagnosis"
- "treatment"
- "therapy"
- "stress detected"
- "anxiety"
- "medical"
- "EEG required"

---

## 6. Debrief Specification

### 6.1 Top-Level Layout

Before charts, show:

1. Header:
   mode, map, aircraft, difficulty.
2. Score panel:
   score, mode label, duration.
3. Flight story:
   one sentence summarizing what happened.
4. Best moments:
   2-4 cards from events.
5. Signal coverage:
   coverage status and confidence explanation.
6. Next flight:
   one suggestion.

Charts remain below.

### 6.2 Insight Card Examples

No sensor:

- Title: "Flight-only debrief"
- Detail: "No camera or headset signal was used, so this report focuses on
  route progress, speed, altitude, and game events."

Low signal:

- Title: "Limited signal coverage"
- Detail: "Camera signal was available for part of the flight. Biofeedback
  notes are shown only where confidence was usable."

Camera ready:

- Title: "Camera signal tracked"
- Detail: "The debrief includes camera-derived signal proxies alongside flight
  events."

Zen:

- Title: "Route flow"
- Detail: "You passed X of Y glowing route gates and reached a best combo of Z."

Expedition:

- Title: "Expedition log"
- Detail: "You completed X of Y landmarks, including [event label]."

Dogfight:

- Title: "Aerial tag"
- Detail: "You scored X tag wins with Y resets."

### 6.3 Event Windows

For notable events, derive a small window around the event time:

- 10 seconds before.
- 10 seconds after.
- nearest sample before event.
- nearest sample after event.

Use these windows to create gentle insights:

- "Signal confidence was strongest around this moment."
- "Speed climbed before this gate."
- "The route was completed after a steady segment."

Do not overfit:

- If samples are missing, omit the signal claim.
- If coverage is low, state that the insight is flight-only.

---

## 7. Mode Reward Loop Specification

### 7.1 Zen Flight

Goal:

- Make Zen feel like a complete calming arcade route.

Core loop:

1. Follow glowing route.
2. Pass gate.
3. Build combo/streak.
4. Maintain smooth flight.
5. Finish route.
6. Read debrief.

Implementation:

- Record `ring_hit` events.
- Add route-complete bonus.
- Add route-complete event.
- Add smooth flight streak if feasible.
- Use calm visual/audio cues.

Scoring:

- Ring pass: existing ring points.
- Every 3 ring combo: existing combo multiplier.
- Route complete: fixed bonus.
- Optional flow/composure multiplier: existing adaptation multiplier.

### 7.2 Expedition

Goal:

- Make Expedition feel like discovering a small theme-park route.

Core loop:

1. See current objective.
2. Fly toward beacon.
3. Complete landmark/low-pass/climb/postcard.
4. Receive discovery message and score.
5. Move to next objective.
6. Finish route and review log.

Implementation:

- Strengthen objective completion events.
- Add completion event for all Expedition objectives.
- Use objective kind in copy.
- Ensure objective spacing remains readable.

Scoring:

- Landmark: configured waypoint score.
- Low pass: configured score plus clean-flight bonus if available.
- Climb: configured score.
- Postcard: configured score and special debrief item.
- Full expedition complete: fixed bonus.

### 7.3 Dogfight

Goal:

- Keep Dogfight as playful aerial tag.

Core loop:

1. Find rival.
2. Line up tag.
3. Tag rival.
4. Rival respawns at safe distance.
5. Build wins/score.
6. Debrief shows tag rhythm and flight control.

Implementation:

- Keep current combat core.
- Strengthen visible copy translation.
- Ensure summary says "tag" and "wins".
- Avoid weapon/kills framing in UI.

Scoring:

- Tag win: current bonus, centralized constant.
- Reset/loss: current penalty or count only.
- Difficulty multiplier: keep existing difficulty config.

---

## 8. Aircraft Identity Specification

### 8.1 Available Aircraft

Current verified aircraft should remain:

- `storybook_biplane`: default, gentle cruiser.
- `spitfire`: fast ace run.
- `il28`: heavy recon.

Unavailable aircraft should stay hidden unless verified:

- Wright Flyer.
- Cessna.
- Celera.
- UFO.
- Sci-fi plane.
- Boeing.

### 8.2 Menu Card Content

Each available aircraft card should show:

- Name.
- One-line personality.
- Best-for label.
- Difficulty.
- Three compact stats:
  speed, handling, stability.

Example:

- Sunny Biplane
  - Best for: first flights and Zen routes.
  - Feel: gentle, stable, forgiving.
  - Speed: 2/5, handling: 4/5, stability: 5/5.

- Spitfire
  - Best for: Dogfight and fast routes.
  - Feel: quick, agile, less forgiving.
  - Speed: 4/5, handling: 4/5, stability: 3/5.

- IL-28 Reconnaissance
  - Best for: high-speed Expedition routes.
  - Feel: heavy, fast, deliberate.
  - Speed: 5/5, handling: 2/5, stability: 3/5.

### 8.3 Tests

- Default aircraft remains `storybook_biplane`.
- Every available aircraft has complete card metadata.
- Unavailable aircraft are not returned by `getAvailableAircraft()`.

---

## 9. Data And Interface Changes

### 9.1 `SessionRecorder`

Add or document additional event usage:

- `ring_hit`: Zen gate passed.
- `objective_complete`: Expedition objective completed.
- `landmark_discovered`: Landmark/low-pass/climb discovery.
- `postcard`: Postcard objective.
- `neuro_recovery`: Recovery/composure moment.
- `crash`: Crash or collision.
- `hard_landing`: lower-severity ground event.
- `kill`: internal Dogfight tag event; visible UI translates to tag/win.
- `respawn`: rival rejoined or player recovered.

Optional new event types if cleaner:

- `route_complete`
- `smooth_streak`
- `signal_shift`

Decision:

- Prefer adding `route_complete` and `smooth_streak` if used in both gameplay
  and summary.
- Do not rename `kill` internally unless migration is trivial; translate visible
  copy instead.

### 9.2 `ScoreManager`

Possible additions:

- `addRouteComplete(points: number, multiplier?: number)`
- `addSmoothBonus(points: number, multiplier?: number)`

Decision:

- Add methods only if they simplify `Game.ts`.
- Otherwise use `addBonus()` with centralized constants.

### 9.3 `AircraftDefinition`

Possible additions:

```ts
bestFor?: string;
statBars?: {
  speed: number;
  handling: number;
  stability: number;
};
```

Decision:

- Add these fields if improving the menu aircraft cards.
- Values must be 1-5 integers.
- Every available aircraft must define them.

### 9.4 `NeuroCockpit`

Add pure helper output shape:

```ts
interface BiofeedbackDisplayState {
  state: 'none' | 'permission-denied' | 'warming' | 'low-confidence' | 'ready' | 'simulated' | 'eeg-active';
  primaryLabel: string;
  guidance: string;
  tone: 'neutral' | 'warming' | 'ready' | 'warning' | 'simulated' | 'advanced';
  showCameraMetrics: boolean;
  showEegAdvanced: boolean;
}
```

Decision:

- Exact file location can be inside `NeuroCockpit.tsx` or a sibling helper.
- Export helper for tests.

### 9.5 `SummaryScreen`

Add pure helper output shape:

```ts
interface DebriefInsight {
  id: string;
  title: string;
  body: string;
  tone: 'flight' | 'signal' | 'reward' | 'warning' | 'next';
}
```

Decision:

- Helper should derive cards from `SessionSummary`.
- Keep rendered chart data code separate from insight derivation.

---

## 10. Browser Verification Scenarios

Use the local dev server, preferably:

```sh
npm run dev -- --host 127.0.0.1 --port 3011
```

Verify:

- Menu loads.
- Mode cards select correctly.
- Map cards select correctly.
- Aircraft cards select correctly.
- Camera button starts rPPG when permission is granted.
- Camera permission denied shows friendly copy.
- Simulate shows simulated state.
- No sensor shows optional state.
- Zen starts on both maps.
- Expedition starts on both maps.
- Dogfight starts on both maps.
- End Flight opens summary.
- Summary works with no sensor data.
- Summary works with mock/camera data.
- Dogfight summary uses "tag" and "wins", not visible "kills".
- Aircraft selector keeps biplane default.
- UI buttons do not fire Dogfight tag.

Screenshot set:

- Main menu with aircraft cards.
- rPPG ready cockpit.
- no-sensor cockpit.
- low-confidence/permission-denied state if practical.
- Zen route completion.
- Expedition objective completion.
- Dogfight tag moment.
- Summary top debrief.
- Summary signal section.

---

## 11. Required Final Verification

Run all commands before final handoff:

```sh
npm run assets:audit
npm run typecheck
npm run test -- --run
npm run build
npm run lint
```

If any command cannot run, record why in the final response and leave the
smallest possible worktree diff.

Expected final state:

- All tests pass.
- Build passes.
- Lint passes.
- Asset audit passes.
- Worktree is clean after final commit.

---

## 12. Acceptance Checklist

### rPPG UX

- [ ] Camera biofeedback is the primary neuro path.
- [ ] EEG is optional/advanced.
- [ ] No-sensor state feels intentional.
- [ ] Camera permission denied is friendly and actionable.
- [ ] Low-confidence camera state gives useful guidance.
- [ ] Ready camera state is clear.
- [ ] rPPG metrics use "proxy" language where needed.
- [ ] No medical claims.

### Debrief

- [ ] Summary opens with plain-language debrief cards.
- [ ] No-sensor summary is useful.
- [ ] Low-coverage summary is honest.
- [ ] Camera/rPPG summary shows signal coverage.
- [ ] Expedition summary surfaces discoveries/postcards.
- [ ] Zen summary surfaces route gates/completion.
- [ ] Dogfight summary uses tag/wins language.
- [ ] Charts remain below the readable overview.

### Modes

- [ ] Zen has route completion feedback.
- [ ] Zen records ring events.
- [ ] Expedition has completion feedback.
- [ ] Expedition records meaningful objective events.
- [ ] Dogfight remains playful aerial tag.
- [ ] Scoring constants are clear and tested.

### Aircraft

- [ ] Biplane is default.
- [ ] Available aircraft have clear personalities.
- [ ] Unverified aircraft stay hidden.
- [ ] Aircraft cards are useful before flight.

### QA

- [ ] UI controls do not trigger flight/fire input.
- [ ] Full command gate passes.
- [ ] Screenshots captured where practical.
- [ ] Incremental commits are present.

---

## 13. Risks And Guardrails

Risk: overcomplicating rPPG state.

- Guardrail: keep display states simple and derived from existing fields.

Risk: summary becomes too long.

- Guardrail: put plain-language cards first, charts below, and avoid duplicating
  every metric in prose.

Risk: making clinical claims accidentally.

- Guardrail: all copy uses signals/proxies/coverage/confidence.

Risk: Dogfight language regresses.

- Guardrail: add tests that visible summary/HUD copy does not contain
  "Kill"/"Kills".

Risk: adding scoring complexity that breaks current modes.

- Guardrail: centralize constants and add targeted scoring tests.

Risk: aircraft metadata becomes too elaborate.

- Guardrail: add only `bestFor` and `statBars` if needed.

Risk: browser screenshot automation may fail on WebGL.

- Guardrail: use headed/manual screenshots if headless WebGL fails.

---

## 14. Implementation Notes For The Next Agent

Start with the rPPG/debrief work, not aircraft or game-feel tweaks.

Recommended first commands:

```sh
git status --short --branch
rg "NeuroCockpit|SummaryScreen|SessionSummary|SessionRecorder|ScoreManager" src -n
npm run test -- --run src/app/ui/hud/FlightHud.test.ts src/game/gameplay/SessionRecorder.test.ts
```

Recommended first code commit:

- Extract and test `getBiofeedbackDisplayState()`.
- Keep UI behavior visually similar, but improve labels and state mapping.

Recommended second code commit:

- Add summary insight helper and tests.
- Then wire it into `SummaryScreen`.

Do not begin by changing the map/world systems. The world is good enough for
this pass. The product value now comes from making the session loop coherent.

---

## 15. Final Handoff Standard

When the implementation pass is complete, the final response should include:

- Commit list.
- What changed by subsystem.
- Verification commands and results.
- Any screenshots captured.
- Any known limitations or deferred work.

The final answer should not be a giant dump of implementation detail. The
markdown plan and commits should carry the detail; the final user-facing summary
should stay high-signal.
