import '../style/visual.less';
import MapViewer from './mapViewer';
let html2canvas;

(window as any).wynVisualGetMap = () => {
  (document as any).isWynVisualMapOnReady = true;
  if ((document as any).wynMapVisualInstance) {
    const visualInstance = (document as any).wynMapVisualInstance;
    visualInstance.loadMap();
    if (visualInstance.update) {
      visualInstance.update(visualInstance.options);
    }
  }
}

export default class Visual extends WynVisual {
  private mapViewer: MapViewer;
  public options: VisualNS.IVisualUpdateOptions;
  public loadMap: () => void;
  private dom: HTMLDivElement;
  private host: any;

  public needUpdate: boolean;
  private timerId = null;

  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    super(dom, host, options);
    this.dom = dom;
    this.host = host;
    this.needUpdate = false;
    this.options = options;
    html2canvas = host.moduleManager.getModule('html2canvas');
    this.loadMap = () => {
      this.mapViewer = new MapViewer(dom, host, this.options);
      this.paletteLegendBoxInit(dom);
    };
    if ((document as any).isWynVisualMapOnReady) {
      this.loadMap();
    } else {
      (document as any).wynMapVisualInstance = this;
    }
  }

  private paletteLegendBoxInit(dom: HTMLDivElement) {
    const box = document.createElement('div');
    box.id = 'paletteLegendBox';
    box.className = 'wyn-visual-bing-map palette-legend-box';
    const container = document.createElement('div');
    container.className = 'wyn-visual-bing-map palette-legend-container';
    container.appendChild(box);
    dom.appendChild(container);
  }

  public update(options: VisualNS.IVisualUpdateOptions) {
    this.options = options;
    if (this.mapViewer !== undefined) {
      this.mapViewer.update(options);
    } else {
      this.needUpdate = true;
    }
  }

  public onDestroy() {
    (window as any).wynVisualGetMap = undefined;
    (document as any).wynMapVisualInstance = undefined;
    (document as any).isWynVisualMapOnReady = undefined;
    if (this.mapViewer !== undefined) {
      this.mapViewer.onDestroy();
    }
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public onResize() {

  }

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    const r = [];
    if (options.properties['maintainColorAssignments']) {
      r.push('paletteId');
    }
    if (options.properties['colorPreference'] === 'palette') {
      r.push('baseColor');
      r.push('gradientPreference');
      r.push('rangeCount');
    } else {
      if (options.properties['gradientPreference'] === 'gradual') {
        r.push('rangeCount');
      }
    }
    return r;
  }

  public getActionBarHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    return null;
  }

  public getColorAssignmentConfigMapping(dataViews: VisualNS.IDataView[]): VisualNS.IColorAssignmentConfigMapping {
    if (!dataViews.length) {
      return null;
    }
    const columns = [];
    const colorValues = [];
    if (dataViews[0]) {
      const pinDataView = dataViews[0].plain;
      const pinProfile = pinDataView.profile['pushPinCategory'].values[0];
      if (pinProfile) {
        colorValues.push(...pinDataView.data.map(d => d[pinProfile.display]));
        columns.push(pinProfile);
      }
    }

    if (dataViews[2]) {
      const blockDataView = dataViews[2].matrix;
      const blockProfile = blockDataView.profile['blockMapValue'].values[0];
      if (blockProfile && blockProfile.method === 'fst') {
        colorValues.push(...blockDataView.matrix.values.map(d => d[blockProfile.display]));
        columns.push(blockProfile);
      }
    }

    if (colorValues.length === 0) return null;

    return {
      maintainColorAssignments: {
        values: Array.from(new Set(colorValues)),
        type: 'dimension',
        columns: Array.from(new Set(columns)),
      },
    };
  }

  public export() {
    const def = this.host.promiseFactory.defer();
    if (this.timerId) clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      html2canvas(this.dom, {useCORS: true, backgroundColor: null}).then((canvas) => {
        def.resolve(canvas.toDataURL());
      });
    },1000)
    return def.promise;
  }
}