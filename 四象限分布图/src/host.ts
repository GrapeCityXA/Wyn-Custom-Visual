import * as d3 from 'd3';

export default class ChartVisualHost {
  private visualHost: VisualNS.VisualHost;
  private selectionManager: VisualNS.SelectionManager;
  private plotsData: VisualNS.IPlainDataView;

  constructor (dom: HTMLDivElement, host: VisualNS.VisualHost) {
    this.visualHost = host;
    this.selectionManager = host.selectionService.createSelectionManager();
    this.selectedPlotsIds = new Array();
    this.lockToolTip = false;
  }

  public BindOptions(options: VisualNS.IVisualUpdateOptions) {
    if (options.dataViews.length < 1) return null;
    this.plotsData = options.dataViews[0].plain;
  }

  public MouseEventRegister = (g: any) => g
    .on('mousemove', () => this.showToolTip())
    .on('mouseout', () => this.hideToolTip())
    .on('click', () => this.selectPlot())
    .on('focus', () => g.style('border', 'none').style('outline', 'none'))
    .on('blur', () => this.clearSelectedPlots());

  public GetSelectionId = d => this.visualHost.selectionService.createSelectionId()
      .withDimension(this.plotsData.profile['name'].values[0], d.value);

  public renderFinish() {
    this.visualHost.eventService.renderFinish();
  }

  public renderStart() {
    this.visualHost.eventService.renderStart();
  }

  private lockToolTip: boolean;

  private showToolTip() {
    if (this.lockToolTip) return;
    const e = d3.event;
    const node = (e.target as HTMLElement).parentNode;
    this.visualHost.toolTipService.show({
      position: {
        x: e.clientX,
        y: e.clientY
      },
      fields: [{
        'label': this.plotsData.profile['name'].values[0].display,
        'value': node['plot-data'].value[this.plotsData.profile['name'].values[0].display]
      }, {
        'label': this.plotsData.profile['xAxis'].values[0].display,
        'value': node['plot-data'].value[this.plotsData.profile['xAxis'].values[0].display]
      }, {
        'label': this.plotsData.profile['yAxis'].values[0].display,
        'value': node['plot-data'].value[this.plotsData.profile['yAxis'].values[0].display]
      }]
    });
  }
  private hideToolTip() {
    if (this.lockToolTip) return;
    this.visualHost.toolTipService.hide();
  }
  private showLockToolTip() {
    const e = d3.event;
    const node = (e.target as HTMLElement).parentNode;
    this.visualHost.toolTipService.show({
      position: {
        x: e.clientX,
        y: e.clientY
      },
      title: node['plot-data'].value[this.plotsData.profile['name'].values[0].display],
      fields: [{
        'label': this.plotsData.profile['xAxis'].values[0].display,
        'value': node['plot-data'].value[this.plotsData.profile['xAxis'].values[0].display]
      }, {
        'label': this.plotsData.profile['yAxis'].values[0].display,
        'value': node['plot-data'].value[this.plotsData.profile['yAxis'].values[0].display]
      }],
      selected: this.selectedPlotsIds,
      menu: true,
    });
    this.lockToolTip = true;
  }

  private selectedPlotsIds: any[];

  private selectPlot() {
    const e = d3.event;
    const node = (e.target as HTMLElement).parentNode;
    if (this.selectedPlotsIds.length === 0) d3.selectAll('.plot').attr('fill', '#bbbbbb');
    d3.select(node).attr('fill', 'black');
    this.selectedPlotsIds.push(node['selection-id']);
    this.showLockToolTip();
    this.selectionManager.select(this.selectedPlotsIds, true);
  }

  private clearSelectedPlots() {
    this.selectionManager.clear();
    d3.selectAll('.plot').attr('fill', 'black');
    this.selectedPlotsIds = [];
    this.lockToolTip = false;
    this.hideToolTip();
  }
}