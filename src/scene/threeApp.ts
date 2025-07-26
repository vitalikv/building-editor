import * as THREE from 'three';
import { sceneManager, cameraManager, controls, effectsManager, mouseManager } from '../index';

export class ThreeApp {
  init({ containerId }) {
    const container = document.getElementById(containerId) as HTMLElement;

    sceneManager.init({ container });
    const renderer = sceneManager.getRenderer();

    cameraManager.init({ container, renderer });
    const camera = cameraManager.getActiveCamera();

    controls.init({ camera, renderer });

    const scene = sceneManager.getScene();
    effectsManager.init({ scene, camera, renderer: sceneManager.getRenderer() });

    mouseManager.init(scene, cameraManager.getActiveCamera(), renderer.domElement);

    cameraManager.setCamera({ type: '3D' });
  }
}
