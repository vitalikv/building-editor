import { SceneManager } from './scene/sceneManager';
import { CameraManager } from './scene/components/cameras/cameraManager';
import { Controls } from './scene/components/controls/controls';
import { EffectsManager } from './scene/components/postProcessing/effectsManager';
import { MouseManager } from './scene/components/mouse/mouseManager';
import { JsonModelParser } from './scene/components/building/jsonModelParser';
import { CreateModel } from './scene/components/building/createModel';
import { ExtrudedGeometry } from './scene/components/core/extrudedGeometry';
import { ThreeApp } from './scene/threeApp';
//import { sceneManager, cameraManager, controls, effectsManager, mouseManager } from './scene/composer';
import { UiMain } from './ui/uiMain';

const containerId = 'container';

export const uiMain = new UiMain(containerId);

export const sceneManager = new SceneManager();
export const cameraManager = new CameraManager();
export const controls = new Controls();
export const effectsManager = new EffectsManager();
export const mouseManager = new MouseManager();
export const jsonModelParser = new JsonModelParser();
export const createModel = new CreateModel();
export const extrudedGeometry = new ExtrudedGeometry();

const threeApp = new ThreeApp();
threeApp.init({ containerId });
