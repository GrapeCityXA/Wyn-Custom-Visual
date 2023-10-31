import ScatterChart from './chart';
import ChartVisualHost from './host';
import DemoData from './demo_data';

export default class Visual extends WynVisual {
  private chartHost: ChartVisualHost;
  private myChart: ScatterChart;
  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    super(dom, host, options);
    this.chartHost = new ChartVisualHost(dom, host);
    this.myChart = new ScatterChart(dom);
  }

  public update(options: VisualNS.IVisualUpdateOptions) {
    if (options.dataViews.length === 0) 
      options.dataViews.push(DemoData.GetDemoData());
    this.myChart
      .UpdatePlotData(options)
      .UpdateChartProperties(options)
      .BindHost(this.chartHost, options)
      .render();
  }

  public onDestroy() {

  }

  public onResize() {
    this.myChart.render();
  }

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    return null;
  }

  public getActionBarHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    return null;
  }

  public export() {
    return this.myChart.exportFile();
  }
}