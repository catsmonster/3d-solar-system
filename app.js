import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class SolarSystemApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.loader = document.getElementById('loader-overlay');
    
    // Core parameters
    this.time = 0;
    this.speedMultiplier = 1.0;
    this.isPaused = false;
    this.showOrbits = true;
    this.scaleMode = 'visual'; // 'visual' or 'realistic'
    this.selectedBody = null;
    this.targetFocus = new THREE.Vector3(0, 0, 0);
    this.cameraDistance = 150;
    
    // Arrays to store interactive 3D elements
    this.planets = {};
    this.orbitLines = [];
    this.cloudMeshes = []; // for rotating atmospheric clouds

    // Lightbox zoom & pan states
    this.zoomScale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.startPanCoords = { x: 0, y: 0 };
    
    // Keyboard navigation keys pressed state
    this.keysPressed = {};
    
    this.init();
  }

  async init() {
    // 1. Setup Loading Manager and Texture Loader
    this.loadingSubtext = document.querySelector('#loader-overlay .loader-subtext');
    this.loadingManager = new THREE.LoadingManager();
    
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const percentage = Math.round((itemsLoaded / itemsTotal) * 100);
      if (this.loadingSubtext) {
        this.loadingSubtext.textContent = `Loading Celestial Textures: ${percentage}%`;
      }
    };
    
    this.loadingManager.onLoad = () => {
      if (this.loadingSubtext) {
        this.loadingSubtext.textContent = `System Calibration Complete.`;
      }
      setTimeout(() => {
        if (this.loader) {
          this.loader.classList.add('fade-out');
        }
      }, 500);
    };

    this.loadingManager.onError = (url) => {
      console.warn(`Error loading texture: ${url}`);
    };

    this.textureLoader = new THREE.TextureLoader(this.loadingManager);

    // Safety timeout: guarantee scene fades in even if a texture fails to resolve
    setTimeout(() => {
      if (this.loader && !this.loader.classList.contains('fade-out')) {
        console.log('Safety timeout triggered - forcing fade-in');
        if (this.loadingSubtext) {
          this.loadingSubtext.textContent = `System Calibration Complete.`;
        }
        this.loader.classList.add('fade-out');
      }
    }, 8000);

    // 2. Setup Three.js Boilerplate
    this.createScene();
    this.createLighting();
    this.createStarfield();
    
    // 3. Generate Sun & Planets
    this.createSolarSystem();
    
    // 4. Setup Interaction Controls
    this.setupControls();
    this.setupInteraction();
    
    // 5. Bind DOM Controls UI
    this.bindHUD();
    
    // 6. Start Render Animation Loop
    this.animate();
  }

  createScene() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030308, 0.001);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 150, 260);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 600;
    this.controls.minDistance = 15;
  }

  createLighting() {
    // Ambient Light - soft cosmic deep blue fill light so shadows aren't pitch black
    this.ambientLight = new THREE.AmbientLight(0x22264a, 0.15);
    this.scene.add(this.ambientLight);

    // Hemisphere Light - simulates a warm cosmic nebula fill (soft blue-gray from top, dark violet from bottom)
    // This gives planets a gorgeous, premium 3D volumetric look, ensuring procedural textures are visible even in shadow
    this.hemiLight = new THREE.HemisphereLight(0x4b6bb0, 0x0c0c17, 0.35);
    this.scene.add(this.hemiLight);

    // Point Light - positioned inside the Sun to brilliantly illuminate planet faces
    // Tuned down to 3.2 intensity and 0.08 decay to make details highly legible and give a gorgeous deep-space contrast
    this.sunLight = new THREE.PointLight(0xffffff, 3.2, 2000, 0.08);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
  }

  createStarfield() {
    const starCount = 6000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const colorPalette = [
      new THREE.Color(0xffffff), // White stars
      new THREE.Color(0xaae2e6), // Cyan stars
      new THREE.Color(0xffd2a1), // Warm orange stars
      new THREE.Color(0xffbfb0), // Soft red stars
    ];

    for (let i = 0; i < starCount * 3; i += 3) {
      // Position inside a massive spherical coordinate shell
      const radius = 600 + Math.random() * 400;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);

      // Color variation
      const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i] = randomColor.r;
      colors[i + 1] = randomColor.g;
      colors[i + 2] = randomColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle texture - procedural glow point
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    const starTex = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      map: starTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  createSolarSystem() {
    // Generate planet by planet based on data.js schema
    for (const key in window.PLANET_DATA) {
      const data = window.PLANET_DATA[key];
      const visualSize = data.orbital.size;

      // Group holds planet and any offset orbits / rings for cleaner transformations
      const bodyGroup = new THREE.Group();
      bodyGroup.name = key;

      // Create core planetary sphere
      // Terrestrial planets use 128 segments to enable detailed physical terrain displacement, gas giants use 64
      const isTerrestrial = ['mercury', 'venus', 'earth', 'mars'].includes(key);
      const subdivisions = isTerrestrial ? 128 : 64;
      const sphereGeo = new THREE.SphereGeometry(1, subdivisions, subdivisions);
      let material;

      // Create high-end procedural textures
      if (key === 'sun') {
        material = this.createSunMaterial();
        
        // Add beautiful glowing halos
        const glowGeo = new THREE.SphereGeometry(1.2, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xff8800,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        bodyGroup.add(glowMesh);
      } else {
        material = this.createPlanetMaterial(key, data.color);
      }

      const mesh = new THREE.Mesh(sphereGeo, material);
      mesh.name = `${key}_sphere`;
      
      // Apply oblate spheroid squashing (flattening due to centrifugal rotation)
      const squashFactor = data.orbital.flattening || 1.0;
      mesh.scale.set(visualSize, visualSize * squashFactor, visualSize);
      
      mesh.castShadow = (key !== 'sun');
      mesh.receiveShadow = (key !== 'sun');
      bodyGroup.add(mesh);

      // Add extra features (Earth clouds, Saturn rings, etc.)
      this.addExtraPlanetFeatures(key, bodyGroup, visualSize);

      this.scene.add(bodyGroup);
      this.planets[key] = {
        group: bodyGroup,
        mesh: mesh,
        data: data,
        angle: Math.random() * Math.PI * 2 // Random starting orbital position
      };

      // Orbit lines rendering
      if (key !== 'sun') {
        this.createOrbitLine(key, data.orbital.distance);
      }
    }
  }

  // --- High-fidelity Procedural Texturing System ---

  createSunMaterial() {
    const texture = this.textureLoader.load('./assets/sun_texture.png');
    return new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff
    });
  }

  createPlanetMaterial(key, hexColor) {
    let texture;
    
    // Check if we have generated texture assets for this planet
    const texturedPlanets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn'];
    
    if (texturedPlanets.includes(key)) {
      texture = this.textureLoader.load(`./assets/${key}_texture.png`);
    } else {
      // Fallback/procedural high-fidelity textures for Uranus and Neptune
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      if (key === 'uranus') {
        // Soft cyan horizontal atmospheric bands
        const gradStripe = ctx.createLinearGradient(0, 0, 0, 256);
        gradStripe.addColorStop(0, '#bbf2f6');
        gradStripe.addColorStop(0.3, '#9ce8ed');
        gradStripe.addColorStop(0.6, '#7cdfe5');
        gradStripe.addColorStop(1, '#56cbd1');
        ctx.fillStyle = gradStripe;
        ctx.fillRect(0, 0, 512, 256);
        
        // Faint planetary atmospheric rings/glow bands on texture
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.fillRect(0, Math.random() * 256, 512, 10 + Math.random() * 20);
        }
      } 
      else if (key === 'neptune') {
        // Cobalt blue with dynamic bands and darker storm spots
        const gradStripe = ctx.createLinearGradient(0, 0, 0, 256);
        gradStripe.addColorStop(0, '#2d4d9c');
        gradStripe.addColorStop(0.3, '#1c3673');
        gradStripe.addColorStop(0.7, '#102454');
        gradStripe.addColorStop(1, '#061330');
        ctx.fillStyle = gradStripe;
        ctx.fillRect(0, 0, 512, 256);

        // Swirling thin white methane cloud lines (supersonic winds)
        for (let i = 0; i < 8; i++) {
          ctx.strokeStyle = 'rgba(200, 240, 255, 0.15)';
          ctx.lineWidth = 1 + Math.random() * 2;
          ctx.beginPath();
          const y = 30 + Math.random() * 196;
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(128, y - 10 + Math.random() * 20, 384, y - 10 + Math.random() * 20, 512, y);
          ctx.stroke();
        }

        // Great Dark Spot storm
        ctx.fillStyle = '#030a21';
        ctx.beginPath();
        ctx.ellipse(140, 100, 22, 12, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Default block fallback color just in case
        ctx.fillStyle = hexColor;
        ctx.fillRect(0, 0, 512, 256);
      }
      
      texture = new THREE.CanvasTexture(canvas);
    }
    
    // Set appropriate roughness/metalness parameters per planet type to look extremely premium!
    let roughness = 0.85;
    let metalness = 0.05;
    
    if (key === 'earth') {
      roughness = 0.4;  // oceans are shiny
      metalness = 0.1;
    } else if (key === 'venus') {
      roughness = 0.9;  // very thick gas
    } else if (key === 'jupiter' || key === 'saturn') {
      roughness = 0.75; // gas giant soft sheen
    }
    
    const matParams = {
      map: texture,
      roughness: roughness,
      metalness: metalness
    };

    // Apply GPU-accelerated physical terrain displacement for solid terrestrial worlds
    const displacementSettings = {
      mercury: { scale: 0.022, bias: -0.006 },
      venus: { scale: 0.015, bias: -0.004 },
      earth: { scale: 0.025, bias: -0.008 },
      mars: { scale: 0.035, bias: -0.012 }
    };

    if (displacementSettings[key]) {
      matParams.displacementMap = texture;
      matParams.displacementScale = displacementSettings[key].scale;
      matParams.displacementBias = displacementSettings[key].bias;
    }
    
    const mat = new THREE.MeshStandardMaterial(matParams);

    return mat;
  }

  addExtraPlanetFeatures(key, group, planetSize) {
    // 1. Earth Atmosphere Cloud Layer - Removed for now by user request

    // 2. Saturn rings
    if (key === 'saturn') {
      const innerRadius = 1.35;
      const outerRadius = 2.45;
      
      const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 64);
      
      // Project UV coordinates radially mapping standard planar rings
      const pos = ringGeo.attributes.position;
      const v3 = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        ringGeo.attributes.uv.setXY(i, (v3.length() - innerRadius) / (outerRadius - innerRadius), 0.5);
      }

      // Make ring transparency gaps map
      const ringCanvas = document.createElement('canvas');
      ringCanvas.width = 256;
      ringCanvas.height = 4;
      const rctx = ringCanvas.getContext('2d');
      
      // Beautiful gold and charcoal radial transparency stripes
      const ringGrad = rctx.createLinearGradient(0, 0, 256, 0);
      ringGrad.addColorStop(0, 'rgba(235, 210, 160, 0.7)');
      ringGrad.addColorStop(0.3, 'rgba(200, 180, 140, 0.9)');
      ringGrad.addColorStop(0.48, 'rgba(10, 10, 15, 0.05)'); // Cassine division
      ringGrad.addColorStop(0.52, 'rgba(10, 10, 15, 0.05)'); // Cassine division
      ringGrad.addColorStop(0.7, 'rgba(215, 190, 150, 0.8)');
      ringGrad.addColorStop(0.9, 'rgba(175, 150, 120, 0.6)');
      ringGrad.addColorStop(1, 'rgba(145, 120, 95, 0.0)');

      rctx.fillStyle = ringGrad;
      rctx.fillRect(0, 0, 256, 4);

      const ringTexture = new THREE.CanvasTexture(ringCanvas);
      const ringMat = new THREE.MeshStandardMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        roughness: 0.6,
        metalness: 0.1
      });

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.3; // Tilted ring
      ringMesh.scale.setScalar(planetSize);
      ringMesh.name = 'saturn_rings';
      group.add(ringMesh);
    }

    // 3. Uranus rings (tilted vertically)
    if (key === 'uranus') {
      const innerRadius = 1.35;
      const outerRadius = 1.45;
      const ringGeo = new THREE.RingGeometry(innerRadius, outerRadius, 64);
      
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xaae2e6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35
      });

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.y = Math.PI / 2; // Perfectly vertical alignment (axial tilt)
      ringMesh.scale.setScalar(planetSize);
      ringMesh.name = 'uranus_rings';
      group.add(ringMesh);
    }
  }

  createOrbitLine(planetKey, distance) {
    const orbitGeo = new THREE.BufferGeometry();
    const segments = 128;
    const points = [];

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * distance, 0, Math.sin(theta) * distance));
    }

    orbitGeo.setFromPoints(points);

    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });

    const orbit = new THREE.LineLoop(orbitGeo, orbitMat);
    orbit.name = `${planetKey}_orbit_line`;
    this.scene.add(orbit);
    this.orbitLines.push(orbit);
  }

  // --- Dynamic HUD binding & Interactivity ---

  bindHUD() {
    this.toggleOrbitsBtn = document.getElementById('toggle-orbits-btn');
    this.toggleScaleBtn = document.getElementById('toggle-scale-btn');
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.speedSlider = document.getElementById('speed-slider');
    this.speedVal = document.getElementById('speed-val');
    this.resetCamBtn = document.getElementById('reset-cam-btn');
    
    // Panel Elements
    this.panelContainer = document.getElementById('telemetry-panel');
    this.closePanelBtn = document.getElementById('close-panel-btn');
    this.planetTitle = document.getElementById('planet-title');
    this.planetTagline = document.getElementById('planet-tagline');
    this.planetDesc = document.getElementById('planet-desc');
    this.planetInfographicImg = document.getElementById('planet-infographic-img');
    this.infographicLoader = document.getElementById('infographic-loader');
    this.statsGrid = document.getElementById('planet-stats-grid');
    this.funFactsList = document.getElementById('planet-fun-facts');
    this.instructions = document.getElementById('nav-instructions');

    // Lightbox Elements
    this.lightbox = document.getElementById('infographic-lightbox');
    this.lightboxImg = document.getElementById('lightbox-img');
    this.lightboxCaption = document.getElementById('lightbox-caption');
    this.lightboxCloseBtn = document.getElementById('lightbox-close-btn');

    // Dot Sidebar items
    this.navItems = document.querySelectorAll('.sidebar-planet-item');

    // Event Listeners
    this.toggleOrbitsBtn.addEventListener('click', () => this.toggleOrbits());
    this.toggleScaleBtn.addEventListener('click', () => this.toggleScaleMode());
    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.speedSlider.addEventListener('input', (e) => this.updateSpeed(e.target.value));
    this.resetCamBtn.addEventListener('click', () => this.resetCamera());
    this.closePanelBtn.addEventListener('click', () => this.deselectPlanet());

    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const planetKey = item.getAttribute('data-planet');
        this.selectPlanet(planetKey);
      });
    });

    // Make image transition fade smoothly on loads
    this.planetInfographicImg.addEventListener('load', () => {
      this.infographicLoader.style.display = 'none';
      this.planetInfographicImg.classList.add('loaded');
    });

    // Lightbox interactions
    this.planetInfographicImg.addEventListener('click', () => this.openLightbox());
    this.lightboxCloseBtn.addEventListener('click', () => this.closeLightbox());
    this.lightbox.addEventListener('click', (e) => {
      if (e.target !== this.lightboxImg) {
        this.closeLightbox();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.lightbox.classList.contains('open')) {
        this.closeLightbox();
      }
    });

    // Lightbox zoom & pan event listeners
    this.lightboxImg.addEventListener('wheel', (e) => {
      if (!this.lightbox.classList.contains('open')) return;
      e.preventDefault();
      const zoomFactor = 0.15;
      
      if (e.deltaY < 0) {
        this.zoomScale = Math.min(this.zoomScale + zoomFactor, 5.0);
      } else {
        this.zoomScale = Math.max(this.zoomScale - zoomFactor, 1.0);
      }

      if (this.zoomScale === 1.0) {
        this.panX = 0;
        this.panY = 0;
        this.lightboxImg.classList.remove('zoomed');
      } else {
        this.lightboxImg.classList.add('zoomed');
      }

      this.updateLightboxTransform();
    }, { passive: false });

    // Drag-panning via mouse
    this.lightboxImg.addEventListener('mousedown', (e) => {
      if (this.zoomScale > 1.0) {
        e.preventDefault();
        this.isPanning = true;
        this.lightboxImg.classList.add('zoomed'); // ensure transition is off during drag
        this.lightboxImg.style.cursor = 'grabbing';
        this.startPanCoords.x = e.clientX - this.panX;
        this.startPanCoords.y = e.clientY - this.panY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning && this.lightbox.classList.contains('open')) {
        this.panX = e.clientX - this.startPanCoords.x;
        this.panY = e.clientY - this.startPanCoords.y;
        
        // Boundaries: clamp pan based on scale to prevent dragging completely out of view
        const maxPanX = window.innerWidth * 0.45 * this.zoomScale;
        const maxPanY = window.innerHeight * 0.45 * this.zoomScale;
        this.panX = Math.max(Math.min(this.panX, maxPanX), -maxPanX);
        this.panY = Math.max(Math.min(this.panY, maxPanY), -maxPanY);

        this.updateLightboxTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        if (this.lightboxImg) {
          this.lightboxImg.style.cursor = this.zoomScale > 1.0 ? 'grab' : 'zoom-out';
        }
      }
    });

    // Touch support for drag-panning on mobile
    this.lightboxImg.addEventListener('touchstart', (e) => {
      if (this.zoomScale > 1.0 && e.touches.length === 1) {
        this.isPanning = true;
        this.lightboxImg.classList.add('zoomed');
        this.startPanCoords.x = e.touches[0].clientX - this.panX;
        this.startPanCoords.y = e.touches[0].clientY - this.panY;
      }
    });

    this.lightboxImg.addEventListener('touchmove', (e) => {
      if (this.isPanning && e.touches.length === 1 && this.lightbox.classList.contains('open')) {
        this.panX = e.touches[0].clientX - this.startPanCoords.x;
        this.panY = e.touches[0].clientY - this.startPanCoords.y;
        
        const maxPanX = window.innerWidth * 0.45 * this.zoomScale;
        const maxPanY = window.innerHeight * 0.45 * this.zoomScale;
        this.panX = Math.max(Math.min(this.panX, maxPanX), -maxPanX);
        this.panY = Math.max(Math.min(this.panY, maxPanY), -maxPanY);

        this.updateLightboxTransform();
      }
    });

    this.lightboxImg.addEventListener('touchend', () => {
      this.isPanning = false;
    });
  }

  toggleOrbits() {
    this.showOrbits = !this.showOrbits;
    this.toggleOrbitsBtn.classList.toggle('active', this.showOrbits);
    this.toggleOrbitsBtn.textContent = this.showOrbits ? 'Active' : 'Muted';

    this.orbitLines.forEach(line => {
      line.visible = this.showOrbits;
    });
  }

  toggleScaleMode() {
    this.scaleMode = this.scaleMode === 'visual' ? 'realistic' : 'visual';
    this.toggleScaleBtn.classList.toggle('active', this.scaleMode === 'realistic');
    this.toggleScaleBtn.textContent = this.scaleMode === 'visual' ? 'Visual' : 'Log Ratio';

    // Transition distance scales and visual mesh radius multipliers
    for (const key in this.planets) {
      const p = this.planets[key];
      const data = p.data;

      let targetDist;
      let targetSize;

      if (this.scaleMode === 'realistic') {
        // Semi-major orbital logarithmic factors so they remain visible on screen
        targetDist = key === 'sun' ? 0 : 35 + Math.log(data.orbital.semiMajor + 1.1) * 110;
        
        // Size scale adjustments representing comparative diameters (log scaled so Jupiter isn't 200px vs Mercury 0.1px)
        if (key === 'sun') {
          targetSize = 16;
        } else {
          targetSize = 1.2 + Math.log10(data.orbital.size + 1) * 3.8;
        }
      } else {
        // Reset back to visual-friendly layout
        targetDist = data.orbital.distance;
        targetSize = data.orbital.size;
      }

      // Smoothly update sizes and reposition orbit circles
      const squashFactor = data.orbital.flattening || 1.0;
      p.mesh.scale.set(targetSize, targetSize * squashFactor, targetSize);
      
      // Update custom features sizes
      const earthClouds = p.group.getObjectByName('earth_clouds');
      if (earthClouds) {
        earthClouds.scale.set(targetSize * 1.015, targetSize * 1.015 * squashFactor, targetSize * 1.015);
      }

      const saturnRings = p.group.getObjectByName('saturn_rings');
      if (saturnRings) saturnRings.scale.setScalar(targetSize);

      const uranusRings = p.group.getObjectByName('uranus_rings');
      if (uranusRings) uranusRings.scale.setScalar(targetSize);

      // Reposition orbital geometry loops
      if (key !== 'sun') {
        const orbitLine = this.scene.getObjectByName(`${key}_orbit_line`);
        if (orbitLine) {
          const points = [];
          for (let i = 0; i <= 128; i++) {
            const theta = (i / 128) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(theta) * targetDist, 0, Math.sin(theta) * targetDist));
          }
          orbitLine.geometry.setFromPoints(points);
        }
      }
    }
  }

  togglePlayPause() {
    this.isPaused = !this.isPaused;
    this.playPauseBtn.classList.toggle('active', !this.isPaused);
    this.playPauseBtn.textContent = this.isPaused ? '▶' : '⏸';
  }

  updateSpeed(val) {
    this.speedMultiplier = val / 10;
    this.speedVal.textContent = `${this.speedMultiplier.toFixed(1)}x`;
  }

  resetCamera() {
    this.deselectPlanet();
    
    // Smooth transition camera back to standard overhead coordinates
    const duration = 1200;
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    
    const endPos = new THREE.Vector3(0, 150, 260);
    const endTarget = new THREE.Vector3(0, 0, 0);

    const startTime = performance.now();

    const animateCam = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth ease-out-cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCam);
      }
    };

    requestAnimationFrame(animateCam);
  }

  selectPlanet(key) {
    if (!window.PLANET_DATA[key]) return;
    this.selectedBody = this.planets[key];
    
    // Highlight sidebar nav list
    this.navItems.forEach(item => {
      const match = item.getAttribute('data-planet') === key;
      item.classList.toggle('active', match);
    });

    // Populate HUD data side drawer details
    const data = window.PLANET_DATA[key];
    this.planetTitle.textContent = data.name;
    this.planetTagline.textContent = data.tagline;
    this.planetDesc.textContent = data.description;

    // Load AI infographic card smoothly
    this.planetInfographicImg.classList.remove('loaded');
    this.infographicLoader.style.display = 'flex';
    this.planetInfographicImg.src = data.image;

    // Load Specs
    this.statsGrid.innerHTML = '';
    for (const statName in data.stats) {
      const statVal = data.stats[statName];
      const item = document.createElement('div');
      item.className = 'stat-item';
      
      // Capitalize first letters of keys
      const displayName = statName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      item.innerHTML = `
        <span class="stat-name">${displayName}</span>
        <span class="stat-value">${statVal}</span>
      `;
      this.statsGrid.appendChild(item);
    }

    // Load Fun Facts bullets
    this.funFactsList.innerHTML = '';
    data.funFacts.forEach(fact => {
      const item = document.createElement('div');
      item.className = 'fun-fact-item';
      item.textContent = fact;
      this.funFactsList.appendChild(item);
    });

    // Hide instruction pill & Slide out telemetry drawer
    this.instructions.style.display = 'none';
    this.panelContainer.classList.add('open');

    // Trigger visual highlight ring pulses later if desired...
  }

  deselectPlanet() {
    this.selectedBody = null;
    
    this.navItems.forEach(item => item.classList.remove('active'));
    this.panelContainer.classList.remove('open');
    
    setTimeout(() => {
      if (!this.selectedBody) {
        this.instructions.style.display = 'block';
      }
    }, 400);
  }

  openLightbox() {
    if (!this.selectedBody) return;
    const data = this.selectedBody.data;

    // Reset zoom & pan on open to guarantee clean opening transition
    this.zoomScale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.lightboxImg.classList.remove('zoomed');
    this.updateLightboxTransform();

    this.lightboxImg.src = data.image;
    this.lightboxCaption.textContent = `${data.name} - Telemetry Infographic`;
    this.lightbox.classList.add('open');
  }

  closeLightbox() {
    this.lightbox.classList.remove('open');
    this.isPanning = false;
    
    // Smoothly restore transition for the closing animation
    setTimeout(() => {
      if (this.lightboxImg) {
        this.lightboxImg.classList.remove('zoomed');
        this.zoomScale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.updateLightboxTransform();
      }
    }, 400); // match CSS modal transition speed
  }

  updateLightboxTransform() {
    if (!this.lightboxImg) return;
    this.lightboxImg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomScale})`;
    
    if (this.zoomScale > 1.0) {
      this.lightboxImg.style.cursor = this.isPanning ? 'grabbing' : 'grab';
    } else {
      this.lightboxImg.style.cursor = 'zoom-out';
    }
  }

  setupControls() {
    // Window Resize Support
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Keyboard navigation key state tracking
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.keysPressed[key] = true;
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.keysPressed[key] = false;
    });

    // Reset keyboard keys map on browser tab blur to prevent keys getting stuck
    window.addEventListener('blur', () => {
      this.keysPressed = {};
    });
  }

  setupInteraction() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dom = this.renderer.domElement;
    
    let isMouseDown = false;
    let downCoords = { x: 0, y: 0 };

    // Use unified Pointer Events directly on the canvas to ensure OrbitControls cannot intercept/stop propagation,
    // and to perfectly support touchscreens, trackpads, and standard mice.
    dom.addEventListener('pointerdown', (e) => {
      isMouseDown = true;
      downCoords.x = e.clientX;
      downCoords.y = e.clientY;
    });

    dom.addEventListener('pointerup', (e) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      // Safe drag/rotate drift threshold (15px) to support click-and-drag camera pans without losing selection responsiveness
      const deltaX = Math.abs(e.clientX - downCoords.x);
      const deltaY = Math.abs(e.clientY - downCoords.y);
      
      if (deltaX < 15 && deltaY < 15) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, this.camera);
        
        // Raycast against all planet mesh spheres
        const targets = Object.values(this.planets).map(p => p.mesh);
        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
          const hitSphere = intersects[0].object;
          const planetKey = hitSphere.parent.name;
          this.selectPlanet(planetKey);
        }
      }
    });

    // Cursor hover style updates restricted to the canvas bounds
    dom.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const targets = Object.values(this.planets).map(p => p.mesh);
      const intersects = raycaster.intersectObjects(targets);

      dom.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    });
  }

  // --- Animation loop ---

  animate() {
    requestAnimationFrame(() => this.animate());

    // Handle WASD / Arrow keyboard navigation bounded to the solar system grid
    this.handleKeyboardNavigation();

    // Update orbit positions (only if not paused)
    if (!this.isPaused) {
      const dt = 0.01 * this.speedMultiplier;
      this.time += dt;

      for (const key in this.planets) {
        if (key === 'sun') continue;

        const p = this.planets[key];
        const data = p.data;
        
        // Logarithmic scale adjustments mapping distance
        let dist = data.orbital.distance;
        if (this.scaleMode === 'realistic') {
          dist = 35 + Math.log(data.orbital.semiMajor + 1.1) * 110;
        }

        // Adjust velocity proportionally to orbital period
        const periodFactor = 365.25 / data.orbital.period;
        p.angle += dt * 0.4 * periodFactor;

        // Position coordinates in X-Z orbital plane
        p.group.position.x = Math.cos(p.angle) * dist;
        p.group.position.z = Math.sin(p.angle) * dist;
      }
    }

    // Spin celestial bodies slowly on their axes
    for (const key in this.planets) {
      const p = this.planets[key];
      // Spin planet sphere
      p.mesh.rotation.y += 0.005;
    }

    // Spin cloud mesh overlays in reverse/faster speeds
    this.cloudMeshes.forEach(cloud => {
      cloud.rotation.y += 0.007;
      cloud.rotation.x += 0.001;
    });

    // Smooth LERP camera tracker when planet focused
    if (this.selectedBody) {
      const targetPos = this.selectedBody.group.position;
      
      // Target focus coordinates follow moving planet position smoothly
      this.targetFocus.lerp(targetPos, 0.08);
      this.controls.target.copy(this.targetFocus);

      // Set nice camera target offset depending on planet visual radius
      const offsetFactor = this.selectedBody.data.orbital.size * 3.5;
      const cameraOffset = new THREE.Vector3(0, offsetFactor * 0.6, offsetFactor * 1.5);
      
      // Dynamic camera orbital chasing positions
      const desiredCamPos = targetPos.clone().add(cameraOffset);
      this.camera.position.lerp(desiredCamPos, 0.05);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // --- Keyboard Panning & Navigation Engine ---
  handleKeyboardNavigation() {
    let dx = 0;
    let dz = 0;

    // Monitor keys pressed state map
    if (this.keysPressed['w'] || this.keysPressed['arrowup']) dz += 1;
    if (this.keysPressed['s'] || this.keysPressed['arrowdown']) dz -= 1;
    if (this.keysPressed['a'] || this.keysPressed['arrowleft']) dx -= 1;
    if (this.keysPressed['d'] || this.keysPressed['arrowright']) dx += 1;

    if (dx !== 0 || dz !== 0) {
      // Break selected body tracking focus to permit free panning navigation
      if (this.selectedBody) {
        this.deselectPlanet();
      }

      // Calculate direction vectors projected horizontally relative to camera viewing direction
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0; // Lock movement strictly to the horizontal orbital grid
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)); // Cross with world vertical Up vector
      right.y = 0;
      right.normalize();

      // Assemble combined vector inputs
      const moveDirection = new THREE.Vector3();
      moveDirection.addScaledVector(forward, dz);
      moveDirection.addScaledVector(right, dx);
      moveDirection.normalize();

      // Dynamic movement speed scaled proportionally to camera distance for natural accuracy
      const distance = this.camera.position.distanceTo(this.controls.target);
      const panSpeed = Math.max(0.4, distance * 0.015);

      // Translate controls target coordinate focus and shift camera symmetrically
      const movement = moveDirection.multiplyScalar(panSpeed);
      this.controls.target.add(movement);
      this.camera.position.add(movement);

      // Limit/bound controls target to the boundary bounds of the solar system (max 600 units from Sun coordinate)
      if (this.controls.target.length() > 600) {
        const excess = this.controls.target.clone().setLength(600).sub(this.controls.target);
        this.controls.target.add(excess);
        this.camera.position.add(excess);
      }
    }
  }
}

// Instantiate on loads
window.addEventListener('DOMContentLoaded', () => {
  new SolarSystemApp();
});
