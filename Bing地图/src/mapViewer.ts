import BlockMap from "./blockMap";
import HeatMap from "./heatMap";
import MapVisualHost from "./host";
import PinMap from "./pinMap";

export default class MapViewer {
  private mapInstance: Microsoft.Maps.Map;
  private handlerIdList: Microsoft.Maps.IHandlerId[] = [];
  private visualHost: VisualNS.VisualHost;
  private host: MapVisualHost;
  private pinMap: PinMap;
  private heatMap: HeatMap;
  private blockMap: BlockMap;

  private firstUpdate: boolean = true;

  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    const licenseKey = host.configurationManager.get('Application Key');
    this.visualHost = host;
    this.host = new MapVisualHost(host);
    this.newMap(dom, options, licenseKey);
    this.initLayers(licenseKey);
    this.initMapEventHandler(options, host);
  }

  private newMap(dom: HTMLDivElement, options: VisualNS.IVisualUpdateOptions, licenseKey: string) {
    const mapDiv = document.createElement('div');
    mapDiv.id = 'wynBingMap';
    mapDiv.style.width = '100%';
    mapDiv.style.height = '100%';
    const mapOptions: Microsoft.Maps.IMapLoadOptions = {
      credentials: licenseKey,
      zoom: 4,
      showZoomButtons: false,
      disableBirdseye: false,
      disableStreetside: false,
      enableCORS: true,
    }
    const mapCenter = options.properties['mapCenter'];
    const center = mapCenter.center;
    const zoom = mapCenter.zoom;
    if (center !== undefined && zoom !== undefined) {
      mapOptions.zoom = zoom;
      mapOptions.center = center;
    }
    this.mapInstance = new Microsoft.Maps.Map(mapDiv, mapOptions);
    Microsoft.Maps.Events.addHandler(this.mapInstance, 'viewchangestart', () => this.host.eventService.renderStart());
    Microsoft.Maps.Events.addHandler(this.mapInstance, 'viewrendered', () => this.host.eventService.renderFinish());
    this.mapCenter = this.mapInstance.getCenter();
    this.mapZoom = this.mapInstance.getZoom();
    try {
      this.mapInstance.setMapType(Microsoft.Maps.MapTypeId[options.properties['mapType'] as string]);
    } catch {}
    dom.appendChild(mapDiv);
  }

  private initLayers(licenseKey: string) {
    this.pinMap = new PinMap(this.mapInstance, this.host, this.visualHost);
    this.heatMap = new HeatMap(this.mapInstance);
    this.blockMap = new BlockMap(this.mapInstance, this.host, licenseKey);
  }

  private mapCenter: Microsoft.Maps.Location;
  private mapZoom: number;
  private viewChangeEndEventHandler: () => void;
  private viewChangeEndEventHandlerId: Microsoft.Maps.IHandlerId;
  private initMapEventHandler(options: VisualNS.IVisualUpdateOptions, host: VisualNS.VisualHost) {
    this.viewChangeEndEventHandler = () => {
      if (!options.isViewer) {
        const curCenter = this.mapInstance.getCenter();
        const curZoom = this.mapInstance.getZoom();
        if (Microsoft.Maps.Location.areEqual(this.mapCenter, curCenter) && this.mapZoom === curZoom) return;
        host.propertyService.setProperty('mapCenter', {center: this.mapInstance.getCenter(), zoom: this.mapInstance.getZoom()});
      }
    };
    this.viewChangeEndEventHandlerId = Microsoft.Maps.Events.addHandler(this.mapInstance, 'viewchangeend', this.viewChangeEndEventHandler);

    this.handlerIdList.push(
      Microsoft.Maps.Events.addHandler(this.mapInstance, 'click', () => {
        this.host.hideToolTipByClick();
        this.host.clearSelection();
        this.pinMap.clearSelection();
        this.blockMap.clearSelection();
      })
    );
  }

  private isMapViewChanged(options: VisualNS.IVisualUpdateOptions): boolean {
    const mapCenter = options.properties['mapCenter'];
    const center = mapCenter.center;
    const zoom = mapCenter.zoom;
    if (center !== undefined && zoom !== undefined) {
      if (!Microsoft.Maps.Location.areEqual(this.mapInstance.getCenter(), center) || !this.mapInstance.getZoom() === zoom) {
        Microsoft.Maps.Events.removeHandler(this.viewChangeEndEventHandlerId);
        this.mapInstance.setView({
          center: center,
          zoom: zoom
        });
        this.viewChangeEndEventHandlerId = Microsoft.Maps.Events.addHandler(this.mapInstance, 'viewchangeend', this.viewChangeEndEventHandler);
      }

      if (Microsoft.Maps.Location.areEqual(this.mapCenter, center) && this.mapZoom === zoom) {
        return false;
      } else {
        this.mapCenter = center;
        this.mapZoom = zoom;
        return true;
      }
    } else {
      return false;
    }
  }

  private clearHandlers() {
    Microsoft.Maps.Events.removeHandler(this.viewChangeEndEventHandlerId);
    this.handlerIdList.forEach(e => {
      Microsoft.Maps.Events.removeHandler(e);
    });
    this.handlerIdList.length = 0;
  }

  public update(options: VisualNS.IVisualUpdateOptions) {
    this.host.hoverSwitch = options.properties['hoverAct'];
    if (!this.firstUpdate && this.isMapViewChanged(options)) return;
    this.firstUpdate = false;
    try {
      this.mapInstance.setMapType(Microsoft.Maps.MapTypeId[options.properties['mapType'] as string]);
    } catch {}
    Microsoft.Maps.loadModule(
      [
        'Microsoft.Maps.SpatialMath',
        'Microsoft.Maps.HeatMap',
        'Microsoft.Maps.SpatialDataService'
      ],
      () => {
        this.pinMap.mapClear();
        this.heatMap.mapClear();
        this.blockMap.mapClear();
        let pinMapRender = false;
        let blockMapRender = false;
        options.dataViews.forEach(e => {
          if (e !== undefined) {
            if (e.plain !== null && e.plain.profile['pushPinValue'] !== undefined) {
              this.pinMap.update(options, e.plain);
              pinMapRender = true;
            }
            if (e.plain !== null && e.plain.profile['heatMapValue'] !== undefined) {
              this.heatMap.render(e.plain, options.properties);
            }
            if (e.matrix !== null && e.matrix.profile['blockMapValue'] !== undefined) {
              this.blockMap.update(options, e.matrix);
              blockMapRender = true;
            }
          }
        });
        if (!pinMapRender) {
          this.pinMap.renderDataList.length = 0;
        }
        if (!blockMapRender) {
          this.blockMap.clearBlockDataList();
        }
      }
    );
  }

  public onDestroy() {
    this.clearHandlers();
  }
}