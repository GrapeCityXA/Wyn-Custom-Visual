import Color from 'color';
import MapVisualHost from "./host";
import Palette from './palette';
import Legend from "./legend";

interface BlockData {
  name: string,
  value: string | number,
  selectionId: VisualNS.SelectionId,
  choose: boolean,
  color: Color,
  show: boolean,
  isRequest: boolean,
  polygons: Microsoft.Maps.Polygon[],
  bound: Microsoft.Maps.LocationRect
}

interface BlockDataObj {
  dataList: BlockData[],
  maxValue: number,
  minValue: number,
  legend: Legend
}

interface BlockDataSet {
  countryRegion: BlockDataObj,
  firstAdminDivision: BlockDataObj,
  secondAdminDivision: BlockDataObj
}

interface SearchResult {
  location: Microsoft.Maps.Location,
  result: Microsoft.Maps.SpatialDataService.IGeoDataResult[]
}

interface LocData {
  countryRegion: SearchResult,
  firstAdminDivision: SearchResult,
  secondAdminDivision: SearchResult
}

interface TaskStatus {
  count: number
}

export default class BlockMap {
  private layer = new Microsoft.Maps.Layer();
  private map: Microsoft.Maps.Map;
  private licenseKey: string;
  private host: MapVisualHost;
  private matrix: VisualNS.IMatrixDataView;

  private locDataSet = new Map<string, LocData>();

  constructor(map: Microsoft.Maps.Map, host: MapVisualHost, licenseKey: string) {
    map.layers.insert(this.layer);
    this.map = map;
    this.licenseKey = licenseKey;
    this.host = host;
    Microsoft.Maps.Events.addHandler(this.map, 'viewchangeend', () => { this.mapViewChangeEnd(); });
  }

  private taskStatus: TaskStatus = {
    count: 0
  };
  public update(options: VisualNS.IVisualUpdateOptions, matrix: VisualNS.IMatrixDataView) {
    this.matrix = matrix;
    this.updateProperties(options);
    const updateType = options.updateType;
    if (updateType === 'dataViewChange' || updateType === 'fullyChange') {
      if (this.curEntityTypeIdx !== undefined) {
        this.disableEntity(this.entityTypeList[this.curEntityTypeIdx]);
      }
      this.updateDisplay(matrix);
      this.updateData(matrix);
      this.updateCurEntityTypeIdx();
    }
    this.updateLegend();
    this.updateColor();
    if (this.valueMethod === 'fst') {
      document.getElementById('paletteLegendBox').appendChild(this.paletteLegend.getLegend());
    }
    if (updateType === 'dataViewChange' || updateType === 'fullyChange') {
      this.searchLocation();
    } else {
      this.showEntity(this.entityTypeList[this.curEntityTypeIdx]);
    }
  }

  private colorAssignment: any;
  private paletteId: string[];
  private updateProperties(options: VisualNS.IVisualUpdateOptions) {
    this.colorAssignment = options.properties['maintainColorAssignments'];
    this.paletteId = [];
    options.properties['paletteId'].forEach(e => {
      if (typeof e === 'object') {
        this.paletteId.push(e.colorStops[0]);
      } else {
        this.paletteId.push(e);
      }
    });
  }

  private firstLLDStr: string;
  private secondLLDStr: string;
  private thirdLLDStr: string;
  private vStr: string;
  private vFormat: string;
  private valueMethod: string;
  private tooltip: any;
  private updateDisplay(matrix: VisualNS.IMatrixDataView) {
    this.firstLLDStr = matrix.profile['firstLevelLocationDivision'].values.length > 0 ? matrix.profile['firstLevelLocationDivision'].values[0].display : undefined;
    this.secondLLDStr = matrix.profile['secondLevelLocationDivision'].values.length > 0 ? matrix.profile['secondLevelLocationDivision'].values[0].display : undefined;
    this.thirdLLDStr = matrix.profile['thirdLevelLocationDivision'].values.length > 0 ? matrix.profile['thirdLevelLocationDivision'].values[0].display : undefined;
    this.vStr = matrix.profile['blockMapValue'].values[0].display;
    this.vFormat = matrix.profile['blockMapValue'].values[0].format;
    this.valueMethod = matrix.profile['blockMapValue'].values[0].method;
    this.tooltip = matrix.profile['tooltip'];
  }

  private blockDataList: BlockDataSet = {
    countryRegion: undefined,
    firstAdminDivision: undefined,
    secondAdminDivision: undefined
  };
  private updateData(matrix: VisualNS.IMatrixDataView) {
    this.blockDataList = {
      countryRegion: undefined,
      firstAdminDivision: undefined,
      secondAdminDivision: undefined
    }
    if (this.firstLLDStr !== undefined) this.blockDataList.countryRegion = {
      dataList: [],
      maxValue: undefined,
      minValue: undefined,
      legend: undefined
    };
    if (this.secondLLDStr !== undefined) this.blockDataList.firstAdminDivision = {
      dataList: [],
      maxValue: undefined,
      minValue: undefined,
      legend: undefined
    };
    if (this.thirdLLDStr !== undefined) this.blockDataList.secondAdminDivision = {
      dataList: [],
      maxValue: undefined,
      minValue: undefined,
      legend: undefined
    };

    const firstLLDSet = new Set();
    const secondLLDSet = new Set();
    const thirdLLDSet = new Set();

    matrix.matrix.values.forEach(data => {
      if (this.valueMethod !== 'fst' && data[this.vStr] == null) return;
      const newBlockData: () => BlockData = () => ({
        name: undefined,
        value: data[this.vStr],
        selectionId: undefined,
        choose: false,
        color: undefined,
        show: false,
        polygons: undefined,
        bound: undefined,
        isRequest: false
      });
      let firstLLDName = undefined;
      let secondLLDName = undefined;
      let thirdLLDName = undefined;
      if (this.firstLLDStr !== undefined) firstLLDName = data[this.firstLLDStr];
      if (this.secondLLDStr !== undefined) secondLLDName = data[this.secondLLDStr];
      if (this.thirdLLDStr !== undefined) thirdLLDName = data[this.thirdLLDStr];

      // Value Type --> Attribute
      if (this.valueMethod === 'fst') {
        if (thirdLLDName != undefined && !thirdLLDSet.has(thirdLLDName)) {
          const blockData = newBlockData();
          blockData.name = thirdLLDName;
          blockData.selectionId = this.host.createSelectionId().withDimension(matrix.profile['thirdLevelLocationDivision'].values[0], data);
          this.blockDataList.secondAdminDivision.dataList.push(blockData);
          thirdLLDSet.add(thirdLLDName);
        }
        if (secondLLDName != undefined && !secondLLDSet.has(secondLLDName)) {
          const blockData = newBlockData();
          blockData.name = secondLLDName;
          blockData.selectionId = this.host.createSelectionId().withDimension(matrix.profile['secondLevelLocationDivision'].values[0], data);
          this.blockDataList.firstAdminDivision.dataList.push(blockData);
          secondLLDSet.add(secondLLDName);
        }
        if (firstLLDName != undefined && !firstLLDSet.has(firstLLDName)) {
          const blockData = newBlockData();
          blockData.name = firstLLDName;
          blockData.selectionId = this.host.createSelectionId().withDimension(matrix.profile['firstLevelLocationDivision'].values[0], data);
          this.blockDataList.countryRegion.dataList.push(blockData);
          firstLLDSet.add(firstLLDName);
        }
        return;
      }

      // Value Type --> Value
      const blockData = newBlockData();
      if (thirdLLDName != undefined) {
        blockData.name = thirdLLDName;
        blockData.selectionId = this.host.createSelectionId().withDimension(matrix.profile['thirdLevelLocationDivision'].values[0], data);
        const obj = this.blockDataList.secondAdminDivision;
        if (this.valueMethod !== 'fst') {
          if (obj.minValue === undefined || blockData.value < obj.minValue) obj.minValue = blockData.value as number;
          if (obj.maxValue === undefined || blockData.value > obj.maxValue) obj.maxValue = blockData.value as number;
        }
        obj.dataList.push(blockData);
      } else if (secondLLDName != undefined) {
        blockData.name = secondLLDName;
        blockData.selectionId = this.host.createSelectionId().withDimension(matrix.profile['secondLevelLocationDivision'].values[0], data);
        const obj = this.blockDataList.firstAdminDivision;
        if (this.valueMethod !== 'fst') {
          if (obj.minValue === undefined || blockData.value < obj.minValue) obj.minValue = blockData.value as number;
          if (obj.maxValue === undefined || blockData.value > obj.maxValue) obj.maxValue = blockData.value as number;
        }
        obj.dataList.push(blockData);
      } else if (firstLLDName != undefined) {
        blockData.name = firstLLDName;
        blockData.selectionId = this.host.createSelectionId().withDimension(matrix.profile['firstLevelLocationDivision'].values[0], data);
        const obj = this.blockDataList.countryRegion;
        if (this.valueMethod !== 'fst') {
          if (obj.minValue === undefined || blockData.value < obj.minValue) obj.minValue = blockData.value as number;
          if (obj.maxValue === undefined || blockData.value > obj.maxValue) obj.maxValue = blockData.value as number;
        }
        obj.dataList.push(blockData);
      }
    });
  }
  private getTooltipShowFields(entityType: string, data: BlockData) {
    const { firstLevelLocationDivision, secondLevelLocationDivision, thirdLevelLocationDivision, blockMapValue, tooltip } = this.matrix.profile;
    const allTooltipConfig = [...firstLevelLocationDivision.values, ...secondLevelLocationDivision.values, ...thirdLevelLocationDivision.values, ...blockMapValue.values, ...tooltip.values];
    const dataValues = this.matrix.matrix.values;
    let typeKey = '';
    switch(entityType) {
      case 'countryRegion':
        typeKey = 'firstLevelLocationDivision';
        break;
      case 'firstAdminDivision':
        typeKey = 'secondLevelLocationDivision';
        break;
      case 'secondAdminDivision':
        typeKey = 'thirdLevelLocationDivision';
        break;
      default:
        break;
    }
    const titleKey = this.matrix.profile[typeKey] && this.matrix.profile[typeKey].values[0].display;
    const dataValue = dataValues.filter(item => item[titleKey] === data.name);
    const fields = []

    if(dataValue && dataValue.length) {
      const data = dataValue[0];
      for (let i = 0; i < allTooltipConfig.length; i++) {
        const value = data[allTooltipConfig[i].display];
        fields.push({
          label: allTooltipConfig[i].display,
          value: typeof value === 'number'? this.host.formatService.format(allTooltipConfig[i].format, value) : value.toString()
        })
      }
    }

    return fields;
  }

  private curEntityTypeIdx: number;
  private entityTypeList = [
    'countryRegion',
    'firstAdminDivision',
    'secondAdminDivision'
  ]
  private updateCurEntityTypeIdx() {
    if (this.curEntityTypeIdx !== undefined && this.blockDataList[this.entityTypeList[this.curEntityTypeIdx]] !== undefined) return;
    if (this.blockDataList.countryRegion !== undefined) {
      this.curEntityTypeIdx = 0;
    } else if (this.blockDataList.firstAdminDivision !== undefined) {
      this.curEntityTypeIdx = 1;
    } else if (this.blockDataList.secondAdminDivision !== undefined) {
      this.curEntityTypeIdx = 2;
    }
  }

  private paletteLegend: Palette;
  private legendForCurEntityType: Legend;
  private updateLegend() {
    if (this.paletteLegend) this.paletteLegend.destructLegend();
    if (this.legendForCurEntityType !== undefined) this.legendForCurEntityType.destructLegend();
    this.paletteLegend = undefined;
    this.legendForCurEntityType = undefined;

    if (this.valueMethod === 'fst') {
      this.paletteLegend = new Palette('Block Map Legend', this.paletteId);
    } else {
      if (this.blockDataList.countryRegion !== undefined) {
        this.blockDataList.countryRegion.legend = new Legend(this.blockDataList.countryRegion.minValue, this.blockDataList.countryRegion.maxValue);
      }
      if (this.blockDataList.firstAdminDivision !== undefined) {
        this.blockDataList.firstAdminDivision.legend = new Legend(this.blockDataList.firstAdminDivision.minValue, this.blockDataList.firstAdminDivision.maxValue);
      }
      if (this.blockDataList.secondAdminDivision !== undefined) {
        this.blockDataList.secondAdminDivision.legend = new Legend(this.blockDataList.secondAdminDivision.minValue, this.blockDataList.secondAdminDivision.maxValue);
      }
      const curEntityType = this.entityTypeList[this.curEntityTypeIdx];
      this.legendForCurEntityType = this.blockDataList[curEntityType].legend;
      document.getElementById('wynBingMap').appendChild(this.legendForCurEntityType.getLegendElement());
    }
  }

  private changeColor(data: BlockData) {
    if (data.polygons !== undefined && data.color !== undefined) {
      const a = data.choose? 1 : 0.7;
      data.polygons.forEach(e => {
        e.setOptions({
          fillColor: data.color.alpha(a).toString()
        });
      });
    }
  }
  private updateColor() {
    this.entityTypeList.forEach(entityType => {
      const blockDataListInEntity = this.blockDataList[entityType];
      if (blockDataListInEntity !== undefined) {
        blockDataListInEntity.dataList.forEach((data: BlockData) => {
          if (this.valueMethod === 'fst') {
            if (this.colorAssignment) {
              const categoryColor = this.colorAssignment[data.value.toString()];
              if (categoryColor) {
                data.color = new Color(this.paletteLegend.getColorByColorAssignment(data.value.toString(), categoryColor, data.choose));
              }
            } else {
              data.color = new Color(this.paletteLegend.getColor(data.value.toString(), data.choose));
            }
          } else {
            const legend = blockDataListInEntity.legend;
            if (legend !== undefined) {
              data.color = new Color(legend.getRgb(data.value as number, data.choose).toRgba());
            }
          }
          this.changeColor(data);
        });
      }
    });
  }

  private searchLocation() {
    const nameList = [];
    const func = (data: BlockData) => {
      if (!this.locDataSet.has(data.name)) {
        nameList.push(data.name);
        this.locDataSet.set(data.name, {
          countryRegion: {location: undefined, result: undefined},
          firstAdminDivision: {location: undefined, result: undefined},
          secondAdminDivision: {location: undefined, result: undefined}
        });
      }
    };
    if (this.blockDataList.countryRegion !== undefined) {
      this.blockDataList.countryRegion.dataList.forEach(func);
    }
    if (this.blockDataList.firstAdminDivision !== undefined) {
      this.blockDataList.firstAdminDivision.dataList.forEach(func);
    }
    if (this.blockDataList.secondAdminDivision !== undefined) {
      this.blockDataList.secondAdminDivision.dataList.forEach(func);
    }
    for (let i = 0; i < nameList.length;) {
      this.taskStatus.count++;
      this.createSearchTask(nameList.slice(i, i+50));
      i += 50;
    }
    if (this.taskStatus.count <= 0) {
      this.showEntity(this.entityTypeList[this.curEntityTypeIdx]);
    }
  }
  private createSearchTask(list: string[]) {
    const request = new XMLHttpRequest();
    let url = 'https://spatial.virtualearth.net/REST/v1/Dataflows/Geocode?input=xml';
    url += '&key=' + this.licenseKey;
    request.open('POST', url);

    const xml = document.implementation.createDocument('http://schemas.microsoft.com/search/local/2010/5/geocode','', null);
    const geocodeFeed = document.createElement('GeocodeFeed');
    geocodeFeed.setAttribute('Version', '2.0');

    list.forEach((v, idx) => {
      this.addGeocodeEntity(geocodeFeed, idx, v);
    });

    xml.appendChild(geocodeFeed);
    request.send(xml);

    request.onload = () => {
      const jsonObj = eval('(' + request.responseText + ')');
      if (jsonObj.statusCode === 201) {
        const taskId = jsonObj.resourceSets[0].resources[0].id;
        setTimeout(() => {
          this.checkTaskStatus(taskId, 15);
        }, 2000);
        return;
      }
      this.searchEnd();
    };
  }
  private addGeocodeEntity(geocodeFeed, id: number, locationName: string) {
    const geocodeEntity = document.createElement('GeocodeEntity');
    geocodeEntity.setAttribute('Id', id.toString());
    geocodeEntity.setAttribute('xmlns', 'http://schemas.microsoft.com/search/local/2010/5/geocode');
    const geocodeRequest = document.createElement('GeocodeRequest');
    geocodeRequest.setAttribute('Culture', 'en-US');
    geocodeRequest.setAttribute('Query', locationName);
    geocodeRequest.setAttribute('IncludeNeighborhood', '1');
    geocodeRequest.setAttribute('IncludeQueryParse', '1');
    // geocodeRequest.setAttribute('IncludeEntityTypes', entityTypes);
    geocodeRequest.setAttribute('MaxResults', '3');
    geocodeEntity.appendChild(geocodeRequest);
    geocodeFeed.appendChild(geocodeEntity);
  }
  private checkTaskStatus(taskId: string, retryCount: number) {
    const request = new XMLHttpRequest();
    let url = 'https://spatial.virtualearth.net/REST/v1/Dataflows/Geocode/';
    url += taskId;
    url += '?key=' + this.licenseKey;
    request.open('GET', url);

    request.send();

    request.onload = () => {
      const jsonObj = eval('(' + request.responseText + ')');
      if (jsonObj.statusCode === 200) {
        const status = jsonObj.resourceSets[0].resources[0].status;
        if (status === 'Pending' && retryCount > 0) {
          setTimeout(() => {
            this.checkTaskStatus(taskId, retryCount-1);
          }, 1000);
          return;
        } else if (status === 'Completed') {
          const links = jsonObj.resourceSets[0].resources[0].links;
          links.forEach(e => {
            if (e.role === 'output' && e.name === 'succeeded') {
              this.getResult(e.url);
            }
          });
          return;
        }
      }
      this.searchEnd();
    };
  }
  private getResult(url: string) {
    const request = new XMLHttpRequest();
    url += '?key=' + this.licenseKey;
    request.open('GET', url);
    request.send();
    request.onload = () => {
      const domParser = new DOMParser();
      const xmlDoc = domParser.parseFromString(request.responseText, 'text/xml');
      const geocodeFeed = xmlDoc.children[0];
      const geocodeFeedLen = geocodeFeed.children.length;
      for (let i = 0; i < geocodeFeedLen; i++) {
        const geocodeEntity = geocodeFeed.children.item(i);
        const requests = geocodeEntity.getElementsByTagName('GeocodeRequest');
        if (requests.length > 0) {
          const request = requests.item(0);
          const locName = request.getAttribute('Query');
          const responses = geocodeEntity.getElementsByTagName('GeocodeResponse');
          const responsesLen = responses.length;
          for (let j = 0; j < responsesLen; j++) {
            const response = responses.item(j);
            if (response.getElementsByTagName('GeocodePoint').length > 0) {
              const point = response.getElementsByTagName('GeocodePoint').item(0);
              const latLong = point.getAttribute('Latitude') + ',' + point.getAttribute('Longitude');
              const location = Microsoft.Maps.Location.parseLatLong(latLong);
              if (this.locDataSet.has(locName)) {
                switch (response.getAttribute('EntityType')) {
                  case 'CountryRegion':
                    if (this.locDataSet.get(locName).countryRegion.location === undefined) {
                      this.locDataSet.get(locName).countryRegion.location = location;
                    }
                    break;
                  case 'AdminDivision1':
                    if (this.locDataSet.get(locName).firstAdminDivision.location === undefined) {
                      this.locDataSet.get(locName).firstAdminDivision.location = location;
                    }
                    break;
                  case 'AdminDivision2':
                    if (this.locDataSet.get(locName).secondAdminDivision.location === undefined) {
                      this.locDataSet.get(locName).firstAdminDivision.location = location;
                    }
                    break;
                }
              }
            }

          }
        }
      }

      this.searchEnd();
    };
  }
  private searchEnd() {
    this.taskStatus.count--;
    if (this.taskStatus.count <= 0) {
      this.showEntity(this.entityTypeList[this.curEntityTypeIdx]);
    }
  }

  private addPolygonHandler(data: BlockData, entityType: string) {
    data.polygons.forEach(e => {
      Microsoft.Maps.Events.addHandler(e, 'click', event => {
        const ev = event as Microsoft.Maps.IMouseEventArgs;
        const toolTipShowFields = this.getTooltipShowFields(entityType, data);
        this.host.showToolTipByClick(ev.pageX, ev.pageY, toolTipShowFields, this.tooltip.options.tooltipContentSetting);
        this.host.select(data.selectionId);
        data.choose = true;
        this.changeColor(data);
      });

      Microsoft.Maps.Events.addHandler(e, 'mouseover', event => {
        const ev = event as Microsoft.Maps.IMouseEventArgs;
        const toolTipShowFields = this.getTooltipShowFields(entityType, data);
        this.host.showToolTipByHover(ev.pageX, ev.pageY, toolTipShowFields, this.tooltip.options.tooltipContentSetting);
      });

      Microsoft.Maps.Events.addHandler(e, 'mouseout', () => {
        this.host.hideToolTipByHover();
      });
    });
  }
  private processResult(results: Microsoft.Maps.SpatialDataService.IGeoDataResult[], data: BlockData, entityType: string) {
    if (results.length <= 0) return;
    data.polygons = results[0].Polygons;
    data.bound = Microsoft.Maps.SpatialMath.Geometry.bounds(data.polygons);
    this.changeColor(data);
    this.addPolygonHandler(data, entityType);
  }
  private disableEntity(entityType: string) {
    if (this.legendForCurEntityType !== undefined) {
      this.legendForCurEntityType.destructLegend();
      this.legendForCurEntityType = undefined;
    }

    if (this.blockDataList[entityType] === undefined) return;
    this.blockDataList[entityType].dataList.forEach((data: BlockData) => {
      data.show = false
    });
    this.layer.clear();
  }
  private showEntity(entityType: string) {
    if (this.valueMethod !== 'fst') {
      this.legendForCurEntityType = this.blockDataList[entityType].legend;
      document.getElementById('wynBingMap').appendChild(this.legendForCurEntityType.getLegendElement());
    }

    this.blockDataList[entityType].dataList.forEach((data: BlockData) => {
      data.show = true;
      if (data.polygons !== undefined) {
        this.layer.add(data.polygons);
      } else {
        if (this.locDataSet.has(data.name)) {
          const searchResult = this.locDataSet.get(data.name)[entityType] as SearchResult;
          if (searchResult.result !== undefined && searchResult.result.length > 0) {
            this.processResult(searchResult.result, data, entityType);
            this.layer.add(data.polygons);
          } else if (searchResult.location != undefined) {
            this.getBoundary(searchResult.location, entityType, data);
          } else {
            this.getBoundary(data.name, entityType, data);
          }
        }
      }
    });
  }

  private entityMap = {
    countryRegion: 'CountryRegion',
    firstAdminDivision: 'AdminDivision1',
    secondAdminDivision: 'AdminDivision2'
  }
  private getBoundary(locName: string | Microsoft.Maps.Location, entityType: string, data: BlockData) {
    if (data.isRequest) return;
    data.isRequest = true;
    const tryRequest = (n: number) => {
      Microsoft.Maps.SpatialDataService.GeoDataAPIManager.getBoundary(locName,
        {entityType: this.entityMap[entityType], getAllPolygons: true},
        this.map,
        response => {
          if (response.results) {
            if (this.locDataSet.has(data.name)) {
              this.locDataSet.get(data.name)[entityType].result = response.results;
            }
            this.processResult(response.results, data, entityType);
            data.isRequest = false;
            if (data.show && data.polygons !== undefined) {
              this.layer.add(data.polygons);
            }
          }
        },
        {},
        () => {
          if (n > 0 && data.show) {
            setTimeout(() => {tryRequest(n - 1);}, 10000);
          } else {
            data.isRequest = false;
          }
        }
      );
    };

    tryRequest(3);
  }

  private mapViewChangeEnd() {
    if (this.curEntityTypeIdx === undefined) return;
    if (!this.vStr) return;
    let showLocNum = 0;
    let maxPercent = 0;
    const bounds = this.map.getBounds();
    const curEntityType = this.entityTypeList[this.curEntityTypeIdx];
    if (this.blockDataList[curEntityType] === undefined) return;
    const curDataList = this.blockDataList[curEntityType].dataList;
    curDataList.forEach(e => {
      if (!e.bound) return;
      const intersection = this.getIntersection(e.bound, bounds);
      if (intersection !== null) {
        showLocNum++;
        const curPercent = intersection.width / bounds.width * intersection.height / intersection.height;
        if (curPercent > maxPercent) {
          maxPercent = curPercent;
        }
      }
    });

    this.zoomUpdate(showLocNum, maxPercent);
  }
  private zoomUpdate(num: number, percent: number) {
    const saveLv = this.curEntityTypeIdx;
    if ((num < 5 && percent >= 0.85) || percent >= 0.95) {
      while (this.curEntityTypeIdx < 2) {
        this.curEntityTypeIdx++;
        const curEntityType = this.entityTypeList[this.curEntityTypeIdx];
        if (this.blockDataList[curEntityType] !== undefined) {
          this.disableEntity(this.entityTypeList[saveLv]);
          this.showEntity(this.entityTypeList[this.curEntityTypeIdx]);
          return;
        }
      }
      this.curEntityTypeIdx = saveLv;
    } else if ((num > 15 && percent < 0.6) || percent < 0.15) {
      while (this.curEntityTypeIdx > 0) {
        this.curEntityTypeIdx--;
        const curEntityType = this.entityTypeList[this.curEntityTypeIdx];
        if (this.blockDataList[curEntityType] !== undefined) {
          this.disableEntity(this.entityTypeList[saveLv]);
          this.showEntity(this.entityTypeList[this.curEntityTypeIdx]);
          return;
        }
      }
      this.curEntityTypeIdx = saveLv;
    }
  }
  private getIntersection(view: Microsoft.Maps.LocationRect, loc: Microsoft.Maps.LocationRect) {
    let west = view.getWest();
    let east = view.getEast();
    let north = view.getNorth();
    let south = view.getSouth();
    if (view.getWest() < view.getEast()) {
      // no intersection
      if (loc.getWest() > view.getEast()) {
        if (loc.getEast() > loc.getWest() || loc.getEast() < view.getWest()) return null;
      } else if (loc.getWest() < view.getWest()) {
        if (loc.getEast() < view.getWest() && loc.getEast() > loc.getWest()) return null;
      }

      if (loc.getWest() >= view.getWest() && loc.getWest() < view.getEast()) {
        west = loc.getWest();
      }
      if (loc.getEast() > view.getWest() && loc.getEast() <= view.getEast()) {
        east = loc.getEast();
      }
    } else {
      // no intersection
      if (loc.getWest() >= view.getEast() && loc.getEast() >= loc.getWest() && loc.getEast() <= view.getWest()) {
        return null;
      }

      if (loc.getWest() >= view.getWest() || loc.getWest() < view.getEast()) {
        west = loc.getWest();
      }
      if (loc.getEast() > view.getWest() || loc.getEast() <= view.getEast()) {
        east = loc.getEast();
      }
    }

    if (loc.getNorth() >= view.getSouth() && loc.getNorth() < view.getNorth()) {
      north = loc.getNorth();
    }
    if (loc.getSouth() > view.getSouth() && loc.getSouth() <= view.getNorth()) {
      south = loc.getSouth();
    }

    return Microsoft.Maps.LocationRect.fromCorners(
      new Microsoft.Maps.Location(north, west),
      new Microsoft.Maps.Location(south, east)
    );
  }

  public mapClear() {
    if (this.curEntityTypeIdx !== undefined) {
      this.disableEntity(this.entityTypeList[this.curEntityTypeIdx]);
    }
    this.layer.clear();
    if (this.paletteLegend !== undefined) this.paletteLegend.destructLegend();
    if (this.legendForCurEntityType !== undefined) this.legendForCurEntityType.destructLegend();
  }

  public clearSelection() {
    this.entityTypeList.forEach(entityType => {
      const blockDataListInEntity = this.blockDataList[entityType];
      if (blockDataListInEntity !== undefined) {
        blockDataListInEntity.dataList.forEach((data: BlockData) => {
          data.choose = false;
          this.changeColor(data);
        });
      }
    });
  }

  public clearBlockDataList() {
    this.blockDataList = {
      countryRegion: undefined,
      firstAdminDivision: undefined,
      secondAdminDivision: undefined
    }
  }
}