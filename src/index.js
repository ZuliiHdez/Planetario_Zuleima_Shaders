import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { SpaceEffects } from "./shaders.js";

let scene, camera, renderer;
let orbitControls;
let useFlyView = false;
let sol;
let planetas = [];
let extras = [];
let asteroides = [];
let labels = [];
let spaceEffects;
let starField;

const TIME_SCALE = 500;
const rotationPeriods = {
  Mercurio: 1407.6,
  Venus: -5832.5,
  Tierra: 24,
  Marte: 24.6,
  Júpiter: 9.9,
  Saturno: 10.7,
  Urano: -17.2,
  Neptuno: 16.1,
  Luna: 655.7,
};

let moveState = { forward: 0, backward: 0, left: 0, right: 0, up: 0, down: 0 };
let t0 = new Date();
let pitch = 0,
  yaw = 0,
  isMouseDown = false;
let prevMouse = { x: 0, y: 0 };

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    3000
  );
  camera.position.set(0, 100, 250);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000);
  renderer.domElement.style.display = "block";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  const starTexture = new THREE.TextureLoader().load(
    "src/textures/stars_milky_way.jpg"
  );
  const starGeo = new THREE.SphereGeometry(2000, 64, 64);
  const starMat = new THREE.MeshBasicMaterial({
    map: starTexture,
    side: THREE.BackSide,
  });
  starField = new THREE.Mesh(starGeo, starMat);
  scene.add(starField);

  spaceEffects = new SpaceEffects(scene);

  sol = spaceEffects.initSunEffects();

  const sunLight = new THREE.PointLight(0xffffff, 2.5, 0);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x222222));

  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousedown", (e) => {
    if (useFlyView) {
      isMouseDown = true;
      prevMouse.x = e.clientX;
      prevMouse.y = e.clientY;
    }
  });
  window.addEventListener("mouseup", (e) => {
    if (useFlyView) isMouseDown = false;
  });
  window.addEventListener("mousemove", (e) => {
    if (useFlyView && isMouseDown) {
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      yaw -= dx * 0.002;
      pitch -= dy * 0.002;
      pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
      prevMouse.x = e.clientX;
      prevMouse.y = e.clientY;
    }
  });
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "v") {
      useFlyView = !useFlyView;
      if (!useFlyView) orbitControls.update();
    }
  });

  crearPlanetas();
  crearCinturonAsteroides();
  crearHUD();
}

function crearHUD() {
  const hud = document.createElement("div");
  hud.style.position = "absolute";
  hud.style.bottom = "10px";
  hud.style.left = "10px";
  hud.style.padding = "10px";
  hud.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
  hud.style.color = "#fff";
  hud.style.fontFamily = "Monospace";
  hud.style.fontSize = "14px";
  hud.style.lineHeight = "1.4em";
  hud.style.borderRadius = "5px";
  hud.style.userSelect = "none";
  hud.innerHTML = `
    <b>Controles del Sistema Solar:</b><br><br>
    <u>Vista General (OrbitControls)</u>:<br>
    - Rotar: botón izquierdo del ratón<br>
    - Zoom: rueda del ratón<br>
    - Desplazar cámara: botón derecho del ratón<br><br>
    <u>Vista Exploración (V para activar)</u>:<br>
    - Mover: W/A/S/D<br>
    - Subir/Bajar: Space / Shift<br>
    - Rotar cámara: mantener clic izquierdo y mover ratón<br>
    - Cambiar vista: V
  `;
  document.body.appendChild(hud);
}

function onKeyDown(e) {
  switch (e.code) {
    case "KeyW":
      moveState.forward = 1;
      break;
    case "KeyS":
      moveState.backward = 1;
      break;
    case "KeyA":
      moveState.left = 1;
      break;
    case "KeyD":
      moveState.right = 1;
      break;
    case "ShiftLeft":
      moveState.down = 1;
      break;
    case "Space":
      moveState.up = 1;
      break;
  }
}
function onKeyUp(e) {
  switch (e.code) {
    case "KeyW":
      moveState.forward = 0;
      break;
    case "KeyS":
      moveState.backward = 0;
      break;
    case "KeyA":
      moveState.left = 0;
      break;
    case "KeyD":
      moveState.right = 0;
      break;
    case "ShiftLeft":
      moveState.down = 0;
      break;
    case "Space":
      moveState.up = 0;
      break;
  }
}

function crearPlanetas() {
  const loader = new THREE.TextureLoader();
  const planetData = [
    { nombre: "Mercurio", radio: 1, dist: 18, vel: 4.8, tex: "mercury.jpg" },
    { nombre: "Venus", radio: 1.3, dist: 26, vel: 3.8, tex: "venus.jpg" },
    {
      nombre: "Tierra",
      radio: 1.4,
      dist: 34,
      vel: 3.2,
      tex: "earth_daymap.jpg",
    },
    { nombre: "Marte", radio: 1.1, dist: 42, vel: 2.6, tex: "mars.jpg" },
    { nombre: "Júpiter", radio: 5.0, dist: 90, vel: 1.5, tex: "jupiter.jpg" },
    { nombre: "Saturno", radio: 4.5, dist: 110, vel: 1.0, tex: "saturn.jpg" },
    { nombre: "Urano", radio: 3.0, dist: 130, vel: 0.8, tex: "uranus.jpg" },
    { nombre: "Neptuno", radio: 2.7, dist: 150, vel: 0.5, tex: "neptune.jpg" },
  ];

  for (let d of planetData) {
    const geom = new THREE.SphereGeometry(d.radio, 64, 64);
    const mat = new THREE.MeshStandardMaterial({
      map: loader.load(`src/textures/${d.tex}`),
    });
    const planeta = new THREE.Mesh(geom, mat);
    planeta.userData = {
      dist: d.dist,
      vel: d.vel,
      ang: Math.random() * Math.PI * 2,
      nombre: d.nombre,
    };
    planetas.push(planeta);
    scene.add(planeta);
    crearEtiqueta(d.nombre, planeta);

    const ringGeom = new THREE.RingGeometry(d.dist - 0.05, d.dist + 0.05, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x555555,
      side: THREE.DoubleSide,
    });
    const orbita = new THREE.Mesh(ringGeom, ringMat);
    orbita.rotation.x = -Math.PI / 2;
    scene.add(orbita);

    if (d.nombre === "Venus") crearAtmósferaVenus(planeta);
    if (d.nombre === "Tierra") crearTierraCompleta(planeta);
    if (d.nombre === "Saturno") crearAnillosSaturno(planeta);
  }
}

function crearEtiqueta(nombre, objeto) {
  const label = document.createElement("div");
  label.style.position = "absolute";
  label.style.color = "white";
  label.style.fontFamily = "Monospace";
  label.style.fontSize = "14px";
  label.style.fontWeight = "bold";
  label.style.backgroundColor = "rgba(0,0,0,0.5)";
  label.style.padding = "2px 4px";
  label.style.borderRadius = "3px";
  label.innerHTML = nombre;
  document.body.appendChild(label);
  labels.push({ div: label, obj: objeto });
}

function crearAtmósferaVenus(planeta) {
  const txAtmos = new THREE.TextureLoader().load(
    "src/textures/venus_atmosphere.jpg"
  );
  const atmGeo = new THREE.SphereGeometry(
    planeta.geometry.parameters.radius * 1.02,
    64,
    64
  );
  const atmMat = new THREE.MeshStandardMaterial({
    map: txAtmos,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const atm = new THREE.Mesh(atmGeo, atmMat);
  atm.userData.parent = planeta;
  extras.push(atm);
  scene.add(atm);
}

function crearTierraCompleta(planeta) {
  const loader = new THREE.TextureLoader();
  const mapDay = loader.load("src/textures/earth_daymap.jpg");
  const mapNight = loader.load("src/textures/earth_nightmap.jpg");
  const mapClouds = loader.load("src/textures/earth_clouds.jpg");
  const mapSpecular = loader.load("src/textures/earth_specular.tif");

  planeta.material = new THREE.MeshPhongMaterial({
    map: mapDay,
    emissiveMap: mapNight,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.4,
    specularMap: mapSpecular,
    shininess: 30,
  });

  const geoNubes = new THREE.SphereGeometry(
    planeta.geometry.parameters.radius * 1.015,
    64,
    64
  );
  const matNubes = new THREE.MeshPhongMaterial({
    map: mapClouds,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const nubes = new THREE.Mesh(geoNubes, matNubes);
  nubes.userData.parent = planeta;
  extras.push(nubes);
  scene.add(nubes);

  const moonGeom = new THREE.SphereGeometry(0.35, 32, 32);
  const moonTex = loader.load("src/textures/moon.jpg");
  const moonMat = new THREE.MeshStandardMaterial({ map: moonTex });
  const luna = new THREE.Mesh(moonGeom, moonMat);
  luna.userData = {
    dist: 3.0,
    vel: 5.0,
    ang: Math.random() * Math.PI * 2,
    parent: planeta,
    nombre: "Luna",
  };
  extras.push(luna);
  planetas.push(luna);
  scene.add(luna);
  crearEtiqueta("Luna", luna);
}

function crearAnillosSaturno(planeta) {
  const ringTex = new THREE.TextureLoader().load(
    "src/textures/saturn_ring.png"
  );
  const ringGeo = new THREE.RingGeometry(
    planeta.geometry.parameters.radius * 1.6,
    planeta.geometry.parameters.radius * 3.0,
    128
  );
  const ringMat = new THREE.MeshBasicMaterial({
    map: ringTex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const anillo = new THREE.Mesh(ringGeo, ringMat);
  anillo.rotation.x = -Math.PI / 2;
  anillo.userData.parent = planeta;
  extras.push(anillo);
  scene.add(anillo);
}

function crearCinturonAsteroides() {
  const geom = new THREE.SphereGeometry(0.15, 6, 6);
  const matAst = new THREE.TextureLoader().load("src/textures/asteroid.jpg");
  const mat = new THREE.MeshStandardMaterial({ map: matAst });

  for (let i = 0; i < 800; i++) {
    const ast = new THREE.Mesh(geom, mat.clone());
    const ang = Math.random() * Math.PI * 2;
    const dist = THREE.MathUtils.randFloat(45, 70);
    const y = THREE.MathUtils.randFloat(-2, 2);
    ast.position.set(Math.cos(ang) * dist, y, Math.sin(ang) * dist);
    ast.userData = { dist, ang, vel: THREE.MathUtils.randFloat(0.4, 0.8) };
    scene.add(ast);
    asteroides.push(ast);
  }

  for (let i = 0; i < 600; i++) {
    const ast = new THREE.Mesh(geom, mat.clone());
    const ang = Math.random() * Math.PI * 2;
    const dist = THREE.MathUtils.randFloat(140, 180);
    const y = THREE.MathUtils.randFloat(-3, 3);
    ast.position.set(Math.cos(ang) * dist, y, Math.sin(ang) * dist);
    ast.userData = { dist, ang, vel: THREE.MathUtils.randFloat(0.1, 0.3) };
    scene.add(ast);
    asteroides.push(ast);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const t1 = new Date();
  const dt = (t1 - t0) / 1000;
  t0 = t1;

  if (spaceEffects) {
    spaceEffects.update(performance.now() * 0.001);
  }

  if (sol) sol.rotation.y += 0.001;
  if (starField) starField.rotation.y += 0.00005;

  for (let p of planetas) {
    if (p.userData.parent) {
      const parent = p.userData.parent;
      p.userData.ang += 0.02 * p.userData.vel;
      p.position.x =
        parent.position.x + Math.cos(p.userData.ang) * p.userData.dist;
      p.position.z =
        parent.position.z + Math.sin(p.userData.ang) * p.userData.dist;
    } else {
      p.userData.ang += 0.001 * p.userData.vel;
      p.position.x = Math.cos(p.userData.ang) * p.userData.dist;
      p.position.z = Math.sin(p.userData.ang) * p.userData.dist;
    }
    const period = rotationPeriods[p.userData.nombre] || 24;
    p.rotation.y += (2 * Math.PI) / (period * TIME_SCALE);
  }

  for (let ex of extras) {
    if (ex.userData.parent && !ex.userData.dist)
      ex.position.copy(ex.userData.parent.position);
    ex.rotation.y += 0.002;
  }

  for (let a of asteroides) {
    a.userData.ang += 0.001 * a.userData.vel;
    a.position.x = Math.cos(a.userData.ang) * a.userData.dist;
    a.position.z = Math.sin(a.userData.ang) * a.userData.dist;
  }

  labels.forEach((label) => {
    const pos = label.obj.position.clone();
    pos.project(camera);
    if (pos.z < 1) {
      const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
      label.div.style.left = `${x}px`;
      label.div.style.top = `${y}px`;
      label.div.style.display = "block";
    } else {
      label.div.style.display = "none";
    }
  });

  if (useFlyView) {
    orbitControls.enabled = false;
    const dir = new THREE.Vector3();
    const right = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.normalize();
    right.crossVectors(dir, camera.up).normalize();
    const speed = 1.5;

    camera.position.addScaledVector(
      dir,
      (moveState.forward - moveState.backward) * speed
    );
    camera.position.addScaledVector(
      right,
      (moveState.right - moveState.left) * speed
    );
    camera.position.y += (moveState.up - moveState.down) * speed;

    const quat = new THREE.Quaternion();
    quat.setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
    camera.quaternion.copy(quat);
  } else {
    orbitControls.enabled = true;
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
