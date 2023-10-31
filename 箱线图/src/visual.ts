import '../style/visual.less';
import Hsl from './palette';
let _;

export default class Visual extends WynVisual {

  private styleConfig: any;
  private renderConfig: any;
  private plainDataView: any;
  private eChartsInstance: any;
  private selectionManager: VisualNS.SelectionManager;
  private host: VisualNS.VisualHost;
  private dom: HTMLDivElement;
  private echarts: any;
  private palettes: string[];
  private category: string[];
  private series: string[];
  private valueDisplay: string;
  private variationDisplay: string;
  private categoryDisplay: string;
  private seriesDisplay: string;
  private valueFormat: string;
  private isLegend: boolean;
  private data: any;
  private timerId = null;

  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    super(dom, host, options);
    this.host = host;
    this.dom = dom;
    this.isLegend = false;
    this.categoryDisplay = 'category';
    this.valueDisplay = 'value';
    _ = host.moduleManager.getModule('lodash');
    this.echarts = host.moduleManager.getModule('echarts');
    this.eChartsInstance = this.echarts.init(dom);
    this.eChartsInstance.on('mouseover', this.mouseoverHandler);
    this.eChartsInstance.on('mouseout', this.mouseoutHandler);
    this.eChartsInstance.on('click', this.eChartsClickHandler);
    this.eChartsInstance.on('legendselectchanged', this.legendSelectChangedHandler);
    this.dom.addEventListener('click', this.domClickHandler);
    this.selectionManager = host.selectionService.createSelectionManager();
    this.selectionManager.registerOnSelectCallback(this.resetBoxPlot);
    this.data = this.generateData();
  }

  private generateData() {
    const data = [];
    for (let seriesIndex = 0; seriesIndex < 3; seriesIndex++) {
      const seriesData = [];
      for (let i = 0; i < 2; i++) {
        const cate = [];
        for (let j = 0; j < 100; j++) {
          cate.push(Math.random() * 200);
        }
        seriesData.push(cate);
      }
      data.push(this.echarts.dataTool.prepareBoxplotData(seriesData));
    }
    return data;
  }

  private defaultConfig = (): object => ({
    data: this.data,
    category: ['DD1', 'DD2'],
    series: ['series1', 'series2', 'series3']
  })

  private setGrid = (): object => ({
    containLabel: true,
    top: '3%',
    left: 0,
    right: 0,
    bottom: this.renderConfig.series.length === 0 || !this.styleConfig.showLegend ? '1%' : 25,
  })

  private convertOtherUnitToPx = (fontSize: string): number => {
    const divDom = document.createElement('div');
    divDom.style.visibility = 'hidden';
    divDom.style.position = 'absolute';
    divDom.style.padding = '0';
    divDom.style.border = '0';
    divDom.style.width = fontSize;
    document.body.appendChild(divDom);
    const info = divDom.getBoundingClientRect();
    document.body.removeChild(divDom);
    return info.width;
  }

  private getAxisLabel(textStyleType: string, axisType: string): object {
    const axisLabel = {};
    const textStyle = this.styleConfig[textStyleType];
    axisLabel['color'] = textStyle['color'];
    axisLabel['fontFamily'] = textStyle['fontFamily'];
    axisLabel['fontSize'] = this.convertOtherUnitToPx(textStyle['fontSize']);
    axisLabel['fontStyle'] = textStyle['fontStyle'].toLowerCase();
    axisLabel['fontWeight'] = textStyle['fontWeight'].toLowerCase();
    if (axisType === 'XAxis') {
      axisLabel['show'] = this.styleConfig.showTickLabels && this.styleConfig.showAxis;
    } else if (axisType === 'YAxis') {
      axisLabel['show'] = this.styleConfig.showValueTickLabels && this.styleConfig.showValueAxis;
      axisLabel['formatter'] = (value: number, index: number) => this.host.formatService.format(this.valueFormat, value)
    }
    return axisLabel;
  }

  private setXAxis = (): object => {
    const { showAxis, showAxisLine, showTickMarks } = this.styleConfig;
    const axisLabel = this.getAxisLabel('axisTextStyle', 'XAxis');
    return {
      data: this.renderConfig.category,
      triggerEvent: true,
      show: showAxis,
      axisLine: {
        show: showAxisLine && showAxis
      },
      axisTick: {
        show: showTickMarks && showAxis,
        interval: 0
      },
      axisLabel,
    }
  }

  private setYAxis = (): object => {
    const { showValueAxis, showSplitLine, showValueAxisLine, showValueTickMarks } = this.styleConfig;
    const axisLabel = this.getAxisLabel('axisTextStyle', 'YAxis');
    return {
      show: showValueAxis,
      axisLine: {
        show: showValueAxisLine && showValueAxis
      },
      axisTick: {
        show: showValueTickMarks && showValueAxis
      },
      splitLine: {
        show: showSplitLine && showValueAxis
      },
      axisLabel,
    }
  }

  private isSelectedBoxPlot(index: number, i: number): boolean {
    if (_.isEqual(this.renderConfig, this.defaultConfig())) {
      return true;
    }
    const selectionValue = this.renderConfig.selectionIds.filter((selectionId: any) => !selectionId.dimensions[this.variationDisplay]
      && (!selectionId.dimensions[this.categoryDisplay] || selectionId.dimensions[this.categoryDisplay] === this.renderConfig.category[i])
      && (!selectionId.dimensions[this.seriesDisplay] || selectionId.dimensions[this.seriesDisplay] === this.renderConfig.series[index]));
    return this.selectionManager.isEmpty() || this.selectionManager.contains(selectionValue[0]);
  }

  private setBoxPlotData(renderData: any, data: any, index: number, opacity: number) {
    for (let i = 0; i < data.length; i++) {
      renderData.push({
        value: data[i],
        itemStyle: {
          opacity: this.isSelectedBoxPlot(index, i) ? 0.5 * opacity / 100 : 0.15 * opacity / 100
        }
      });
    }
  }

  private getPalette = () => {
    const { color } = this.styleConfig;
    const hsl = [];
    for (let i = 0; i < this.series.length; i++) {
      i < 6 ? hsl.push(new Hsl(this.series[i], color[i])) : hsl.push(new Hsl(this.series[i], hsl[i - 6]));
      this.palettes.push(hsl[i].ToRgba(1));
    }
  }

  private getColor = (index: number) => {
    const { color, maintainColorAssignment } = this.styleConfig;
    if (this.palettes.length === 0 || _.isEqual(this.renderConfig, this.defaultConfig())) {
      return color[index];
    } else if (maintainColorAssignment) {
      return maintainColorAssignment[this.series[index]];
    } else {
      return this.palettes[index];
    }
  }

  private setSeriesBoxPlot = (data: any, index: number): object => {
    const { boxWidth, opacity, isFill, borderWidth, borderType } = this.styleConfig;
    const renderData = [];
    this.setBoxPlotData(renderData, data.boxData, index, opacity);
    return {
      name: this.renderConfig.series.length === 0 ? null : this.renderConfig.series[index],
      type: 'boxplot',
      boxWidth: ['100%', `${boxWidth / (this.renderConfig.series.length === 0 ? 1 : this.renderConfig.series.length)}%`],
      itemStyle: {
        color: isFill ? this.getColor(index) : 'transparent',
        borderColor: this.getColor(index),
        borderWidth,
        borderType
      },
      data: renderData
    }
  }

  private isSelectedScatter(data: any, index: number): boolean {
    if (_.isEqual(this.renderConfig, this.defaultConfig())) {
      return true;
    }
    const targetPoint = this.plainDataView.data.filter((dataPoint: any) => dataPoint[this.valueDisplay] === data[1]
      && (!dataPoint[this.categoryDisplay] || dataPoint[this.categoryDisplay] === this.renderConfig.category[data[0]])
      && (!dataPoint[this.seriesDisplay] || dataPoint[this.seriesDisplay] === this.renderConfig.series[index])
    );
    const result = this.selectionManager.getSelectionIds().some((selectionId: any) =>
      selectionId.dimensions[this.variationDisplay] && selectionId.dimensions[this.variationDisplay] === targetPoint[0][this.variationDisplay]
      && (!selectionId.dimensions[this.categoryDisplay] || selectionId.dimensions[this.categoryDisplay] === targetPoint[0][this.categoryDisplay])
      && (!selectionId.dimensions[this.seriesDisplay] || selectionId.dimensions[this.seriesDisplay] === targetPoint[0][this.seriesDisplay]));
    return this.selectionManager.isEmpty() || result;
  }

  private setScatterData(renderData: any, data: any, index: number, opacity: number) {
    for (let i = 0; i < data.length; i++) {
      renderData.push({
        value: data[i],
        itemStyle: {
          opacity: this.isSelectedScatter(data[i], index) ? opacity / 100 : 0.3 * opacity / 100
        }
      });
    }
  }

  private setSeriesScatter = (data: any, index: number): object => {
    const { showOutliers, opacity, symbolSize, large, largeThreshold } = this.styleConfig;
    const renderData = [];
    this.setScatterData(renderData, data.outliers, index, opacity);
    return {
      type: 'scatter',
      symbolSize,
      large,
      largeThreshold,
      itemStyle: {
        color: this.getColor(index)
      },
      data: showOutliers ? renderData : null
    }
  }

  private setLegend = (): object => {
    const { opacity, showLegend } = this.styleConfig;
    const textStyle = this.getAxisLabel('legendTextStyle', 'Legend');
    return {
      show: showLegend,
      type: 'scroll',
      bottom: 0,
      data: this.renderConfig.series.length === 0 ? null : this.renderConfig.series,
      itemStyle: {
        opacity: opacity / 100
      },
      textStyle,
    }
  }

  private domClickHandler = (e: any) => {
    if (this.isLegend && !this.selectionManager.isEmpty()) {
      this.showClickToolTip(e, []);
      this.isLegend = false;
    } else {
      this.selectionManager.clear();
    }
  }

  private resetBoxPlot = (ids: VisualNS.SelectionId[]) => {
    this.host.toolTipService.hide();
    this.render();
  }

  private getBoxPlotFields = (e: any): Array<object> => [
    {
      label: this.host.localizationManager.getDisplay('visual.upper'),
      value: this.host.formatService.format(this.valueFormat, e.value[5])
    }, {
      label: this.host.localizationManager.getDisplay('visual.q3'),
      value: this.host.formatService.format(this.valueFormat, e.value[4])
    }, {
      label: this.host.localizationManager.getDisplay('visual.median'),
      value: this.host.formatService.format(this.valueFormat, e.value[3])
    }, {
      label: this.host.localizationManager.getDisplay('visual.q1'),
      value: this.host.formatService.format(this.valueFormat, e.value[2])
    }, {
      label: this.host.localizationManager.getDisplay('visual.lower'),
      value: this.host.formatService.format(this.valueFormat, e.value[1])
    }]

  private showMouseoverToolTip(e: any, getFields: Function) {
    const fields = getFields(e);
    this.host.toolTipService.show({
      position: {
        x: e.event.event.pageX,
        y: e.event.event.pageY,
      },
      title: e.name,
      fields,
      menu: false
    });
  }

  private dealNullText = (text: string) => {
    if (text === null) {
      return this.host.localizationManager.getDisplay('visual.null');
    } else if (text === '') {
      return this.host.localizationManager.getDisplay('visual.emptyDisplay');
    } else {
      return text;
    }
  }

  private getScatterFields = (e: any): Array<object> => {
    const fields = [];
    fields.push({
      label: this.valueDisplay,
      value: this.host.formatService.format(this.valueFormat, e.value[1])
    });
    const variation = this.plainDataView.data.filter((dataPoint: any) => dataPoint[this.valueDisplay] === e.value[1]
      && (!dataPoint[this.categoryDisplay] || dataPoint[this.categoryDisplay] === e.name)
      && (!dataPoint[this.seriesDisplay] || dataPoint[this.seriesDisplay] === this.renderConfig.series[Math.floor(e.seriesIndex / 2)]));
    fields.push({
      label: this.variationDisplay,
      value: this.dealNullText(variation[0][this.variationDisplay])
    });
    if (variation[0][this.categoryDisplay]) {
      fields.push({
        label: this.categoryDisplay,
        value: this.dealNullText(variation[0][this.categoryDisplay])
      });
    }
    if (variation[0][this.seriesDisplay]) {
      fields.push({
        label: this.seriesDisplay,
        value: this.dealNullText(variation[0][this.seriesDisplay])
      });
    }
    return fields;
  }

  private mouseoverHandler = (e: any) => {
    if (e.seriesType === 'scatter') {
      this.showMouseoverToolTip(e, this.getScatterFields);
    } else if (e.seriesType === 'boxplot') {
      this.showMouseoverToolTip(e, this.getBoxPlotFields);
    }
  }

  private mouseoutHandler = (e: any) => {
    if (e.seriesType === 'boxplot') {
      const points = e.event.target.shape.points;
      const offsetX = e.event.offsetX;
      const offsetY = e.event.offsetY;
      if (offsetX >= points[0][0] && offsetX <= points[1][0] && offsetY >= points[2][1] && offsetY <= points[1][1]) {
        return;
      }
    }
    if (this.selectionManager.isEmpty()) {
      this.host.toolTipService.hide();
    }
  }

  private isContainBoxPlot = () => this.selectionManager.getSelectionIds().every((selectionId: any) => !selectionId.dimensions[this.variationDisplay])

  private managerSelectionId(selectionId: VisualNS.SelectionId, isContain: Function) {
    if (this.selectionManager.isEmpty()) {
      this.selectionManager.select(selectionId, true);
    } else if (isContain()) {
      this.selectionManager.clear();
      this.selectionManager.select(selectionId, true);
    } else if (!this.selectionManager.contains(selectionId)) {
      this.selectionManager.select(selectionId, true);
    } else {
      this.selectionManager.clear(selectionId);
    }
  }

  private showClickToolTip(e: any, fields: any) {
    if (this.selectionManager.isEmpty()) {
      this.host.toolTipService.hide();
    } else {
      this.host.toolTipService.show({
        position: {
          x: e.pageX,
          y: e.pageY,
        },
        fields,
        selected: this.selectionManager.getSelectionIds(),
        menu: true,
      });
    }
  }

  private getScatterClickSelectionId(fields: any): VisualNS.SelectionId {
    const selectionValue = this.renderConfig.selectionIds.filter((selectionId: any) =>
      selectionId.dimensions[this.variationDisplay] && selectionId.dimensions[this.variationDisplay] === fields[1].value
      && (!selectionId.dimensions[this.categoryDisplay] || selectionId.dimensions[this.categoryDisplay] === fields[2].value)
      && (!selectionId.dimensions[this.seriesDisplay] || selectionId.dimensions[this.seriesDisplay] === fields[3].value));
    return selectionValue[0];
  }

  private scatterClickHandler(e: any) {
    const fields = this.getScatterFields(e);
    const selectionId = this.getScatterClickSelectionId(fields);
    this.managerSelectionId(selectionId, this.isContainBoxPlot);
    this.showClickToolTip(e.event.event, fields);
  }

  private isContainScatter = () => this.selectionManager.getSelectionIds().every((selectionId: any) => selectionId.dimensions[this.variationDisplay])

  private getBoxPlotClickSelectionId(e: any): VisualNS.SelectionId {
    const selectionValue = this.renderConfig.selectionIds.filter((selectionId: any) => !selectionId.dimensions[this.variationDisplay]
      && (!selectionId.dimensions[this.categoryDisplay] || selectionId.dimensions[this.categoryDisplay] === e.name)
      && (!selectionId.dimensions[this.seriesDisplay] || selectionId.dimensions[this.seriesDisplay] === e.seriesName));
    return selectionValue[0]
  }

  private boxPlotClickHandler(e: any) {
    const fields = this.getBoxPlotFields(e);
    const selectionId = this.getBoxPlotClickSelectionId(e);
    this.managerSelectionId(selectionId, this.isContainScatter);
    this.showClickToolTip(e.event.event, fields);
  }

  private managerSelectionIds(selectionIds: Array<VisualNS.SelectionId>) {
    if (this.selectionManager.isEmpty()) {
      this.selectionManager.select(selectionIds, true);
    } else if (this.isContainScatter()) {
      this.selectionManager.clear();
      this.selectionManager.select(selectionIds, true);
    } else {
      selectionIds.every(selectionId => this.selectionManager.contains(selectionId))
        ? selectionIds.forEach(selectionId => this.selectionManager.clear(selectionId))
        : this.selectionManager.select(selectionIds, true);
    }
  }

  private getXAxisClickSelectionId = (category: string): Array<VisualNS.SelectionId> => this.renderConfig.selectionIds.filter((selectionId: any) =>
    !selectionId.dimensions[this.variationDisplay] && (!selectionId.dimensions[this.categoryDisplay] || selectionId.dimensions[this.categoryDisplay] === category))

  private xAxisClickHandler(e: any) {
    const selectionIds = this.getXAxisClickSelectionId(e.value);
    this.managerSelectionIds(selectionIds);
    this.showClickToolTip(e.event.event, []);
  }

  private eChartsClickHandler = (e: any) => {
    e.event.event.stopPropagation();
    if (_.isEqual(this.renderConfig, this.defaultConfig())) {
      return;
    }
    if (e.seriesType === 'scatter') {
      this.scatterClickHandler(e);
    } else if (e.seriesType === 'boxplot') {
      this.boxPlotClickHandler(e);
    } else if (e.componentType === 'xAxis') {
      this.xAxisClickHandler(e);
    }
  }

  private suppressSelection(chart, params: any) {
    chart.setOption({ animation: false });
    chart.dispatchAction({
      type: 'legendSelect',
      name: params.name
    });
    chart.setOption({ animation: true });
  }

  private legendSelectChangedHandler = (e: any) => {
    this.suppressSelection(this.eChartsInstance, e);
    this.selectSeriesHandler(e);
  }

  private getSeriesClickSelectionId = (series: string): Array<VisualNS.SelectionId> => this.renderConfig.selectionIds.filter((selectionId: any) =>
    !selectionId.dimensions[this.variationDisplay] && (!selectionId.dimensions[this.seriesDisplay] || selectionId.dimensions[this.seriesDisplay] === series))

  private selectSeriesHandler(e: any) {
    if (_.isEqual(this.renderConfig, this.defaultConfig())) {
      return;
    }
    const selectionIds = this.getSeriesClickSelectionId(e.name);
    this.managerSelectionIds(selectionIds);
    this.isLegend = true;
  }

  private setSeries(data: any) {
    const series = [];
    for (let i = 0; i < data.length; i++) {
      series.push(this.setSeriesBoxPlot(data[i], i), this.setSeriesScatter(data[i], i))
    }
    return series;
  }

  private render() {
    this.host.eventService.renderStart();
    this.eChartsInstance.clear();
    const options: any = {
      legend: this.setLegend(),
      grid: this.setGrid(),
      xAxis: this.setXAxis(),
      yAxis: this.setYAxis(),
      series: this.setSeries(this.renderConfig.data)
    };
    this.eChartsInstance.on('finished', () => {
      // wait for animation finished
    if (this.timerId) clearTimeout(this.timerId);
      this.timerId = setTimeout(() => {
        this.host.eventService.renderFinish();
        this.eChartsInstance.off('finished');
      });
    });
    this.eChartsInstance.setOption(options);
  }

  private getSeriesDataPoints(): Array<any> {
    const dataPoint = this.plainDataView.data;
    const seriesDataPoints = [];
    for (let i = 0; i < this.series.length; i++) {
      seriesDataPoints.push([]);
    }
    for (let i = 0; i < dataPoint.length; i++) {
      const index = this.series.indexOf(dataPoint[i][this.seriesDisplay]);
      seriesDataPoints[index].push(dataPoint[i]);
    }
    return seriesDataPoints;
  }

  private oneData(data: any, sourceData: any) {
    const values = [];
    sourceData.forEach((dataPoint: any) => values.push(dataPoint[this.valueDisplay]));
    const seriesData = [];
    seriesData.push(values);
    data.push(this.echarts.dataTool.prepareBoxplotData(seriesData));
  }

  private noCategoryData(data: any) {
    const seriesDataPoints = this.getSeriesDataPoints();
    seriesDataPoints.forEach(seriesDataPoint => this.oneData(data, seriesDataPoint));
  }

  private noSeriesData(data: any, dataPoints: any) {
    const categoryData = [];
    for (let i = 0; i < this.category.length; i++) {
      categoryData.push([]);
    }
    for (let i = 0; i < dataPoints.length; i++) {
      const index = this.category.indexOf(dataPoints[i][this.categoryDisplay]);
      categoryData[index].push(dataPoints[i][this.valueDisplay]);
    }
    data.push(this.echarts.dataTool.prepareBoxplotData(categoryData));
  }

  private renderCompleteData(data: any) {
    const seriesDataPoints = this.getSeriesDataPoints();
    seriesDataPoints.forEach(seriesDataPoint => this.noSeriesData(data, seriesDataPoint));
  }

  private noCategorySelectionId(selectionIds: Array<VisualNS.SelectionId>) {
    this.series.forEach(series => {
      const selectionId = this.host.selectionService.createSelectionId();
      selectionId.withDimension(this.plainDataView.profile.series.values[0], { [this.seriesDisplay]: series });
      selectionIds.push(selectionId);
    });
  }

  private noSeriesSelectionId(selectionIds: Array<VisualNS.SelectionId>) {
    this.category.forEach(category => {
      const selectionId = this.host.selectionService.createSelectionId();
      selectionId.withDimension(this.plainDataView.profile.category.values[0], { [this.categoryDisplay]: category });
      selectionIds.push(selectionId);
    })
  }

  private renderCompleteSelectionId(selectionIds: Array<VisualNS.SelectionId>) {
    this.series.forEach(series => {
      this.category.forEach(category => {
        const selectionId = this.host.selectionService.createSelectionId();
        selectionId.withDimension(this.plainDataView.profile.series.values[0], { [this.seriesDisplay]: series });
        selectionId.withDimension(this.plainDataView.profile.category.values[0], { [this.categoryDisplay]: category });
        selectionIds.push(selectionId);
      });
    });
  }

  private renderOutlierSelectionId(data: any, selectionIds: Array<VisualNS.SelectionId>) {
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < data[i].outliers.length; j++) {
        const selectionId = this.host.selectionService.createSelectionId();
        if (this.series.length !== 0) {
          selectionId.withDimension(this.plainDataView.profile.series.values[0], { [this.seriesDisplay]: this.series[i] });
        }
        if (this.category.length !== 0) {
          selectionId.withDimension(this.plainDataView.profile.category.values[0], { [this.categoryDisplay]: this.category[(data[i].outliers[j])[0]] });
        }
        const variation = this.plainDataView.data.filter((dataPoint: any) => dataPoint[this.valueDisplay] === (data[i].outliers[j])[1]
          && (this.category.length === 0 || dataPoint[this.categoryDisplay] === this.category[(data[i].outliers[j])[0]])
          && (this.series.length === 0 || dataPoint[this.seriesDisplay] === this.series[i]));
        selectionId.withDimension(this.plainDataView.profile.variation.values[0], { [this.variationDisplay]: variation[0][this.variationDisplay] });
        selectionIds.push(selectionId);
      }
    }
  }

  private setRenderConfigData(data: any, selectionIds: Array<VisualNS.SelectionId>) {
    this.valueDisplay = this.plainDataView.profile.value.values[0].display;
    this.valueFormat = this.plainDataView.profile.value.values[0].format;
    this.variationDisplay = this.plainDataView.profile.variation.values[0].display;
    if (this.category.length === 0 && this.series.length === 0) {
      this.oneData(data, this.plainDataView.data);
    } else if (this.category.length === 0) {
      this.noCategoryData(data);
      this.noCategorySelectionId(selectionIds);
    } else if (this.series.length === 0) {
      this.noSeriesData(data, this.plainDataView.data);
      this.noSeriesSelectionId(selectionIds);
    } else {
      this.renderCompleteData(data);
      this.renderCompleteSelectionId(selectionIds);
    }
    this.renderOutlierSelectionId(data, selectionIds);
  }

  private dealNullArray = (array: string[]) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = this.dealNullText(array[i]);
    }
  }

  private setRenderConfigCategory() {
    this.categoryDisplay = this.plainDataView.profile.category.values[0].display;
    this.category.push(...this.plainDataView.sort[this.categoryDisplay].order);
  }

  private setRenderConfigSeries() {
    this.seriesDisplay = this.plainDataView.profile.series.values[0].display;
    this.series.push(...this.plainDataView.sort[this.seriesDisplay].order);
  }

  private setRenderConfig(options: VisualNS.IVisualUpdateOptions) {
    this.plainDataView = options.dataViews[0] && options.dataViews[0].plain;
    this.palettes = [];
    if (this.plainDataView) {
      this.category = [];
      this.series = [];
      const data = [];
      const selectionIds = [];
      if (this.plainDataView.profile.category.values.length !== 0) {
        this.setRenderConfigCategory();
      }
      if (this.plainDataView.profile.series.values.length !== 0) {
        this.setRenderConfigSeries();
        this.getPalette();
      }
      this.setRenderConfigData(data, selectionIds);
      const category = this.category;
      const series = this.series;
      this.dealNullArray(category);
      this.dealNullArray(series);
      this.renderConfig = {
        data,
        category,
        series,
        selectionIds
      }
    } else {
      this.renderConfig = this.defaultConfig();
    }
  }

  public update(options: VisualNS.IVisualUpdateOptions) {
    this.styleConfig = options.properties;
    this.setRenderConfig(options);
    this.render();
  }

  public onDestroy() {
    this.eChartsInstance.off('mouseover', this.mouseoverHandler);
    this.eChartsInstance.off('mouseout', this.mouseoutHandler);
    this.eChartsInstance.off('click', this.eChartsClickHandler);
    this.eChartsInstance.off('legendselectchanged', this.legendSelectChangedHandler);
    this.eChartsInstance.dispose();
    this.dom.removeEventListener('click', this.domClickHandler);
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public onResize() {
    this.eChartsInstance.resize();
  }

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    const hiddenInspectors = [];
    if (options.properties.maintainColorAssignment) {
      hiddenInspectors.push('color');
    }
    if (!options.properties.showOutliers) {
      hiddenInspectors.push('outlierColor', 'symbolSize', 'large', 'largeThreshold');
    }
    if (!options.properties.showAxis) {
      hiddenInspectors.push('showAxisLine', 'showTickLabels', 'showTickMarks', 'textStyle');
    }
    if (!options.properties.showValueAxis) {
      hiddenInspectors.push('showValueAxisLine', 'showValueTickLabels', 'showValueTickMarks', 'showSplitLine');
    }
    if (!options.properties.showLegend) {
      hiddenInspectors.push('legendTextStyle');
    }
    return hiddenInspectors;
  }

  public getActionBarHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    return null;
  }

  public getColorAssignmentConfigMapping(dataViews: VisualNS.IDataView[]): VisualNS.IColorAssignmentConfigMapping {
    if (!dataViews.length) {
      return null;
    }
    const plain = dataViews[0].plain;
    const colorProfile = plain.profile.series.values[0];
    if (!colorProfile) {
      return null;
    }
    const colorValues = plain.data.map(d => d[colorProfile.display]);
    return {
      maintainColorAssignment: {
        values: Array.from(new Set(colorValues)),
        type: 'dimension',
        columns: [colorProfile],
      },
    };
  }

  public export() {
    return this.eChartsInstance.getDataURL({ type: 'png'});
  }
}