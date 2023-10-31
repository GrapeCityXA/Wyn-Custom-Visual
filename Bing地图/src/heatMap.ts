interface HeatMapData {
  x: number,
  y: number,
  v: number
}

interface DataObj {
  dataList: Array<HeatMapData>,
  min: number,
  max: number
}

export default class HeatMap {
  private layer: Microsoft.Maps.HeatMapLayer;
  private map: Microsoft.Maps.Map;

  constructor (map: Microsoft.Maps.Map) {
    this.map = map;
    Microsoft.Maps.loadModule('Microsoft.Maps.HeatMap', () => {
      this.layer = new Microsoft.Maps.HeatMapLayer([]);
      this.map.layers.insert(this.layer);
    });
  }

  public render(plain: VisualNS.IPlainDataView, properties: any) {
    this.updateDataObj(plain);
    this.stepAnalysis(properties);
    this.updateLayer(properties);
  }

  private dataObj: DataObj;
  private updateDataObj(plain: VisualNS.IPlainDataView) {
    const xStr = plain.profile['latitude'].values[0].display;
    const yStr = plain.profile['longitude'].values[0].display;
    const vStr = plain.profile['heatMapValue'].values[0].display;
    this.dataObj = {
      dataList: [],
      min: undefined,
      max: undefined
    };

    plain.data.forEach(e => {
      if ((typeof e[xStr]) !== 'number' || (typeof e[yStr]) !== 'number') return;
      if (e[xStr] == null || e[yStr] == null) return;
      const v = e[vStr] as number;
      if (v == null) return;
      const d = {
        x: e[xStr] as number,
        y: e[yStr] as number,
        v: v
      };
      this.dataObj.dataList.push(d);

      if (this.dataObj.min === undefined || v < this.dataObj.min) this.dataObj.min = v;
      if (this.dataObj.max === undefined || v > this.dataObj.max) this.dataObj.max = v;
    });
  }

  private locs: Array<Microsoft.Maps.Location>;
  private stepAnalysis(properties: any) {
    this.locs = [];
    if ((typeof this.dataObj.min) !== 'number' || (typeof this.dataObj.max) !== 'number') return;

    const dt = (this.dataObj.max - this.dataObj.min) / properties['step'];

    this.dataObj.dataList.forEach(e => {
      let v = e.v;
      while (v >= this.dataObj.min) {
        this.locs.push(new Microsoft.Maps.Location(e.x, e.y))
        v -= dt;
        if (dt === 0) break;
      }
    });
  }

  private updateLayer(properties: any) {
    this.map.layers.remove(this.layer);
    this.layer.dispose();

    this.layer = new Microsoft.Maps.HeatMapLayer(
      this.locs,
      {
        colorGradient: {
          '0.00': 'rgb(0,0,255)',
          '0.30': 'rgb(0,255,0)',
          '0.70': 'rgb(255,255,0)',
          '1.00': 'rgb(255,0,0)'
        },
        intensity: 1 / properties['step'],
        radius: properties['radius'],
        unit: properties['unit']
      }
    );

    this.map.layers.insert(this.layer);
  }

  public mapClear() {
    this.layer.clear();
  }
}