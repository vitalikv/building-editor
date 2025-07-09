export class UiBtnCamera {
  sceneManager;
  divBtns;
  btnCam2D;
  btnCam3D;

  init({ container, sceneManager }) {
    this.sceneManager = sceneManager;

    this.divBtns = this.crDivP();
    container.append(this.divBtns);

    this.btnCam2D = this.divBtns.querySelector('[nameId="butt_camera_2D"]');
    this.btnCam3D = this.divBtns.querySelector('[nameId="butt_camera_3D"]');

    this.initBtnEvent();
  }

  crDivP() {
    const div = document.createElement('div');
    div.innerHTML = this.html_1();
    return div.children[0];
  }

  initBtnEvent() {
    this.btnCam2D.onmousedown = () => {
      this.clickOnBtn('2D');
      this.sceneManager.setCamera({ type: '2D' });
    };
    this.btnCam3D.onmousedown = () => {
      this.clickOnBtn('3D');
      this.sceneManager.setCamera({ type: '3D' });
    };
  }

  html_1() {
    const css1 = `margin: 0;
    border: 1px solid #b3b3b3;
    background-color: #f1f1f1;
    position: absolute;
    top: 50px;
    right: 50px;`;

    const html = `<div style="${css1}">	
			
			<div style="display: flex; width: auto; text-decoration: none;">	
				<div nameId='butt_camera_2D' style="display: none; align-items: center; cursor: pointer;">
					<div style="width: 39px; padding: 7px; text-align: center;"> 
						2D
					</div>	
				</div>		
				<div nameId='butt_camera_3D' style="display: flex; align-items: center; cursor: pointer;">
					<div style="width: 39px; padding: 7px; text-align: center;"> 
						3D
					</div>	
				</div>			
			</div>	
			
		</div>`;

    return html;
  }

  clickOnBtn(cam) {
    this.btnCam2D.style.display = 'none';
    this.btnCam3D.style.display = 'none';

    if (cam === '2D') this.btnCam3D.style.display = '';
    if (cam === '3D') this.btnCam2D.style.display = '';
  }
}
