# Earth Walk

Scroll-driven Three.js scene built from `low_poly_earth.blend`.

## Run Locally

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173/`.

On this Windows workspace, you can also run `start-site.bat`.

## Build

```bash
pnpm build
```

## Re-export Earth GLB

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' -b '.\low_poly_earth.blend' --python '.\scripts\export_earth_glb.py'
```
