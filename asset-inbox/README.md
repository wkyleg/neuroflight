# NeuroFlight Asset Inbox

This folder is the staging area for visual asset experiments. Raw downloads,
extracted packs, and candidate symlinks are intentionally ignored by git so the
repo does not absorb hundreds of megabytes of third-party art by accident.

Tracked files:

- `manifests/source-assets.json` records every asset source, license, author,
  download URL, local path, and candidate category.
- `ATTRIBUTION.md` collects credit lines for assets that require attribution.
- `screenshots/baseline/README.md` documents the current screenshot baseline.

Run the harvest with:

```bash
npm run assets:harvest
```

Audit the manifest and attribution coverage with:

```bash
npm run assets:audit
```
