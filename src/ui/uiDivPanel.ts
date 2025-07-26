export class UiDivPanel {
  divPanel;

  init({ container }) {
    this.divPanel = this.crDivP();
    this.divPanel.style.font = '18px Arial, Helvetica, sans-serif';
    this.divPanel.style.color = '#737373';

    container.append(this.divPanel);
  }

  crDivP() {
    const div = document.createElement('div');
    div.innerHTML = this.html_1();
    return div.children[0];
  }

  html_1() {
    const html = `<div style="display: flex; width: 300px; height: 100%; border: 1px solid #b3b3b3; background-color: #f1f1f1;"></div>`;

    return html;
  }

  getDiv() {
    return this.divPanel;
  }
}
