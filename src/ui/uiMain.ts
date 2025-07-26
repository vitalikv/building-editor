import { UiBtnCamera } from './uiBtnCamera';
import { UiDivPanel } from './uiDivPanel';
import { UiDivListWindows } from './uiDivListWindows';

export class UiMain {
  uiBtnCamera: UiBtnCamera;
  uiDivPanel: UiDivPanel;
  uiDivListWindows: UiDivListWindows;

  constructor(containerId: string) {
    const container = document.getElementById(containerId) as HTMLElement;

    container.style.font = '18px Arial, Helvetica, sans-serif';
    container.style.color = '#737373';

    this.uiBtnCamera = new UiBtnCamera();
    this.uiBtnCamera.init({ container });

    this.uiDivPanel = new UiDivPanel();
    this.uiDivPanel.init({ container: container.parentElement });

    this.uiDivListWindows = new UiDivListWindows();
    this.uiDivListWindows.init({ container: this.uiDivPanel.divPanel });
  }
}
