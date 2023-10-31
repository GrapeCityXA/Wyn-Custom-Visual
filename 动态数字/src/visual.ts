import '../style/visual.less';
import '../style/flip.less';
import '../style/odometer.less';
import '../style/perfect-scrollbar.less';
let html2canvas;

import { utils } from './utils';
import { DigitsChart } from './digitsChart';
export default class Visual extends WynVisual {
  private container: any;
  private properties: any;
  private viewport: any;
  private chartContainer: any;
  private digitsContainer: any;
  private digitsChart: any;
  private isMock: boolean;
  private number: number;
  private aggregation: any;
  private options: any;
  private ActualValue: any
  private host: any;
  private selectionManager: any;
  private selectionId: any
  static mockNumber = 123456;

  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    super(dom, host, options);

    let chartDiv = utils.createElement('div', 'chart-container');
    html2canvas = host.moduleManager.getModule('html2canvas');

    this.container = dom;
    this.host = host;
    this.chartContainer = chartDiv;
    this.digitsContainer = utils.createElement('div', 'digits-container');

    this.chartContainer.appendChild(this.digitsContainer);

    dom.appendChild(this.chartContainer);

    this.digitsChart = new DigitsChart(this.digitsContainer, host.eventService);


    this.isMock = true;
    this.number = 0;
    this.aggregation = null;
    this.options = {
      digit: {},
    };

    this.selectionManager = host.selectionService.createSelectionManager();
    this.selectEvent();
  }

  private clickFunction = () => {
    this.selectionManager.clear();
    this.host.toolTipService.hide();
    this.host.contextMenuService.hide();
    return;
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
  private selectEvent() {
    this.container.addEventListener("click", this.clickFunction);
  
     //tooltip	跳转保留等
     this.container.addEventListener('contextmenu',  this.mouseupFunction);
  }

  public renderDigits() {
    let config = utils.clone(this.options.digit);
    if (this.isMock) {
      config.animationDuration = 0;
    }
    this.digitsChart.render(this.number, config);
    if (config.animationDuration === 0) {
      this.host.eventService.renderFinish();
    }
  };

  public render() {
    this.host.eventService.renderStart();
    this.container.style.opacity = 1;
    this.renderDigits();
  }

  public update(options: VisualNS.IVisualUpdateOptions) {
    this.properties = options.properties;
    this.viewport = options.viewport;
    const textStyle = this.properties.textStyle
    const font = {
      color: textStyle.color,
      size: textStyle.fontSize,
      family: textStyle.fontFamily,
      bold: textStyle.fontWeight === 'Normal' ? false : textStyle.fontWeight,
      italic: textStyle.fontStyle === 'Normal' ? false : textStyle.fontStyle,
    }
    const bgColor = this.properties.backgroundColor
    const gradientColor = this.properties.gradientBackgroundColor
    let backgroundColor = this.properties.backgroundColor

    if (this.properties.animationMode === 'slide') {
      if (this.properties.gradientType === 'center') {
        backgroundColor = `-webkit-linear-gradient(top, ${bgColor} 0%, ${bgColor} 35%, ${gradientColor} 55%, ${bgColor} 55%, ${bgColor} 100%);`
      } else if (this.properties.gradientType === 'topToBottom') {
        backgroundColor = `-webkit-linear-gradient(top, ${gradientColor} 0%, ${bgColor} 25%, ${bgColor} 55%, ${bgColor} 75%, ${gradientColor} 100%);`
      }
    }

    const integerLength = this.properties.integerType === 'auto' ? 'auto' : this.properties.integerLength

    this.options.digit = {
      ...this.properties,
      integerLength,
      backgroundColor,
      font,
    }

    const dataView = options.dataViews[0];
    if (dataView &&
      dataView.plain.profile.ActualValue.values.length) {
      const plainData = dataView.plain;

      this.ActualValue = plainData.profile.ActualValue.values[0].display;
      this.isMock = false
      // if return data is empty array, should display 0 as the number
      if(plainData.data.length == 0){
         this.number = 0;
      }else{  plainData.data.map((item: any) => {

        const selectionId = this.host.selectionService.createSelectionId();
        selectionId
          .withDimension(plainData.profile.ActualValue.values[0], item)
        this.selectionId = selectionId

        return this.number = item[this.ActualValue];
      })
    }
    } else {
      this.isMock = true;
      this.number = Visual.mockNumber;
    }
    this.render()
  }

  public onDestroy() {
    this.digitsChart.destroy();
    this.container.removeEventListener("click", this.clickFunction);
    this.container.removeEventListener("contextmenu", this.mouseupFunction);
  }

  public onResize() {
    let number = this.isMock ? Visual.mockNumber : this.number;
    this.digitsChart.resize(number);
  }

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {

    if (options.properties.animationMode === 'flip') {
      const integerLength = options.properties.integerType === 'auto' && ['integerLength'] || []
      return ['animationDuration', 'gradientType', 'gradientBackgroundColor'].concat(integerLength);
    }

    if (options.properties.integerType === 'auto') {
      return ['integerLength'];
    }

    return null;
  }

  public getActionBarHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    return null;
  }

  private handleIntegerDigits(digits) {
    return this.properties.showThousandSign ? digits.replace(/(\d)(?=(\d{3})+$)/g, '$1,') : digits;
  }

  private prepareDigits() {
    const renderDigits = [];
    const digits = this.digitsChart.formatDigits(this.number);
    const integerDigits = this.handleIntegerDigits(digits[0]).split('');
    Array.prototype.push.apply(renderDigits, integerDigits);
    if(this.properties.decimalLength !== 0) {
      const pointDigits = digits[1].split('');
      Array.prototype.push.apply(renderDigits, ['.', ...pointDigits]);
    }
    return renderDigits;
  }

  private renderExportDigits(renderedDigits) {
    const exportContainer =  utils.createElement('div', 'export-digits-container');
    this.chartContainer.appendChild(exportContainer);
    this.chartContainer.style.height = `${this.viewport.height}px`;
    this.chartContainer.style.lineHeight = `${this.viewport.height}px`;
    renderedDigits.forEach((digit) => {
      const digitSpan =  document.createElement('span');
      if(digit === ','  || digit === '.') {
        digitSpan.className = 'digit-spacer';
      } else {
        digitSpan.className = 'digit';
        digitSpan.style.cssText = 'background:' + this.options.digit.backgroundColor;
      }
      digitSpan.innerHTML = digit;
      const textStyle = this.options.digit.textStyle;
      if (this.options.digit.font?.size === 'auto') {
        textStyle.fontSize = this.digitsChart.fontRenderSize;
      }
      if (textStyle.fontWeight !== 'Normal'){
         textStyle.fontWeight = 'Bold';
      }

      Object.keys(textStyle).forEach((cssAttr) => {
        digitSpan.style[cssAttr] = textStyle[cssAttr]
      })
      exportContainer.appendChild(digitSpan);
    })
  }

  public export() {
    const def = this.host.promiseFactory.defer();
    this.digitsContainer.remove();
    const renderedDigits = this.prepareDigits();
    this.renderExportDigits(renderedDigits);
    html2canvas(this.container, { backgroundColor: null }).then((canvas) => {
      def.resolve(canvas.toDataURL());
    });
    return def.promise;
  }
}