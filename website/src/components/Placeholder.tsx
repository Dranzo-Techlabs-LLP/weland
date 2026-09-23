// Designed stand-in for property photos that haven't arrived yet.
// Draws an in-palette hillscape (or a contour map) that varies by `seed`,
// so placeholders look intentional rather than broken. Swap for <img>
// by setting the `image` field in src/lib/content.ts.

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 800;
const H = 600;

function hillPath(random: () => number, base: number, amp: number) {
  const points: [number, number][] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const x = (W / steps) * i;
    const y = base + (random() - 0.5) * amp * 2;
    points.push([x, y]);
  }
  let d = `M0 ${H} L0 ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const cx = ((px + x) / 2).toFixed(1);
    d += ` C ${cx} ${py.toFixed(1)}, ${cx} ${y.toFixed(1)}, ${x} ${y.toFixed(1)}`;
  }
  d += ` L${W} ${H} Z`;
  return d;
}

function contourPath(random: () => number, cx: number, cy: number, r: number) {
  const n = 9;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n;
    const rr = r * (0.82 + random() * 0.36);
    pts.push([cx + Math.cos(angle) * rr, cy + Math.sin(angle) * rr * 0.72]);
  }
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += i === 0 ? `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}` : "";
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + " Z";
}

export default function Placeholder({
  caption,
  seed,
  variant = "hills",
}: {
  caption: string;
  seed: string;
  variant?: "hills" | "map";
}) {
  const random = rng(hash(seed));
  const id = `ph-${hash(seed).toString(36)}`;

  if (variant === "map") {
    const rings = [260, 210, 165, 122, 84, 50];
    return (
      <div className="ph" role="img" aria-label={caption}>
        <svg className="ph-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width={W} height={H} fill="#efe6e1" />
          {rings.map((r, i) => (
            <path
              key={r}
              d={contourPath(random, 430, 300, r)}
              fill={i % 2 === 0 ? "#e9ddd7" : "#f2eae5"}
              stroke="#c9b4b0"
              strokeWidth="1.2"
            />
          ))}
          <path d="M0 470 C 140 430, 260 520, 420 480 S 700 420, 800 470" fill="none" stroke="#fcf9f7" strokeWidth="7" />
          <path d="M0 470 C 140 430, 260 520, 420 480 S 700 420, 800 470" fill="none" stroke="#d8c6c1" strokeWidth="2" />
          <circle cx="430" cy="300" r="9" fill="#5e2432" />
          <circle cx="430" cy="300" r="20" fill="none" stroke="#5e2432" strokeWidth="2" opacity="0.5" />
        </svg>
        <span className="ph-caption" style={{ color: "#2a1d21" }}>{caption}</span>
      </div>
    );
  }

  const layers = [
    { base: 300, amp: 40, fill: "#d9c3c0" },
    { base: 370, amp: 45, fill: "#a17d82" },
    { base: 440, amp: 40, fill: "#6e3b47" },
    { base: 520, amp: 30, fill: "#451a25" },
  ];
  const sunX = 140 + random() * 520;

  return (
    <div className="ph" role="img" aria-label={caption}>
      <svg className="ph-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7f2ee" />
            <stop offset="1" stopColor="#efe2d8" />
          </linearGradient>
          <linearGradient id={`${id}-mist`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fcf9f7" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fcf9f7" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fcf9f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${id}-sky)`} />
        <circle cx={sunX} cy="200" r="46" fill="#e8cf96" opacity="0.55" />
        {layers.map((l, i) => (
          <g key={i}>
            <path d={hillPath(random, l.base, l.amp)} fill={l.fill} />
            {i === 1 && <rect x="0" y={l.base - 30} width={W} height="110" fill={`url(#${id}-mist)`} />}
          </g>
        ))}
      </svg>
      <span className="ph-caption">{caption}</span>
    </div>
  );
}
