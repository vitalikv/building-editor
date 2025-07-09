import { sceneManager } from '../index';
import { UiBtnCamera } from './uiBtnCamera';

export class MainUI {
  constructor(containerId: string) {
    const container = document.getElementById(containerId) as HTMLElement;

    container.style.font = '18px Arial, Helvetica, sans-serif';
    container.style.color = '#737373';

    const uiBtnCamera = new UiBtnCamera();
    uiBtnCamera.init({ container, sceneManager });
  }
}
