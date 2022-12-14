import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Sprite,
  SpriteMaterial,
} from 'three';
import { Block, Text } from 'three-mesh-ui';
import FontJSON from 'three-mesh-ui/examples/assets/Roboto-msdf.json';
import FontImage from 'three-mesh-ui/examples/assets/Roboto-msdf.png';
import { XRButton } from './XRButton.js';

export class XRInterface extends Block {
  titlePanel;
  title;
  instructionsPanel;
  instructions;
  buttonPanel;
  backButton;
  nextButton;
  interactive;

  constructor() {
    super({
      fontFamily: FontJSON,
      fontTexture: FontImage,
      backgroundOpacity: 0,
    });
    this.position.set(0, 1.2, -1.8);
    this.rotation.x = 0;
    this.interactive = true;

    // HEADER
    this.titlePanel = new Block({
      height: 0.1,
      width: 0.6,
      fontSize: 0.07,
      justifyContent: 'center',
    });
    this.title = new Text({
      content: 'Instructions',
    });
    this.titlePanel.add(this.title);
    this.add(this.titlePanel);

    // PROGRESS
    this.progress = new Block({
      margin: 0.01,
      height: 0.02,
      width: 0.6,
      justifyContent: 'start',
      alignItems: 'start',
    });
    this.progressInner = new Block({
      height: 0.02,
      width: 0.001,
      backgroundColor: new Color('green'),
    });
    this.progress.add(this.progressInner);
    this.add(this.progress);

    // TEXT
    this.instructionsPanel = new Block({
      padding: 0.05,
      height: 0.4,
      width: 1,
      textAlign: 'left',
      fontSize: 0.05,
      margin: 0.05,
    });
    this.instructions = new Text({ content: '' });
    this.instructionsPanel.add(this.instructions);
    this.add(this.instructionsPanel);

    // BUTTONS
    this.buttonPanel = new Block({
      padding: 0.05,
      width: 0.8,
      height: 0.2,
      contentDirection: 'row',
    });
    this.nextButton = new XRButton({ content: 'Next', width: 0.3 });
    this.backButton = new XRButton({ content: 'Back', width: 0.3 });
    this.backButton.setState('disabled');
    this.buttons = [this.backButton, this.nextButton, this];
    this.buttonPanel.add(this.backButton, this.nextButton);
    this.add(this.buttonPanel);

    this.xrPointer = new Group();
    this.xrPointer.beam = this.#xrPointer({});
    this.xrPointer.add(this.xrPointer.beam);
    this.xrPointer.dot = this.#xrPointerDot();
    this.xrPointer.add(this.xrPointer.dot);
    this.xrPointer.raycaster = new Raycaster();
  }

  setInteractive(interactive = true) {
    this.interactive = interactive;
    this.xrPointer.visible = this.interactive;
  }

  updateButtons() {
    let controllerRay = this.xrPointer.parent;
    if (!controllerRay || !this.interactive) {
      return;
    }
    // Find closest intersecting object
    let intersect;
    //if (renderer.xr.isPresenting) {
    this.#updateTargetRay(this.xrPointer.raycaster, controllerRay);
    intersect = this.#getClosestIntersection(
      this.buttons,
      this.xrPointer.raycaster
    );
    //intersect = xrPointer.raycaster.intersectObjects(buttons, false)[0];
    // Position the little white dot at the end of the controller pointing ray
    if (intersect) {
      this.#updatePointerDot(
        this.xrPointer.dot,
        controllerRay,
        intersect.point
      );
    } else {
      this.xrPointer.dot.visible = false;
    }
    //}
    // Update targeted button state (if any)
    // setState internally calls component.set with the options you defined in component.setupState
    if (
      intersect &&
      intersect.object.isUI &&
      intersect.object.currentState !== 'disabled'
    ) {
      if (
        controllerRay.userData.isSelecting &&
        'selected' in intersect.object.states
      ) {
        intersect.object.setState('selected');
      } else if ('hovered' in intersect.object.states) {
        intersect.object.setState('hovered');
      }
    }
    // Update non-targeted buttons state
    this.buttons.forEach((obj) => {
      if (
        (!intersect || obj !== intersect.object) &&
        obj.isUI &&
        obj.currentState !== 'disabled' &&
        'idle' in obj.states
      ) {
        obj.setState('idle');
      }
    });
  }

  #updateTargetRay(raycaster, controller) {
    if (raycaster.dummyMatrix === undefined) {
      raycaster.dummyMatrix = new Matrix4();
    }
    raycaster.dummyMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(raycaster.dummyMatrix);
  }

  #updatePointerDot(dot, controllerRay, location) {
    const localVec = controllerRay.worldToLocal(location);
    dot.position.copy(localVec);
    dot.visible = true;
  }

  #getClosestIntersection(objsToTest, raycaster) {
    return objsToTest.reduce((closestIntersection, obj) => {
      const intersection = raycaster.intersectObject(obj, true);

      if (!intersection[0]) return closestIntersection;

      if (
        !closestIntersection ||
        intersection[0].distance < closestIntersection.distance
      ) {
        intersection[0].object = obj;

        return intersection[0];
      }

      return closestIntersection;
    }, null);
  }

  // XR POINTER MESH STUFF

  #xrPointerSimple({ length = 0.5 }) {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 0, 0, -length], 3)
    );
    geometry.setAttribute(
      'color',
      new Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
    );
    const material = new LineBasicMaterial({
      vertexColors: true,
      blending: AdditiveBlending,
    });
    return new Line(geometry, material);
  }

  #xrPointer({ gradientSteps = 64 }) {
    // https://github.com/felixmariotto/three-mesh-ui/blob/master/examples/utils/VRControl.js
    const material = new MeshBasicMaterial({
      color: 0xffffff,
      alphaMap: new CanvasTexture(
        generateRayTexture({ gradientSteps: gradientSteps })
      ),
      transparent: true,
    });
    const geometry = new BoxGeometry(0.004, 0.004, 0.35);
    geometry.translate(0, 0, -0.15);

    const uvAttribute = geometry.attributes.uv;
    for (let i = 0; i < uvAttribute.count; i++) {
      let u = uvAttribute.getX(i);
      let v = uvAttribute.getY(i);
      [u, v] = (() => {
        switch (i) {
          case 0:
            return [1, 1];
          case 1:
            return [0, 0];
          case 2:
            return [1, 1];
          case 3:
            return [0, 0];
          case 4:
            return [0, 0];
          case 5:
            return [1, 1];
          case 6:
            return [0, 0];
          case 7:
            return [1, 1];
          case 8:
            return [0, 0];
          case 9:
            return [0, 0];
          case 10:
            return [1, 1];
          case 11:
            return [1, 1];
          case 12:
            return [1, 1];
          case 13:
            return [1, 1];
          case 14:
            return [0, 0];
          case 15:
            return [0, 0];
          default:
            return [0, 0];
        }
      })();
      uvAttribute.setXY(i, u, v);
    }

    const linesHelper = new Mesh(geometry, material);
    linesHelper.renderOrder = Infinity;
    return linesHelper;

    function generateRayTexture({ gradientSteps = 64 }) {
      const canvas = document.createElement('canvas');
      canvas.width = gradientSteps;
      canvas.height = gradientSteps;

      const ctx = canvas.getContext('2d');

      const gradient = ctx.createLinearGradient(0, 0, gradientSteps, 0);
      gradient.addColorStop(0, 'black');
      gradient.addColorStop(1, 'white');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, gradientSteps, gradientSteps);

      return canvas;
    }
  }

  #xrPointerDot() {
    const spriteMaterial = new SpriteMaterial({
      map: new CanvasTexture(generatePointerTexture()),
      sizeAttenuation: false,
      depthTest: false,
    });

    const pointer = new Sprite(spriteMaterial);

    pointer.scale.set(0.015, 0.015, 1);
    pointer.renderOrder = Infinity;
    return pointer;

    function generatePointerTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;

      const ctx = canvas.getContext('2d');

      ctx.beginPath();
      ctx.arc(32, 32, 29, 0, 2 * Math.PI);
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.fillStyle = 'white';
      ctx.fill();

      return canvas;
    }
  }
}
