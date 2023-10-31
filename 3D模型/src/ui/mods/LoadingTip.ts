import BaseWindow from "../BaseWindow";

export default class LoadingTip extends BaseWindow {
  private close: HTMLDivElement;
  private text: HTMLDivElement;

  private closeEvent: () => void;

  constructor() {
    super('loading-tip');

    this.close = document.createElement('div');
    this.close.className = 'close-icon';
    this.dom.appendChild(this.close);

    this.closeEvent = () => {this.hide();}
    this.close.addEventListener('click', this.closeEvent );

    this.text = document.createElement('div');
    this.text.className = 'loading-text';
    this.dom.appendChild(this.text);

    this.dom.hidden = true;
  }

  public showLoading = () => {
    this.text.innerText = 'Loading';
    this.dom.hidden = false;
  }

  public showError = () => {
    this.text.innerText = 'Error';
    this.dom.hidden = false;
  }

  public hide = () => {
    this.dom.hidden = true;
  }

  public show = (text) => {
    this.text.innerHTML = text;
    this.dom.hidden = false;
  }

  public destroy() {
    this.close.removeEventListener('click', this.closeEvent );
  }
}