import BaseWindow from "../BaseWindow";

export default class LoadingTipWindow extends BaseWindow {

  
  private getDisplay : (key : string) => string;
  constructor(localizationManager:VisualNS.LocalizationManager) {
    super('loading-tip-window');
    this.getDisplay = key => localizationManager.getDisplay(`window.loadingTip.${key}`);
  }
  
  public hide() {
    this.dom.style.display = 'none';
  }

  private show() {
    this.dom.style.display = 'flex';
  }

  // 提示用户加载模型
  public showPleaseLoad() {
    
    this.dom.innerHTML = '';
    const textTip = document.createElement('div');
    textTip.className = 'loading-text-tip'
    textTip.innerHTML = this.getDisplay('pleaseLoadModel');

    this.dom.appendChild(textTip);
    this.show();
  }

  public showLoadingModel() {
    this.dom.innerHTML = '';
    this.renderLoading(this.getDisplay('loadingModel'));
    this.show();
  }

  public showLoadingError() {
    this.dom.innerHTML = '';
    const textTip = document.createElement('div');
    textTip.className = 'loading-text-tip'
    textTip.innerHTML = this.getDisplay('loadingError');

    this.dom.appendChild(textTip);
    this.show();
  }

  private renderLoading(text : string) {
    const loading = document.createElement('div');
    loading.className = 'loading-animation-box';
    for(let i = 0; i < 5; ++i) {
      const rect = document.createElement('div')
      rect.className = 'rect' + i;
      loading.appendChild(rect);
    }

    const textTip = document.createElement('div');
    textTip.className = 'loading-text-tip'
    textTip.innerHTML = text;

    this.dom.appendChild(loading);
    this.dom.appendChild(textTip);
  }
}