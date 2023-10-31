import '../style/visual.less';
import '../style/animate.less';
let html2canvas;

export default class Visual {
  private container: HTMLDivElement;
  private items: any;
  private properties: any;
  private host: any;
  private title: string;
  private format: String;
  private unit: String;
  private clickFunction: any;

  constructor(dom: HTMLDivElement, host: any, options: any) {
    this.host = host;
    this.container = dom;
    this.items = [];
    html2canvas = host.moduleManager.getModule('html2canvas');
    this.properties = {
      custom: true,
      customText: '请输入标题',
      textStyle: {
        fontSize: '20pt',
        fontFamily: '微软雅黑',
        fontStyle: 'Normal',
        fontWeight: 'Normal'
      },
      customAnimate: false,
      customAnimateName: 'animate__bounceIn',
      customAnimateDelay: '0s',
      customAnimateRepeat: 'animate__repeat-1'
    };
    this.clickFunction = (params) => {
      this.host.contextMenuService.hide();
      let leftMouseButton = options.properties.leftMouseButton;
      this.host.commandService.execute([{
        name: leftMouseButton,
        payload: {
          selectionIds: this.selection,
          position: {
            x: params.x,
            y: params.y,
          },
        }
      }])
    };
    this.selectEvent(options);
  }

  private mouseupFunction = (params) => {
    params.preventDefault();
    params.stopPropagation();
    this.host.contextMenuService.show({
      position: {
        x: params.x,
        y: params.y,
      },
      menu: true
    }, 10)
    return;
  }

  private selection: any;

  private selectEvent(options) {
    this.selection = this.host.selectionService.createSelectionId();

    this.container.addEventListener('click', this.clickFunction);

    this.container.addEventListener('contextmenu', this.mouseupFunction);
  }

  public update(options: any) {
    const dataView = options.dataViews[0];
    this.items = [];
    if (dataView &&
      dataView.plain.profile.dimensions.values.length) {
      const plainData = dataView.plain;
      this.format = plainData.profile.dimensions.options.valueFormat;
      this.unit = plainData.profile.dimensions.options.displayUnit;
      let dimensions = plainData.profile.dimensions.values;
      this.items = plainData.data.map(function (item) {
        return item[dimensions[0].display];
      });
    }
    this.properties = options.properties;;

    this.render();
  }

  private render() {
    this.host.eventService.renderStart();
    this.renderDom()
    this.host.eventService.renderFinish();
  }

  private renderDom = (noAnimation?: boolean) => {
    this.container.innerHTML = "";
    const options = this.properties;
    const isMock = !this.items.length;
    this.title = isMock ? options.customText : this.items[0];
    let realDisplayUnit = this.unit;
    if (this.host.formatService.isAutoDisplayUnit(this.unit)) {
      const values = [];
      values.push(this.title);
      realDisplayUnit = this.host.formatService.getAutoDisplayUnit(values);
    }
    this.title = this.host.formatService.format(this.format, this.title, realDisplayUnit)
    let dowebok: any = document.createElement("div");

    let p1: any = document.createElement("h1");
    // control position
    dowebok.classList.add('title-text');
    dowebok.classList.add(options.customTextAlign);
    dowebok.classList.add(options.customTextVerticalAlign);
    if (options.customTextAlign === 'v-center' && options.customTextVerticalAlign === 'h-center') {
      dowebok.classList.add('center')
    }

    p1.innerHTML = this.title;
    p1.style.color = options.textStyle.color;
    p1.style.fontSize = options.textStyle.fontSize;
    
    p1.style.fontFamily = options.textStyle.fontFamily;
    p1.style.fontStyle = options.textStyle.fontStyle;
    p1.style.fontWeight = options.textStyle.fontWeight;

    // add  animate class name

    if (!noAnimation && options.customAnimate) {
      let addAnimateName = 'animate__';

      if (options.customAnimateName === 'flip') {
        addAnimateName = addAnimateName + options.customAnimateName + options.customAnimateFlipDirection
      } else if (options.customAnimateName === 'rotateIn') {
        addAnimateName = addAnimateName + options.customAnimateName + options.customAnimateRotateDirection
      } else {
        addAnimateName = addAnimateName + options.customAnimateName + options.customAnimateDirection
      }

      const addAnimateDelay = 'animate__' + options.customAnimateDelay;
      const addAnimateRepeat = 'animate__' + options.customAnimateRepeat;

      p1.classList.add('animate__animated');
      p1.classList.add(addAnimateName);
      p1.classList.add(addAnimateDelay);
      p1.classList.add(addAnimateRepeat);
      p1.style.setProperty('--animate-duration', `${options.customAnimateDuration}s`);
    }
    dowebok.appendChild(p1);

    this.container.appendChild(dowebok);
  }

  public onDestroy() {
    this.container.removeEventListener('click', this.clickFunction);
    this.container.removeEventListener('contextmenu', this.mouseupFunction);
  }


  public getInspectorHiddenState(updateOptions: any): string[] {
    // control animate display
    if (!updateOptions.properties.customAnimate) {
      return ['customAnimateName', 'customAnimateDirection', 'customAnimateDuration', 'customAnimateRotateDirection', 'customAnimateFlipDirection', 'customAnimateDelay', 'customAnimateRepeat'];
    }

    if (updateOptions.properties.customAnimateName === 'flip') {
      return ['customAnimateDirection', 'customAnimateRotateDirection'];
    }

    if (updateOptions.properties.customAnimateName === 'rotateIn') {
      return ['customAnimateDirection', 'customAnimateFlipDirection'];
    }

    if (updateOptions.properties.customAnimateName !== 'rotateIn' || updateOptions.properties.customAnimateName !== 'flip') {
      return ['customAnimateRotateDirection', 'customAnimateFlipDirection'];
    }

    return null;
  }

  public getActionBarHiddenState(options: any): string[] {
    return null;
  }

  public export() {
    const def = this.host.promiseFactory.defer();
    // remove animate when export
    this.renderDom(true);
    html2canvas(this.container, { backgroundColor: null }).then((canvas) => {
      def.resolve(canvas.toDataURL());
    });
    return def.promise;
  }
}