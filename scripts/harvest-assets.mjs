#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX = path.join(ROOT, 'asset-inbox');
const RAW = path.join(INBOX, 'raw');
const EXTRACTED = path.join(INBOX, 'extracted');
const CANDIDATES = path.join(INBOX, 'candidates');
const MANIFEST_PATH = path.join(INBOX, 'manifests/source-assets.json');
const ATTRIBUTION_PATH = path.join(INBOX, 'ATTRIBUTION.md');
const PUBLIC_ASSETS = path.join(ROOT, 'public/assets');
const WORLD_SCALE_CREDITS_PATH = path.join(PUBLIC_ASSETS, 'CREDITS_WORLD_SCALE.md');
const USER_AGENT = 'NeuroFlightAssetHarvest/1.0 (+https://github.com/wkyleg/neuroflight)';
const NOW = new Date().toISOString();
const args = new Set(process.argv.slice(2));
const AUDIT_ONLY = args.has('--audit');
const SKIP_DOWNLOADS = args.has('--skip-downloads');
const CANDIDATE_CATEGORIES = [
  'aircraft',
  'desert',
  'ocean',
  'sky',
  'sky-objects',
  'mega-landmarks',
  'air-traffic',
  'skyboxes',
  'lighting-sky',
  'weather-vfx',
  'weather-identity',
  'atmosphere-textures',
  'combat-vfx',
  'audio',
  'textures',
  'structures',
  'world-scale-structures',
  'distant-ground',
  'props'
];
const TEXTURE_LIKE_CATEGORIES = new Set([
  'textures',
  'skyboxes',
  'lighting-sky',
  'weather-vfx',
  'weather-identity',
  'atmosphere-textures',
  'combat-vfx'
]);
const MODEL_LIKE_CATEGORIES = new Set([
  'aircraft',
  'sky-objects',
  'mega-landmarks',
  'air-traffic',
  'structures',
  'world-scale-structures',
  'distant-ground',
  'props',
  'desert',
  'ocean',
  'sky'
]);
const AUDIO_LIKE_CATEGORIES = new Set(['audio']);
const MAJOR_DOMAIN_CATEGORIES = [
  'mega-landmarks',
  'air-traffic',
  'weather-identity',
  'combat-vfx',
  'audio',
  'lighting-sky',
  'distant-ground',
  'world-scale-structures'
];

const KENNEY_PACKS = [
  ['nature-kit', 'Nature Kit', 'https://kenney.nl/assets/nature-kit', 'https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip', ['desert', 'ocean', 'props']],
  ['watercraft-kit', 'Watercraft Kit', 'https://kenney.nl/assets/watercraft-kit', 'https://kenney.nl/media/pages/assets/watercraft-kit/a335cfed49-1713519620/kenney_watercraft-pack.zip', ['ocean', 'props']],
  ['pirate-kit', 'Pirate Kit', 'https://kenney.nl/assets/pirate-kit', 'https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip', ['ocean', 'structures', 'props']],
  ['platformer-kit', 'Platformer Kit', 'https://kenney.nl/assets/platformer-kit', 'https://kenney.nl/media/pages/assets/platformer-kit/1585cf62b4-1775122253/kenney_platformer-kit.zip', ['sky', 'props', 'structures']],
  ['survival-kit', 'Survival Kit', 'https://kenney.nl/assets/survival-kit', 'https://kenney.nl/media/pages/assets/survival-kit/4065a8185b-1712149243/kenney_survival-kit.zip', ['desert', 'props', 'structures']],
  ['modular-buildings', 'Modular Buildings', 'https://kenney.nl/assets/modular-buildings', 'https://kenney.nl/media/pages/assets/modular-buildings/3253b4219a-1707397411/kenney_modular-buildings.zip', ['structures', 'desert']],
  ['city-kit-suburban', 'City Kit Suburban', 'https://kenney.nl/assets/city-kit-suburban', 'https://kenney.nl/media/pages/assets/city-kit-suburban/2c871b7af2-1745479373/kenney_city-kit-suburban_20.zip', ['structures', 'desert']],
  ['city-kit-roads', 'City Kit Roads', 'https://kenney.nl/assets/city-kit-roads', 'https://kenney.nl/media/pages/assets/city-kit-roads/74288c9459-1741864740/kenney_city-kit-roads.zip', ['structures', 'props']],
  ['city-kit-industrial', 'City Kit Industrial', 'https://kenney.nl/assets/city-kit-industrial', 'https://kenney.nl/media/pages/assets/city-kit-industrial/5fcb837741-1750838303/kenney_city-kit-industrial_1.0.zip', ['structures', 'desert']],
  ['city-kit-commercial', 'City Kit Commercial', 'https://kenney.nl/assets/city-kit-commercial', 'https://kenney.nl/media/pages/assets/city-kit-commercial/a742d900eb-1753115042/kenney_city-kit-commercial_2.1.zip', ['structures']],
  ['factory-kit', 'Factory Kit', 'https://kenney.nl/assets/factory-kit', 'https://kenney.nl/media/pages/assets/factory-kit/edaac9d4f6-1777639602/kenney_factory-kit_3.0.zip', ['structures', 'desert']],
  ['tower-defense-kit', 'Tower Defense Kit', 'https://kenney.nl/assets/tower-defense-kit', 'https://kenney.nl/media/pages/assets/tower-defense-kit/a402493eaa-1726471567/kenney_tower-defense-kit.zip', ['structures', 'props']],
  ['particle-pack', 'Particle Pack', 'https://kenney.nl/assets/particle-pack', 'https://kenney.nl/media/pages/assets/particle-pack/f8fe0f8cb8-1677578741/kenney_particle-pack.zip', ['weather-vfx', 'atmosphere-textures'], { visualRole: 'weather-vfx', altitudeHint: 'near-camera', runtimeCandidate: true }],
  ['voxel-pack', 'Voxel Pack', 'https://kenney.nl/assets/voxel-pack', 'https://kenney.nl/media/pages/assets/voxel-pack/a3a73d0ff7-1677662501/kenney_voxel-pack.zip', ['sky-objects', 'mega-landmarks', 'props'], { visualRole: 'floating-prop-kit', altitudeHint: 'low-to-mid', runtimeCandidate: false, assetDomain: 'world-scale', runtimeUse: 'experimental floating voxel silhouettes', playtestPriority: 2 }],
  ['smoke-particles', 'Smoke Particles', 'https://kenney.nl/assets/smoke-particles', null, ['weather-vfx', 'weather-identity', 'combat-vfx', 'atmosphere-textures'], { visualRole: 'smoke-particle-sheet', altitudeHint: 'near-to-mid', runtimeCandidate: true, assetDomain: 'vfx', runtimeUse: 'sandstorm, smoke trail, hit puffs, explosion puffs', mapAffinity: 'desert,ocean', visibilityBand: 'near-to-mid', playtestPriority: 5 }],
  ['ui-audio', 'UI Audio', 'https://kenney.nl/assets/ui-audio', null, ['audio'], { visualRole: 'ui-audio', altitudeHint: 'none', runtimeCandidate: true, assetDomain: 'audio', runtimeUse: 'radio bleeps and menu/control feedback', mapAffinity: 'all', visibilityBand: 'none', playtestPriority: 3 }],
  ['impact-sounds', 'Impact Sounds', 'https://kenney.nl/assets/impact-sounds', null, ['audio'], { visualRole: 'impact-audio', altitudeHint: 'none', runtimeCandidate: true, assetDomain: 'audio', runtimeUse: 'hit, explosion, collision, and combat one-shots', mapAffinity: 'all', visibilityBand: 'none', playtestPriority: 4 }],
  ['sci-fi-sounds', 'Sci-Fi Sounds', 'https://kenney.nl/assets/sci-fi-sounds', null, ['audio'], { visualRole: 'sci-fi-audio', altitudeHint: 'none', runtimeCandidate: true, assetDomain: 'audio', runtimeUse: 'weapon, alert, radio, and flyby sweeteners', mapAffinity: 'all', visibilityBand: 'none', playtestPriority: 4 }]
];

const OPENGAMEART_PAGES = [
  ['oga-low-poly-biplane', 'Low Poly Biplane', 'https://opengameart.org/content/low-poly-biplane', ['aircraft']],
  ['oga-low-poly-desert-assets', 'Low Poly Desert Assets', 'https://opengameart.org/content/low-poly-desert-assets', ['desert', 'structures', 'props']],
  ['oga-low-poly-nature-pack', 'Low Poly Nature Pack', 'https://opengameart.org/content/low-poly-nature-pack-1', ['desert', 'ocean', 'props']]
];

const OPENGAMEART_DIRECT_ASSETS = [
  {
    id: 'oga-cloudy-skyboxes-cubemap',
    title: 'Cloudy Skyboxes Cubemap',
    sourceUrl: 'https://opengameart.org/content/cloudy-skyboxes-0',
    downloadUrl: 'https://opengameart.org/sites/default/files/sbs_-_cloudy_skyboxes_-_cubemap_0.zip',
    license: 'CC0',
    author: 'Screaming Brain Studios',
    categories: ['skyboxes', 'atmosphere-textures'],
    visualRole: 'skybox',
    altitudeHint: 'all',
    runtimeCandidate: true
  },
  {
    id: 'oga-cloudy-skyboxes-panorama',
    title: 'Cloudy Skyboxes Panorama',
    sourceUrl: 'https://opengameart.org/content/cloudy-skyboxes-0',
    downloadUrl: 'https://opengameart.org/sites/default/files/sbs_-_cloudy_skyboxes_-_panorama_0.zip',
    license: 'CC0',
    author: 'Screaming Brain Studios',
    categories: ['skyboxes', 'atmosphere-textures'],
    visualRole: 'panorama-skybox',
    altitudeHint: 'all',
    runtimeCandidate: true
  },
  {
    id: 'oga-skydome-3d',
    title: 'Skydome 3D',
    sourceUrl: 'https://opengameart.org/content/skydome-3d',
    downloadUrl: 'https://opengameart.org/sites/default/files/Skydome3D.zip',
    license: 'CC0',
    author: 'GGBotNet',
    categories: ['skyboxes', 'sky-objects'],
    visualRole: 'skydome',
    altitudeHint: 'all',
    runtimeCandidate: false
  },
  {
    id: 'oga-hot-air-balloon-png',
    title: 'Hot Air Balloon PNG',
    sourceUrl: 'https://opengameart.org/content/hot-air-balloon',
    downloadUrl: 'https://opengameart.org/sites/default/files/HotAirBalloon_0.png',
    license: 'CC0',
    author: 'Bert-o-Naught',
    categories: ['sky-objects', 'weather-vfx', 'atmosphere-textures'],
    visualRole: 'billboard-sky-object',
    altitudeHint: 'mid',
    runtimeCandidate: true
  },
  {
    id: 'oga-clouds-png',
    title: 'Clouds PNG',
    sourceUrl: 'https://opengameart.org/content/clouds',
    downloadUrl: 'https://opengameart.org/sites/default/files/Clouds_4.png',
    license: 'CC0',
    author: 'Igor Gundarev',
    categories: ['weather-vfx', 'atmosphere-textures'],
    visualRole: 'cloud-sprite',
    altitudeHint: 'mid-to-high',
    runtimeCandidate: true
  },
  {
    id: 'oga-zeppelin-png',
    title: 'Zeppelin PNG',
    sourceUrl: 'https://opengameart.org/content/zeppelin',
    downloadUrl: 'https://opengameart.org/sites/default/files/Zeppelin.png',
    license: 'CC-BY 3.0',
    author: 'Jean Alvin',
    categories: ['sky-objects', 'atmosphere-textures'],
    visualRole: 'billboard-sky-object',
    altitudeHint: 'mid-to-high',
    runtimeCandidate: true
  },
  {
    id: 'oga-airship-png',
    title: 'Airship PNG',
    sourceUrl: 'https://opengameart.org/content/airship',
    downloadUrl: 'https://opengameart.org/sites/default/files/airship.png',
    license: 'CC-BY 3.0',
    author: 'natebot13',
    categories: ['sky-objects', 'atmosphere-textures'],
    visualRole: 'billboard-sky-object',
    altitudeHint: 'mid',
    runtimeCandidate: true
  }
];

const OPENGAMEART_SCRAPE_ASSETS = [
  {
    id: 'oga-lightning',
    title: 'Lightning',
    sourceUrl: 'https://opengameart.org/content/lightning',
    categories: ['weather-vfx', 'weather-identity', 'combat-vfx', 'atmosphere-textures'],
    visualRole: 'lightning-sheet',
    assetDomain: 'weather',
    mapAffinity: 'ocean,desert',
    visibilityBand: 'mid-to-high',
    runtimeUse: 'storm lightning sheets and electric hit flashes',
    playtestPriority: 5,
    maxFiles: 2
  },
  {
    id: 'oga-backgrounds-effects',
    title: 'Backgrounds & Effects Sprite Pack',
    sourceUrl: 'https://opengameart.org/content/backgrounds-effects-sprite-pack',
    categories: ['weather-vfx', 'weather-identity', 'atmosphere-textures'],
    visualRole: 'weather-background-sprites',
    assetDomain: 'weather',
    mapAffinity: 'desert,ocean',
    visibilityBand: 'near-to-mid',
    runtimeUse: 'rain, smoke, steam, clouds, and horizon effects',
    playtestPriority: 4,
    maxFiles: 3
  },
  {
    id: 'oga-fire-smoke-trail',
    title: 'Fire and Smoke Static and Trail',
    sourceUrl: 'https://opengameart.org/content/fire-and-smoke-static-and-trail',
    categories: ['combat-vfx', 'weather-vfx', 'atmosphere-textures'],
    visualRole: 'smoke-trail',
    assetDomain: 'combat-vfx',
    mapAffinity: 'all',
    visibilityBand: 'near',
    runtimeUse: 'projectile smoke trails and impact smoke',
    playtestPriority: 5,
    maxFiles: 3
  },
  {
    id: 'oga-muzzle-flash-effects',
    title: 'Gun Muzzle Flash Effects',
    sourceUrl: 'https://opengameart.org/content/gun-muzzle-flash-effects-fire-and-ion-and-melee',
    categories: ['combat-vfx'],
    visualRole: 'muzzle-flash',
    assetDomain: 'combat-vfx',
    mapAffinity: 'all',
    visibilityBand: 'near',
    runtimeUse: 'one-frame dogfight muzzle flashes',
    playtestPriority: 5,
    maxFiles: 2
  },
  {
    id: 'oga-toon-muzzle-flash',
    title: '16 Toon Muzzle Flash',
    sourceUrl: 'https://opengameart.org/content/16-toon-muzzle-flash',
    categories: ['combat-vfx'],
    visualRole: 'muzzle-flash',
    assetDomain: 'combat-vfx',
    mapAffinity: 'all',
    visibilityBand: 'near',
    runtimeUse: 'stylized muzzle flash alternatives',
    playtestPriority: 3,
    maxFiles: 2
  },
  {
    id: 'oga-more-explosions',
    title: 'More Explosions',
    sourceUrl: 'https://opengameart.org/content/more-explosions',
    categories: ['combat-vfx', 'weather-vfx'],
    visualRole: 'explosion-sprite',
    assetDomain: 'combat-vfx',
    mapAffinity: 'all',
    visibilityBand: 'near-to-mid',
    runtimeUse: 'hit and kill explosion sprites',
    playtestPriority: 4,
    maxFiles: 4
  },
  {
    id: 'oga-clouds-skybox-1',
    title: 'Clouds Skybox 1',
    sourceUrl: 'https://opengameart.org/content/clouds-skybox-1',
    categories: ['skyboxes', 'lighting-sky', 'atmosphere-textures'],
    visualRole: 'six-sided-skybox',
    assetDomain: 'sky-lighting',
    mapAffinity: 'all',
    visibilityBand: 'all',
    runtimeUse: 'alternate bright cloud skybox',
    playtestPriority: 3,
    maxFiles: 2
  },
  {
    id: 'oga-wind1',
    title: 'Wind 1',
    sourceUrl: 'https://opengameart.org/content/wind1',
    categories: ['audio'],
    visualRole: 'wind-loop',
    assetDomain: 'audio',
    mapAffinity: 'desert,ocean',
    visibilityBand: 'none',
    runtimeUse: 'altitude and speed wind ambience',
    playtestPriority: 5,
    maxFiles: 5
  },
  {
    id: 'oga-electricity-game-sound-pack',
    title: 'Electricity Game Sound Pack',
    sourceUrl: 'https://opengameart.org/content/electricity-game-sound-pack',
    categories: ['audio'],
    visualRole: 'thunder-electric-audio',
    assetDomain: 'audio',
    mapAffinity: 'ocean,desert',
    visibilityBand: 'none',
    runtimeUse: 'thunder, lightning, and energy weapon one-shots',
    playtestPriority: 4,
    maxFiles: 12
  },
  {
    id: 'oga-interface-sounds',
    title: 'Interface Sounds',
    sourceUrl: 'https://opengameart.org/content/interface-sounds',
    categories: ['audio'],
    visualRole: 'ui-audio',
    assetDomain: 'audio',
    mapAffinity: 'all',
    visibilityBand: 'none',
    runtimeUse: 'radio and UI beeps',
    playtestPriority: 3,
    maxFiles: 2
  }
];

const QUATERNIUS_SOURCE_REFS = [
  ['quaternius-stylized-nature-megakit', 'Stylized Nature MegaKit', 'https://quaternius.com/packs/stylizednaturemegakit.html', 'https://quaternius.itch.io/stylized-nature-megakit', ['desert', 'ocean', 'props']],
  ['quaternius-ultimate-stylized-nature', 'Ultimate Stylized Nature Pack', 'https://quaternius.com/packs/ultimatestylizednature.html', 'https://drive.google.com/drive/folders/1IV3bXHzkNvuNWFHPi4KPx-G4ghuxIuT-?usp=sharing', ['desert', 'ocean', 'props']],
  ['quaternius-ships', 'Ships Pack', 'https://quaternius.com/packs/ships.html', 'https://drive.google.com/drive/folders/1Qf31QTnGfxRzYxx8dHmlVGDT4KmIa0Vy?usp=sharing', ['ocean']],
  ['quaternius-ultimate-modular-ruins', 'Ultimate Modular Ruins Pack', 'https://quaternius.com/packs/ultimatemodularruins.html', 'https://drive.google.com/drive/folders/1ETp2ldaHaP0BkS4FBmkT-g9Yf88T_cIX?usp=sharing', ['desert', 'structures']],
  ['quaternius-animated-fish', 'Animated Fish Pack', 'https://quaternius.com/packs/animatedfish.html', 'https://drive.google.com/drive/folders/1SvlOveJJjmhSn-FgCRyojc1T5QHjjGkF?usp=sharing', ['ocean']]
];

const POLY_PIZZA_QUERIES = [
  ['airplane', ['aircraft'], 5],
  ['hot air balloon', ['sky', 'sky-objects', 'props'], 10, { visualRole: 'balloon', altitudeHint: 'mid-to-high', runtimeCandidate: true }],
  ['balloon', ['sky-objects', 'props'], 8, { visualRole: 'balloon', altitudeHint: 'mid-to-high', runtimeCandidate: true }],
  ['blimp', ['sky-objects', 'props'], 10, { visualRole: 'airship', altitudeHint: 'high', runtimeCandidate: true }],
  ['airship', ['sky-objects', 'props'], 10, { visualRole: 'airship', altitudeHint: 'high', runtimeCandidate: true }],
  ['zeppelin', ['sky-objects', 'props'], 8, { visualRole: 'airship', altitudeHint: 'high', runtimeCandidate: true }],
  ['cloud', ['sky', 'sky-objects'], 10, { visualRole: 'cloud-mesh', altitudeHint: 'mid-to-high', runtimeCandidate: true }],
  ['clouds', ['sky', 'sky-objects'], 8, { visualRole: 'cloud-mesh', altitudeHint: 'mid-to-high', runtimeCandidate: true }],
  ['floating island', ['sky-objects', 'desert', 'ocean'], 10, { visualRole: 'floating-island', altitudeHint: 'low-to-mid', runtimeCandidate: true }],
  ['floating rock', ['sky-objects', 'desert'], 8, { visualRole: 'floating-island', altitudeHint: 'low-to-mid', runtimeCandidate: true }],
  ['island', ['sky-objects', 'ocean'], 8, { visualRole: 'floating-island', altitudeHint: 'low-to-mid', runtimeCandidate: true }],
  ['sky island', ['mega-landmarks', 'sky-objects'], 10, { visualRole: 'sky-landmark', altitudeHint: 'mid-to-high', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'desert,ocean', visibilityBand: 'far', runtimeUse: 'large floating world silhouettes', playtestPriority: 5 }],
  ['castle', ['mega-landmarks', 'world-scale-structures'], 10, { visualRole: 'sky-castle-or-ruin', altitudeHint: 'low-to-mid', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'desert,ocean', visibilityBand: 'far', runtimeUse: 'distant fantasy landmark silhouette', playtestPriority: 4 }],
  ['temple', ['mega-landmarks', 'world-scale-structures', 'desert'], 10, { visualRole: 'temple-landmark', altitudeHint: 'ground-to-mid', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'desert', visibilityBand: 'far', runtimeUse: 'desert landmark destination', playtestPriority: 5 }],
  ['ruins', ['mega-landmarks', 'world-scale-structures', 'desert'], 10, { visualRole: 'ruins-landmark', altitudeHint: 'ground-to-mid', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'desert', visibilityBand: 'far', runtimeUse: 'large readable ruins', playtestPriority: 4 }],
  ['arch', ['mega-landmarks', 'world-scale-structures', 'distant-ground'], 8, { visualRole: 'arch-landmark', altitudeHint: 'ground-to-mid', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'desert', visibilityBand: 'far', runtimeUse: 'fly-through rock/ruin arch silhouette', playtestPriority: 4 }],
  ['portal', ['mega-landmarks', 'world-scale-structures', 'sky-objects'], 8, { visualRole: 'portal-landmark', altitudeHint: 'ground-to-high', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'all', visibilityBand: 'far', runtimeUse: 'large fantastical sky/ground landmark', playtestPriority: 3 }],
  ['monument', ['mega-landmarks', 'world-scale-structures'], 8, { visualRole: 'monument-landmark', altitudeHint: 'ground-to-mid', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'all', visibilityBand: 'far', runtimeUse: 'readable navigation monument', playtestPriority: 3 }],
  ['observatory', ['mega-landmarks', 'world-scale-structures'], 8, { visualRole: 'observatory-landmark', altitudeHint: 'ground-to-mid', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'desert,ocean', visibilityBand: 'far', runtimeUse: 'science landmark silhouette', playtestPriority: 3 }],
  ['radar', ['mega-landmarks', 'world-scale-structures', 'desert'], 8, { visualRole: 'radar-landmark', altitudeHint: 'ground-to-mid', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'desert,ocean', visibilityBand: 'far', runtimeUse: 'radar/radio tower silhouette', playtestPriority: 4 }],
  ['radio tower', ['mega-landmarks', 'world-scale-structures', 'desert'], 8, { visualRole: 'tower-landmark', altitudeHint: 'ground-to-mid', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'desert', visibilityBand: 'far', runtimeUse: 'thin vertical navigation silhouette', playtestPriority: 4 }],
  ['oil rig', ['mega-landmarks', 'world-scale-structures', 'ocean'], 10, { visualRole: 'ocean-industrial-landmark', altitudeHint: 'ground-to-mid', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'ocean', visibilityBand: 'far', runtimeUse: 'large ocean industrial platform', playtestPriority: 5 }],
  ['harbor', ['mega-landmarks', 'world-scale-structures', 'ocean'], 8, { visualRole: 'harbor-landmark', altitudeHint: 'ground', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'ocean', visibilityBand: 'far', runtimeUse: 'coastal structure cluster', playtestPriority: 3 }],
  ['shipwreck', ['mega-landmarks', 'distant-ground', 'ocean'], 10, { visualRole: 'shipwreck-landmark', altitudeHint: 'ground', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'ocean', visibilityBand: 'mid-to-far', runtimeUse: 'large ocean silhouette and flyover target', playtestPriority: 5 }],
  ['wreck', ['mega-landmarks', 'distant-ground', 'desert', 'ocean'], 8, { visualRole: 'wreck-landmark', altitudeHint: 'ground', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'desert,ocean', visibilityBand: 'mid-to-far', runtimeUse: 'large readable crash/wreck prop', playtestPriority: 4 }],
  ['canyon', ['mega-landmarks', 'distant-ground', 'desert'], 8, { visualRole: 'canyon-landmark', altitudeHint: 'ground', runtimeCandidate: true, assetDomain: 'distant-ground', mapAffinity: 'desert', visibilityBand: 'far', runtimeUse: 'large terrain silhouette', playtestPriority: 5 }],
  ['mesa', ['mega-landmarks', 'distant-ground', 'desert'], 8, { visualRole: 'mesa-landmark', altitudeHint: 'ground', runtimeCandidate: true, assetDomain: 'distant-ground', mapAffinity: 'desert', visibilityBand: 'far', runtimeUse: 'large desert plateau silhouette', playtestPriority: 5 }],
  ['mountain', ['mega-landmarks', 'distant-ground'], 8, { visualRole: 'mountain-landmark', altitudeHint: 'ground', runtimeCandidate: true, assetDomain: 'distant-ground', mapAffinity: 'desert,ocean', visibilityBand: 'far', runtimeUse: 'far horizon silhouettes', playtestPriority: 3 }],
  ['cliff', ['mega-landmarks', 'distant-ground', 'ocean'], 8, { visualRole: 'cliff-landmark', altitudeHint: 'ground', runtimeCandidate: true, assetDomain: 'distant-ground', mapAffinity: 'ocean,desert', visibilityBand: 'far', runtimeUse: 'large coast/desert cliffs', playtestPriority: 4 }],
  ['volcano', ['mega-landmarks', 'distant-ground', 'ocean'], 8, { visualRole: 'volcano-landmark', altitudeHint: 'ground-to-mid', runtimeCandidate: true, assetDomain: 'mega-landmark', mapAffinity: 'ocean', visibilityBand: 'far', runtimeUse: 'island-scale focal landmark', playtestPriority: 4 }],
  ['seaplane', ['air-traffic', 'aircraft', 'ocean'], 8, { visualRole: 'air-traffic', altitudeHint: 'mid', runtimeCandidate: true, assetDomain: 'air-traffic', mapAffinity: 'ocean', visibilityBand: 'mid-to-far', runtimeUse: 'distant ocean air traffic', playtestPriority: 4 }],
  ['glider', ['air-traffic', 'aircraft', 'sky-objects'], 8, { visualRole: 'air-traffic', altitudeHint: 'mid-to-high', runtimeCandidate: true, assetDomain: 'air-traffic', mapAffinity: 'all', visibilityBand: 'mid-to-far', runtimeUse: 'quiet readable air traffic', playtestPriority: 4 }],
  ['drone', ['air-traffic', 'aircraft', 'sky-objects'], 8, { visualRole: 'air-traffic', altitudeHint: 'mid', runtimeCandidate: true, assetDomain: 'air-traffic', mapAffinity: 'all', visibilityBand: 'mid', runtimeUse: 'small moving sky traffic', playtestPriority: 3 }],
  ['parachute', ['air-traffic', 'sky-objects'], 8, { visualRole: 'parachute', altitudeHint: 'mid', runtimeCandidate: true, assetDomain: 'air-traffic', mapAffinity: 'all', visibilityBand: 'mid', runtimeUse: 'slow whimsical sky traffic', playtestPriority: 3 }],
  ['helicopter', ['air-traffic', 'aircraft'], 8, { visualRole: 'air-traffic', altitudeHint: 'low-to-mid', runtimeCandidate: true, assetDomain: 'air-traffic', mapAffinity: 'all', visibilityBand: 'mid', runtimeUse: 'distant moving aircraft variety', playtestPriority: 3 }],
  ['cargo plane', ['air-traffic', 'aircraft'], 8, { visualRole: 'air-traffic', altitudeHint: 'high', runtimeCandidate: true, assetDomain: 'air-traffic', mapAffinity: 'all', visibilityBand: 'far', runtimeUse: 'large distant aircraft silhouettes', playtestPriority: 3 }],
  ['kite', ['sky-objects', 'props'], 8, { visualRole: 'kite', altitudeHint: 'mid', runtimeCandidate: true }],
  ['bird', ['sky-objects', 'props'], 8, { visualRole: 'distant-life', altitudeHint: 'mid-to-high', runtimeCandidate: false }],
  ['ufo', ['sky-objects', 'props'], 6, { visualRole: 'whimsical-sky-object', altitudeHint: 'high', runtimeCandidate: false }],
  ['cactus', ['desert', 'props'], 5],
  ['lighthouse', ['ocean', 'structures'], 5],
  ['sailboat', ['ocean'], 5],
  ['ship', ['ocean'], 5],
  ['whale', ['ocean', 'props'], 4],
  ['buoy', ['ocean', 'props'], 4],
  ['tower', ['desert', 'structures'], 4],
  ['rock', ['desert', 'ocean', 'props'], 4],
  ['palm tree', ['ocean', 'props'], 4]
];

const POLY_HAVEN_HDRIS = [
  ['pink_sunrise', 'Pink Sunrise', '2k'],
  ['kiara_1_dawn', 'Kiara 1 Dawn', '2k'],
  ['venice_sunset', 'Venice Sunset', '2k'],
  ['sunflowers_puresky', 'Sunflowers Puresky', '2k'],
  ['approaching_storm', 'Approaching Storm', '1k'],
  ['cloud_layers', 'Cloud Layers', '1k'],
  ['furry_clouds', 'Furry Clouds', '1k'],
  ['the_sky_is_on_fire', 'The Sky Is On Fire', '1k'],
  ['kloofendal_38d_partly_cloudy_puresky', 'Kloofendal Partly Cloudy Puresky', '1k'],
  ['kloofendal_misty_morning_puresky', 'Kloofendal Misty Morning Puresky', '1k'],
  ['rogland_overcast', 'Rogland Overcast', '1k'],
  ['qwantani_sunset_puresky', 'Qwantani Sunset Puresky', '1k'],
  ['blue_cloud', 'Blue Cloud', '1k'],
  ['brown_photostudio_02', 'Brown Photostudio 02', '1k'],
  ['dikhololo_night', 'Dikhololo Night', '1k'],
  ['moonless_golf', 'Moonless Golf', '1k'],
  ['satara_night', 'Satara Night', '1k'],
  ['table_mountain_1', 'Table Mountain 1', '1k'],
  ['drakensberg_solitary_mountain', 'Drakensberg Solitary Mountain', '1k'],
  ['spruit_sunrise', 'Spruit Sunrise', '1k'],
  ['wasteland_clouds_puresky', 'Wasteland Clouds Puresky', '1k']
];

const POLY_HAVEN_TEXTURES = [
  ['aerial_beach_01', 'Aerial Beach 01', ['textures', 'ocean']],
  ['aerial_beach_02', 'Aerial Beach 02', ['textures', 'ocean']],
  ['sand_01', 'Sand 01', ['textures', 'desert']],
  ['rock_surface', 'Rock Surface', ['textures', 'desert', 'ocean']],
  ['gray_rocks', 'Gray Rocks', ['textures', 'desert', 'ocean']],
  ['coast_sand_rocks_02', 'Coast Sand Rocks 02', ['textures', 'ocean']],
  ['rocky_trail', 'Rocky Trail', ['textures', 'desert']],
  ['cliff_rocks_02', 'Cliff Rocks 02', ['textures', 'distant-ground', 'desert', 'ocean']],
  ['aerial_rocks_01', 'Aerial Rocks 01', ['textures', 'distant-ground', 'desert']],
  ['brown_mud_leaves_01', 'Brown Mud Leaves 01', ['textures', 'distant-ground']],
  ['concrete_layers_02', 'Concrete Layers 02', ['textures', 'world-scale-structures']],
  ['metal_plate_01', 'Metal Plate 01', ['textures', 'world-scale-structures']],
  ['painted_concrete', 'Painted Concrete', ['textures', 'world-scale-structures']],
  ['gravel_02', 'Gravel 02', ['textures', 'distant-ground', 'desert']]
];

const AMBIENTCG_QUERIES = [
  ['sand', ['textures', 'desert']],
  ['canyon', ['textures', 'desert', 'distant-ground']],
  ['cliff', ['textures', 'desert', 'ocean', 'distant-ground']],
  ['rock', ['textures', 'desert', 'ocean']],
  ['gravel', ['textures', 'desert', 'distant-ground']],
  ['concrete', ['textures', 'world-scale-structures']],
  ['metal', ['textures', 'world-scale-structures']],
  ['terrain', ['textures', 'desert']],
  ['water', ['textures', 'ocean']],
  ['shore', ['textures', 'ocean']],
  ['foam', ['textures', 'ocean']],
  ['runway', ['textures', 'world-scale-structures']]
];

const OPEN_HDRI_SOURCE_REFS = [
  ['open-hdri-sky-library', 'Open HDRI Sky Library', 'https://openhdri.org/', ['skyboxes', 'atmosphere-textures']],
  ['open-hdri-cloudy-skies', 'Open HDRI Cloudy Skies', 'https://openhdri.org/category/skies/', ['skyboxes', 'atmosphere-textures']]
];

const FREESOUND_QUERIES = [
  ['wind altitude loop', 'wind-loop', 'desert,ocean', 10],
  ['propeller aircraft flyby', 'flyby-audio', 'all', 8],
  ['thunder distant storm', 'thunder-audio', 'ocean,desert', 8],
  ['rain squall wind', 'rain-audio', 'ocean', 8],
  ['ocean waves wind', 'ocean-ambience', 'ocean', 8],
  ['desert wind gust', 'desert-ambience', 'desert', 8],
  ['radio beep ui', 'radio-ui-audio', 'all', 8],
  ['explosion distant', 'explosion-audio', 'all', 8],
  ['missile whoosh', 'missile-audio', 'all', 8],
  ['gunfire burst', 'weapon-audio', 'all', 8]
];

const PUBLIC_DOMAIN_AEROSPACE_REFS = [
  ['nasa-3d-resources', 'NASA 3D Resources', 'https://github.com/nasa/NASA-3D-Resources', 'NASA', 'NASA public domain / usage-guidelines', ['aircraft', 'air-traffic', 'mega-landmarks']],
  ['nasa-airborne-platform-models', 'NASA Airborne Science Aircraft Platform Models', 'https://airbornescience.nasa.gov/3d-models/', 'NASA Airborne Science Program', 'NASA public domain / usage-guidelines', ['aircraft', 'air-traffic']],
  ['smithsonian-3d-open-access', 'Smithsonian 3D Open Access', 'https://3d.si.edu/', 'Smithsonian Institution', 'CC0 / Smithsonian Open Access', ['aircraft', 'mega-landmarks', 'world-scale-structures']],
  ['smithsonian-wright-flyer', 'Smithsonian Wright Flyer 3D Reference', 'https://3d.si.edu/object/3d/wright-flyer:d8c623be-4ebc-11ea-b77f-2e728ce88125', 'Smithsonian Institution', 'CC0 / Smithsonian Open Access', ['aircraft', 'air-traffic']]
];

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function safeName(value) {
  return value
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'asset';
}

async function ensureDirs() {
  if (!AUDIT_ONLY && !SKIP_DOWNLOADS) {
    await fs.rm(CANDIDATES, { recursive: true, force: true });
  }

  const dirs = [
    RAW,
    EXTRACTED,
    CANDIDATES,
    path.join(INBOX, 'manifests'),
    path.join(INBOX, 'screenshots/baseline'),
    ...CANDIDATE_CATEGORIES.map((d) => path.join(CANDIDATES, d))
  ];
  await Promise.all(dirs.map((dir) => fs.mkdir(dir, { recursive: true })));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.text();
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers } });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.json();
}

function normalizeUrl(url) {
  return decodeHtml(url).replace(/ /g, '%20');
}

function formatFromUrl(url) {
  const pathname = new URL(url).pathname;
  const ext = path.extname(pathname).replace('.', '').toLowerCase();
  return ext || 'unknown';
}

async function resolveKenneyZipDownload(sourceUrl) {
  const html = await fetchText(sourceUrl);
  const match = html.match(/https:\/\/kenney\.nl\/media\/pages\/assets\/[^"']+?\.zip/);
  if (!match) throw new Error(`No Kenney zip download found on ${sourceUrl}`);
  return normalizeUrl(match[0]);
}

function extractOpenGameArtFileUrls(html) {
  const urls = new Set();
  const filePattern = /(?:https:\/\/opengameart\.org)?\/sites\/default\/files\/[^"'<>\s]+?\.(?:zip|png|jpg|jpeg|webp|wav|ogg|mp3|flac)/gi;
  for (const match of html.matchAll(filePattern)) {
    const url = normalizeUrl(new URL(match[0], 'https://opengameart.org').toString());
    const basename = path.basename(new URL(url).pathname).toLowerCase();
    const ext = path.extname(basename);
    const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    const isPageChrome =
      basename === 'cc0.png' ||
      basename === 'sara-logo.png' ||
      basename.startsWith('oga-icon-') ||
      basename.startsWith('preview') ||
      basename.startsWith('picture-');
    if (isImage && isPageChrome) continue;
    urls.add(url);
  }
  return [...urls];
}

async function sha256(filePath) {
  const buffer = await fs.readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function downloadFile(url, destination) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  if (await exists(destination)) {
    const stat = await fs.stat(destination);
    if (stat.size > 0) {
      return { status: 'already-present', byteLength: stat.size, sha256: await sha256(destination) };
    }
  }

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok || !response.body) throw new Error(`Download failed ${response.status}: ${url}`);
  const tempPath = `${destination}.download`;
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tempPath));
  await fs.rename(tempPath, destination);
  const stat = await fs.stat(destination);
  return { status: 'downloaded', byteLength: stat.size, sha256: await sha256(destination) };
}

async function run(command, commandArgs) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(' ')} failed (${code}): ${stderr}`));
    });
  });
}

async function extractZip(zipPath, destination) {
  if (!(await exists(zipPath))) return false;
  await fs.mkdir(destination, { recursive: true });
  const marker = path.join(destination, '.extracted-ok');
  if (await exists(marker)) return true;
  await run('unzip', ['-q', '-o', zipPath, '-d', destination]);
  await fs.writeFile(marker, `${NOW}\n`);
  return true;
}

async function walk(dir) {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

async function linkFile(sourcePath, category, prefix) {
  const ext = path.extname(sourcePath);
  const base = safeName(path.basename(sourcePath, ext));
  const destDir = path.join(CANDIDATES, category);
  await fs.mkdir(destDir, { recursive: true });
  let dest = path.join(destDir, `${safeName(prefix)}-${base}${ext.toLowerCase()}`);
  let i = 2;
  while (await exists(dest)) {
    dest = path.join(destDir, `${safeName(prefix)}-${base}-${i}${ext.toLowerCase()}`);
    i += 1;
  }
  const target = path.relative(path.dirname(dest), sourcePath);
  await fs.symlink(target, dest);
  return rel(dest);
}

async function linkCandidates(entry, rootPath, prefix) {
  const files = await walk(rootPath);
  const categories = entry.candidateCategories ?? ['props'];
  const wantsTextureLike = categories.some((category) => TEXTURE_LIKE_CATEGORIES.has(category));
  const wantsAudio = categories.some((category) => AUDIO_LIKE_CATEGORIES.has(category));
  const wantsModels = categories.some((category) => MODEL_LIKE_CATEGORIES.has(category)) && !wantsAudio;
  const allowed = new Set([
    ...(wantsModels ? ['.glb', '.gltf', '.obj', '.fbx', '.blend'] : []),
    ...(wantsTextureLike ? ['.jpg', '.jpeg', '.png', '.hdr', '.exr', '.webp'] : []),
    ...(wantsAudio ? ['.wav', '.ogg', '.mp3', '.flac', '.m4a'] : [])
  ]);
  const sourceFiles = files.filter((file) => allowed.has(path.extname(file).toLowerCase())).slice(0, 600);
  const linked = [];

  for (const file of sourceFiles) {
    for (const category of categories) {
      linked.push(await linkFile(file, category, prefix));
    }
  }

  entry.candidateCount = linked.length;
  entry.candidatePaths = linked.slice(0, 80);
  if (linked.length > entry.candidatePaths.length) {
    entry.notes = `${entry.notes ? `${entry.notes} ` : ''}${linked.length - entry.candidatePaths.length} additional candidate symlinks omitted from manifest preview.`;
  }
}

function makeBaseEntry({
  id,
  source,
  title,
  sourceUrl,
  downloadUrl,
  license,
  author,
  categories,
  notes,
  visualRole,
  altitudeHint,
  runtimeCandidate,
  assetDomain,
  mapAffinity,
  visibilityBand,
  runtimeUse,
  playtestPriority,
  sizeBytes,
  format,
  durationSeconds
}) {
  const requiresAttribution = /cc-?by|creative commons attribution/i.test(license);
  return {
    id,
    source,
    title,
    sourceUrl,
    downloadUrl,
    license,
    author,
    attribution: requiresAttribution ? `${title} by ${author}, ${license}. Source: ${sourceUrl}` : `${title} by ${author}, ${license}.`,
    downloadedAt: null,
    rawPath: null,
    extractedPath: null,
    candidateCategories: categories,
    visualRole: visualRole ?? null,
    altitudeHint: altitudeHint ?? null,
    runtimeCandidate: runtimeCandidate ?? false,
    assetDomain: assetDomain ?? null,
    mapAffinity: mapAffinity ?? null,
    visibilityBand: visibilityBand ?? null,
    runtimeUse: runtimeUse ?? null,
    playtestPriority: playtestPriority ?? null,
    sizeBytes: sizeBytes ?? null,
    format: format ?? (downloadUrl ? formatFromUrl(downloadUrl) : null),
    durationSeconds: durationSeconds ?? null,
    notes: notes ?? '',
    status: 'pending'
  };
}

async function processZipEntry(entry, rawFile, extractedDir) {
  if (!AUDIT_ONLY && !SKIP_DOWNLOADS) {
    console.log(`download zip: ${entry.id}`);
    const result = await downloadFile(entry.downloadUrl, rawFile);
    Object.assign(entry, {
      downloadedAt: NOW,
      rawPath: rel(rawFile),
      byteLength: result.byteLength,
      sizeBytes: result.byteLength,
      sha256: result.sha256,
      format: formatFromUrl(entry.downloadUrl),
      status: result.status === 'already-present' ? 'already-present' : 'downloaded'
    });

    const extracted = await extractZip(rawFile, extractedDir);
    if (extracted) {
      entry.extractedPath = rel(extractedDir);
      await linkCandidates(entry, extractedDir, entry.id);
    }
  } else {
    entry.rawPath = rel(rawFile);
    entry.extractedPath = rel(extractedDir);
    entry.status = 'planned';
  }
  return entry;
}

async function processFileEntry(entry, rawFile) {
  if (!AUDIT_ONLY && !SKIP_DOWNLOADS) {
    console.log(`download file: ${entry.id}`);
    const result = await downloadFile(entry.downloadUrl, rawFile);
    Object.assign(entry, {
      downloadedAt: NOW,
      rawPath: rel(rawFile),
      byteLength: result.byteLength,
      sizeBytes: result.byteLength,
      sha256: result.sha256,
      format: formatFromUrl(entry.downloadUrl),
      status: result.status === 'already-present' ? 'already-present' : 'downloaded'
    });
    await linkCandidates(entry, path.dirname(rawFile), entry.id);
  } else {
    entry.rawPath = rel(rawFile);
    entry.status = 'planned';
  }
  return entry;
}

async function processDirectEntry(entry, rawFile, extractedDir) {
  if (/\.(zip|7z)$/i.test(rawFile)) {
    return processZipEntry(entry, rawFile, extractedDir);
  }
  return processFileEntry(entry, rawFile);
}

async function harvestKenney() {
  const entries = [];
  for (const [id, title, sourceUrl, downloadUrl, categories, meta = {}] of KENNEY_PACKS) {
    let resolvedDownloadUrl = downloadUrl;
    const entry = makeBaseEntry({
      id: `kenney-${id}`,
      source: 'Kenney',
      title,
      sourceUrl,
      downloadUrl: resolvedDownloadUrl,
      license: 'CC0 1.0',
      author: 'Kenney',
      categories,
      notes: 'Official Kenney zip pack.',
      ...meta
    });
    try {
      if (!resolvedDownloadUrl) {
        resolvedDownloadUrl = await resolveKenneyZipDownload(sourceUrl);
        entry.downloadUrl = resolvedDownloadUrl;
        entry.format = formatFromUrl(resolvedDownloadUrl);
      }
      const fileName = path.basename(new URL(resolvedDownloadUrl).pathname);
      entries.push(
        await processZipEntry(entry, path.join(RAW, 'kenney', id, fileName), path.join(EXTRACTED, 'kenney', id))
      );
    } catch (error) {
      entry.status = 'failed';
      entry.notes = `${entry.notes} ${error.message}`;
      entries.push(entry);
    }
  }
  return entries;
}

async function harvestOpenGameArtDirectAssets() {
  const entries = [];
  for (const asset of OPENGAMEART_DIRECT_ASSETS) {
    const entry = makeBaseEntry({
      id: asset.id,
      source: 'OpenGameArt',
      title: asset.title,
      sourceUrl: asset.sourceUrl,
      downloadUrl: asset.downloadUrl,
      license: asset.license,
      author: asset.author,
      categories: asset.categories,
      notes: 'Direct OpenGameArt download selected for sky/atmosphere tests.',
      visualRole: asset.visualRole,
      altitudeHint: asset.altitudeHint,
      runtimeCandidate: asset.runtimeCandidate
    });
    try {
      const pathname = new URL(asset.downloadUrl).pathname;
      const fileName = decodeURIComponent(path.basename(pathname));
      entries.push(
        await processDirectEntry(
          entry,
          path.join(RAW, 'opengameart', safeName(asset.title), fileName),
          path.join(EXTRACTED, 'opengameart', safeName(asset.title))
        )
      );
    } catch (error) {
      entry.status = 'failed';
      entry.notes = `${entry.notes} ${error.message}`;
      entries.push(entry);
    }
  }
  return entries;
}

async function harvestOpenGameArtScrapedAssets() {
  const entries = [];
  for (const asset of OPENGAMEART_SCRAPE_ASSETS) {
    try {
      const html = await fetchText(asset.sourceUrl);
      const author = html.match(/Author:&nbsp;<\/div>[\s\S]*?<a href="\/users\/[^"]+">([^<]+)<\/a>/)?.[1];
      const license = html.match(/<div class='license-name'>([^<]+)<\/div>/)?.[1] ?? 'CC0 1.0';
      if (!/CC0|CC-BY|Creative Commons Attribution/i.test(license)) {
        throw new Error(`Unsupported OpenGameArt license: ${license}`);
      }

      const fileUrls = extractOpenGameArtFileUrls(html).slice(0, asset.maxFiles ?? 3);
      if (fileUrls.length === 0) throw new Error('No downloadable file URL found');

      for (let i = 0; i < fileUrls.length; i++) {
        const downloadUrl = fileUrls[i];
        const fileName = decodeURIComponent(path.basename(new URL(downloadUrl).pathname));
        const title = fileUrls.length > 1 ? `${asset.title} ${i + 1}` : asset.title;
        const entry = makeBaseEntry({
          id: `${asset.id}-${safeName(fileName)}`,
          source: 'OpenGameArt',
          title,
          sourceUrl: asset.sourceUrl,
          downloadUrl,
          license,
          author: author ? decodeHtml(author) : 'OpenGameArt contributor',
          categories: asset.categories,
          notes: 'Scraped OpenGameArt download selected for world-scale, weather, combat, or audio tests.',
          visualRole: asset.visualRole,
          altitudeHint: asset.altitudeHint ?? null,
          runtimeCandidate: true,
          assetDomain: asset.assetDomain,
          mapAffinity: asset.mapAffinity,
          visibilityBand: asset.visibilityBand,
          runtimeUse: asset.runtimeUse,
          playtestPriority: asset.playtestPriority
        });
        entries.push(
          await processDirectEntry(
            entry,
            path.join(RAW, 'opengameart', safeName(asset.title), fileName),
            path.join(EXTRACTED, 'opengameart', safeName(asset.title), safeName(fileName))
          )
        );
      }
    } catch (error) {
      entries.push({
        ...makeBaseEntry({
          id: `${asset.id}-catalog`,
          source: 'OpenGameArt',
          title: asset.title,
          sourceUrl: asset.sourceUrl,
          downloadUrl: null,
          license: 'CC0 or CC-BY',
          author: 'OpenGameArt contributor',
          categories: asset.categories,
          notes: `Scrape failed: ${error.message}`,
          visualRole: asset.visualRole,
          runtimeCandidate: false,
          assetDomain: asset.assetDomain,
          mapAffinity: asset.mapAffinity,
          visibilityBand: asset.visibilityBand,
          runtimeUse: asset.runtimeUse,
          playtestPriority: asset.playtestPriority
        }),
        status: 'failed'
      });
    }
  }
  return entries;
}

async function harvestOpenGameArt() {
  const entries = [];
  for (const [id, title, sourceUrl, categories] of OPENGAMEART_PAGES) {
    const entry = makeBaseEntry({
      id,
      source: 'OpenGameArt',
      title,
      sourceUrl,
      downloadUrl: null,
      license: 'CC0 1.0',
      author: 'OpenGameArt contributor',
      categories,
      notes: 'Direct file URL scraped from the OpenGameArt asset page.'
    });

    try {
      const html = await fetchText(sourceUrl);
      const author = html.match(/Author:&nbsp;<\/div>[\s\S]*?<a href="\/users\/[^"]+">([^<]+)<\/a>/)?.[1];
      const license = html.match(/<div class='license-name'>([^<]+)<\/div>/)?.[1];
      const fileUrl = html.match(/https:\/\/opengameart\.org\/sites\/default\/files\/[^"]+\.zip/)?.[0];
      if (author) entry.author = decodeHtml(author);
      if (license) entry.license = license;
      if (fileUrl) entry.downloadUrl = fileUrl;
      entry.attribution = /cc-?by|creative commons attribution/i.test(entry.license)
        ? `${entry.title} by ${entry.author}, ${entry.license}. Source: ${entry.sourceUrl}`
        : `${entry.title} by ${entry.author}, ${entry.license}.`;
      if (!entry.downloadUrl) throw new Error('No zip URL found');
      const fileName = path.basename(new URL(entry.downloadUrl).pathname);
      entries.push(await processZipEntry(entry, path.join(RAW, 'opengameart', safeName(title), fileName), path.join(EXTRACTED, 'opengameart', safeName(title))));
    } catch (error) {
      entry.status = 'failed';
      entry.notes = `${entry.notes} ${error.message}`;
      entries.push(entry);
    }
  }
  return entries;
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractServerState(html) {
  const match = html.match(/window\.__SERVER_APP_STATE__\s*=\s*([\s\S]*?)<\/script>/);
  if (!match) return null;
  return JSON.parse(match[1].trim());
}

function flattenModels(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenModels(item, out);
  } else if (value && typeof value === 'object') {
    if (value.publicID && value.title && value.creator && value.licence) out.push(value);
    for (const key of Object.keys(value)) {
      if (key !== 'creator') flattenModels(value[key], out);
    }
  }
  return out;
}

async function getPolyPizzaSearchResults(query, limit) {
  const html = await fetchText(`https://poly.pizza/search/${encodeURIComponent(query)}`);
  const state = extractServerState(html);
  const models = flattenModels(state?.initialData?.results ?? state?.initialData ?? []);
  const seen = new Set();
  return models
    .filter((model) => {
      const license = String(model.licence ?? '');
      if (!/CC0|CC-BY|Creative Commons Attribution/i.test(license)) return false;
      if (seen.has(model.publicID)) return false;
      seen.add(model.publicID);
      return true;
    })
    .slice(0, limit);
}

async function getPolyPizzaModel(publicId) {
  const sourceUrl = `https://poly.pizza/m/${publicId}`;
  const html = await fetchText(sourceUrl);
  const state = extractServerState(html);
  const model = state?.initialData?.model;
  if (!model?.ResourceID) throw new Error(`No ResourceID on ${sourceUrl}`);
  return { sourceUrl, model };
}

async function harvestPolyPizza() {
  const entries = [];
  const seen = new Set();
  for (const [query, categories, limit, meta = {}] of POLY_PIZZA_QUERIES) {
    let searchResults = [];
    try {
      searchResults = await getPolyPizzaSearchResults(query, limit);
    } catch (error) {
      entries.push({
        ...makeBaseEntry({
          id: `poly-pizza-search-${safeName(query)}`,
          source: 'Poly Pizza',
          title: `Poly Pizza search: ${query}`,
          sourceUrl: `https://poly.pizza/search/${encodeURIComponent(query)}`,
          downloadUrl: null,
          license: 'Unknown',
          author: 'Unknown',
          categories,
          notes: `Search failed: ${error.message}`
        }),
        status: 'failed'
      });
      continue;
    }

    for (const result of searchResults) {
      if (seen.has(result.publicID)) continue;
      seen.add(result.publicID);
      try {
        const { sourceUrl, model } = await getPolyPizzaModel(result.publicID);
        const license = model.Licence?.replace('CC0 1.0', 'CC0 1.0').replace('CC-BY 3.0', 'CC-BY 3.0') ?? result.licence;
        const title = model.Title ?? result.title;
        const author = model.Creator?.Username ?? result.creator?.username ?? 'Unknown';
        const glbUrl = `https://static.poly.pizza/${model.ResourceID}.glb`;
        const entry = makeBaseEntry({
          id: `poly-pizza-${safeName(result.publicID)}-${safeName(title)}`,
          source: 'Poly Pizza',
          title,
          sourceUrl,
          downloadUrl: glbUrl,
          license,
          author,
          categories,
          notes: `Discovered from Poly Pizza search query "${query}". Public ID ${result.publicID}.`,
          ...meta
        });
        const rawFile = path.join(RAW, 'poly-pizza', safeName(result.publicID), `${safeName(title)}.glb`);
        if (!AUDIT_ONLY && !SKIP_DOWNLOADS) {
          console.log(`download glb: ${entry.id}`);
          const dl = await downloadFile(glbUrl, rawFile);
          Object.assign(entry, {
            downloadedAt: NOW,
            rawPath: rel(rawFile),
            byteLength: dl.byteLength,
            sizeBytes: dl.byteLength,
            sha256: dl.sha256,
            format: 'glb',
            status: dl.status === 'already-present' ? 'already-present' : 'downloaded'
          });
          await linkCandidates(entry, path.dirname(rawFile), entry.id);
        } else {
          entry.rawPath = rel(rawFile);
          entry.status = 'planned';
        }
        entries.push(entry);
      } catch (error) {
        entries.push({
          ...makeBaseEntry({
            id: `poly-pizza-${safeName(result.publicID)}`,
            source: 'Poly Pizza',
            title: result.title ?? result.publicID,
            sourceUrl: `https://poly.pizza/m/${result.publicID}`,
            downloadUrl: null,
            license: result.licence ?? 'Unknown',
            author: result.creator?.username ?? 'Unknown',
            categories,
            notes: `Model failed: ${error.message}`
          }),
          status: 'failed'
        });
      }
    }
  }
  return entries;
}

async function harvestPolyHaven() {
  const entries = [];

  for (const [assetId, title, preferredResolution = '1k'] of POLY_HAVEN_HDRIS) {
    const entry = makeBaseEntry({
      id: `poly-haven-${assetId}`,
      source: 'Poly Haven',
      title,
      sourceUrl: `https://polyhaven.com/a/${assetId}`,
      downloadUrl: null,
      license: 'CC0 1.0',
      author: 'Poly Haven',
      categories: ['sky', 'skyboxes', 'lighting-sky', 'atmosphere-textures', 'textures'],
      notes: `${preferredResolution.toUpperCase()} HDRI selected for browser-friendly sky/lighting tests.`,
      visualRole: 'hdri-sky',
      altitudeHint: 'all',
      runtimeCandidate: true,
      assetDomain: 'sky-lighting',
      mapAffinity: 'all',
      visibilityBand: 'all',
      runtimeUse: 'sky lighting and mood reference',
      playtestPriority: 3
    });
    try {
      const files = await fetchJson(`https://api.polyhaven.com/files/${assetId}`);
      entry.downloadUrl = files.hdri?.[preferredResolution]?.hdr?.url ?? files.hdri?.['1k']?.hdr?.url ?? files.hdri?.['2k']?.hdr?.url;
      if (!entry.downloadUrl) throw new Error('No 1K/2K HDR URL found');
      const rawFile = path.join(RAW, 'poly-haven', assetId, path.basename(new URL(entry.downloadUrl).pathname));
      if (!AUDIT_ONLY && !SKIP_DOWNLOADS) {
        console.log(`download hdri: ${entry.id}`);
        const dl = await downloadFile(entry.downloadUrl, rawFile);
        Object.assign(entry, {
          downloadedAt: NOW,
          rawPath: rel(rawFile),
          byteLength: dl.byteLength,
          sizeBytes: dl.byteLength,
          sha256: dl.sha256,
          format: 'hdr',
          status: dl.status === 'already-present' ? 'already-present' : 'downloaded'
        });
        await linkCandidates(entry, path.dirname(rawFile), entry.id);
      } else {
        entry.rawPath = rel(rawFile);
        entry.status = 'planned';
      }
    } catch (error) {
      entry.status = 'failed';
      entry.notes = `${entry.notes} ${error.message}`;
    }
    entries.push(entry);
  }

  for (const [assetId, title, categories] of POLY_HAVEN_TEXTURES) {
    const entry = makeBaseEntry({
      id: `poly-haven-${assetId}`,
      source: 'Poly Haven',
      title,
      sourceUrl: `https://polyhaven.com/a/${assetId}`,
      downloadUrl: null,
      license: 'CC0 1.0',
      author: 'Poly Haven',
      categories,
      notes: '1K JPG PBR map subset: Diffuse, normal, roughness, and ARM when available.'
    });
    try {
      const files = await fetchJson(`https://api.polyhaven.com/files/${assetId}`);
      const mapUrls = [
        files.Diffuse?.['1k']?.jpg?.url,
        files.nor_gl?.['1k']?.jpg?.url,
        files.Rough?.['1k']?.jpg?.url,
        files.arm?.['1k']?.jpg?.url
      ].filter(Boolean);
      if (mapUrls.length === 0) throw new Error('No 1K JPG texture maps found');
      entry.downloadUrl = mapUrls.join(' ');
      const rawDir = path.join(RAW, 'poly-haven', assetId);
      if (!AUDIT_ONLY && !SKIP_DOWNLOADS) {
        console.log(`download texture set: ${entry.id}`);
        let totalBytes = 0;
        const hashes = [];
        for (const url of mapUrls) {
          const rawFile = path.join(rawDir, path.basename(new URL(url).pathname));
          const dl = await downloadFile(url, rawFile);
          totalBytes += dl.byteLength;
          hashes.push(dl.sha256);
        }
        Object.assign(entry, {
          downloadedAt: NOW,
          rawPath: rel(rawDir),
          byteLength: totalBytes,
          sizeBytes: totalBytes,
          sha256: createHash('sha256').update(hashes.join('')).digest('hex'),
          format: 'jpg-set',
          status: 'downloaded'
        });
        await linkCandidates(entry, rawDir, entry.id);
      } else {
        entry.rawPath = rel(rawDir);
        entry.status = 'planned';
      }
    } catch (error) {
      entry.status = 'failed';
      entry.notes = `${entry.notes} ${error.message}`;
    }
    entries.push(entry);
  }

  return entries;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift()?.split(',') ?? [];
  return lines.map((line) => {
    const cols = line.split(',');
    return Object.fromEntries(header.map((key, index) => [key, cols[index]]));
  });
}

async function harvestAmbientCg() {
  const entries = [];
  const seenAssets = new Set();
  for (const [query, categories] of AMBIENTCG_QUERIES) {
    const csvUrl = `https://ambientCG.com/api/v2/downloads_csv?q=${encodeURIComponent(query)}&type=Material&sort=Popular`;
    try {
      const rows = parseCsv(await fetchText(csvUrl));
      const picks = rows.filter((row) => row.downloadAttribute === '1K-JPG' && !seenAssets.has(row.assetId)).slice(0, 2);
      for (const row of picks) {
        seenAssets.add(row.assetId);
        const entry = makeBaseEntry({
          id: `ambientcg-${safeName(row.assetId)}`,
          source: 'ambientCG',
          title: row.assetId,
          sourceUrl: `https://ambientCG.com/view?id=${row.assetId}`,
          downloadUrl: row.downloadLink,
          license: 'CC0 1.0',
          author: 'ambientCG',
          categories,
          notes: `Selected from ambientCG popular material query "${query}" as 1K-JPG.`
        });
        const rawFile = path.join(RAW, 'ambientcg', safeName(row.assetId), path.basename(new URL(row.downloadLink).searchParams.get('file') ?? `${row.assetId}.zip`));
        entries.push(await processZipEntry(entry, rawFile, path.join(EXTRACTED, 'ambientcg', safeName(row.assetId))));
      }
    } catch (error) {
      entries.push({
        ...makeBaseEntry({
          id: `ambientcg-search-${safeName(query)}`,
          source: 'ambientCG',
          title: `ambientCG query: ${query}`,
          sourceUrl: csvUrl,
          downloadUrl: null,
          license: 'CC0 1.0',
          author: 'ambientCG',
          categories,
          notes: `Query failed: ${error.message}`
        }),
        status: 'failed'
      });
    }
  }
  return entries;
}

async function harvestFreesound() {
  const entries = [];
  const token = process.env.FREESOUND_API_KEY;

  for (const [query, visualRole, mapAffinity, limit] of FREESOUND_QUERIES) {
    const sourceUrl = `https://freesound.org/search/?q=${encodeURIComponent(query)}&f=license:%22Creative+Commons+0%22+license:%22Attribution%22`;
    if (!token) {
      entries.push({
        ...makeBaseEntry({
          id: `freesound-search-${safeName(query)}`,
          source: 'Freesound',
          title: `Freesound search: ${query}`,
          sourceUrl,
          downloadUrl: null,
          license: 'CC0 or CC-BY',
          author: 'Freesound contributors',
          categories: ['audio'],
          notes: 'Cataloged search only. Set FREESOUND_API_KEY to download CC0/CC-BY preview audio candidates.',
          visualRole,
          runtimeCandidate: false,
          assetDomain: 'audio',
          mapAffinity,
          visibilityBand: 'none',
          runtimeUse: query,
          playtestPriority: 2
        }),
        status: 'cataloged-source'
      });
      continue;
    }

    try {
      const apiUrl =
        `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}` +
        `&filter=${encodeURIComponent('license:"Creative Commons 0" OR license:"Attribution" duration:[0.2 TO 60]')}` +
        '&fields=id,name,username,license,url,duration,previews&sort=score';
      const json = await fetchJson(apiUrl, { Authorization: `Token ${token}` });
      for (const result of (json.results ?? []).slice(0, limit)) {
        const downloadUrl =
          result.previews?.['preview-hq-mp3'] ?? result.previews?.['preview-lq-mp3'] ?? result.previews?.['preview-hq-ogg'];
        if (!downloadUrl) continue;
        const license = /zero|cc0/i.test(result.license) ? 'CC0 1.0' : 'CC-BY 4.0';
        const entry = makeBaseEntry({
          id: `freesound-${result.id}-${safeName(result.name)}`,
          source: 'Freesound',
          title: result.name,
          sourceUrl: result.url,
          downloadUrl,
          license,
          author: result.username,
          categories: ['audio'],
          notes: `Downloaded browser preview for Freesound query "${query}". Replace with original file before production use if needed.`,
          visualRole,
          runtimeCandidate: true,
          assetDomain: 'audio',
          mapAffinity,
          visibilityBand: 'none',
          runtimeUse: query,
          playtestPriority: 3,
          durationSeconds: result.duration ?? null
        });
        const rawFile = path.join(RAW, 'freesound', safeName(query), `${result.id}-${safeName(result.name)}.mp3`);
        entries.push(await processFileEntry(entry, rawFile));
      }
    } catch (error) {
      entries.push({
        ...makeBaseEntry({
          id: `freesound-search-${safeName(query)}`,
          source: 'Freesound',
          title: `Freesound search: ${query}`,
          sourceUrl,
          downloadUrl: null,
          license: 'CC0 or CC-BY',
          author: 'Freesound contributors',
          categories: ['audio'],
          notes: `Freesound query failed: ${error.message}`,
          visualRole,
          runtimeCandidate: false,
          assetDomain: 'audio',
          mapAffinity,
          visibilityBand: 'none',
          runtimeUse: query,
          playtestPriority: 2
        }),
        status: 'failed'
      });
    }
  }
  return entries;
}

function catalogQuaterniusRefs() {
  return QUATERNIUS_SOURCE_REFS.map(([id, title, sourceUrl, downloadUrl, categories]) => ({
    ...makeBaseEntry({
      id,
      source: 'Quaternius',
      title,
      sourceUrl,
      downloadUrl,
      license: 'CC0 1.0',
      author: 'Quaternius',
      categories,
      notes: 'Cataloged official source. Direct folder download is not automated here because the public source is Google Drive or Itch rather than a stable raw file URL.'
    }),
    status: 'cataloged-source'
  }));
}

function catalogAerospaceRefs() {
  return PUBLIC_DOMAIN_AEROSPACE_REFS.map(([id, title, sourceUrl, author, license, categories]) => ({
    ...makeBaseEntry({
      id,
      source: author.includes('NASA') ? 'NASA' : 'Smithsonian',
      title,
      sourceUrl,
      downloadUrl: null,
      license,
      author,
      categories,
      notes: 'Cataloged public-domain/CC0 aerospace source. Download only browser-practical models after manual inspection because many scans are high-poly.',
      visualRole: 'aerospace-reference',
      altitudeHint: 'mid-to-high',
      runtimeCandidate: false,
      assetDomain: 'air-traffic',
      mapAffinity: 'all',
      visibilityBand: 'far',
      runtimeUse: 'aircraft silhouettes and aerospace landmark references',
      playtestPriority: 2
    }),
    status: 'cataloged-source'
  }));
}

function catalogOpenHdriRefs() {
  return OPEN_HDRI_SOURCE_REFS.map(([id, title, sourceUrl, categories]) => ({
    ...makeBaseEntry({
      id,
      source: 'Open HDRI',
      title,
      sourceUrl,
      downloadUrl: null,
      license: 'CC0 1.0',
      author: 'Open HDRI',
      categories,
      notes: 'Cataloged as a sky HDRI research source only. Large original HDR downloads are intentionally skipped in this pass.',
      visualRole: 'hdri-sky-reference',
      altitudeHint: 'all',
      runtimeCandidate: false
    }),
    status: 'cataloged-source'
  }));
}

async function copyBaselineScreenshots() {
  const source = '/tmp/neuroflight-menu.png';
  const dest = path.join(INBOX, 'screenshots/baseline/current-menu.png');
  if ((await exists(source)) && !(await exists(dest))) {
    await fs.copyFile(source, dest);
    console.log(`copied baseline screenshot: ${rel(dest)}`);
  }
}

async function writeOutputs(assets) {
  assets.sort((a, b) => a.id.localeCompare(b.id));
  const manifest = {
    generatedAt: NOW,
    policy: 'CC0 + CC-BY, with required attribution for CC-BY assets',
    schema: {
      id: 'Stable local catalog id',
      source: 'Source site or library',
      sourceUrl: 'Human-readable source page',
      downloadUrl: 'Direct download URL when available',
      license: 'License declared by source',
      author: 'Creator or publisher',
      attribution: 'Credit line, required for CC-BY',
      downloadedAt: 'ISO timestamp when downloaded',
      rawPath: 'Path under asset-inbox/raw',
      extractedPath: 'Path under asset-inbox/extracted when applicable',
      candidateCategories: 'Candidate buckets such as aircraft, sky-objects, mega-landmarks, air-traffic, skyboxes, lighting-sky, weather-vfx, weather-identity, combat-vfx, audio, textures, structures, world-scale-structures, distant-ground, props',
      visualRole: 'Optional role hint such as balloon, airship, skybox, weather-vfx, or hdri-sky',
      altitudeHint: 'Optional placement hint such as low-to-mid, mid, mid-to-high, high, near-camera, or all',
      assetDomain: 'Optional broad domain such as mega-landmark, weather, combat-vfx, audio, or sky-lighting',
      mapAffinity: 'Optional map hint such as desert, ocean, all, or comma-separated values',
      visibilityBand: 'Optional readability hint such as near, mid, far, all, or none',
      runtimeUse: 'Optional intended prototype use',
      playtestPriority: 'Optional 1-5 ranking for manual curation',
      sizeBytes: 'Downloaded byte size when available',
      format: 'Primary file format or format family',
      durationSeconds: 'Audio duration when known',
      runtimeCandidate: 'Whether the source looks promising for a curated runtime prototype',
      notes: 'Implementation notes, caveats, or source-specific details'
    },
    summary: {
      total: assets.length,
      downloaded: assets.filter((asset) => ['downloaded', 'already-present'].includes(asset.status)).length,
      catalogedOnly: assets.filter((asset) => asset.status === 'cataloged-source').length,
      failed: assets.filter((asset) => asset.status === 'failed').length,
      ccBy: assets.filter((asset) => /cc-?by|creative commons attribution/i.test(asset.license)).length
    },
    assets
  };
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  const ccByAssets = assets.filter((asset) => /cc-?by|creative commons attribution/i.test(asset.license));
  const lines = [
    '# NeuroFlight Asset Attribution',
    '',
    `Generated: ${NOW}`,
    '',
    'Assets listed here are staged for evaluation only. Before any CC-BY asset is shipped in-game, copy the relevant credit line into the production credits UI or documentation.',
    ''
  ];
  if (ccByAssets.length === 0) {
    lines.push('No CC-BY assets were downloaded in the latest harvest.');
  } else {
    for (const asset of ccByAssets) {
      lines.push(`- ${asset.attribution}`);
    }
  }
  await fs.writeFile(ATTRIBUTION_PATH, `${lines.join('\n')}\n`);
}

async function auditManifest() {
  const text = await fs.readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(text);
  const failures = [];
  for (const asset of manifest.assets ?? []) {
    for (const field of ['id', 'source', 'sourceUrl', 'license', 'author', 'attribution', 'candidateCategories']) {
      if (asset[field] === undefined || asset[field] === null || asset[field] === '') failures.push(`${asset.id ?? 'unknown'} missing ${field}`);
    }
    if (/cc-?by|creative commons attribution/i.test(asset.license) && !asset.attribution.includes(asset.author)) {
      failures.push(`${asset.id} CC-BY attribution does not include author`);
    }
    if (['downloaded', 'already-present'].includes(asset.status) && !asset.rawPath) {
      failures.push(`${asset.id} downloaded without rawPath`);
    }
    if (asset.rawPath && !asset.rawPath.startsWith('asset-inbox/raw/')) {
      failures.push(`${asset.id} rawPath outside asset-inbox/raw`);
    }
  }

  const candidateFiles = await walk(CANDIDATES);
  const categoryCounts = {};
  for (const file of candidateFiles) {
    const relativePath = rel(file);
    const [, , category] = relativePath.split('/');
    if (category) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
  }

  for (const category of MAJOR_DOMAIN_CATEGORIES) {
    if ((categoryCounts[category] ?? 0) === 0) failures.push(`no candidates found for major category ${category}`);
  }

  const publicFiles = await walk(PUBLIC_ASSETS);
  for (const file of publicFiles) {
    const publicPath = rel(file);
    if (/\/(?:raw|extracted|candidates)\//.test(publicPath)) {
      failures.push(`${publicPath} looks like raw intake staged under public assets`);
    }
    if (['.zip', '.7z', '.rar'].includes(path.extname(file).toLowerCase())) {
      failures.push(`${publicPath} is an archive staged under public assets`);
    }
  }

  const runtimeCreditText = (await exists(WORLD_SCALE_CREDITS_PATH))
    ? await fs.readFile(WORLD_SCALE_CREDITS_PATH, 'utf8')
    : '';
  const runtimeDirs = new Set(['audio', 'vfx', 'weather', 'world']);
  for (const file of publicFiles) {
    const publicPath = rel(file);
    const parts = publicPath.split('/');
    if (parts[0] !== 'public' || parts[1] !== 'assets' || !runtimeDirs.has(parts[2])) continue;
    const runtimePath = `/${parts.slice(1).join('/')}`;
    if (!runtimeCreditText.includes(runtimePath)) {
      failures.push(`${publicPath} missing production credit entry in public/assets/CREDITS_WORLD_SCALE.md`);
    }
  }

  const totalCandidates = candidateFiles.length;
  const gltfCandidates = candidateFiles.filter((file) => ['.glb', '.gltf'].includes(path.extname(file).toLowerCase())).length;
  const vfxCandidates = (categoryCounts['weather-vfx'] ?? 0) + (categoryCounts['weather-identity'] ?? 0) + (categoryCounts['combat-vfx'] ?? 0);
  const audioCandidates = categoryCounts.audio ?? 0;
  const skyCandidates = (categoryCounts.skyboxes ?? 0) + (categoryCounts['lighting-sky'] ?? 0);
  const warnings = [];
  if (manifest.assets.length < 250) warnings.push(`manifest target not met: ${manifest.assets.length}/250 entries`);
  if (totalCandidates < 1500) warnings.push(`candidate target not met: ${totalCandidates}/1500 candidates`);
  if (gltfCandidates < 75) warnings.push(`runtime GLB/GLTF target not met: ${gltfCandidates}/75 candidates`);
  if (vfxCandidates < 120) warnings.push(`VFX/weather target not met: ${vfxCandidates}/120 candidates`);
  if (audioCandidates < 50) warnings.push(`audio target not met: ${audioCandidates}/50 candidates`);
  if (skyCandidates < 30) warnings.push(`sky/HDRI target not met: ${skyCandidates}/30 candidates`);

  if (failures.length > 0) {
    console.error('Asset audit failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    for (const warning of warnings) console.warn(`Asset audit warning: ${warning}`);
    console.log(`Asset audit passed (${manifest.assets?.length ?? 0} manifest entries).`);
  }
}

async function main() {
  await ensureDirs();
  if (AUDIT_ONLY) {
    await auditManifest();
    return;
  }

  const groups = [
    await harvestKenney(),
    await harvestOpenGameArt(),
    await harvestOpenGameArtDirectAssets(),
    await harvestOpenGameArtScrapedAssets(),
    await harvestPolyPizza(),
    await harvestPolyHaven(),
    await harvestAmbientCg(),
    await harvestFreesound(),
    catalogQuaterniusRefs(),
    catalogOpenHdriRefs(),
    catalogAerospaceRefs()
  ];
  const assets = groups.flat();
  await copyBaselineScreenshots();
  await writeOutputs(assets);
  await auditManifest();
  console.log(`Asset harvest complete: ${assets.length} entries, ${assets.filter((a) => ['downloaded', 'already-present'].includes(a.status)).length} downloaded.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
