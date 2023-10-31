import * as d3 from 'd3';
import ChartVisualHost from './host';

export default class ScatterChart {
  private width: number;
  private height: number;
  private margin: { top: number, bottom: number, left: number, right: number };
  private dom: HTMLDivElement;
  private chart: any;
  private plotsData: any[];
  private chartProperties: any;
  private docTheme: VisualNS.IDocTheme;
  private x: any;
  private y: any;
  private minX: number;
  private minY: number;
  private maxX: number;
  private maxY: number;

  private chartHost: ChartVisualHost;

  constructor(dom: HTMLDivElement) {
    this.dom = dom;
  }

  public UpdatePlotData(options: VisualNS.IVisualUpdateOptions): ScatterChart {
    this.plotsData = [];
    if (options.dataViews.length === 0) return this;
    const dv = options.dataViews[0].plain;
    if (dv.profile.xAxis.values.length === 0 ||
      dv.profile.yAxis.values.length === 0 ||
      dv.profile.name.values.length === 0)
      return this;
    if (dv.profile.xAxis.values[0].dataType !== 'number' ||
      dv.profile.yAxis.values[0].dataType !== 'number')
      return this;
    const xStr = dv.profile.xAxis.values[0].display;
    const yStr = dv.profile.yAxis.values[0].display;
    dv.data.forEach(element => {
      this.plotsData.push({
        x: element[xStr],
        y: element[yStr],
        name: element[dv.profile.name.values[0].display],
        value: element
      });
    });
    return this;
  }

  public UpdateChartProperties(options: VisualNS.IVisualUpdateOptions): ScatterChart {
    this.chartProperties = options.properties;
    this.docTheme = options.docTheme;
    return this;
  }

  public BindHost(host: ChartVisualHost, options: VisualNS.IVisualUpdateOptions): ScatterChart {
    this.chartHost = host;
    this.chartHost.BindOptions(options);
    return this;
  }

  public render() {
    this.chartHost.renderStart();
    if (this.plotsData.length === 0) return;
    const oldChart = this.chart;
    this.width = this.dom.clientWidth - 5;
    this.height = this.dom.clientHeight - 5;
    this.chart = d3.create('svg')
      .attr('viewBox', [0, 0, this.width, this.height])
      .attr('width', `${this.width}px`)
      .attr('height', `${this.height}px`);
    this.margin = {
      top: this.chartProperties.chartMarginTop,
      bottom: this.chartProperties.chartMarginBottom,
      left: this.chartProperties.chartMarginLeft,
      right: this.chartProperties.chartMarginRight };
    this.updateXYFunc();
    this.renderQuadrants();
    this.renderAxis();
    this.renderGrid();
    this.renderPlots();
    if (oldChart) {
      this.dom.replaceChild(this.chart.node(), oldChart.node());
    } else {
      this.dom.appendChild(this.chart.node());
    }
    this.chartHost.renderFinish();
  }

  public exportFile() {
    const svg = this.chart.node();
    const s = new XMLSerializer().serializeToString(svg);
    const ImgBase64 = `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(s)))}`;
    return ImgBase64;
  }

  private updateXYFunc() {
    this.x = d3.scaleLinear()
      .domain(d3.extent(this.plotsData, d => d.x)).nice()
      .range([this.margin.left, this.width - this.margin.right]);
    this.y = d3.scaleLinear()
      .domain(d3.extent(this.plotsData, d => d.y)).nice()
      .range([this.height - this.margin.bottom, this.margin.top]);
    this.minX = d3.min(this.plotsData, d => d.x);
    this.minY = d3.min(this.plotsData, d => d.y);
    this.maxX = d3.max(this.plotsData, d => d.x);
    this.maxY = d3.max(this.plotsData, d => d.y);
  }

  private renderAxis() {
    const font = this.docTheme.textStyle;
    this.chart.append('g').call(g => g
      .attr('transform', `translate(0,${this.height - this.margin.bottom})`)
      .attr('color', this.docTheme.colors.Dark1)
      .call(d3.axisBottom(this.x).ticks(this.width / 80))
      .call(g => g.select('.domain').remove())
      .call(g => g.append('text')
        .attr('x', this.width)
        .attr('y', this.margin.bottom - 4)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'end'))
      .selectAll('text')
        .attr('font-family', font.minorFontFamily)
        .attr('font-style', font.minorFontStyle)
        .attr('font-size', font.minorFontSize)
        .attr('font-weight', font.minorFontWeight));
    this.chart.append('g').call(g => g
      .attr('transform', `translate(${this.margin.left},0)`)
      .attr('color', this.docTheme.colors.Dark1)
      .call(d3.axisLeft(this.y))
      .call(g => g.select('.domain').remove())
      .call(g => g.append('text')
        .attr('x', -this.margin.left)
        .attr('y', 10)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'start'))
      .selectAll('text')
        .attr('font-family', font.minorFontFamily)
        .attr('font-style', font.minorFontStyle)
        .attr('font-size', font.minorFontSize)
        .attr('font-weight', font.minorFontWeight));
  }

  private renderGrid() {
    this.chart.append('g')
      .call(g => g
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.1)
      .call(g => g.append('g')
        .selectAll('line')
        .data(this.x.ticks())
        .join('line')
          .attr('x1', d => 0.5 + this.x(d))
          .attr('x2', d => 0.5 + this.x(d))
          .attr('y1', this.margin.top)
          .attr('y2', this.height - this.margin.bottom))
      .call(g => g.append('g')
        .selectAll('line')
        .data(this.y.ticks())
        .join('line')
          .attr('y1', d => 0.5 + this.y(d))
          .attr('y2', d => 0.5 + this.y(d))
          .attr('x1', this.margin.left)
          .attr('x2', this.width - this.margin.right)));
  }

  private renderPlots() {
    const plotsArea = this.chart.append('g')
        .attr('stroke-width', 1.5)
        .attr('font-family', 'sans-serif')
        .attr('font-size', 10)
        .call(this.chartHost.MouseEventRegister);
    const printPlot = g => g.append('path')
      .attr('d', d3.symbol()());
    const printLabel = g => {
      if (this.chartProperties.showLabel) g
      .append('text')
      .attr("dy", "0.31em")
      .attr("x", 8)
      .attr("text-anchor", "start")
      .text(d => d.name)};
    plotsArea.selectAll('g')
      .data(this.plotsData)
      .join('g')
        .classed('plot', true)
        .attr('fill', 'black')
        .property('selection-id', this.chartHost.GetSelectionId)
        .property('plot-data', d => d)
        .attr('transform', d => `translate(${this.x(d.x)},${this.y(d.y)})`)
        .call(printPlot)
        .call(printLabel);
  }

  private getXYArray() {
    const r =  {
      x0: this.margin.left,
      x1: this.x(this.chartProperties.xSlice),
      x2: this.width - this.margin.right,
      y0: this.margin.top,
      y1: this.y(this.chartProperties.ySlice),
      y2: this.height - this.margin.bottom
    }
    if (this.chartProperties.xSlice < this.minX || r.x1 < r.x0) r.x1 = r.x0;
    if (this.chartProperties.xSlice > this.maxX || r.x1 > r.x2) r.x1 = r.x2;
    if (this.chartProperties.ySlice > this.maxY || r.y1 < r.y0) r.y1 = r.y0;
    if (this.chartProperties.ySlice < this.minY || r.y1 > r.y2) r.y1 = r.y2;
    return r;
  }
  private renderOneQuadrantText(bg: any) {
    if (this.chartProperties[bg.index + 'QuadrantColor'] === undefined) return g => {};
    if (bg.width === 0 || bg.height === 0) return g => {};
    const textX = this.chartProperties[bg.index + 'QuadrantTextX'] / 100;
    const textY = this.chartProperties[bg.index + 'QuadrantTextY'] / 100;
    const font = this.chartProperties[bg.index + 'QuadrantTextStyle'];
    return g => g
      .append('text')
      .text(this.chartProperties[bg.index + 'QuadrantName'])
      .attr('x', bg.x + bg.width * textX)
      .attr('y', bg.y + bg.height * textY)
      .attr('fill', font.color)
      .attr('font-family', font.fontFamily)
      .attr('font-style', font.fontStyle)
      .attr('font-size', font.fontSize)
      .attr('font-weight', font.fontWeight)
      .attr('text-anchor', 'middle');
  }
  private renderOneQuadrant(bg: any) {
    if (this.chartProperties[bg.index + 'QuadrantColor'] === undefined) return g => {};
    return g => g
        .append('rect')
        .attr('transform', `translate(${bg.x},${bg.y})`)
        .attr('width', bg.width)
        .attr('height', bg.height)
        .attr('fill', this.chartProperties[bg.index + 'QuadrantColor']);
  }
  private renderQuadrants() {
    const g = this.chart.append('g');
    const xyArray = this.getXYArray();
    const bgs = new Array();
    bgs.push({
      index: 'first',
      x: xyArray.x1,
      y: xyArray.y0,
      width: xyArray.x2 - xyArray.x1,
      height: xyArray.y1 - xyArray.y0
    })
    bgs.push({
      index: 'second',
      x: xyArray.x0,
      y: xyArray.y0,
      width: xyArray.x1 - xyArray.x0,
      height: xyArray.y1 - xyArray.y0
    })
    bgs.push({
      index: 'third',
      x: xyArray.x0,
      y: xyArray.y1,
      width: xyArray.x1 - xyArray.x0,
      height: xyArray.y2 - xyArray.y1
    })
    bgs.push({
      index: 'fourth',
      x: xyArray.x1,
      y: xyArray.y1,
      width: xyArray.x2 - xyArray.x1,
      height: xyArray.y2 - xyArray.y1
    })
    bgs.forEach(bg => {
      g.call(this.renderOneQuadrant(bg));
    })
    bgs.forEach(bg => {
      g.call(this.renderOneQuadrantText(bg));
    })
  }
}