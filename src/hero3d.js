// Hero bo‘limidagi 3D kompozitsiya: oltin kubok, kitoblar va kristallar.
// `npm run build` orqali public/js/hero3d.js ga yig‘iladi (tree-shaking bilan).
import {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, Group, Mesh, Points, BufferGeometry, Float32BufferAttribute,
  LatheGeometry, TorusGeometry, CylinderGeometry, BoxGeometry, OctahedronGeometry, IcosahedronGeometry, PlaneGeometry,
  MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, PointsMaterial, CanvasTexture,
  DirectionalLight, PointLight, HemisphereLight, Vector2, ACESFilmicToneMapping, SRGBColorSpace, AdditiveBlending, DoubleSide,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function mount(canvas, { reduceMotion = false } = {}) {
  const small = matchMedia('(max-width: 640px)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const renderer = new WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.5, 12.8);
  camera.lookAt(0, -0.35, 0);

  /* ---------- Yorug‘lik: oltin asosiy nur, moviy kontur ---------- */
  scene.add(new HemisphereLight(0x5b8cff, 0x020b24, 0.6));
  const key = new DirectionalLight(0xffe39a, 3.2);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new PointLight(0x24d8ff, 60, 20);
  rim.position.set(-5, 2.5, -3);
  scene.add(rim);
  const warm = new PointLight(0xfff000, 25, 12);
  warm.position.set(2.5, -1, 4);
  scene.add(warm);

  /* ---------- Materiallar ---------- */
  const gold = new MeshPhysicalMaterial({ color: 0xffc940, metalness: 1, roughness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.15 });
  const plinth = new MeshPhysicalMaterial({ color: 0x0b45a0, metalness: 0.35, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const crystal = new MeshPhysicalMaterial({
    color: 0x24d8ff, metalness: 0.25, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05,
    emissive: 0x0a4f8a, emissiveIntensity: 0.55, transparent: true, opacity: 0.88,
    iridescence: small ? 0 : 0.6, iridescenceIOR: 1.4, flatShading: true,
  });

  const root = new Group();
  root.position.y = -0.25;
  scene.add(root);

  /* ---------- Oltin kubok ---------- */
  const trophy = new Group();
  const profile = [
    [0, -1.55], [0.98, -1.55], [0.98, -1.42], [0.78, -1.36], [0.72, -1.18], [0.42, -1.12], [0.36, -0.98],
    [0.17, -0.9], [0.13, -0.6], [0.13, -0.38], [0.26, -0.3], [0.17, -0.2], [0.3, -0.12], [0.68, 0.06],
    [0.98, 0.42], [1.14, 0.9], [1.2, 1.36], [1.24, 1.5], [1.16, 1.52], [1.1, 1.38], [1.04, 0.92], [0.86, 0.44], [0, 0.18],
  ].map(([x, y]) => new Vector2(x, y));
  trophy.add(new Mesh(new LatheGeometry(profile, small ? 40 : 72), gold));
  for (const side of [-1, 1]) {
    const handle = new Mesh(new TorusGeometry(0.42, 0.075, 14, 36, Math.PI * 1.15), gold);
    handle.position.set(side * 1.12, 0.82, 0);
    handle.rotation.z = -Math.PI * 0.52;
    if (side === -1) handle.rotation.y = Math.PI; // ko‘zgu aksi
    trophy.add(handle);
  }
  const star = new Mesh(new OctahedronGeometry(0.2, 0), gold);
  star.position.set(0, 0.82, 1.06);
  star.scale.set(1, 1.25, 0.35);
  trophy.add(star);

  const base = new Mesh(new CylinderGeometry(1.25, 1.38, 0.5, small ? 40 : 64), plinth);
  base.position.y = -1.8;
  trophy.add(base);
  const trim = new Mesh(new TorusGeometry(1.255, 0.03, 8, small ? 48 : 96), gold);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = -1.55;
  trophy.add(trim);
  root.add(trophy);

  /* ---------- Kitoblar ---------- */
  const pagesMat = new MeshStandardMaterial({ color: 0xf2ecdc, roughness: 0.85 });
  const covers = [
    new MeshPhysicalMaterial({ color: 0x0b45a0, roughness: 0.45, clearcoat: 0.6 }),
    new MeshPhysicalMaterial({ color: 0x0a1f4d, roughness: 0.4, clearcoat: 0.6 }),
    new MeshPhysicalMaterial({ color: 0x1b6fe0, roughness: 0.45, clearcoat: 0.6 }),
  ];
  function book(w, h, d, cover) {
    const g = new Group();
    const t = 0.05;
    const top = new Mesh(new BoxGeometry(w, t, d), cover);
    top.position.y = h / 2 - t / 2;
    const bottom = top.clone();
    bottom.position.y = -h / 2 + t / 2;
    const spine = new Mesh(new BoxGeometry(t, h, d), cover);
    spine.position.x = -w / 2 + t / 2;
    const pages = new Mesh(new BoxGeometry(w - 0.1, h - t * 2, d - 0.08), pagesMat);
    pages.position.x = 0.01;
    const band = new Mesh(new BoxGeometry(t + 0.01, h * 0.22, d + 0.004), gold);
    band.position.set(-w / 2 + t / 2, 0, 0);
    g.add(top, bottom, spine, pages, band);
    return g;
  }
  const books = new Group();
  [[1.9, 0.34, 1.35, 0, 0.0], [1.75, 0.3, 1.25, 1, 0.22], [1.6, 0.28, 1.15, 2, -0.15]].forEach(([w, h, d, c, rot], i) => {
    const b = book(w, h, d, covers[c]);
    b.position.y = i * 0.33;
    b.rotation.y = rot;
    books.add(b);
  });
  books.position.set(-2.25, -1.85, 0.6);
  books.rotation.y = 0.5;
  root.add(books);

  const leaning = book(1.3, 0.24, 0.95, covers[1]);
  leaning.position.set(2.35, -1.75, 0.9);
  leaning.rotation.set(0, -0.6, 0.12);
  root.add(leaning);

  /* ---------- Kristallar va orbita halqasi ---------- */
  const crystals = [];
  const addCrystal = (geo, pos, scale) => {
    const m = new Mesh(geo, crystal);
    m.position.set(...pos);
    m.scale.setScalar(scale);
    m.userData.base = pos[1];
    m.userData.phase = Math.random() * Math.PI * 2;
    root.add(m);
    crystals.push(m);
  };
  addCrystal(new OctahedronGeometry(0.5, 0), [2.35, 1.35, 0.2], 1);
  addCrystal(new IcosahedronGeometry(0.45, 0), [-2.25, 1.55, -0.4], 1);
  addCrystal(new OctahedronGeometry(0.5, 0), [1.75, -0.55, 1.4], 0.55);
  addCrystal(new OctahedronGeometry(0.5, 0), [-1.35, 2.55, -1.2], 0.45);
  const goldGem = new Mesh(new OctahedronGeometry(0.22, 0), gold);
  goldGem.position.set(-1.6, 0.25, 1.4);
  root.add(goldGem);

  const ring = new Mesh(
    new TorusGeometry(2.1, 0.012, 6, 160),
    new MeshBasicMaterial({ color: 0x24d8ff, transparent: true, opacity: 0.45 }),
  );
  ring.rotation.set(Math.PI / 2.25, 0, 0.18);
  ring.position.y = 0.2;
  root.add(ring);
  const ringGold = new Mesh(
    new TorusGeometry(2.55, 0.01, 6, 160),
    new MeshBasicMaterial({ color: 0xfff000, transparent: true, opacity: 0.35 }),
  );
  ringGold.rotation.set(Math.PI / 2.6, 0, -0.25);
  ringGold.position.y = 0.1;
  root.add(ringGold);

  /* ---------- Yumshoq soya va oltin zarrachalar ---------- */
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.7)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadow = new Mesh(new PlaneGeometry(8, 3.4), new MeshBasicMaterial({ map: new CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -2.06;
  root.add(shadow);

  const count = small ? 40 : 110;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 1.6 + Math.random() * 2.6;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = -1.8 + Math.random() * 4.6;
    pos[i * 3 + 2] = Math.sin(a) * r * 0.6;
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const dust = new Points(dustGeo, new PointsMaterial({
    color: 0xffe866, size: small ? 0.05 : 0.04, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false,
  }));
  root.add(dust);

  // Yorug‘ rejimda soya yengilroq, oltin zarrachalar (oq fonda ko‘rinmaydi) o‘chiriladi
  function applyTheme() {
    const light = document.documentElement.dataset.theme === 'light';
    shadow.material.opacity = light ? 0.35 : 1;
    dust.visible = !light;
    if (reduceMotion) renderer.render(scene, camera);
  }
  document.addEventListener('themechange', applyTheme);
  applyTheme();

  /* ---------- O‘lcham, kursor, aylanish ---------- */
  const wrap = canvas.parentElement;
  function resize() {
    const { width, height } = wrap.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (reduceMotion) renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(wrap);
  resize();

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!coarse && !reduceMotion) {
    addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  let visible = true;
  let running = false;
  let last = performance.now();
  let t = 0;

  function frame(now) {
    if (!visible || document.hidden) {
      running = false;
      return;
    }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += dt;

    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;

    trophy.rotation.y = Math.sin(t * 0.35) * 0.45 + pointer.x * 0.25;
    trophy.position.y = Math.sin(t * 0.8) * 0.08;
    root.rotation.x = pointer.y * 0.06;
    root.rotation.y = pointer.x * 0.12;
    books.position.y = -1.85 + Math.sin(t * 0.7 + 1) * 0.04;
    for (const c of crystals) {
      c.rotation.y += dt * 0.5;
      c.rotation.x += dt * 0.2;
      c.position.y = c.userData.base + Math.sin(t * 0.9 + c.userData.phase) * 0.15;
    }
    goldGem.rotation.y += dt * 0.9;
    ring.rotation.z += dt * 0.08;
    ringGold.rotation.z -= dt * 0.05;
    dust.rotation.y += dt * 0.03;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function play() {
    if (reduceMotion || running || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    play();
  }).observe(wrap);
  document.addEventListener('visibilitychange', play);

  renderer.render(scene, camera);
  wrap.classList.add('is-ready');
  play();
}
