import { mouseManager } from '../index';

export class UiDivListWindows {
  divContainer;
  btnCam2D;
  btnCam3D;

  public init({ container }) {
    this.divContainer = this.crDiv({ html: this.html_1() });
    container.append(this.divContainer);
  }

  private crDiv({ html }) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.children[0];
  }

  private html_1() {
    const html = `<div style="display: flex; flex-direction: column; width: 100%; height: fit-content;"></div>`;

    return html;
  }

  private htmlTitleListWindows() {
    const css1 = `
    display: flex;
    width: 100%;
    margin: 5px;
    text-decoration: none;
    justify-content: center;
    border-bottom: solid 1px #b3b3b3;
    font-size: 18px;
    color: #737373;`;

    const html = `<div style="${css1}">Список окон</div>`;

    return html;
  }

  private htmlBtn({ name }) {
    const css1 = `
    display: flex;
    width: auto;
    margin: 5px;
    text-decoration: none;
    text-align: center;
    padding: 5px 11px;
    border: solid 1px #b3b3b3;
    font-size: 14px;
    color: #737373;
    background-color: #ffffff;
    cursor: pointer;`;

    const html = `<div style="${css1}">${name}</div>`;

    return html;
  }

  public addBtns({ objs }) {
    const title = this.crDiv({ html: this.htmlTitleListWindows() });
    this.divContainer.append(title);

    for (let i = 0; i < objs.length; i++) {
      const obj = objs[i];
      const name = obj.userData.name;
      const btn = this.crDiv({ html: this.htmlBtn({ name }) });
      this.divContainer.append(btn);

      this.clickOnBtn({ btn, obj });
    }
  }

  private clickOnBtn = ({ btn, obj }) => {
    btn.onmousedown = () => {
      mouseManager.changeWindow({ objPatternWind: obj });
    };
  };
}
