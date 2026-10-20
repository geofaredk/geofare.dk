/**
 * Heal: a square tile of six slats, every slat stepping one pitch sideways where it
 * crosses the tile's centre line, so the set is sheared, as in the geofare mark.
 * The slat under the pointer lifts free of the shear and goes straight; the slats
 * beside it stir a little, staggered outwards from it on the 700ms lift curve. At
 * rest the middle slat is bright. The slider is the stagger, in ms.
 *
 * The pattern: discrete items, each a bent solid. Tweens, a stagger by distance, a
 * silhouette built from the ring's back run on top and its front run at the base
 * (what prism does, for a footprint that is not convex), and a hit test on the
 * resting footprints, projected onto the plane of the slats' tops.
 */
const {
  Cam, clamp, facing, fillet, fit, open, poly, prism, proj, rings, ringAt, run, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

// Proportions from the mark: six slats, slat to gap 7:3, a step of one pitch over a run of about 1.6 pitches.
const N = 6, PITCH = 20, W = 14, L = 38, TK = 3, PB = 4, T = 80.6, D = T / Math.SQRT2, RIM = 2.2;
const B = 1, R = 1.8, LIFT = 10, STIR = [1, 0.3, 0.1], HOME = 2, S2 = Math.SQRT1_2;

/** The step: 0 before the centre line, 1 after it, smooth over L. */
const step = (u) => { const t = clamp(u / L + 0.5, 0, 1); return t * t * (3 - 2 * t); };
/** Slat k's centreline across (v) at u along it, healed by h: bent as the mark at 0, straight at 1. */
const centre = (k, h, u) => PITCH * (k - 3) + PITCH * ((1 - h) * step(u) + 0.5 * h);

// Where each edge is sampled along the slat: straight runs as single segments, the bend every 2 units.
const US = (() => { const a = [-D - 4, -L / 2]; for (let u = -L / 2 + 2; u < L / 2; u += 2) a.push(u); a.push(L / 2, D + 4); return a; })();

/** Keeps the part of a polygon with a·u + b·v ≤ c. */
function clipHP(pts, a, b, c) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const A = pts[i], Bp = pts[(i + 1) % pts.length], da = a * A[0] + b * A[1] - c, db = a * Bp[0] + b * Bp[1] - c;
    if (da <= 0) out.push(A);
    if ((da < 0) !== (db < 0) && da !== 0) { const t = da / (da - db); out.push([A[0] + (Bp[0] - A[0]) * t, A[1] + (Bp[1] - A[1]) * t]); }
  }
  return dedupe(out);
}

/** Drops consecutive points that coincide: clipping and a zero-radius fillet both leave them. */
const dedupe = (pts) => pts.filter((p, i) => Math.hypot(p[0] - pts[(i + pts.length - 1) % pts.length][0], p[1] - pts[(i + pts.length - 1) % pts.length][1]) > 1e-6);

/** The turn at vertex i, in radians. */
function turn(pts, i) {
  const n = pts.length, a = pts[(i + n - 1) % n], p = pts[i], b = pts[(i + 1) % n];
  const ax = p[0] - a[0], ay = p[1] - a[1], bx = b[0] - p[0], by = b[1] - p[1];
  return Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
}

/** Slat k's footprint, inset by `inset`, in slat coordinates (u along, v across): clipped to the tile, corners rounded where the tile cut it. */
function outline(k, h, inset) {
  const half = W / 2 - inset, d = D - RIM - inset * Math.SQRT2;
  const up = US.map((u) => [u, centre(k, h, u) - half]), lo = US.map((u) => [u, centre(k, h, u) + half]).reverse();
  let pts = up.concat(lo);
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) pts = clipHP(pts, a, b, d);
  if (pts.length < 3) return null;
  return dedupe(fillet(pts, pts.map((_, i) => (turn(pts, i) > 0.4 ? R - inset : 0))));
}

/** A ring of samples with outward normals, turned from slat coordinates into world x, y. */
function ring(pts) {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  const sgn = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], tx = b[0] - a[0], ty = b[1] - a[1], m = Math.hypot(tx, ty) || 1;
    const nu = (sgn * ty) / m, nv = (-sgn * tx) / m;
    return { u: (p[0] + p[1]) * S2, v: (p[1] - p[0]) * S2, nu: (nu + nv) * S2, nv: (nv - nu) * S2 };
  });
}

/** A solid over a footprint that need not be convex: the ring's back run on top, its front run at the base, and the crease along the front at the top. */
function bent(P, front, outer, inner, z0, z1) {
  const back = run(outer, (q) => !front(q)), fr = run(outer, front);
  return { sil: poly(ringAt(P, back, z1).concat(ringAt(P, fr, z0))), crease: open(ringAt(P, run(inner, front), z1)) };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted with the far slat lifted, so nothing leaves the frame in any pose.
  const C = Cam(45, 0.5, 2.5);
  const hT = T / 2;
  fit(C, [[-hT, -hT, -PB], [hT, hT, -PB], [hT, -hT, -PB], [-hT, hT, -PB], [-hT + 6, -hT + 6, TK + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-hT, -hT, hT, hT, 3, 1.4);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  // Slats, far to near: appending in this order paints back to front.
  const slats = [];
  for (let k = 0; k < N; k++) slats.push({ k, el: solid(g), h: tween(0), z: tween(0), dh: NaN, dz: NaN });

  function draw(sl, h, z) {
    if (h === sl.dh && z === sl.dz) return;
    sl.dh = h; sl.dz = z;
    const o = outline(sl.k, h, 0), i = outline(sl.k, h, B);
    if (!o || !i) return;
    put(sl.el, bent(P, front, ring(o), ring(i), z, z + TK));
  }

  const Bk = register(stage, (_dt, now) => {
    let moving = false;
    for (const sl of slats) { draw(sl, tval(sl.h, now), tval(sl.z, now)); if (!tdone(sl.h, now) || !tdone(sl.z, now)) moving = true; }
    return moving;
  });
  bag.add(Bk.unregister);

  // Hit test: the pointer on the plane of the resting tops, read against the resting footprints, which never move.
  function hit([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, TK), u = (x - y) * S2, v = (x + y) * S2;
    if (Math.abs(u) + Math.abs(v) > D - RIM) return -1;
    return clamp(Math.round((v - PITCH * step(u)) / PITCH + 3), 0, N - 1);
  }

  let act = -1;
  /** Frees slat a (-1 lets them all settle). The stagger spreads out from the slat taken, or the one let go. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    slats.forEach((sl, i) => {
      const dist = Math.abs(i - from), delay = dist * stag;
      tset(sl.h, i === a ? 1 : 0, now, delay);
      tset(sl.z, a < 0 ? 0 : LIFT * (STIR[dist] || 0), now, delay);
      sl.el.sil.classList.toggle("hi", i === (a < 0 ? HOME : a));
    });
    read.textContent = a < 0 ? "rest" : "slat " + (a + 1);
    Bk.wake();
  }
  slats[HOME].el.sil.classList.add("hi");
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "heal",
  means: "Six slats sheared across a square tile: the one under the pointer lifts free and goes straight, its neighbours stirring in turn.",
  rules: [1, 2, 8, 9, 10],
  range: [0, 40, 90],
  tour: [[138, 114], [263, 214], [200, 176], null],
  mount,
});
