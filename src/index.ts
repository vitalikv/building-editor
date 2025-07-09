import { SceneManager } from './scene/sceneManager';
import { MainUI } from './ui/uiMain';

export const sceneManager = new SceneManager('container', { backgroundColor: 0xffffff });
new MainUI('container');
