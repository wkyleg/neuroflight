import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type CandidateType = 'model' | 'image' | 'audio' | 'data';
type PreviewMode = 'studio' | 'sky' | 'world' | 'vfx';

interface CandidateFile {
  path: string;
  category: string;
  type: CandidateType;
}

interface CandidateIndex {
  files: CandidateFile[];
}

interface ManifestEntry {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  downloadUrl: string | null;
  license: string;
  author: string;
  attribution: string;
  rawPath: string | null;
  extractedPath?: string | null;
  candidateCategories: string[];
  candidateCount?: number;
  visualRole?: string | null;
  altitudeHint?: string | null;
  runtimeCandidate?: boolean;
  assetDomain?: string | null;
  mapAffinity?: string | null;
  visibilityBand?: string | null;
  runtimeUse?: string | null;
  playtestPriority?: number | null;
  sizeBytes?: number | null;
  format?: string | null;
  durationSeconds?: number | null;
  notes?: string;
  status: string;
}

interface AssetManifest {
  generatedAt: string | null;
  summary?: {
    total: number;
    downloaded: number;
    catalogedOnly: number;
    failed: number;
    ccBy: number;
  };
  assets: ManifestEntry[];
}

interface EnrichedCandidate extends CandidateFile {
  asset: ManifestEntry | null;
}

const TYPE_OPTIONS: { label: string; value: CandidateType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Models', value: 'model' },
  { label: 'Images', value: 'image' },
  { label: 'Audio', value: 'audio' },
  { label: 'Data', value: 'data' },
];

const LAB_PRESETS: { label: string; category: string; type: CandidateType | 'all'; previewMode: PreviewMode }[] = [
  { label: 'World Scale', category: 'mega-landmarks', type: 'model', previewMode: 'world' },
  { label: 'Air Traffic', category: 'air-traffic', type: 'model', previewMode: 'sky' },
  { label: 'Weather', category: 'weather-identity', type: 'image', previewMode: 'vfx' },
  { label: 'Combat VFX', category: 'combat-vfx', type: 'image', previewMode: 'vfx' },
  { label: 'Audio', category: 'audio', type: 'audio', previewMode: 'studio' },
  { label: 'Sky Lighting', category: 'lighting-sky', type: 'data', previewMode: 'sky' },
];

function safeName(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/&amp;/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'asset'
  );
}

function assetFileUrl(candidatePath: string): string {
  return `/asset-lab/files/${candidatePath.split('/').map(encodeURIComponent).join('/')}`;
}

function shortName(candidatePath: string): string {
  return candidatePath.split('/').pop() ?? candidatePath;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material.dispose();
  });
}

function ModelPreview({ src, mode }: { src: string; mode: PreviewMode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let model: THREE.Object3D | null = null;
    let frame = 0;

    const scene = new THREE.Scene();
    const isWorld = mode === 'world';
    const isSky = mode === 'sky';
    scene.background = new THREE.Color(isSky || isWorld ? 0xb7def0 : 0x91c7d9);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
    camera.position.set(
      isWorld ? 8.4 : isSky ? 5.4 : 4,
      isWorld ? 4.8 : isSky ? 3.1 : 2.4,
      isWorld ? 10.5 : isSky ? 6.6 : 5,
    );
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 5);
    scene.add(key);
    scene.add(new THREE.HemisphereLight(0xbbe8ff, 0x7a6a55, 1.7));

    const floor = new THREE.GridHelper(isWorld ? 28 : isSky ? 16 : 8, isWorld ? 14 : 8, 0x2d5360, 0x47717c);
    floor.position.y = -1.2;
    scene.add(floor);

    const horizon = new THREE.Mesh(
      new THREE.PlaneGeometry(isWorld ? 52 : 28, isWorld ? 22 : 14),
      new THREE.MeshBasicMaterial({ color: isSky || isWorld ? 0x4b9bc1 : 0x25424d, transparent: true, opacity: 0.22 }),
    );
    horizon.position.set(0, -1.35, -7);
    horizon.rotation.x = -Math.PI / 2;
    if (isSky || isWorld) scene.add(horizon);

    const rangeMarkers = new THREE.Group();
    if (isWorld) {
      for (const [index, radius] of [2.2, 4.4, 8.8, 13.2].entries()) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(radius, radius + 0.035, 96),
          new THREE.MeshBasicMaterial({
            color: index < 2 ? 0x67e8f9 : 0xe2c766,
            transparent: true,
            opacity: index < 2 ? 0.55 : 0.34,
            side: THREE.DoubleSide,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -1.18;
        rangeMarkers.add(ring);
      }
      scene.add(rangeMarkers);
    }

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = Math.max(1, parent.clientWidth);
      const height = Math.max(1, parent.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    const parent = canvas.parentElement;
    if (parent) observer.observe(parent);
    resize();

    const loader = new GLTFLoader();
    setError(null);
    loader.load(
      src,
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }

        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const largest = Math.max(size.x, size.y, size.z, 0.001);
        const scale = (isWorld ? 3.4 : 2.7) / largest;
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        scene.add(model);
      },
      undefined,
      (loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load this model');
      },
    );

    const render = () => {
      frame = requestAnimationFrame(render);
      if (model) model.rotation.y += 0.009;
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (model) disposeObject(model);
      floor.geometry.dispose();
      horizon.geometry.dispose();
      (horizon.material as THREE.Material).dispose();
      rangeMarkers.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) {
          for (const item of material) item.dispose();
        } else {
          material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [mode, src]);

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-lg border border-white/10 bg-slate-950">
      <canvas ref={canvasRef} className="h-full w-full" />
      {mode === 'world' && (
        <div className="absolute right-4 top-4 rounded-md border border-white/10 bg-black/55 px-3 py-2 text-xs text-slate-200">
          500m · 1km · 3km · 6km
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-8 text-center text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

function ImagePreview({ src, alt, mode }: { src: string; alt: string; mode: PreviewMode }) {
  return (
    <div
      className="flex h-full min-h-[420px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950"
      style={{
        background:
          mode === 'vfx'
            ? 'radial-gradient(circle at center, rgba(48, 60, 72, 0.72), rgba(2, 6, 12, 1) 68%)'
            : undefined,
      }}
    >
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
    </div>
  );
}

function AudioPreview({ src, name }: { src: string; name: string }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-5 rounded-lg border border-white/10 bg-slate-950 p-8 text-center">
      <div
        className="flex h-28 w-28 items-center justify-center rounded-full border border-cyan-300/30 text-3xl text-cyan-100"
        aria-hidden="true"
      >
        ~
      </div>
      <div>
        <p className="text-sm text-slate-300">{name}</p>
        {/* biome-ignore lint/a11y/useMediaCaption: Asset Lab auditions non-speech SFX and ambience clips. */}
        <audio className="mt-4 w-[min(520px,80vw)]" controls src={src} />
      </div>
    </div>
  );
}

export function AssetSandbox() {
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<AssetManifest | null>(null);
  const [candidates, setCandidates] = useState<CandidateFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [category, setCategory] = useState('mega-landmarks');
  const [type, setType] = useState<CandidateType | 'all'>('model');
  const [license, setLicense] = useState('all');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('world');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadAssets() {
      try {
        const [manifestResponse, indexResponse] = await Promise.all([
          fetch('/asset-lab/manifest.json'),
          fetch('/asset-lab/index.json'),
        ]);
        if (!manifestResponse.ok) throw new Error('Could not load asset manifest');
        if (!indexResponse.ok) throw new Error('Could not load candidate index');
        const nextManifest = (await manifestResponse.json()) as AssetManifest;
        const index = (await indexResponse.json()) as CandidateIndex;
        if (!alive) return;
        setManifest(nextManifest);
        setCandidates(index.files);
        setSelectedPath(
          (current) =>
            current ?? index.files.find((file) => file.type === 'model')?.path ?? index.files[0]?.path ?? null,
        );
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : 'Unable to load asset sandbox data');
      }
    }

    loadAssets();

    return () => {
      alive = false;
    };
  }, []);

  const assetSlugs = useMemo(() => {
    return (manifest?.assets ?? [])
      .map((asset) => ({ slug: safeName(asset.id), asset }))
      .sort((a, b) => b.slug.length - a.slug.length);
  }, [manifest]);

  const enriched = useMemo<EnrichedCandidate[]>(() => {
    return candidates.map((candidate) => {
      const fileName = shortName(candidate.path);
      const match = assetSlugs.find(({ slug }) => fileName.startsWith(slug));
      return { ...candidate, asset: match?.asset ?? null };
    });
  }, [assetSlugs, candidates]);

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(candidates.map((candidate) => candidate.category))).sort()];
  }, [candidates]);

  const licenses = useMemo(() => {
    return [
      'all',
      ...Array.from(new Set(enriched.map((candidate) => candidate.asset?.license).filter(Boolean) as string[])).sort(),
    ];
  }, [enriched]);

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enriched
      .filter((candidate) => category === 'all' || candidate.category === category)
      .filter((candidate) => type === 'all' || candidate.type === type)
      .filter((candidate) => license === 'all' || candidate.asset?.license === license)
      .filter((candidate) => {
        if (!query) return true;
        return (
          candidate.path.toLowerCase().includes(query) ||
          candidate.asset?.title.toLowerCase().includes(query) ||
          candidate.asset?.source.toLowerCase().includes(query)
        );
      });
  }, [category, enriched, license, search, type]);

  const selected = useMemo(() => {
    return filteredCandidates.find((candidate) => candidate.path === selectedPath) ?? filteredCandidates[0] ?? null;
  }, [filteredCandidates, selectedPath]);

  const previewSrc = selected ? assetFileUrl(selected.path) : null;
  const summary = manifest?.summary;

  return (
    <div
      className="h-full w-full overflow-hidden text-slate-100"
      style={{ background: 'linear-gradient(180deg, #081118 0%, #101819 58%, #17130f 100%)' }}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-8 py-5">
          <div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-2 border border-cyan-400/30 bg-transparent px-3 py-1 text-xs text-cyan-200"
            >
              BACK
            </button>
            <h1
              className="text-3xl font-bold tracking-widest"
              style={{ fontFamily: 'var(--font-heading)', color: '#e2c766' }}
            >
              ASSET LAB
            </h1>
          </div>
          <div className="grid grid-cols-4 gap-3 text-right text-xs text-slate-300">
            <span>
              Total
              <br />
              <strong className="text-white">{summary?.total ?? '-'}</strong>
            </span>
            <span>
              Downloaded
              <br />
              <strong className="text-white">{summary?.downloaded ?? '-'}</strong>
            </span>
            <span>
              CC-BY
              <br />
              <strong className="text-white">{summary?.ccBy ?? '-'}</strong>
            </span>
            <span>
              Candidates
              <br />
              <strong className="text-white">{candidates.length}</strong>
            </span>
          </div>
        </header>

        {error ? (
          <main className="flex flex-1 items-center justify-center p-8 text-red-200">{error}</main>
        ) : (
          <main className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)_340px] gap-0">
            <aside className="flex min-h-0 flex-col border-r border-white/10 bg-black/25">
              <div className="space-y-3 border-b border-white/10 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {LAB_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setCategory(preset.category);
                        setType(preset.type);
                        setPreviewMode(preset.previewMode);
                      }}
                      className="rounded-md border border-cyan-300/20 bg-cyan-300/5 px-2 py-2 text-xs text-cyan-100 hover:bg-cyan-300/12"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search towers, storms, flybys..."
                  className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="rounded-md border border-white/10 bg-black/40 px-2 py-2 text-sm"
                  >
                    {categories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as CandidateType | 'all')}
                    className="rounded-md border border-white/10 bg-black/40 px-2 py-2 text-sm"
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  value={license}
                  onChange={(event) => setLicense(event.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-2 text-sm"
                >
                  {licenses.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  {(['world', 'sky', 'vfx', 'studio'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPreviewMode(mode)}
                      className="rounded-md border px-2 py-2 text-xs"
                      style={{
                        borderColor: previewMode === mode ? '#67e8f9' : 'rgba(255,255,255,0.14)',
                        color: previewMode === mode ? '#67e8f9' : '#b8c6cc',
                        background: previewMode === mode ? 'rgba(103,232,249,0.08)' : 'rgba(0,0,0,0.28)',
                      }}
                    >
                      {mode === 'world' ? 'World' : mode === 'sky' ? 'Sky' : mode === 'vfx' ? 'VFX' : 'Studio'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredCandidates.slice(0, 700).map((candidate) => (
                  <button
                    key={candidate.path}
                    type="button"
                    onClick={() => setSelectedPath(candidate.path)}
                    className="block min-h-[72px] w-full rounded-none border-b border-white/5 bg-transparent px-4 py-3 text-left hover:bg-cyan-300/10"
                    style={{
                      color: selected?.path === candidate.path ? '#67e8f9' : '#d9e5ea',
                      borderLeft: selected?.path === candidate.path ? '3px solid #67e8f9' : '3px solid transparent',
                    }}
                  >
                    <span className="block truncate text-sm font-medium">{shortName(candidate.path)}</span>
                    <span className="mt-1 block text-xs text-slate-400">
                      {candidate.category} · {candidate.type} · {candidate.asset?.source ?? 'local'}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="min-h-0 overflow-hidden p-5">
              {selected && previewSrc ? (
                selected.type === 'model' ? (
                  <ModelPreview src={previewSrc} mode={previewMode} />
                ) : selected.type === 'image' ? (
                  <ImagePreview src={previewSrc} alt={shortName(selected.path)} mode={previewMode} />
                ) : selected.type === 'audio' ? (
                  <AudioPreview src={previewSrc} name={shortName(selected.path)} />
                ) : (
                  <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-white/10 bg-slate-950 p-8 text-center text-sm text-slate-300">
                    This file type is staged for lighting/material experiments and does not have an inline preview.
                  </div>
                )
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">Loading candidates...</div>
              )}
            </section>

            <aside className="min-h-0 overflow-y-auto border-l border-white/10 bg-black/25 p-5">
              <h2
                className="mb-2 text-xl font-semibold"
                style={{ fontFamily: 'var(--font-heading)', color: '#e2c766' }}
              >
                {selected ? shortName(selected.path) : 'No Asset'}
              </h2>
              {selected && (
                <div className="space-y-4 text-sm text-slate-300">
                  <div>
                    <span className="block text-xs uppercase tracking-widest text-slate-500">Candidate Path</span>
                    <code className="mt-1 block break-all rounded bg-black/40 p-2 text-xs text-cyan-100">
                      {selected.path}
                    </code>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-xs uppercase tracking-widest text-slate-500">Category</span>
                      <strong>{selected.category}</strong>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-widest text-slate-500">Type</span>
                      <strong>{selected.type}</strong>
                    </div>
                  </div>
                  {selected.asset && (
                    <>
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-slate-500">Source Asset</span>
                        <strong>{selected.asset.title}</strong>
                        <p className="mt-1 text-slate-400">
                          {selected.asset.source} · {selected.asset.license}
                        </p>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-slate-500">Author</span>
                        <p>{selected.asset.author}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="block text-xs uppercase tracking-widest text-slate-500">Role</span>
                          <p>{selected.asset.visualRole ?? '-'}</p>
                        </div>
                        <div>
                          <span className="block text-xs uppercase tracking-widest text-slate-500">Altitude</span>
                          <p>{selected.asset.altitudeHint ?? '-'}</p>
                        </div>
                        <div>
                          <span className="block text-xs uppercase tracking-widest text-slate-500">Runtime</span>
                          <p>{selected.asset.runtimeCandidate ? 'candidate' : 'research'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-xs uppercase tracking-widest text-slate-500">Domain</span>
                          <p>{selected.asset.assetDomain ?? '-'}</p>
                        </div>
                        <div>
                          <span className="block text-xs uppercase tracking-widest text-slate-500">Map</span>
                          <p>{selected.asset.mapAffinity ?? '-'}</p>
                        </div>
                        <div>
                          <span className="block text-xs uppercase tracking-widest text-slate-500">Visibility</span>
                          <p>{selected.asset.visibilityBand ?? '-'}</p>
                        </div>
                        <div>
                          <span className="block text-xs uppercase tracking-widest text-slate-500">Priority</span>
                          <p>{selected.asset.playtestPriority ?? '-'}</p>
                        </div>
                        <div>
                          <span className="block text-xs uppercase tracking-widest text-slate-500">Format</span>
                          <p>{selected.asset.format ?? '-'}</p>
                        </div>
                        <div>
                          <span className="block text-xs uppercase tracking-widest text-slate-500">Size</span>
                          <p>
                            {selected.asset.sizeBytes
                              ? `${(selected.asset.sizeBytes / 1024 / 1024).toFixed(2)} MB`
                              : '-'}
                          </p>
                        </div>
                      </div>
                      {selected.asset.runtimeUse && (
                        <div>
                          <span className="block text-xs uppercase tracking-widest text-slate-500">Runtime Use</span>
                          <p className="text-slate-400">{selected.asset.runtimeUse}</p>
                        </div>
                      )}
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-slate-500">Attribution</span>
                        <p className="rounded bg-black/40 p-2 text-xs leading-relaxed text-slate-300">
                          {selected.asset.attribution}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={selected.asset.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-cyan-300/30 px-3 py-2 text-xs text-cyan-100"
                        >
                          SOURCE
                        </a>
                        {selected.asset.downloadUrl && (
                          <a
                            href={selected.asset.downloadUrl.split(' ')[0]}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-white/20 px-3 py-2 text-xs text-slate-100"
                          >
                            DOWNLOAD
                          </a>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </aside>
          </main>
        )}
      </div>
    </div>
  );
}
