// A tileable 3D noise volume for the cloud shader. Worley "cells" give the
// rounded, puffy billows of real cumulus; value-noise fbm breaks them up into
// wisps. Blending the two (a Perlin–Worley mix) is the usual base for
// volumetric clouds. It's built a few slices at a time so scrolling never stutters.

export const NOISE_SIZE = 64;

function hash(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440670441) ^ Math.imul(seed, 144665);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const wrap = (i: number, n: number) => ((i % n) + n) % n;
const fade = (t: number) => t * t * (3 - 2 * t);

/** Periodic value noise: `cells` lattice cells across the volume. */
function valueNoise(x: number, y: number, z: number, cells: number, seed: number): number {
  const s = cells / NOISE_SIZE;
  const fx = x * s;
  const fy = y * s;
  const fz = z * s;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const iz = Math.floor(fz);
  const ux = fade(fx - ix);
  const uy = fade(fy - iy);
  const uz = fade(fz - iz);
  const at = (dx: number, dy: number, dz: number) =>
    hash(wrap(ix + dx, cells), wrap(iy + dy, cells), wrap(iz + dz, cells), seed);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(lerp(at(0, 0, 0), at(1, 0, 0), ux), lerp(at(0, 1, 0), at(1, 1, 0), ux), uy),
    lerp(lerp(at(0, 0, 1), at(1, 0, 1), ux), lerp(at(0, 1, 1), at(1, 1, 1), ux), uy),
    uz,
  );
}

/** Periodic Worley noise: distance to the nearest of one random point per cell. */
function makeWorley(cells: number, seed: number) {
  const size = NOISE_SIZE / cells;
  const points = new Float32Array(cells * cells * cells * 3);
  for (let i = 0; i < cells * cells * cells; i++) {
    points[i * 3] = hash(i, 1, 0, seed);
    points[i * 3 + 1] = hash(i, 2, 0, seed);
    points[i * 3 + 2] = hash(i, 3, 0, seed);
  }
  return (x: number, y: number, z: number): number => {
    const cx = Math.floor(x / size);
    const cy = Math.floor(y / size);
    const cz = Math.floor(z / size);
    let nearest = Infinity;
    for (let dz = -1; dz <= 1; dz++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          const nz = cz + dz;
          const k = (wrap(nx, cells) + wrap(ny, cells) * cells + wrap(nz, cells) * cells * cells) * 3;
          const px = (nx + points[k]) * size - x;
          const py = (ny + points[k + 1]) * size - y;
          const pz = (nz + points[k + 2]) * size - z;
          const d = px * px + py * py + pz * pz;
          if (d < nearest) nearest = d;
        }
    return Math.min(1, Math.sqrt(nearest) / size); // 0 at a point, ~1 between points
  };
}

/**
 * Builds the volume in slices, yielding between them. Calls `done` with an
 * R8 array (x fastest), or never if `cancelled()` turns true first.
 */
export function buildCloudNoise(done: (data: Uint8Array) => void, cancelled: () => boolean): void {
  const N = NOISE_SIZE;
  const data = new Uint8Array(N * N * N);
  const coarse = makeWorley(4, 11);
  const medium = makeWorley(8, 23);
  let z = 0;
  const slice = () => {
    if (cancelled()) return;
    const end = Math.min(N, z + 4);
    for (; z < end; z++) {
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const billows = 1 - (coarse(x, y, z) * 0.65 + medium(x, y, z) * 0.35);
          const wisps =
            valueNoise(x, y, z, 4, 3) * 0.5 + valueNoise(x, y, z, 8, 5) * 0.3 + valueNoise(x, y, z, 16, 7) * 0.2;
          // Perlin–Worley: the fbm shapes the edges of the rounded cells
          const v = Math.min(1, Math.max(0, billows * 0.7 + wisps * 0.55 - 0.18));
          data[x + y * N + z * N * N] = Math.round(v * 255);
        }
      }
    }
    if (z < N) setTimeout(slice, 0);
    else done(data);
  };
  slice();
}
