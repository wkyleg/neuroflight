import type { FlightEvent, FlightSample } from '@/game/gameplay/SessionRecorder.ts';
import type { SessionSummary } from '@/stores/gameStore.ts';

export type DebriefInsightTone = 'flight' | 'signal' | 'reward' | 'warning' | 'next';

export interface DebriefInsight {
  id: string;
  title: string;
  body: string;
  tone: DebriefInsightTone;
}

function formatCount(value: number, goal: number): string {
  return `${value}/${Math.max(1, goal)}`;
}

function eventDisplayLabel(event: FlightEvent): string {
  if (event.label) return event.label.replace(/\bkill(s|ed)?\b/gi, 'tag$1');
  switch (event.type) {
    case 'kill':
      return 'Rival tagged';
    case 'death':
      return 'Flight reset';
    case 'ring_hit':
      return 'Route gate';
    case 'objective_complete':
      return 'Objective complete';
    case 'landmark_discovered':
      return 'Landmark discovered';
    case 'postcard':
      return 'Postcard moment';
    case 'neuro_recovery':
      return 'Recovery moment';
    case 'crash':
      return 'Crash recovery';
    case 'hard_landing':
      return 'Hard landing';
    case 'respawn':
      return 'Rival rejoined';
    case 'shot_hit':
      return 'Tag connected';
    case 'shot_fired':
      return 'Tag attempt';
    case 'near_miss':
      return 'Near miss';
    default:
      return event.type.replace(/_/g, ' ');
  }
}

function isRewardEvent(event: FlightEvent): boolean {
  return ['ring_hit', 'objective_complete', 'landmark_discovered', 'postcard', 'kill', 'neuro_recovery'].includes(
    event.type,
  );
}

function closestSample(samples: FlightSample[], event: FlightEvent): FlightSample | null {
  if (samples.length === 0) return null;
  return samples.reduce((best, sample) => (Math.abs(sample.t - event.t) < Math.abs(best.t - event.t) ? sample : best));
}

function buildModeStory(session: SessionSummary): DebriefInsight {
  if (session.mode === 'dogfight') {
    return {
      id: 'flight-story',
      title: 'Aerial tag run',
      body: `You scored ${session.kills} tag ${session.kills === 1 ? 'win' : 'wins'} with ${session.deaths} ${session.deaths === 1 ? 'reset' : 'resets'} on this route.`,
      tone: session.kills > 0 ? 'reward' : 'flight',
    };
  }

  if (session.mode === 'free') {
    return {
      id: 'flight-story',
      title: 'Expedition log',
      body: `You completed ${formatCount(session.objectivesCompleted, session.objectiveGoal)} discoveries and covered ${(session.totalDistance / 1000).toFixed(1)} km of the route.`,
      tone: session.objectivesCompleted > 0 ? 'reward' : 'flight',
    };
  }

  return {
    id: 'flight-story',
    title: 'Route flow',
    body: `You passed ${formatCount(session.ringsPassed, session.objectiveGoal)} glowing gates with a best combo of ${session.bestCombo}x.`,
    tone: session.ringsPassed > 0 ? 'reward' : 'flight',
  };
}

function buildSignalStory(session: SessionSummary): DebriefInsight {
  if (session.neuroSource === 'none' || session.signalCoveragePct <= 0) {
    return {
      id: 'signal-coverage',
      title: 'Flight-only debrief',
      body: 'No camera or headset signal was used, so this report focuses on route progress, altitude, speed, and game events.',
      tone: 'signal',
    };
  }

  if (session.signalCoveragePct < 30) {
    return {
      id: 'signal-coverage',
      title: 'Limited signal coverage',
      body: `Signal coverage was ${Math.round(session.signalCoveragePct)}%, so biofeedback notes are shown only where confidence was usable.`,
      tone: 'warning',
    };
  }

  const source = session.neuroSource === 'eeg' ? 'EEG headset' : 'camera';
  return {
    id: 'signal-coverage',
    title: `${source[0].toUpperCase()}${source.slice(1)} signal tracked`,
    body: `Signal coverage reached ${Math.round(session.signalCoveragePct)}%, so the debrief can compare signal proxies with flight events.`,
    tone: 'signal',
  };
}

function buildBestMoment(session: SessionSummary): DebriefInsight {
  const scored = session.events.filter((event) => isRewardEvent(event)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const event = scored[0];

  if (event) {
    const sample = closestSample(session.samples, event);
    const signalNote =
      sample && session.signalCoveragePct >= 30
        ? ` Flow proxy was ${Math.round(sample.flow * 100)}% near that moment.`
        : '';
    return {
      id: 'best-moment',
      title: eventDisplayLabel(event),
      body: `${event.score ? `Worth ${event.score} points. ` : ''}This was one of the clearest session moments around ${Math.round(event.t)} seconds.${signalNote}`,
      tone: 'reward',
    };
  }

  return {
    id: 'best-moment',
    title: 'Clean flight baseline',
    body: `You flew for ${Math.round(session.durationMs / 1000)} seconds and covered ${(session.totalDistance / 1000).toFixed(1)} km.`,
    tone: 'flight',
  };
}

function buildNextSuggestion(session: SessionSummary): DebriefInsight {
  if (session.neuroSource === 'none') {
    return {
      id: 'next-flight',
      title: 'Next flight idea',
      body: 'Try the same route with camera biofeedback on to add signal coverage and recovery notes to the debrief.',
      tone: 'next',
    };
  }

  if (session.mode === 'zen' && session.ringsPassed < session.objectiveGoal) {
    return {
      id: 'next-flight',
      title: 'Next flight idea',
      body: 'Replay the Zen route and aim for a full gate chain with wide, smooth turns.',
      tone: 'next',
    };
  }

  if (session.mode === 'free' && session.objectivesCompleted < session.objectiveGoal) {
    return {
      id: 'next-flight',
      title: 'Next flight idea',
      body: 'Continue the Expedition route and try to collect the remaining postcard or landmark moments.',
      tone: 'next',
    };
  }

  if (session.mode === 'dogfight') {
    return {
      id: 'next-flight',
      title: 'Next flight idea',
      body:
        session.kills > session.deaths
          ? 'Try the same aerial tag route at the next difficulty.'
          : 'Try Rookie difficulty with the biplane and use wider turns to keep the rival in view.',
      tone: 'next',
    };
  }

  return {
    id: 'next-flight',
    title: 'Next flight idea',
    body: 'Try a different aircraft on the same map to compare flight feel and signal coverage.',
    tone: 'next',
  };
}

function buildEventWindowInsight(session: SessionSummary): DebriefInsight | null {
  if (session.signalCoveragePct < 30 || session.samples.length === 0) return null;
  const event = session.events.find((candidate) => isRewardEvent(candidate));
  if (!event) return null;

  const before = session.samples.filter((sample) => sample.t >= event.t - 10 && sample.t < event.t);
  const after = session.samples.filter((sample) => sample.t >= event.t && sample.t <= event.t + 10);
  if (before.length === 0 || after.length === 0) return null;

  const beforeFlow = before.reduce((sum, sample) => sum + sample.flow, 0) / before.length;
  const afterFlow = after.reduce((sum, sample) => sum + sample.flow, 0) / after.length;
  const delta = afterFlow - beforeFlow;

  return {
    id: 'event-window',
    title: 'Event window',
    body:
      Math.abs(delta) < 0.04
        ? `Flow proxy stayed steady around ${eventDisplayLabel(event).toLowerCase()}.`
        : `Flow proxy ${delta > 0 ? 'rose' : 'dipped'} after ${eventDisplayLabel(event).toLowerCase()}.`,
    tone: delta >= 0 ? 'signal' : 'warning',
  };
}

export function buildDebriefInsights(session: SessionSummary): DebriefInsight[] {
  const insights = [buildModeStory(session), buildBestMoment(session), buildSignalStory(session)];
  const eventWindow = buildEventWindowInsight(session);
  if (eventWindow) insights.push(eventWindow);
  insights.push(buildNextSuggestion(session));
  return insights;
}
