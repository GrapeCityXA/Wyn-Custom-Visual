export default class BaseWindow {
  protected dom: HTMLDivElement;

  constructor(className: string) {
    this.dom = document.createElement('div');
    this.dom.className = className;
  }

  public render(dom: HTMLElement | DocumentFragment) {
    dom.appendChild(this.dom);
  }


  public applyInlineStyles(...styles : Array<[string, string]>) {
    for(const style of styles) {
      this.dom.style[style[0]] = style[1];
    }
  }
}