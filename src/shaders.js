import * as THREE from "three";

export class SpaceEffects {
  constructor(scene) {
    this.scene = scene;
    this.sun = null;
    this.layers = [];
    this.exposure = 1.0;
  }

  createRealisticSun() {
    const geometry = new THREE.SphereGeometry(12, 96, 96);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        exposure: { value: this.exposure },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
      uniform float time;
      uniform float exposure;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      // --- Ruido procedural mejorado ---
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v){
        const vec4 C=vec4(0.211324865405187,0.366025403784439,
                          -0.577350269189626,0.024390243902439);
        vec2 i=floor(v+dot(v,C.yy));
        vec2 x0=v-i+dot(i,C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0*fract(p*C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314*(a0*a0 + h*h);
        vec3 g;
        g.x = a0.x*x0.x + h.x*x0.y;
        g.yz = a0.yz*x12.xz + h.yz*x12.yw;
        return 130.0 * dot(m, g);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 6; i++) {
          value += amplitude * snoise(p * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec3 n = normalize(vNormal);
        vec3 viewDir = normalize(-vWorldPosition);

        // --- Corrección mapeo UV para continuidad ---
        float longitude = atan(vWorldPosition.z, vWorldPosition.x);
        float latitude = asin(clamp(vWorldPosition.y / length(vWorldPosition), -1.0, 1.0));

        // Mapear longitude de [-PI, PI] a [0, 1] (U)
        float u = (longitude + 3.1415926) / (2.0 * 3.1415926);

        // Mapear latitude de [-PI/2, PI/2] a [0, 1] (V), suavizando polos con smoothstep
        float v = latitude / 3.1415926 + 0.5;

        // Suavizado en polos para evitar salto
        float poleBlend = smoothstep(0.0, 0.1, v) * smoothstep(1.0, 0.9, v);

        // Textura con fbm para detalle y movimiento
        float t = time * 0.25;
        vec2 uv = vec2(u, v);
        float basePattern = fbm(uv * 6.0 + vec2(t * 0.6, t * 0.4));
        float detailPattern = fbm(uv * 24.0 + vec2(-t * 0.3, t * 0.7));
        float pattern = mix(basePattern, detailPattern, 0.5);

        float grain = fbm(uv * 120.0 + vec2(t * 1.5, -t * 1.0)) * 0.1;

        pattern = mix(pattern, 0.0, 1.0 - poleBlend) + grain;

        // --- Color base solar ---
        vec3 red = vec3(1.0, 0.2, 0.05);
        vec3 orange = vec3(1.0, 0.55, 0.1);
        vec3 yellow = vec3(0.98, 0.85, 0.3);
        vec3 baseColor = mix(red, orange, pattern);
        baseColor = mix(baseColor, yellow, smoothstep(0.2, 0.8, pattern));

        // --- Iluminación difusa ---
        vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0));
        float diffuse = clamp(dot(n, lightDir), 0.0, 1.0);
        diffuse = 0.4 + 0.6 * diffuse;

        // --- Glow interno ajustado ---
        float glowFactor = pow(max(dot(viewDir, n), 0.0), 2.0) * 0.3;
        vec3 glowColor = vec3(1.0, 0.85, 0.4) * glowFactor;

        // --- Color final ---
        vec3 color = baseColor * diffuse + glowColor;
        color *= exposure;
        color = clamp(color, 0.0, 1.0);

        gl_FragColor = vec4(color, 1.0);
      }      
      `,
    });

    this.sun = new THREE.Mesh(geometry, material);
    return this.sun;
  }

  createCoronaLayers(sun) {
    const coronaGroup = new THREE.Group();
    const coronaData = [
      {
        radius: 12.3,
        colorInner: new THREE.Color(0xffd966),
        colorOuter: new THREE.Color(0xff9933),
        intensity: 0.35,
      },
      {
        radius: 12.7,
        colorInner: new THREE.Color(0xff9933),
        colorOuter: new THREE.Color(0xff6600),
        intensity: 0.25,
      },
      {
        radius: 13.0,
        colorInner: new THREE.Color(0xff6600),
        colorOuter: new THREE.Color(0xff4400),
        intensity: 0.15,
      },
    ];

    coronaData.forEach((d) => {
      const geom = new THREE.SphereGeometry(d.radius, 64, 64);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0.0 },
          colorInner: { value: d.colorInner },
          colorOuter: { value: d.colorOuter },
          intensity: { value: d.intensity },
          exposure: { value: this.exposure },
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 colorInner;
          uniform vec3 colorOuter;
          uniform float intensity;
          uniform float exposure;
          varying vec3 vNormal;
  
          float hash(vec2 p) {
            return fract(sin(dot(p ,vec2(127.1,311.7))) * 43758.5453123);
          }
  
          float noise(vec2 p){
            vec2 i = floor(p);
            vec2 f = fract(p);
  
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
  
            vec2 u = f*f*(3.0-2.0*f);
            return mix(a, b, u.x) +
                   (c - a)* u.y * (1.0 - u.x) +
                   (d - b) * u.x * u.y;
          }
  
          void main() {
            float pulse = 0.6 + 0.4 * sin(time * 2.0 + vNormal.x * 10.0);
  
            float alphaBase = smoothstep(0.0, 1.0, 1.0 - abs(vNormal.z));
            alphaBase = pow(alphaBase, 1.1);
  
            float n = noise(vNormal.xy * 10.0 + time * 0.5);
            float alphaNoise = mix(0.7, 1.0, n);
  
            float alpha = alphaBase * alphaNoise * intensity * 0.6;
  
            // Mezcla suave entre colores interior y exterior según la normal
            float mixFactor = smoothstep(0.3, 0.8, abs(vNormal.z));
            vec3 color = mix(colorInner, colorOuter, mixFactor);
  
            vec3 finalColor = color * pulse * exposure;
  
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      });

      const corona = new THREE.Mesh(geom, mat);
      coronaGroup.add(corona);
      this.layers.push(corona);
    });

    coronaGroup.position.copy(sun.position);
    return coronaGroup;
  }

  createSolarFlares(sun) {
    const flareGroup = new THREE.Group();

    this.createCoronalLoops(flareGroup, sun);

    flareGroup.position.copy(sun.position);
    return flareGroup;
  }

  createCoronalLoops(flareGroup, sun) {
    const loopCount = 35;

    for (let i = 0; i < loopCount; i++) {
      const points = [];
      const segments = 32;

      const height = 0.8 + Math.random() * 1.5;
      const width = 0.6 + Math.random() * 1.2;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const angle = t * Math.PI;
        const x = Math.cos(angle) * width;
        const y = Math.sin(angle) * height;
        points.push(new THREE.Vector3(x, y, 0));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, segments, 0.02, 8, false);

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0.0 },
          exposure: { value: this.exposure },
          seed: { value: Math.random() * 1000.0 },
        },
        vertexShader: `
        uniform float time;
        uniform float seed;
        varying float vIntensity;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vIntensity = uv.x; // Intensidad a lo largo del bucle
          
          // Movimiento orgánico sutil
          vec3 pos = position;
          float wave = sin(time * 3.0 + seed + position.y * 15.0) * 0.02;
          pos.x += wave;
          pos.z += cos(time * 2.5 + seed + position.x * 12.0) * 0.015;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
        fragmentShader: `
        uniform float time;
        uniform float exposure;
        varying float vIntensity;
        varying vec2 vUv;
        
        void main() {
          // Colores basados en temperatura real del plasma solar
          vec3 coolColor = vec3(1.0, 0.3, 0.1);    // Rojo - plasma más frío
          vec3 hotColor = vec3(1.0, 0.9, 0.4);     // Amarillo-blanco - plasma caliente
          
          // Mezcla de colores según la posición en el bucle
          vec3 loopColor = mix(coolColor, hotColor, vIntensity);
          
          // Pulsación y variación de intensidad
          float globalPulse = 0.7 + 0.3 * sin(time * 2.0);
          float finePulse = 0.8 + 0.2 * sin(time * 8.0 + vUv.y * 25.0);
          
          // Alpha con gradiente y pulsación
          float alpha = vIntensity * globalPulse * finePulse * exposure * 0.5;
          
          // Suavizado en los extremos
          alpha *= smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
          
          gl_FragColor = vec4(loopColor, alpha);
        }
      `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const loop = new THREE.Mesh(geometry, material);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const surfaceNormal = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      );

      const surfacePos = surfaceNormal.clone().multiplyScalar(12.0);
      loop.position.copy(surfacePos);

      const normal = surfaceNormal.clone();

      const tangent = new THREE.Vector3();
      tangent.crossVectors(normal, new THREE.Vector3(0, 1, 0));
      if (tangent.length() < 0.001) {
        tangent.crossVectors(normal, new THREE.Vector3(1, 0, 0));
      }
      tangent.normalize();

      const binormal = new THREE.Vector3();
      binormal.crossVectors(normal, tangent);
      binormal.normalize();

      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.set(
        tangent.x,
        binormal.x,
        normal.x,
        0,
        tangent.y,
        binormal.y,
        normal.y,
        0,
        tangent.z,
        binormal.z,
        normal.z,
        0,
        0,
        0,
        0,
        1
      );

      loop.rotation.setFromRotationMatrix(rotationMatrix);

      loop.rotateOnAxis(normal, Math.random() * Math.PI * 2);

      flareGroup.add(loop);
      this.layers.push(loop);
    }

    console.log("✅ Bucles coronales creados: " + loopCount);
  }

  createHeatHalo(sun) {
    const geom = new THREE.SphereGeometry(12.5, 64, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0.0 }, exposure: { value: this.exposure } },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
      uniform float time;
      uniform float exposure;
      varying vec3 vNormal;
      
      // Ruido simplex o fbm simplificado para el halo
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      
      float snoise(vec2 v){
        const vec4 C=vec4(0.211324865405187,0.366025403784439,
                          -0.577350269189626,0.024390243902439);
        vec2 i=floor(v+dot(v,C.yy));
        vec2 x0=v-i+dot(i,C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0*fract(p*C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314*(a0*a0 + h*h);
        vec3 g;
        g.x = a0.x*x0.x + h.x*x0.y;
        g.yz = a0.yz*x12.xz + h.yz*x12.yw;
        return 130.0 * dot(m, g);
      }
      
      void main() {
        float pulse = 0.85 + 0.15 * sin(time * 0.8 + vNormal.x * 6.0);
      
        float alphaBase = smoothstep(1.0, 0.0, abs(vNormal.z));
        alphaBase = pow(alphaBase, 3.0);
      
        // Coordenadas para el ruido (suavizado y de bajo detalle)
        vec2 noiseCoords = vNormal.xy * 3.0 + time * 0.2;
        float noiseValue = snoise(noiseCoords) * 0.5 + 0.5; // Normalizado 0-1
      
        // Mezcla el color con un naranja cálido más difuso según el ruido
        vec3 baseColor = vec3(1.0, 0.75, 0.3);
        vec3 noiseColor = vec3(1.0, 0.85, 0.5) * noiseValue;
      
        vec3 color = mix(baseColor, noiseColor, 0.7) * pulse * exposure;
      
        float alpha = alphaBase * 0.3 * noiseValue;
      
        gl_FragColor = vec4(color, alpha);
      }      
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const halo = new THREE.Mesh(geom, mat);
    this.layers.push(halo);
    halo.position.copy(sun.position);
    return halo;
  }

  initSunEffects() {
    const sun = this.createRealisticSun();
    const corona = this.createCoronaLayers(sun);
    const flares = this.createSolarFlares(sun);
    const halo = this.createHeatHalo(sun);

    this.scene.add(sun);
    this.scene.add(corona);
    this.scene.add(flares);
    this.scene.add(halo);

    console.log("✅ Sol hiperrealista con control de exposición cargado");
    return sun;
  }

  update(time) {
    if (this.sun && this.sun.material.uniforms.time)
      this.sun.material.uniforms.time.value = time;

    this.layers.forEach((obj) => {
      if (obj.material.uniforms.time) obj.material.uniforms.time.value = time;
      obj.rotation.y += 0.0006;
    });

    if (this.sun) this.sun.rotation.y += 0.001;
  }

  setExposure(value) {
    this.exposure = value;
    if (this.sun && this.sun.material.uniforms.exposure)
      this.sun.material.uniforms.exposure.value = value;

    this.layers.forEach((obj) => {
      if (obj.material.uniforms.exposure)
        obj.material.uniforms.exposure.value = value;
    });
  }
}
