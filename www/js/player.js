/**
 * Player Controller — First-person + mobile touch hybrid input
 */
export class PlayerController {
  constructor(camera, scene, THREE, mobileControls = null) {
    this.camera = camera;
    this.scene = scene;
    this.THREE = THREE;
    this.mobileControls = mobileControls;

    this.moveState = {
      forward: false, backward: false, left: false, right: false,
      sprint: false, jump: false, interact: false
    };

    this.position = new THREE.Vector3(-5, 5, 10);
    this.velocity = new THREE.Vector3();
    this.yVelocity = 0;
    this.isGrounded = true;
    this.moveSpeed = 8;
    this.sprintMultiplier = 1.6;
    this.jumpForce = 8;
    this.gravity = -15;
    this.yaw = 0;
    this.pitch = -0.3;
    this.mouseSensitivity = 0.002;
    this.isPointerLocked = false;
    this.interactionRange = 5;
    this.interactCooldown = 0;
    this.interactTarget = null;
    this.playerBody = this.createPlayerBody();

    if (!mobileControls?.isMobile) {
      this._onKeyDown = this.onKeyDown.bind(this);
      this._onKeyUp = this.onKeyUp.bind(this);
      this._onMouseMove = this.onMouseMove.bind(this);
      this._onMouseDown = this.onMouseDown.bind(this);
      this._onPointerLockChange = this.onPointerLockChange.bind(this);

      document.addEventListener('keydown', this._onKeyDown);
      document.addEventListener('keyup', this._onKeyUp);
      document.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('mousedown', this._onMouseDown);
      document.addEventListener('pointerlockchange', this._onPointerLockChange);
    }
  }

  createPlayerBody() {
    const group = new this.THREE.Group();
    group.position.copy(this.position);
    group.visible = false;
    this.scene.add(group);
    return group;
  }

  onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': this.moveState.forward = true; break;
      case 'KeyS': this.moveState.backward = true; break;
      case 'KeyA': this.moveState.left = true; break;
      case 'KeyD': this.moveState.right = true; break;
      case 'ShiftLeft': this.moveState.sprint = true; break;
      case 'Space': this.moveState.jump = true; this.tryJump(); break;
      case 'KeyE': this.moveState.interact = true; break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': this.moveState.forward = false; break;
      case 'KeyS': this.moveState.backward = false; break;
      case 'KeyA': this.moveState.left = false; break;
      case 'KeyD': this.moveState.right = false; break;
      case 'ShiftLeft': this.moveState.sprint = false; break;
      case 'Space': this.moveState.jump = false; break;
      case 'KeyE': this.moveState.interact = false; break;
    }
  }

  onMouseMove(e) {
    if (!this.isPointerLocked) return;
    this.yaw -= e.movementX * this.mouseSensitivity;
    this.pitch -= e.movementY * this.mouseSensitivity;
    this.pitch = Math.max(-1.4, Math.min(0.7, this.pitch));
  }

  onMouseDown(e) {
    if (!this.isPointerLocked) document.body.requestPointerLock();
  }

  onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === document.body;
  }

  tryJump() {
    if (this.isGrounded) { this.yVelocity = this.jumpForce; this.isGrounded = false; }
  }

  update(deltaTime, worldHeightFn) {
    const THREE = this.THREE;
    const dt = Math.min(deltaTime, 0.1);

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // --- Input source ---
    const mc = this.mobileControls;
    const isMobile = mc?.isMobile;

    if (isMobile) {
      mc.poll();
      this.yaw -= mc.output.lookX;
      this.pitch -= mc.output.lookY;
      this.pitch = Math.max(-1.4, Math.min(0.7, this.pitch));

      const moveDir = new THREE.Vector3();
      moveDir.add(forward.clone().multiplyScalar(mc.output.moveY));
      moveDir.add(right.clone().multiplyScalar(mc.output.moveX));
      if (moveDir.length() > 1) moveDir.normalize();

      const speed = this.moveSpeed * (mc.output.sprint ? this.sprintMultiplier : 1);
      moveDir.multiplyScalar(speed * dt);
      this.position.add(moveDir);

      if (mc.output.jump) this.tryJump();
      this.moveState.interact = mc.output.interact;
    } else {
      const moveDir = new THREE.Vector3();
      if (this.moveState.forward) moveDir.add(forward);
      if (this.moveState.backward) moveDir.sub(forward);
      if (this.moveState.left) moveDir.sub(right);
      if (this.moveState.right) moveDir.add(right);
      if (moveDir.length() > 1) moveDir.normalize();

      const speed = this.moveSpeed * (this.moveState.sprint ? this.sprintMultiplier : 1);
      moveDir.multiplyScalar(speed * dt);
      this.position.add(moveDir);
    }

    this.yVelocity += this.gravity * dt;
    this.position.y += this.yVelocity * dt;

    if (worldHeightFn) {
      const groundY = worldHeightFn(this.position.x, this.position.z) + 1.7;
      if (this.position.y <= groundY) {
        this.position.y = groundY; this.yVelocity = 0; this.isGrounded = true;
      }
    }

    this.position.x = Math.max(-48, Math.min(48, this.position.x));
    this.position.z = Math.max(-48, Math.min(48, this.position.z));
    this.camera.position.copy(this.position);

    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
    this.playerBody.position.copy(this.position);
    this.interactCooldown -= dt;
  }

  getInteractionTarget(interactables) {
    const THREE = this.THREE;
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    raycaster.set(this.camera.position, direction);
    const intersects = raycaster.intersectObjects(interactables, true);
    if (intersects.length > 0 && intersects[0].distance < this.interactionRange) {
      return intersects[0];
    }
    return null;
  }

  dispose() {
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown);
      document.removeEventListener('keyup', this._onKeyUp);
      document.removeEventListener('mousemove', this._onMouseMove);
      document.removeEventListener('mousedown', this._onMouseDown);
      document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    }
    this.scene.remove(this.playerBody);
  }

  serialize() {
    return { position: this.position.toArray(), yaw: this.yaw, pitch: this.pitch };
  }

  deserialize(data) {
    this.position.fromArray(data.position);
    this.yaw = data.yaw;
    this.pitch = data.pitch;
  }
}

export default PlayerController;
