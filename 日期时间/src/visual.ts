import '../style/visual.less';
let html2canvas;
export default class Visual {
  private container: HTMLDivElement;
  private properties: any;
  private scale: number;
  private host: any;
  private timeID: any;
  private firstRendered: boolean;

  constructor(dom: HTMLDivElement, host: any) {
    this.container = dom;
    this.host = host;
    this.firstRendered = true;
    this.container.classList.add('visual-date-time');
    this.properties = {
      shape: 'detailed',
      textStyle: {
        color: '#fff',
        fontSize: '10pt',
        fontFamily: '微软雅黑',
        fontStyle: 'Normal',
        fontWeight: 'Normal'
      }
    };
    html2canvas = host.moduleManager.getModule('html2canvas');
  }

  public update(options: any) {
    this.properties = options.properties;
    this.scale = options.scale;
    this.host.eventService.renderStart();
    this.render();
  };

  private render(noTimeout?: boolean) {
    this.container.innerHTML = "";
    const options = this.properties;
    let p1: any = document.createElement("p");
    p1.className = 'p1';
    p1.style.whiteSpace = 'pre';
    p1.style.margin = '0 auto';
    this.container.appendChild(p1);
    //显示时间
    let nowtime: any = new Date();
    let hour: any = nowtime.getHours();//时
    let minutes: any = nowtime.getMinutes(); //分
    let seconds: any = nowtime.getSeconds(); //秒
    //文字增加空格
    let today: any = new Date();
    let weekday: any
    if (today.getDay() == 0) weekday = "星期日  ";
    if (today.getDay() == 1) weekday = "星期一  ";
    if (today.getDay() == 2) weekday = "星期二  ";
    if (today.getDay() == 3) weekday = "星期三  ";
    if (today.getDay() == 4) weekday = "星期四  ";
    if (today.getDay() == 5) weekday = "星期五  ";
    if (today.getDay() == 6) weekday = "星期六  ";
    let date: any = (today.getFullYear()) + "年" + (today.getMonth() + 1) + "月" + today.getDate() + "日";
    p1.style.color = options.textStyle.color;

    // if (options.textStyle.fontSize === 'auto' || options.textStyle.fontSize === '-1x') {
    //   p1.style.fontSize = this.resizeScale(this.container) + 'px';
    // }
    // p1.style.fontSize = this.caleFontSize(options.textStyle.fontSize, this.scale);
    p1.style.fontSize = options.textStyle.fontSize;
    p1.style.fontFamily = options.textStyle.fontFamily;
    p1.style.fontStyle = options.textStyle.fontStyle;
    p1.style.fontWeight = options.textStyle.fontWeight;
    if (options.format == "") {
      switch (options.shape) {
        case "Short": {
          p1.innerHTML = date;
          break;
        }
        case "Long": {
          p1.innerHTML = date + " " + this.p(hour) + ":" + this.p(minutes) + ":" + this.p(seconds);
          break;
        }
        default: {
          p1.innerHTML = date + " " + weekday + " " + this.p(hour) + ":" + this.p(minutes) + ":" + this.p(seconds);
          break;
        }
      }
    } else {
      p1.innerHTML = this.host.formatService.format(options.format, new Date());
    }

    if (this.firstRendered) {
      this.host.eventService.renderFinish();
      this.firstRendered = false;
    }

    if (this.timeID) clearTimeout(this.timeID);
    if (!noTimeout) {
      this.timeID = setTimeout(() => { this.render() }, 1000)
    }
  }
  private p(s: any) {
    return s < 10 ? '0' + s : s;
  }
  
  public onDestroy(): void {
    if (this.timeID) {
      clearTimeout(this.timeID);
      this.timeID = null;
    }
  }

  // 自定义属性可见性
  public getInspectorVisibilityState(properties: any): string[] {
    return null;
  }
  // 功能按钮可见性
  public getActionBarVisibilityState(updateOptions: any): string[] {
    return null;
  }
  public onActionEventHandler = (name: string) => {
  }

  public export() {
    const def = this.host.promiseFactory.defer();
    html2canvas(this.container, { backgroundColor: null }).then((canvas) => {
      def.resolve(canvas.toDataURL());
    });
    return def.promise;
  }
  // private resizeScale(domContainer) {
  //   // container.width / container.height = 4;
  //   const HEIGHTWEIGHT = 4;
  //   // Calculate the content font size based on the current container size, 1 / HEIGHTWEIGHT;
  //   return Math.min(domContainer.clientWidth , domContainer.clientHeight * HEIGHTWEIGHT) / HEIGHTWEIGHT / HEIGHTWEIGHT ;
  // }

  // private caleFontSize(fontSize, scale) {
  //   const baseFontInfo = fontSize.match(/^(\d+(?:\.\d+)?)(.*)$/);
  //   const fontNumber = baseFontInfo[1];
  //   const unitOfFontSize = baseFontInfo[2];
  //   return fontNumber * scale + unitOfFontSize;
  // }
}