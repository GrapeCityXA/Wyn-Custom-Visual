import '../style/visual.less';

import $ from 'jquery';
(window as any).jQuery = $;

import '../src/jquery.liMarquee.js';
let html2canvas;

export default class Visual {
  private container: HTMLDivElement;
  private items: any;
  private properties: any;
  private host: any;
  private dowebok: any;

  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost) {
    this.container = dom;
    this.host = host;
    html2canvas = host.moduleManager.getModule('html2canvas');
    this.container.classList.add('visual-dynamic-text');
    this.properties = {
      custom: true,
      customText: '这是一个自定义文本',
      scrollDirection: 'left',
      scrollAmount: 50,
      textStyle: {
        color: '#fff',
        fontSize: '10pt',
        fontFamily: '微软雅黑',
        fontStyle: 'Normal',
        fontWeight: 'Normal'
      }
    };
  }

  public update(options: any) {
    this.items = [];
    this.properties = options.properties;
    const dataView = options.dataViews[0];
    if (dataView &&
      dataView.plain.profile.dimensions.values.length) {
      const plainData = dataView.plain;
      let dimensions = plainData.profile.dimensions.values;
      this.items = plainData.data.map(function (item) {
        return item[dimensions[0].display];
      });
    }
    this.items = this.properties.custom ? [this.properties.customText] : this.items;
    this.render();
  };

  private render() {
    this.host.eventService.renderStart();
    this.container.innerHTML = "";
    const options = this.properties;
    this.dowebok = document.createElement("div");
    for (let i = 0; i < this.items.length; i++) {
      let p1: any = document.createElement("li");
      p1.innerHTML = this.items[i];
      p1.style.color = options.textStyle.color;
      p1.style.fontSize = options.textStyle.fontSize;
      p1.style.fontFamily = options.textStyle.fontFamily;
      p1.style.fontStyle = options.textStyle.fontStyle;
      p1.style.fontWeight = options.textStyle.fontWeight;
      this.dowebok.appendChild(p1);
    }

    this.container.appendChild(this.dowebok);
    this.host.eventService.renderFinish();
    $(this.dowebok).liMarquee({
      direction: options.scrollDirection,
      scrollamount: options.scrollAmount
    });
  }

  public onDestroy(): void {
    $(this.dowebok).liMarquee('destroy');
    
  }
  // // 自适应大小
  // private fitSize() {
  //   this.chart.resize();
  // }

  // public abstract onDestroy(): void;
  // public onResize() {
  //   this.fitSize();
  //   this.render();
  // }

  // 自定义属性可见性
  public getInspectorHiddenState(updateOptions: any): string[] {
    if (!updateOptions.properties.custom) {
      return ['customText'];
    }
    return null;
  }

  // 功能按钮可见性
  public getActionBarHiddenState(updateOptions: any): string[] {
    return null;
  }
  public onActionEventHandler = (name: string) => {

  }

  public export() {
    const def = this.host.promiseFactory.defer();
    this.container.innerHTML = "";
    const { color, fontSize, fontFamily, fontStyle, fontWeight } = this.properties.textStyle;
    let ul = document.createElement("ul");
    for (let i = 0; i < this.items.length; i++) {
      let li = document.createElement("li");
      li.innerHTML = this.items[i];
      li.style.color = color;
      li.style.fontSize = fontSize;
      li.style.fontFamily = fontFamily;
      li.style.fontStyle = fontStyle;
      li.style.fontWeight = fontWeight;
      ul.appendChild(li);
    }
    this.container.appendChild(ul);

    html2canvas(this.container, { backgroundColor: null }).then((canvas) => {
      def.resolve(canvas.toDataURL());
    });
    return def.promise;
  }
}