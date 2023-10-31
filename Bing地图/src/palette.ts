import Color from 'color';

class Hsl {
  public h: number;
  public s: number;
  public l: number;
  public value: string;

  constructor(value: string, input: string | Hsl) {
    this.value = value
    if (typeof input === 'object') {
      this.h = (input.h + (50 / 360)) % 1;
      this.s = input.s;
      this.l = input.l
      return this;
    }

    if (typeof input === 'string') {
      this.hex2hsl(input);
      return this;
    }
  }

  private hex2hsl(hexValue: string) {
    const color = new Color(hexValue);
    let r = color.red();
    let g = color.green();
    let b = color.blue();
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    this.l = (max + min) / 2;

    if (max == min){ 
        this.h = this.s = 0; // achromatic
    } else {
        var d = max - min;
        this.s = this.l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max) {
            case r: this.h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: this.h = (b - r) / d + 2; break;
            case b: this.h = (r - g) / d + 4; break;
        }
        this.h /= 6;
    }
  }

  public toRgba(a: number): string {
    let r, g, b;
    if (this.s == 0) {
      r = g = b = this.l;
    } else {
      const q = this.l < 0.5 ? this.l * (1 + this.s) : this.l + this.s - this.l * this.s;
      const p = 2 * this.l - q;
      r = this.hue2rgb(p, q, this.h + 1/3);
      g = this.hue2rgb(p, q, this.h);
      b = this.hue2rgb(p, q, this.h - 1/3);
    }
    return `rgba(${Math.floor(r * 255)},${Math.floor(g * 255)},${Math.floor(b * 255)},${a})`;
  }

  private hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
}

export default class Palette {
  private colorList: Hsl[] = [];
  private cycleLength: number;
  private colorMap: Map<string, number>;
  private legend: HTMLDivElement;
  private name: string;

  private initialColorList: Hsl[];

  constructor(name: string, list: string[]) {
    this.name = name;
    list.forEach(e => {
      this.colorList.push(new Hsl('', e));
    })
    this.initialColorList = this.colorList;
    this.cycleLength = list.length;
    this.colorMap = new Map();
    this.legend = document.createElement('div');
    this.legend.className = 'wyn-visual-bing-map palette-legend';
  }

  public getColor(value: string, choose: boolean): string {
    let a = 0.7;
    if (choose) a = 1;

    const r = this.colorMap.get(value);
    if (r !== undefined) return this.colorList[r].toRgba(a);

    const newIdx = this.colorMap.size;
    this.colorMap.set(value, newIdx);
    if (newIdx >= this.colorList.length) {
      const newHsl = new Hsl(value, this.colorList[newIdx - this.cycleLength]);
      this.colorList.push(newHsl);
    } else {
      this.colorList[newIdx].value = value;
    }

    return this.colorList[newIdx].toRgba(a);
  }

  private updateLegend() {
    const legendHtml = [];
    legendHtml.push(this.name, '<br/>');
    let max = this.colorMap.size;
    if (max > 10) max = 10;

    for (var i = 0; i < max; i++) {
      legendHtml.push('<svg width="12" height="12"><rect width="12" height="12" style="fill:');
      legendHtml.push(this.colorList[i].toRgba(1), '"></rect></svg> ');
      legendHtml.push(this.colorList[i].value, '<br/>');
    }

    if (this.colorMap.size > 10) {
      legendHtml.push('...');
    }

    this.legend.innerHTML = legendHtml.join('');
  }

  public getLegend(): HTMLDivElement {
    this.updateLegend();
    return this.legend;
  }

  public destructLegend() {
    this.legend.remove();
  }

  public resetLegend() {
    this.colorList = this.initialColorList;
    this.cycleLength = this.initialColorList.length;
    this.colorMap = new Map();
  }

  public getColorByColorAssignment(value: string, color: string, choose: boolean): string {
    let a = 0.7;
    if (choose) a = 1;

    if (typeof color === 'object') {
      color = (color as any).colorStops[0];
    }
    let strHex: string;
    if (/^(rgb|RGB)/.test (color)) {
        const arr = color.replace(/(?:\(|\)|rgb|RGB)*/g, "").split(",");
        strHex = '#' + ((1 << 24) + (parseInt(arr[0]) << 16) + (parseInt(arr[1]) << 8) + parseInt(arr[2])).toString(16).substr(1);
    } else {
        strHex = color;
    }

    const r = this.colorMap.get(value);
    if (r !== undefined) return this.colorList[r].toRgba(a);

    const newIdx = this.colorMap.size;
    this.colorMap.set(value, newIdx);
    if (newIdx >= this.colorList.length) {
      const newHsl = new Hsl(value, strHex);
      this.colorList.push(newHsl);
    } else {
      this.colorList[newIdx] = new Hsl(value, strHex);
    }
    return this.colorList[newIdx].toRgba(a);
  }
}