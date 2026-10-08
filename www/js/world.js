/**
 * World Builder - 3D terrain, trees, water, buildings
 * Procedurally generated open world that transforms with solar terms.
 */
import { lerp } from './solarTerms.js';

export class WorldBuilder {
  constructor(scene, THREE) {
    this.scene = scene;
    this.THREE = THREE;
    this.objects = {
      terrain: null,
      water: null,
      trees: [],
      buildings: [],
      stones: [],
      paths: [],
      fields: [],
      flowers: []
    };
    this.treeData = []; // Store tree positions for seasonal updates
  }

  /** Simple noise function for terrain */
  noise2D(x, z) {
    const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  /** Multi-octave noise for smoother terrain */
  fbm(x, z, octaves = 4) {
    let value = 0, amplitude = 0.5, frequency = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, z * frequency);
      max += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / max;
  }

  getHeight(x, z) {
    const worldSize = 100;
    const nx = x / worldSize * 4;
    const nz = z / worldSize * 4;
    let h = this.fbm(nx, nz, 5) * 8;

    // River valley
    const riverDist = Math.abs(z + Math.sin(x * 0.02) * 15);
    if (riverDist < 8) {
      h -= (8 - riverDist) * 0.5;
    }

    // Central flat area for village
    const dx = x + 10, dz = z + 5;
    const distFromCenter = Math.sqrt(dx * dx + dz * dz);
    if (distFromCenter < 20) {
      h *= distFromCenter / 20;
    }

    // Mountain in the north
    const mdx = x + 30, mdz = z - 30;
    const mountainDist = Math.sqrt(mdx * mdx + mdz * mdz);
    if (mountainDist < 25) {
      h += (25 - mountainDist) * 0.5;
    }

    // Hills in the east
    const hx = x - 35, hz = z + 10;
    const hillDist = Math.sqrt(hx * hx + hz * hz);
    if (hillDist < 15) {
      h += (15 - hillDist) * 0.3;
    }

    return h;
  }

  buildTerrain() {
    const THREE = this.THREE;
    const size = 100;
    const segments = 100;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = this.getHeight(x, z);
      positions.setY(i, h);

      // Base color based on height
      if (h < -3) {
        colors[i * 3] = 0.55; colors[i * 3 + 1] = 0.55; colors[i * 3 + 2] = 0.4;
      } else if (h < 0) {
        colors[i * 3] = 0.4; colors[i * 3 + 1] = 0.55; colors[i * 3 + 2] = 0.3;
      } else if (h < 2) {
        colors[i * 3] = 0.35; colors[i * 3 + 1] = 0.6; colors[i * 3 + 2] = 0.25;
      } else if (h < 5) {
        colors[i * 3] = 0.3; colors[i * 3 + 1] = 0.5; colors[i * 3 + 2] = 0.2;
      } else {
        colors[i * 3] = 0.6; colors[i * 3 + 1] = 0.6; colors[i * 3 + 2] = 0.55;
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.objects.terrain = terrain;
    this.scene.add(terrain);
    return terrain;
  }

  buildWater() {
    const THREE = this.THREE;
    // River
    const riverGeom = new THREE.PlaneGeometry(12, 100, 20, 40);
    riverGeom.rotateX(-Math.PI / 2);
    const positions = riverGeom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = this.getHeight(x + Math.sin(x * 0.02) * 15, z - 0);
      positions.setY(i, Math.min(h + 0.3, -0.5));
    }
    riverGeom.computeVertexNormals();

    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x4488aa,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.8
    });
    const river = new THREE.Mesh(riverGeom, riverMat);
    river.name = 'river';
    this.objects.water = river;
    this.scene.add(river);

    // Pond near village
    const pondGeom = new THREE.CircleGeometry(5, 32);
    pondGeom.rotateX(-Math.PI / 2);
    const pondMat = new THREE.MeshStandardMaterial({
      color: 0x5599bb,
      roughness: 0.05,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85
    });
    const pond = new THREE.Mesh(pondGeom, pondMat);
    pond.position.set(5, -1.2, 15);
    pond.name = 'pond';
    this.objects.pond = pond;
    this.scene.add(pond);

    return { river, pond };
  }

  buildTree(x, z, scale = 1) {
    const THREE = this.THREE;
    const y = this.getHeight(x, z);
    const group = new THREE.Group();

    // Trunk
    const trunkGeom = new THREE.CylinderGeometry(0.15 * scale, 0.25 * scale, 3 * scale, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.8 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 1.5 * scale;
    trunk.name = 'trunk';
    group.add(trunk);

    // Leaves (multiple cones for fuller look)
    const leafColors = [0x3A7D3A, 0x4A8D3A, 0x2D6D2D];
    for (let i = 0; i < 3; i++) {
      const leafGeom = new THREE.ConeGeometry((1.2 - i * 0.25) * scale, 1.5 * scale, 8);
      const leafMat = new THREE.MeshStandardMaterial({
        color: leafColors[i],
        roughness: 0.6
      });
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      leaf.position.y = 2.5 * scale + i * 1.2 * scale;
      leaf.name = `leaves_${i}`;
      leaf.castShadow = true;
      group.add(leaf);
    }

    group.position.set(x, y, z);
    group.name = 'tree';
    group.castShadow = true;
    this.scene.add(group);
    return group;
  }

  placeTrees() {
    const placed = [];
    for (let i = 0; i < 120; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      const h = this.getHeight(x, z);

      // Skip river area and village center
      const riverDist = Math.abs(z + Math.sin(x * 0.02) * 15);
      const dx = x + 10, dz = z + 5;
      const villageDist = Math.sqrt(dx * dx + dz * dz);

      if (riverDist < 6 || villageDist < 12 || h < -3 || h > 6) continue;

      // Check distance from other trees
      let tooClose = false;
      for (const t of placed) {
        const dist = Math.sqrt((x - t.x) ** 2 + (z - t.z) ** 2);
        if (dist < 3) { tooClose = true; break; }
      }
      if (tooClose) continue;

      const scale = 0.6 + Math.random() * 0.8;
      const tree = this.buildTree(x, z, scale);
      placed.push({ x, z, scale, mesh: tree });
      this.treeData.push({ x, z, scale, mesh: tree });
      this.objects.trees.push(tree);
    }
  }

  buildHouse(x, z, rotation = 0) {
    const THREE = this.THREE;
    const y = this.getHeight(x, z);
    const group = new THREE.Group();

    // Walls
    const wallGeom = new THREE.BoxGeometry(2, 2.5, 3);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xE8DCC8, roughness: 0.7 });
    const walls = new THREE.Mesh(wallGeom, wallMat);
    walls.position.y = 1.25;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Roof - curved Chinese style
    const roofGeom = new THREE.ConeGeometry(2.2, 2, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x4A3728, roughness: 0.5 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = 3;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Roof tip
    const tipGeom = new THREE.CylinderGeometry(0.05, 0.1, 0.5, 8);
    const tip = new THREE.Mesh(tipGeom, roofMat);
    tip.position.y = 4;
    group.add(tip);

    // Door
    const doorGeom = new THREE.PlaneGeometry(0.7, 1.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.6, side: THREE.DoubleSide });
    const door = new THREE.Mesh(doorGeom, doorMat);
    door.position.set(0, 0.6, 1.51);
    group.add(door);

    group.position.set(x, y, z);
    group.rotation.y = rotation;
    group.name = 'house';
    this.objects.buildings.push(group);
    this.scene.add(group);
    return group;
  }

  buildVillage() {
    // Traditional village layout with a few houses
    const housePositions = [
      { x: -8, z: 0, r: 0 },
      { x: -12, z: 5, r: 0.3 },
      { x: -15, z: -3, r: -0.2 },
      { x: -6, z: 10, r: 0.5 },
      { x: -10, z: -8, r: -0.1 },
    ];

    for (const pos of housePositions) {
      this.buildHouse(pos.x, pos.z, pos.r);
    }

    // Add a larger hall / temple
    const THREE = this.THREE;
    const hallGroup = new THREE.Group();
    const hallWalls = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3, 5),
      new THREE.MeshStandardMaterial({ color: 0xD4C4A8, roughness: 0.6 })
    );
    hallWalls.position.y = 1.5;
    hallGroup.add(hallWalls);

    const hallRoof = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 2.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x5B3A2A, roughness: 0.4 })
    );
    hallRoof.position.y = 4;
    hallRoof.rotation.y = Math.PI / 4;
    hallGroup.add(hallRoof);

    hallGroup.position.set(-3, this.getHeight(-3, -5), -5);
    hallGroup.name = 'temple';
    this.objects.buildings.push(hallGroup);
    this.scene.add(hallGroup);
  }

  placeStones() {
    const THREE = this.THREE;
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      const h = this.getHeight(x, z);
      const size = 0.2 + Math.random() * 0.8;
      const stoneGeom = new THREE.IcosahedronGeometry(size, 0);
      const stoneMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.1, 0.05, 0.3 + Math.random() * 0.3),
        roughness: 0.7
      });
      const stone = new THREE.Mesh(stoneGeom, stoneMat);
      stone.position.set(x, h + size * 0.3, z);
      stone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      stone.receiveShadow = true;
      stone.castShadow = true;
      this.objects.stones.push(stone);
      this.scene.add(stone);
    }
  }

  createFarmFields() {
    const THREE = this.THREE;
    // Rice paddies near village
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const x = -20 + col * 4;
        const z = 3 + row * 4;
        const geom = new THREE.PlaneGeometry(3, 3);
        geom.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x5B7A3B,
          roughness: 0.9,
          side: THREE.DoubleSide
        });
        const field = new THREE.Mesh(geom, mat);
        const h = this.getHeight(x, z);
        field.position.set(x, h + 0.05, z);
        field.receiveShadow = true;
        field.name = 'farm_field';
        this.objects.fields.push(field);
        this.scene.add(field);
      }
    }
  }

  buildPath(from, to) {
    const THREE = this.THREE;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const midX = (from.x + to.x) / 2;
    const midZ = (from.z + to.z) / 2;
    const angle = Math.atan2(dx, dz);

    const pathGeom = new THREE.PlaneGeometry(1.2, length);
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0xB8A88A,
      roughness: 0.8
    });
    const path = new THREE.Mesh(pathGeom, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.rotation.z = angle;
    const h = this.getHeight(midX, midZ);
    path.position.set(midX, h + 0.02, midZ);
    path.receiveShadow = true;
    this.objects.paths.push(path);
    this.scene.add(path);
  }

  createPaths() {
    this.buildPath({ x: -12, z: 0 }, { x: -3, z: -5 });
    this.buildPath({ x: -3, z: -5 }, { x: -20, z: 5 });
    this.buildPath({ x: -8, z: 0 }, { x: 5, z: 15 });
    this.buildPath({ x: -12, z: 5 }, { x: -20, z: 15 });
  }

  /**
   * Update world visuals based on current solar term data
   */
  updateForTerm(termData) {
    const term = termData.current;
    const next = termData.next;
    const blend = termData.blend;
    const THREE = this.THREE;

    // Update terrain grass color
    if (this.objects.terrain) {
      const grassGreen = lerp(term.ground.grassGreen, next.ground.grassGreen, blend);
      const snowCover = lerp(term.ground.snowCover, next.ground.snowCover, blend);
      const geo = this.objects.terrain.geometry;
      if (geo.attributes.color) {
        const colors = geo.attributes.color.array;
        for (let i = 0; i < colors.length; i += 3) {
          // Interpolate between green/brown and snow white based on snowCover
          const baseG = 0.3 + grassGreen * 0.35;
          const baseR = 0.35 - grassGreen * 0.1;
          const baseB = 0.15 + grassGreen * 0.1;
          colors[i] = baseR * (1 - snowCover) + 0.95 * snowCover;
          colors[i + 1] = baseG * (1 - snowCover) + 0.95 * snowCover;
          colors[i + 2] = baseB * (1 - snowCover) + 0.98 * snowCover;
        }
        geo.attributes.color.needsUpdate = true;
      }
    }

    // Update water (freeze/thaw)
    const waterFrozen = lerp(term.water.frozen, next.water.frozen, blend);
    const waterClarity = lerp(term.water.clarity, next.water.clarity, blend);
    if (this.objects.water) {
      this.objects.water.material.opacity = 0.3 + waterClarity * 0.5;
      this.objects.water.material.color.set(
        new THREE.Color().lerpColors(
          new THREE.Color(0x4488aa),
          new THREE.Color(0xaaccee),
          waterFrozen
        )
      );
      // Make frozen water more reflective
      this.objects.water.material.roughness = 0.05 + waterFrozen * 0.3;
    }
    if (this.objects.pond) {
      this.objects.pond.material.opacity = 0.3 + waterClarity * 0.55;
      this.objects.pond.material.color.set(
        new THREE.Color().lerpColors(
          new THREE.Color(0x5599bb),
          new THREE.Color(0xbbddff),
          waterFrozen
        )
      );
    }

    // Update trees (leaves change)
    const leafSize = lerp(term.trees.leafSize, next.trees.leafSize, blend);
    const colorShift = lerp(term.trees.colorShift, next.trees.colorShift, blend);
    const flowering = lerp(term.trees.flowering, next.trees.flowering, blend);

    for (const tree of this.treeData) {
      tree.mesh.children.forEach(child => {
        if (child.name && child.name.startsWith('leaves_')) {
          // Scale leaves based on season
          const baseScale = tree.scale;
          // Invert for bare trees — hide leaves in winter
          const bareVal = lerp(term.trees.bare, next.trees.bare, blend);
          const leafVisibility = 1 - bareVal;
          child.visible = leafVisibility > 0.1;
          if (child.visible) {
            child.scale.setScalar(leafSize * baseScale);

            // Color: green -> golden/red for autumn, white for snow
            const r = 0.1 + leafSize * 0.15 + colorShift * 0.75;
            const g = 0.4 + leafSize * 0.35 - colorShift * 0.25;
            const b = 0.1 + leafSize * 0.15 - colorShift * 0.05;
            child.material.color.setRGB(r, g, b);

            // Flowering trees get pink/white blossoms
            if (flowering > 0.2) {
              child.material.color.setRGB(
                0.85 * flowering + r * (1 - flowering),
                0.6 * flowering + g * (1 - flowering),
                0.7 * flowering + b * (1 - flowering)
              );
            }
          }
        }
      });
    }

    // Update scene fog
    const fogDensity = lerp(term.fogDensity, next.fogDensity, blend);
    const fogColor = new THREE.Color(lerp(
      parseFloat('0x' + term.fogColor.slice(1)),
      parseFloat('0x' + next.fogColor.slice(1)),
      blend
    ));
    this.scene.fog = new THREE.FogExp2(fogColor, fogDensity * 0.5);

    // Update ambient light
    const ambColor = new THREE.Color(
      lerp(
        parseFloat('0x' + term.ambientColor.slice(1)),
        parseFloat('0x' + next.ambientColor.slice(1)),
        blend
      )
    );
    if (this.ambientLight) {
      this.ambientLight.color = ambColor;
    }
  }

  setAmbientLight(light) {
    this.ambientLight = light;
  }

  buildAll() {
    this.buildTerrain();
    this.buildWater();
    this.placeTrees();
    this.buildVillage();
    this.placeStones();
    this.createFarmFields();
    this.createPaths();
  }
}

export default WorldBuilder;
