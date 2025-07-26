import * as THREE from 'three';
import { cameraManager } from '../index';

export class UiBtnCamera {
  divBtns;
  btnCamTop;
  btnCamFront;
  btnCam3D;
  divBtnsCamFront;

  currentIndex = 0;

  public init({ container }) {
    this.divBtns = this.crDivP({ html: this.html_1() });
    container.append(this.divBtns);

    this.btnCamTop = this.divBtns.querySelector('[nameId="btnCamTop"]');
    this.btnCamFront = this.divBtns.querySelector('[nameId="btnCamFront"]');
    this.btnCam3D = this.divBtns.querySelector('[nameId="btnCam3D"]');

    this.divBtnsCamFront = this.crDivP({ html: this.htmlFrontBtms() });
    container.append(this.divBtnsCamFront);

    this.initBtnEvent();
  }

  private crDivP({ html }) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.children[0];
  }

  private initBtnEvent() {
    this.btnCamTop.onmousedown = () => {
      this.clickOnBtn({ type: 'Top' });
      cameraManager.setCamera({ type: 'Top' });
    };
    this.btnCamFront.onmousedown = () => {
      this.clickOnBtn({ type: 'Front' });
      cameraManager.setCamera({ type: 'Front' });
    };
    this.btnCam3D.onmousedown = () => {
      this.clickOnBtn({ type: '3D' });
      cameraManager.setCamera({ type: '3D' });
    };

    const btnCloseCamFront = this.divBtnsCamFront.querySelector('[nameId="btnCloseCamFront"]');
    const txtSideCamFront = this.divBtnsCamFront.querySelector('[nameId="txtSideCamFront"]');
    const btnShL = this.divBtnsCamFront.querySelector('[nameId="shL"]');
    const btnShR = this.divBtnsCamFront.querySelector('[nameId="shR"]');

    btnCloseCamFront.onmousedown = () => {
      this.clickOnBtn({ type: '3D' });
      cameraManager.setCamera({ type: '3D' });
    };

    const views = [
      { side: 'front', position: new THREE.Vector3(0, 0, 100), up: new THREE.Vector3(0, 1, 0) },
      { side: 'right', position: new THREE.Vector3(100, 0, 0), up: new THREE.Vector3(0, 1, 0) },
      { side: 'back', position: new THREE.Vector3(0, 0, -100), up: new THREE.Vector3(0, 1, 0) },
      { side: 'left', position: new THREE.Vector3(-100, 0, 0), up: new THREE.Vector3(0, 1, 0) },
    ];

    btnShL.onmousedown = () => {
      this.currentIndex = (this.currentIndex - 1 + views.length) % views.length;
      console.log(this.currentIndex, views);
      txtSideCamFront.textContent = views[this.currentIndex].side;

      const position = views[this.currentIndex].position.clone();
      cameraManager.setPosCamFront({ position });
    };

    btnShR.onmousedown = () => {
      this.currentIndex = (this.currentIndex + 1) % views.length;
      console.log(this.currentIndex, views);
      txtSideCamFront.textContent = views[this.currentIndex].side;

      const position = views[this.currentIndex].position.clone();
      cameraManager.setPosCamFront({ position });
    };
  }

  private html_1() {
    const css1 = `
    margin: 0;
    position: absolute;
    top: 50px;
    right: 50px;`;

    const css2 = `margin-left: 10px; border: 1px solid #b3b3b3; background-color: #f1f1f1;`;

    const html = `
    <div nameId="btnCam" style="${css1}">	
			<div style="display: flex; width: auto; text-decoration: none;">
				<div nameId="btnCamFront" style="display: flex; align-items: center; cursor: pointer; ${css2}">        
					<div style="width: 39px; padding: 7px; text-align: center;"> 
						Front
					</div>	
				</div>

				<div nameId="btnCamTop" style="display: none; align-items: center; cursor: pointer; ${css2}">
					<div style="width: 39px; padding: 7px; text-align: center;"> 
						Top
					</div>	
				</div>	

				<div nameId="btnCam3D" style="display: flex; align-items: center; cursor: pointer; ${css2}">        
					<div style="width: 39px; padding: 7px; text-align: center;"> 
						3D
					</div>	
				</div>        			
			</div>				
		</div>`;

    return html;
  }

  private htmlFrontBtms() {
    const css1 = `
    display: flex;
    align-items: stretch;
    justify-content: center;
    margin: 0;
    position: absolute;
    top: 50px;
    right: 50px;`;

    const css2 = `
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    border: 1px solid #b3b3b3;
    background-color: #f1f1f1;`;

    const btnClose = `
    display: flex;
    align-items: center;
    justify-content: center;
		width: 20px;
		height: 20px;
		transform: rotate(-45deg);
    margin: auto;
		font-size: 30px;
		text-align: center;
		text-decoration: none;
		line-height: 0.6em;`;

    const svgL = `
    <div nameId="shL" style="width: 20px; height: 20px; padding: 0 5px; cursor: pointer;">				
			<svg height="100%" width="100%" viewBox="0 0 100 100">					
				<polygon points="100,0 100,100 0,50" style="stroke:#222222; stroke-width:4; fill: #fff;"></polygon>				
			</svg>
		</div>`;

    const svgR = `
    <div nameId="shR" style="width: 20px; height: 20px; padding: 0 5px; cursor: pointer;">				
			<svg height="100%" width="100%" viewBox="0 0 100 100">					
				<polygon points="0,0 100,50 0,100" style="stroke:#222222; stroke-width:4; fill: #fff;"></polygon>				
			</svg>
		</div>`;

    const html = `
    <div nameId="divBtnsCamFront" style="${css1}">
      <div style="${css2}">${svgL}</div>

      <div style="${css2} margin-left: 10px;">        
        <div nameId="txtSideCamFront" style="width: 39px; padding: 7px; text-align: center;"> 
          Front
        </div>	
      </div>
      
      <div style="${css2} margin-left: 10px;">${svgR}</div>

      <div nameId="btnCloseCamFront" style="display: flex; align-items: center; justify-content: center; width: 40px; margin-left: 20px; border: 1px solid #b3b3b3; background-color: #f1f1f1; cursor: pointer;">
        <div style="${btnClose}"> + </div>
      </div>
    </div>`;

    return html;
  }

  public clickOnBtn({ type }: { type: '3D' | 'Top' | 'Front' }) {
    this.btnCamTop.style.display = 'none';
    this.btnCamFront.style.display = 'none';
    this.btnCam3D.style.display = 'none';
    this.divBtnsCamFront.style.display = 'none';

    if (type === 'Top') {
      this.btnCam3D.style.display = '';
      this.btnCamFront.style.display = '';
    }
    if (type === '3D') {
      this.btnCamTop.style.display = '';
      this.btnCamFront.style.display = '';
    }
    if (type === 'Front') this.divBtnsCamFront.style.display = 'flex';
  }
}
