// Loader for the packed link meshes (description/meshes/nv01.frame.{json,bin}).
// Positions are int16-quantised inside each link's bounding box; one material id per vertex; indices u16/u32.
import * as THREE from "three";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";

export const FRAME_COLORS = [
  new THREE.Color(0xcdd1d6), // 0 sandblasted aluminium
  new THREE.Color(0x232426), // 1 actuator can, black anodised
  new THREE.Color(0x141414), // 2 rubber sole
];

async function fetchWithProgress(url, onProgress) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url);
  const total = Number(r.headers.get("content-length")) || 0;
  if (!r.body || !total) return r.arrayBuffer();
  const reader = r.body.getReader();
  const chunks = []; let got = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; onProgress?.(got / total); }
  const out = new Uint8Array(got); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer;
}

export async function loadFrame(base = "description/meshes/nv01.frame", onProgress) {
  const [manifest, buf] = await Promise.all([
    fetch(`${base}.json`).then((r) => { if (!r.ok) throw new Error("frame manifest"); return r.json(); }),
    fetchWithProgress(`${base}.bin`, onProgress),
  ]);
  const out = new Map();
  const colors = manifest.colors ? manifest.colors.map((c) => new THREE.Color(c)) : FRAME_COLORS;
  for (const l of manifest.links) {
    const q = new Uint16Array(buf, l.offset, l.vcount * 3);
    const ids = new Uint8Array(buf, l.moffset, l.vcount);
    const pos = new Float32Array(l.vcount * 3);
    const col = new Float32Array(l.vcount * 3);
    const span = [l.max[0] - l.min[0], l.max[1] - l.min[1], l.max[2] - l.min[2]];
    for (let i = 0; i < l.vcount; i++) {
      for (let k = 0; k < 3; k++) pos[i * 3 + k] = l.min[k] + (q[i * 3 + k] / 65535) * span[k];
      const c = colors[ids[i]] || colors[0];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const idx = l.idx === "u16" ? new Uint16Array(buf, l.ioffset, l.icount) : new Uint32Array(buf, l.ioffset, l.icount);
    let g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(idx.slice(), 1));
    g = toCreasedNormals(g, THREE.MathUtils.degToRad(32));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    g.userData.link = l;
    out.set(l.name, g);
  }
  return { manifest, geometries: out };
}
