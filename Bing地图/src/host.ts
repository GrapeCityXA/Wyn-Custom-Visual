export default class MapVisualHost {
  private visualHost: VisualNS.VisualHost;
  private selectionManager: VisualNS.SelectionManager;

  public formatService: VisualNS.FormatService;
  public eventService: VisualNS.EventService;

  public hoverBlock: boolean;
  public hoverSwitch: boolean;

  constructor (host: VisualNS.VisualHost) {
    this.visualHost = host;
    this.selectionManager = host.selectionService.createSelectionManager();
    this.formatService = host.formatService;
    this.eventService = host.eventService;
    this.hoverBlock = false;
    this.hoverSwitch = false;
  }

  public showToolTipByClick(x: number, y: number, fields: Array<any>, customTooltipContent?: string) {
    this.hoverBlock = true;
    this.visualHost.toolTipService.show({
      position: {
        x: x,
        y: y
      },
      fields: fields,
      title: fields[0].value,
      customTooltipContent
    });
  }
  public hideToolTipByClick() {
    this.hoverBlock = false;
    this.visualHost.toolTipService.hide();
  }

  public showToolTipByHover(x: number, y: number, fields: Array<any>, customTooltipContent?: string) {
    if (this.hoverBlock || !this.hoverSwitch) return;
    this.visualHost.toolTipService.show({
      position: {
        x: x,
        y: y
      },
      fields: fields,
      title: fields[0].value,
      customTooltipContent
    });
  }
  public hideToolTipByHover() {
    if (this.hoverBlock || !this.hoverSwitch) return;
    this.visualHost.toolTipService.hide();
  }

  public createSelectionId() {
    return this.visualHost.selectionService.createSelectionId();
  }

  public select(id: VisualNS.SelectionId) {
    this.selectionManager.select(id, true);
  }

  public clearSelection() {
    this.selectionManager.clear();
  }
}