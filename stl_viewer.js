// ==========================================================================
// NITROASIS 3D CAD STL VIEWER
// Interactive WebGL Viewer with Orbit, Zoom, Pan, Material & Measurement
// ==========================================================================

let scene, camera, renderer, controls;
let currentMeshGroup = null;
let currentModelName = 'top';
let autoRotateActive = true;
let wireframeActive = false;
let gridActive = true;
let gridHelper;

// Materials
const materials = {
  emerald: new THREE.MeshPhysicalMaterial({
    color: 0x10b981,
    metalness: 0.15,
    roughness: 0.35,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    reflectivity: 0.5
  }),
  charcoal: new THREE.MeshPhysicalMaterial({
    color: 0x1f2937,
    metalness: 0.25,
    roughness: 0.45,
    clearcoat: 0.2
  }),
  orange: new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    metalness: 0.1,
    roughness: 0.4,
    clearcoat: 0.25
  }),
  cyan: new THREE.MeshPhysicalMaterial({
    color: 0x06b6d4,
    metalness: 0.2,
    roughness: 0.3,
    clearcoat: 0.4
  })
};

let currentMaterialKey = 'emerald';

function initSTLViewer() {
  const container = document.getElementById('cadCanvasContainer');
  if (!container) return;

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 520;

  // 1. Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080f0b);

  // 2. Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 1, 1500);
  camera.position.set(130, 110, 160);

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  // Clear previous canvas if any
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // 4. Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.minDistance = 40;
  controls.maxDistance = 500;
  controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't flip below ground
  controls.autoRotate = autoRotateActive;
  controls.autoRotateSpeed = 1.6;

  // 5. Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
  mainLight.position.set(100, 150, 100);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x34d399, 0.45);
  fillLight.position.set(-100, 80, -100);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x00ff95, 0.3);
  rimLight.position.set(0, -50, 80);
  scene.add(rimLight);

  // 6. Grid Ground
  gridHelper = new THREE.GridHelper(260, 26, 0x10b981, 0x1e293b);
  gridHelper.position.y = -35;
  scene.add(gridHelper);

  // 7. Event Handlers
  window.addEventListener('resize', onWindowResize);
  setupViewerControls();

  // 8. Intersection Observer to eliminate scroll lag when viewer is offscreen
  let isViewerInView = true;
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isViewerInView = entry.isIntersecting;
      });
    }, { threshold: 0.05 });
    observer.observe(container);
  }

  // 9. Load Initial Model (Top Enclosure)
  loadCADModel('top');

  // 10. Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    if (!isViewerInView) return;
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }
  animate();
}

function onWindowResize() {
  const container = document.getElementById('cadCanvasContainer');
  if (!container || !renderer || !camera) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// ==========================================================================
// STL LOADER & MODEL SWITCHER
// ==========================================================================
function loadCADModel(modelType) {
  currentModelName = modelType;
  showLoadingIndicator(true);

  if (currentMeshGroup) {
    scene.remove(currentMeshGroup);
    currentMeshGroup = null;
  }

  currentMeshGroup = new THREE.Group();
  scene.add(currentMeshGroup);

  const loader = new THREE.STLLoader();
  const material = materials[currentMaterialKey];
  material.wireframe = wireframeActive;

  if (modelType === 'top') {
    loader.load('transmitter_top.stl', (geometry) => {
      geometry.computeVertexNormals();
      geometry.center();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.x = -Math.PI / 2; // Orient upright
      currentMeshGroup.add(mesh);

      updateSpecsDisplay('Top Enclosure (transmitter_top.stl)', geometry, 20874, 90.0, 102.0, 21.5);
      showLoadingIndicator(false);
      resetCameraView(120);
    });
  } 
  else if (modelType === 'bottom') {
    loader.load('transmitter_bottom.stl', (geometry) => {
      geometry.computeVertexNormals();
      geometry.center();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.x = -Math.PI / 2;
      currentMeshGroup.add(mesh);

      updateSpecsDisplay('Bottom Chassis (transmitter_bottom.stl)', geometry, 9076, 94.0, 102.0, 57.0);
      showLoadingIndicator(false);
      resetCameraView(150);
    });
  } 
  else if (modelType === 'assembly') {
    // Load both Top and Bottom aligned together
    loader.load('transmitter_bottom.stl', (geoBottom) => {
      geoBottom.computeVertexNormals();
      geoBottom.center();
      const meshBottom = new THREE.Mesh(geoBottom, material);
      meshBottom.castShadow = true;
      meshBottom.receiveShadow = true;
      meshBottom.rotation.x = -Math.PI / 2;
      meshBottom.position.y = -10;
      currentMeshGroup.add(meshBottom);

      loader.load('transmitter_top.stl', (geoTop) => {
        geoTop.computeVertexNormals();
        geoTop.center();
        const meshTop = new THREE.Mesh(geoTop, materials.cyan);
        meshTop.castShadow = true;
        meshTop.receiveShadow = true;
        meshTop.rotation.x = -Math.PI / 2;
        meshTop.position.y = 35; // Positioned directly over bottom chassis
        currentMeshGroup.add(meshTop);

        updateSpecsDisplay('Complete Assembly (Top + Bottom Enclosure)', null, 29950, 94.0, 102.0, 78.5);
        showLoadingIndicator(false);
        resetCameraView(180);
      });
    });
  }
}

function resetCameraView(distance = 140) {
  if (!camera || !controls) return;
  camera.position.set(distance * 0.8, distance * 0.7, distance);
  controls.target.set(0, 0, 0);
  controls.update();
}

function updateSpecsDisplay(name, geometry, triCount, w, d, h) {
  const nameEl = document.getElementById('cadModelName');
  const dimsEl = document.getElementById('cadDimensions');
  const trisEl = document.getElementById('cadTriangles');
  const weightEl = document.getElementById('cadWeightEst');

  if (nameEl) nameEl.textContent = name;
  if (dimsEl) dimsEl.textContent = `${w.toFixed(1)} × ${d.toFixed(1)} × ${h.toFixed(1)} mm`;
  if (trisEl) trisEl.textContent = `${triCount.toLocaleString()} Polygons`;
  
  // Approximate volume / weight calculation for PETG (1.27 g/cm3 with 25% infill)
  const estGrams = (w * d * h * 0.001 * 0.28 * 1.27).toFixed(1);
  if (weightEl) weightEl.textContent = `~${estGrams} g (PETG @ 25% Infill)`;
}

function showLoadingIndicator(show) {
  const loader = document.getElementById('cadLoadingIndicator');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
  }
}

// ==========================================================================
// VIEWER CONTROLS (BUTTONS & COLOR PICKERS)
// ==========================================================================
function setupViewerControls() {
  // Model Select Buttons
  const modelBtns = document.querySelectorAll('.cad-model-btn');
  modelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const model = btn.getAttribute('data-model');
      loadCADModel(model);
    });
  });

  // Auto-Rotate Toggle
  const rotateBtn = document.getElementById('btnCadAutoRotate');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      autoRotateActive = !autoRotateActive;
      controls.autoRotate = autoRotateActive;
      rotateBtn.classList.toggle('active', autoRotateActive);
    });
  }

  // Wireframe Toggle
  const wireBtn = document.getElementById('btnCadWireframe');
  if (wireBtn) {
    wireBtn.addEventListener('click', () => {
      wireframeActive = !wireframeActive;
      if (currentMeshGroup) {
        currentMeshGroup.traverse(child => {
          if (child.isMesh) {
            child.material.wireframe = wireframeActive;
          }
        });
      }
      wireBtn.classList.toggle('active', wireframeActive);
    });
  }

  // Grid Toggle
  const gridBtn = document.getElementById('btnCadGrid');
  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      gridActive = !gridActive;
      if (gridHelper) gridHelper.visible = gridActive;
      gridBtn.classList.toggle('active', gridActive);
    });
  }

  // Reset Camera
  const resetBtn = document.getElementById('btnCadResetCam');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetCameraView();
    });
  }

  // Color Swatches
  const swatches = document.querySelectorAll('.cad-color-swatch');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const matKey = swatch.getAttribute('data-color');
      if (materials[matKey]) {
        currentMaterialKey = matKey;
        const mat = materials[matKey];
        mat.wireframe = wireframeActive;
        if (currentMeshGroup) {
          currentMeshGroup.traverse(child => {
            if (child.isMesh) {
              child.material = mat;
            }
          });
        }
      }
    });
  });
}

// Auto-initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initSTLViewer, 200);
});
