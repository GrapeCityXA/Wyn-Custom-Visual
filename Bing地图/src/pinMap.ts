import Color from 'color';
import MapVisualHost from './host';
import Palette from './palette';

enum ColorPreference {
  palette = 'palette',
  gradient = 'gradient'
}

enum GradientPreference {
  gradual = 'gradual',
  grouped = 'grouped'
}

interface PinData {
  x: number,
  y: number,
  v: number,
  c: string | number,
  t: Array<any>,
  choose: boolean,
  selectionId: VisualNS.SelectionId
}

export default class PinMap {

  private map: Microsoft.Maps.Map;
  private layer = new Microsoft.Maps.Layer();
  private visualHost: VisualNS.VisualHost;
  private host: MapVisualHost;

  constructor(map: Microsoft.Maps.Map, host: MapVisualHost, visualHost: VisualNS.VisualHost) {
    this.map = map;
    map.layers.insert(this.layer);
    this.host = host;
    this.visualHost = visualHost;
  }

  public update(options: VisualNS.IVisualUpdateOptions, plain: VisualNS.IPlainDataView) {
    const updateType = options.updateType;
    if (updateType === 'dataViewChange' || updateType === 'fullyChange') {
      this.updateDisplay(plain);
      this.updateData(plain);
    }

    this.updateProperties(options);
    this.updateLegend();
    this.renderPins();
    this.renderLegend();
  }

  private xStr: VisualNS.IFieldProfile;
  private yStr: VisualNS.IFieldProfile;
  private vStr: VisualNS.IFieldProfile;
  private cStr: VisualNS.IFieldProfile;
  private tooltipStrs: Array<VisualNS.IFieldProfile>;
  private customTooltipContent: string;
  private updateDisplay(plain: VisualNS.IPlainDataView) {
    this.xStr = plain.profile['latitude'].values[0];
    this.yStr = plain.profile['longitude'].values[0];
    this.vStr = undefined;
    this.cStr = undefined;
    this.tooltipStrs = plain.profile['tooltip'].values;
    this.customTooltipContent = plain.profile['tooltip'].options.tooltipContentSetting;
    const vProfile = plain.profile['pushPinValue'].values;
    if (vProfile.length > 0) this.vStr = vProfile[0];
    const cProfile = plain.profile['pushPinCategory'].values;
    if (cProfile.length > 0) this.cStr = cProfile[0];
  }

  private maxPinSizeValue: number;
  private maxPinColorValue: number;
  private minPinColorValue: number;
  public renderDataList: PinData[] = [];
  private updateData(plain: VisualNS.IPlainDataView) {
    const dataList = plain.data;
    this.maxPinSizeValue = undefined;
    this.maxPinColorValue = undefined;
    this.minPinColorValue = undefined;
    this.renderDataList = [];
    let center = undefined;
    dataList.forEach(data => {
      if (data[this.xStr.display] == null || data[this.yStr.display] == null) return;
      const pinData: PinData = {
        x: data[this.xStr.display] as number,
        y: data[this.yStr.display] as number,
        v: undefined,
        c: undefined,
        t: this.getTooltipValue(data),
        choose: false,
        selectionId: this.host.createSelectionId()
          .withDimension(plain.profile['latitude'].values[0], data)
          .withDimension(plain.profile['longitude'].values[0], data)
      }
      // update maxPinSizeValue
      if (this.vStr !== undefined) {
        const value = data[this.vStr.display] as number;
        if (value != null) {
          pinData.v = value;
          if (this.maxPinSizeValue === undefined || value > this.maxPinSizeValue) {
            this.maxPinSizeValue = value;
          }
        }
      }
      // update maxPinColorValue
      if (this.cStr !== undefined) {
        if (data[this.cStr.display] != null) {
          pinData.c = data[this.cStr.display];
          if (typeof data[this.cStr.display] === 'number') {
            const value = data[this.cStr.display] as number;
            if (this.maxPinColorValue === undefined || value > this.maxPinColorValue) {
              this.maxPinColorValue = value;
            }
            if (this.minPinColorValue === undefined || value < this.minPinColorValue) {
              this.minPinColorValue = value;
            }
          }
        } else {
          pinData.c = this.visualHost.localizationManager.getDisplay('null');
        }
      }
      this.renderDataList.push(pinData);
      // update pinCenter
      const loc = new Microsoft.Maps.Location(data[this.xStr.display], data[this.yStr.display]);
      if (center === undefined) {
        center = loc;
      } else {
        center = Microsoft.Maps.SpatialMath.interpolate(center, loc);
      }
    });
    if (center) {
      this.map.setView({
        center: center
      });
    }
  }
  private getTooltipValue = (data) => {
    const values = [];

    for (let i = 0; i < this.tooltipStrs.length; i++) {
      values.push({
        label: this.tooltipStrs[i].display,
        value: data[this.tooltipStrs[i].display]
      })
    }

    return values;
  }

  private maxRadius: number;
  private colorPreference: ColorPreference;
  private baseColor: Color;
  private gradientPreference: GradientPreference;
  private rangeCount: number;
  private colorAssignment: any;
  private showDataLabel: boolean;
  private paletteId: string[];
  private showSizeLegend: boolean;
  private updateProperties(options: VisualNS.IVisualUpdateOptions) {
    this.maxRadius = options.properties['maxRadius'];
    this.colorPreference = options.properties['colorPreference'];
    this.baseColor = Color(options.properties['baseColor']);
    this.gradientPreference = options.properties['gradientPreference'];
    this.rangeCount = options.properties['rangeCount'];
    this.colorAssignment = options.properties['maintainColorAssignments'];
    this.showDataLabel = options.properties['showDataLabel'];
    this.paletteId = [];
    options.properties['paletteId'].forEach(e => {
      if (typeof e === 'object') {
        this.paletteId.push(e.colorStops[0]);
      } else {
        this.paletteId.push(e);
      }
    });
    this.showSizeLegend = options.properties['showSizeLegend'];
  }

  private defaultRadius: number = 10;
  private defaultColor: string = 'rgba(0, 109, 255, 0.7)';
  private palette: Palette;
  private pinLegend: PinLegend;
  private pinGroupGradientColorLegend: PinGroupGradientColorLegend;
  private pinGradualGradientColorLegend: PinGradualGradientColorLegend;
  private updateLegend() {
    if (this.palette) this.palette.destructLegend();
    if (this.cStr !== undefined) this.palette = new Palette('Pin Color Legend', this.paletteId);
    
    if (this.pinLegend) this.pinLegend.destructLegend();
    if (this.vStr !== undefined && this.maxPinSizeValue && this.maxRadius) {
      this.pinLegend = new PinLegend(this.maxPinSizeValue, this.maxRadius, this.defaultColor, this.vStr.format, this.host.formatService);
    }

    if (this.pinGroupGradientColorLegend) this.pinGroupGradientColorLegend.destructLegend();
    if (this.pinGradualGradientColorLegend) this.pinGradualGradientColorLegend.destructLegend();
    if (this.cStr !== undefined && this.colorPreference === ColorPreference.gradient && this.maxPinColorValue) {
      if (this.gradientPreference === GradientPreference.grouped) {
        this.pinGroupGradientColorLegend = new PinGroupGradientColorLegend(this.maxPinColorValue, this.minPinColorValue, this.rangeCount, this.baseColor, this.cStr.format, this.host.formatService);
      } else {
        this.pinGradualGradientColorLegend = new PinGradualGradientColorLegend(this.minPinColorValue, this.maxPinColorValue, this.baseColor, this.cStr.format, this.host.formatService);
      }
    }
  }

  private renderLegend() {
    if (this.renderDataList.length <= 0) return;

    if (this.cStr) {
      if (this.colorPreference === ColorPreference.gradient && this.maxPinColorValue !== undefined) {
        if (this.gradientPreference === GradientPreference.grouped) {
          document.getElementById('paletteLegendBox').appendChild(this.pinGroupGradientColorLegend.getLegend());
        } else {
          document.getElementById('paletteLegendBox').appendChild(this.pinGradualGradientColorLegend.getLegend());
        }
      } else {
        document.getElementById('paletteLegendBox').appendChild(this.palette.getLegend());
      }
    }

    if (this.vStr && this.showSizeLegend) {
      document.getElementById('paletteLegendBox').appendChild(this.pinLegend.getLegend());
    }
  }

  private renderPins() {
    this.renderDataList.forEach(data => {
      // get radius
      const radius = data.v == undefined? this.defaultRadius : (data.v / this.maxPinSizeValue * this.maxRadius);
      // get color
      let fillRgb = this.defaultColor;
      if (data.choose) fillRgb = 'rgba(0, 109, 255, 1)';
      if (data.c != undefined) {
        if (this.colorPreference === ColorPreference.gradient && this.maxPinColorValue !== undefined) {
          let a = 1;
          if (this.maxPinColorValue !== this.minPinColorValue) {
            if (this.gradientPreference === GradientPreference.gradual) {
              a = (data.c as number - this.minPinColorValue) / (this.maxPinColorValue - this.minPinColorValue);
            } else {
              a = Math.ceil((data.c as number - this.minPinColorValue) / ((this.maxPinColorValue - this.minPinColorValue) / this.rangeCount)) / this.rangeCount;
            }
          }
          fillRgb = this.baseColor.alpha(a).toString();
        } else {
          if (data.c != undefined) {
            const categoryStr = data.c.toString();
            if (this.colorAssignment) {
              const categoryColor = this.colorAssignment[categoryStr];
              if (categoryColor) {
                fillRgb = this.palette.getColorByColorAssignment(data.c.toString(), categoryColor, data.choose);
              }
            } else {
              fillRgb = this.palette.getColor(categoryStr, data.choose);
            }
          }
        }
      }

      let title: string = undefined;
      if (data.c != undefined) {
        title = typeof data.c === 'number'? this.host.formatService.format(this.cStr.format, data.c) : data.c;
      }
      if (data.v != undefined) {
        if (title) {
          title += `, ${this.host.formatService.format(this.vStr.format, data.v)}`;
        } else {
          title = this.host.formatService.format(this.vStr.format, data.v);
        }
      }
      let pin = undefined;
      if (title && this.showDataLabel) {
        pin = this.newPin(data.x, data.y, radius, fillRgb, title);
      } else {
        pin = this.newPin(data.x, data.y, radius, fillRgb);
      }
      this.addMouseEvents(pin, data);

      this.layer.add(pin);
    });
  }

  private addMouseEvents(pin: Microsoft.Maps.Pushpin, d: PinData) {
    const lv: Array<any> = [{
      'label': this.xStr.display,
      'value': this.host.formatService.format(this.xStr.format, d.x)
    }, {
      'label': this.yStr.display,
      'value': this.host.formatService.format(this.yStr.format, d.y)
    }];
    if (d.v !== undefined) {
      lv.push({
        'label': this.vStr.display,
        'value': this.host.formatService.format(this.vStr.format, d.v)
      });
    }
    if (d.c !== undefined) {
      lv.push({
        'label': this.cStr.display,
        'value': typeof d.c === 'number'? this.host.formatService.format(this.cStr.format, d.c) : d.c
      });
    }
    if (d.t && d.t.length) {
      lv.push(...d.t);
    }
    Microsoft.Maps.Events.addHandler(pin, 'click', event => {
      const ev = event as Microsoft.Maps.IMouseEventArgs;
      this.host.showToolTipByClick(ev.pageX, ev.pageY, lv, this.customTooltipContent);

      d.choose = true;
      this.host.select(d.selectionId);
      this.layer.clear();
      this.renderPins();
    });

    Microsoft.Maps.Events.addHandler(pin, 'mouseover', event => {
      const ev = event as Microsoft.Maps.IMouseEventArgs;
      this.host.showToolTipByHover(ev.pageX, ev.pageY, lv, this.customTooltipContent);
    });

    Microsoft.Maps.Events.addHandler(pin, 'mouseout', () => {
      this.host.hideToolTipByHover();
    });
  }

  private newPin(x: any, y: any, radius: number, fillColor: string, title?: string) {
    const loc = new Microsoft.Maps.Location(x, y);
    const svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="', (radius * 2), '" height="', (radius * 2),
      '"><circle cx="', radius, '" cy="', radius, '" r="', radius, '" stroke="none" fill="', fillColor, '"/></svg>'];
    const pinCfg: Microsoft.Maps.IPushpinOptions = {
      icon: svg.join(''),
      anchor: new Microsoft.Maps.Point(radius, radius),
      roundClickableArea: true
    };
    if (title) pinCfg.title = title;
    return new Microsoft.Maps.Pushpin(loc, pinCfg);
  }

  public clearSelection() {
    this.renderDataList.forEach(dl => {
      dl.choose = false;
    });
    this.layer.clear();
    this.renderPins();
  }

  public mapClear() {
    this.layer.clear();
    if (this.palette) this.palette.destructLegend();
    if (this.pinLegend) this.pinLegend.destructLegend();
  }
}

class PinLegend {
  private legend: HTMLDivElement;
  constructor(maxV: number, maxR: number, color: string, format: string, formatService: VisualNS.FormatService) {
    this.legend = document.createElement('div');
    this.legend.className = 'wyn-visual-bing-map palette-legend';

    const html = [];
    html.push('Pin Size Legend<br/>');

    const stepNum = 5;
    const stepV = maxV / stepNum;
    const stepR = maxR / stepNum;
    for (let i = 1; i <= stepNum; i++) {
      const v = i * stepV;
      const r = i * stepR;
      html.push(`<svg width="${r*2}" height="${r*2}">`);
      html.push(`<circle cx="${r}" cy="${r}" r="${r}" stroke="none" fill="${color}"/></svg>`);
      html.push(`${formatService.format(format, v)}<br/>`);
    }

    this.legend.innerHTML = html.join('');
  }

  public getLegend(): HTMLDivElement {
    return this.legend;
  }
  public destructLegend() {
    this.legend.remove();
  }
}

class PinGroupGradientColorLegend {
  private legend: HTMLDivElement;
  constructor(maxV: number, minV: number, stepNum: number, color: Color, format: string, formatService: VisualNS.FormatService) {
    this.legend = document.createElement('div');
    this.legend.className = 'wyn-visual-bing-map palette-legend';

    const html = [];
    html.push('Pin Color Legend<br/>');

    const stepV = (maxV - minV) / stepNum;
    if (stepV === 0) stepNum = 1;
    const stepA = 1 / stepNum;
    for (let i = stepNum; i >= 1; i--) {
      const v = i * stepV + minV;
      const a = i * stepA;
      const r = 10;
      html.push(`<svg width="${r*2}" height="${r*2}">`);
      html.push(`<circle cx="${r}" cy="${r}" r="${r}" stroke="none" fill="${color.alpha(a).toString()}"/></svg>`);
      if (stepNum === 1) {
        html.push(`${formatService.format(format, v)}<br/>`);
      } else {
        html.push(`${formatService.format(format, v - stepV)} - ${formatService.format(format, v)}<br/>`);
      }
    }

    this.legend.innerHTML = html.join('');
  }

  public getLegend(): HTMLDivElement {
    return this.legend;
  }
  public destructLegend() {
    this.legend.remove();
  }
}

class PinGradualGradientColorLegend {
  private legendInstance: HTMLDivElement;

  private canvasWidth: number = 15;
  private canvasHeight: number = 100;

  constructor(min: number, max: number, color: Color, format: string, formatService: VisualNS.FormatService) {
    this.legendInstance = document.createElement('div');
    this.legendInstance.className = 'wyn-visual-bing-map palette-legend';
    this.legendInstance.innerHTML = 'Pin Color Legend<br/>';
    this.initLegendCanvas(color);
    this.initLegendText(min, max, format, formatService);
  }

  private initLegendCanvas(color: Color) {
    const canvas = document.createElement('canvas');
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 0, 100);
    grd.addColorStop(0.00, color.alpha(0).toString());
    grd.addColorStop(1.00, color.alpha(1).toString());
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.legendInstance.appendChild(canvas);
  }

  private initLegendText(min: number, max: number, format: string, formatService: VisualNS.FormatService) {
    const textBox = document.createElement('span');
    textBox.className = 'wyn-visual-bing-map gradual-legend-text';
    if (min !== max) {
      const minText = document.createElement('span');
      minText.className = 'wyn-visual-bing-map gradual-legend-min';
      minText.innerHTML = `${formatService.format(format, min)}`;
      textBox.appendChild(minText);
    }
    const maxText = document.createElement('span');
    maxText.innerHTML = `${formatService.format(format, max)}`;
    textBox.appendChild(maxText);
    this.legendInstance.appendChild(textBox);
  }

  public getLegend(): HTMLDivElement {
    return this.legendInstance;
  }

  public destructLegend() {
    this.legendInstance.remove();
  }
}
