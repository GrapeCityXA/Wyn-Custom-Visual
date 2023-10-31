export default class Legend {
  private legendInstance: HTMLDivElement;

  private canvasWidth: number = 256;
  private canvasHeight: number = 15;

  private legendMin: number;
  private legendMax: number;
  private heatGradientData: ImageData;

  constructor(min: number, max: number) {
    this.legendInstance = document.createElement('div');
    this.legendInstance.className = 'wyn-visual-bing-map legend';
    this.legendMin = min;
    this.legendMax = max;
    this.initLegendCanvas();
    this.initLegendText();
  }

  private initLegendCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.canvasWidth;
    canvas.height = this.canvasHeight;
    const ctx = canvas.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 256, 0);
    // grd.addColorStop(0.00, 'rgb(255,0,255)');
    grd.addColorStop(0.00, 'rgb(0,0,255)');
    grd.addColorStop(0.30, 'rgb(0,255,0)');
    grd.addColorStop(0.70, 'rgb(255,255,0)');
    grd.addColorStop(1.00, 'rgb(255,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.heatGradientData = ctx.getImageData(0, 0, canvas.width, 1);
    this.legendInstance.appendChild(canvas);
  }

  private initLegendText() {
    const minText = document.createElement('span');
    minText.className = 'wyn-visual-bing-map legend-min';
    minText.innerHTML = `${this.legendMin}`;
    this.legendInstance.appendChild(minText);
    const maxText = document.createElement('span');
    maxText.className = 'wyn-visual-bing-map legend-max';
    maxText.innerHTML = `${this.legendMax}`;
    this.legendInstance.appendChild(maxText);
  }

  public getLegendElement(): HTMLDivElement {
    return this.legendInstance;
  }

  public getRgb(value: number, heightLight: boolean): Microsoft.Maps.Color {
    let v = value;
    if (v < this.legendMin) v = this.legendMin;
    if (v > this.legendMax) v = this.legendMax;
    let b = (v - this.legendMin) / (this.legendMax - this.legendMin);
    if (this.legendMax === this.legendMin) b = 1;
    let idx = Math.round(b * this.canvasWidth) * 4 - 4;
    if (idx < 0) idx = 0;
    let a = 0.7;
    if (heightLight) a = 1;
    return new Microsoft.Maps.Color(a, this.heatGradientData.data[idx], this.heatGradientData.data[idx + 1], this.heatGradientData.data[idx + 2]);
  }

  public destructLegend() {
    this.legendInstance.remove();
  }
}