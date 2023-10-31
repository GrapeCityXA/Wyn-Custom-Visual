import { Properties, ColumnNames, Columns } from './interface';
import { mockItems, mockColumnNames } from './mockData';
import { fromValuesToDisplays, getEchartTextStyle, getImageUrl } from './utils';

import '../style/visual.less';

export default class Visual extends WynVisual {

  private chart: any;
  private properties: Properties;
  private items: any[] = [];
  private columnNames: ColumnNames;
  private columns: Columns = {};
  private nodeNames: string[] = [];
  private isMock: boolean;
  private selectionManager: VisualNS.SelectionManager;
  private timerId = null;

  constructor(private dom: HTMLDivElement, private host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    super(dom, host, options);
    this.selectionManager = this.host.selectionService.createSelectionManager();
    this.selectionManager.registerOnSelectCallback(() => {
      this.setNodes();
      this.setEdges();
    });
    this.chart = host.moduleManager.getModule('echarts').init(dom);
    this.properties = options.properties;
    this.dom.addEventListener('click', this.onContainerClick);
    this.chart.on('click', this.onClick);
  }

  private onContainerClick = (e: Event) => {
    this.selectionManager.clear();
    this.hideTooltip();
  }

  private onClick = (params) => {
    if (this.isMock || params.dataType !== 'node') return;
    const { event: { event }, data } = params;
    event.stopPropagation();
    const position = { x: event.clientX, y: event.clientY };
    if (event.type === 'touchend') {
      event.preventDefault();
      const touch = event.changedTouches[0];
      position.x = touch.clientX;
      position.y = touch.clientY;
    }

    const { interactionMode } = this.properties;
    let selectionIds: VisualNS.SelectionId | VisualNS.SelectionId[];
    if (interactionMode === 'edge') {
      const { sourceNameField, targetNameField } = this.columnNames;
      selectionIds = this.items.filter(item => item[sourceNameField] === data.name || item[targetNameField] === data.name).map(item => item.selectionId);
    } else { // interactionMode === 'node'
      selectionIds = data.selectionId;
    }
    this.updateSelections(selectionIds);

    if (this.selectionManager.isEmpty()) {
      this.hideTooltip();
      return;
    }
    const localizationManager = this.host.localizationManager;
    const fields = [{ label: localizationManager.getDisplay('tooltip.nodeName'), value: data.name }];
    if (data.category) fields.unshift({ label: localizationManager.getDisplay('tooltip.nodeSeries'), value: data.category });
    this.showTooltip({
      position,
      fields: fields.map(field => ({ label: field.label, value: field.value === '' ? localizationManager.getDisplay('emptyDisplay') : field.value })),
      selected: this.selectionManager.getSelectionIds(),
      menu: true,
    })
  }

  private showTooltip = (tooltipConfig: VisualNS.ITooltipConfig) => {
    const { position, title, fields, selectionId, selected, menu } = tooltipConfig;
    this.host.toolTipService.show({
      position,
      title,
      fields,
      selectionId,
      selected,
      menu,
    });
  }

  private hideTooltip = () => {
    this.host.toolTipService.hide();
  }

  private updateSelections = (selectionIds: VisualNS.SelectionId[] | VisualNS.SelectionId) => {
    if (!selectionIds) return;

    if (Array.isArray(selectionIds)) {
      let containerAll = true;
      for (let selectionId of selectionIds) {
        if (!this.selectionManager.contains(selectionId)) {
          containerAll = false;
          break;
        }
      }
      if (!containerAll) {
        this.selectionManager.select(selectionIds, true);
      } else {
        for (let s of selectionIds) {
          this.selectionManager.clear(s);
        }
      }
    } else {
      if (!this.selectionManager.contains(selectionIds)) {
        this.selectionManager.select(selectionIds, false);
      } else {
        this.selectionManager.clear(selectionIds);
      }
    }
  }

  private getColumnNames = (): ColumnNames => {
    const {
      sourceNameValue: { display: sourceNameField },
      sourceSeriesValue: { display: sourceSeriesField = '' } = {},
      sourceImageValue: { display: sourceImageField = '' } = {},
      targetNameValue: { display: targetNameField },
      targetSeriesValue: { display: targetSeriesField = '' } = {},
      targetImageValue: { display: targetImageField = '' } = {},
      weightValue: { display: weightField = '' } = {},
    } = this.columns;
    return {
      sourceNameField, sourceSeriesField, sourceImageField, targetNameField, targetSeriesField, targetImageField, weightField,
    }
  }

  private render() {
    this.host.eventService.renderStart();
    const isMock = !this.items.length;
    this.dom.style.opacity = '1';
    this.columnNames = isMock ? mockColumnNames : this.getColumnNames();
    this.isMock = isMock;

    const {
      palette, graphDraggable, graphZoomable,
      node: { showLabel, labelTextStyle, draggable },
      edge: { color, isDirected, curveness },
    } = this.properties;

    let roam: boolean | string = false;
    if (graphZoomable && graphDraggable) {
      roam = true;
    } else if (graphZoomable) {
      roam = 'scale';
    } else if (graphDraggable) {
      roam = 'move';
    }
    this.chart.on('finished', () => {
      this.host.eventService.renderFinish();
      this.chart.off('finished');
    });
    this.chart.setOption({
      color: palette,
      series: [{
        type: 'graph',
        legendHoverLink: true,
        layout: 'force',
        force: {
          initLayout: 'circular',
        },
        roam,
        draggable,
        lineStyle: {
          color,
          curveness: curveness / 100,
        },
        label: {
          show: showLabel,
          ...getEchartTextStyle(labelTextStyle),
        },
        edgeSymbol: ['none', isDirected ? 'arrow' : 'none'],
      }],
    });
    
    this.setNodes();
    this.setEdges();
  }

  private getNodeSelectionId = (sourceItem, targetItem): VisualNS.SelectionId => {
    const { sourceNameField, sourceSeriesField, sourceImageField, targetNameField, targetSeriesField, targetImageField } = this.columnNames;
    const { sourceNameValue, sourceSeriesValue, sourceImageValue, targetNameValue, targetSeriesValue, targetImageValue } = this.columns;

    let selectionId = this.host.selectionService.createSelectionId();

    if (sourceItem) {
      const item = {
        [sourceNameField]: sourceItem[sourceNameField],
      };
      if (sourceSeriesField) item[sourceSeriesField] = sourceItem[sourceSeriesField];
      if (sourceImageField) item[sourceImageField] = sourceItem[sourceImageField];
      if (sourceNameValue) selectionId = selectionId.withDimension(sourceNameValue, item);
      if (sourceSeriesValue) selectionId = selectionId.withDimension(sourceSeriesValue, item);
      if (sourceImageValue) selectionId = selectionId.withDimension(sourceImageValue, item);
    }
    
    if (targetItem) {
      const item = {
        [targetNameField]: targetItem[targetNameField],
      };
      if (targetSeriesField) item[targetSeriesField] = targetItem[targetSeriesField];
      if (targetImageField) item[targetImageField] = targetItem[targetImageField];
      if (targetNameValue) selectionId = selectionId.withDimension(targetNameValue, item);
      if (targetSeriesValue) selectionId = selectionId.withDimension(targetSeriesValue, item);
      if (targetImageValue) selectionId = selectionId.withDimension(targetImageValue, item);
    }

    return selectionId;
  }

  private getImageUrl = (sourceItem, targetItem): string => {
    const { sourceImageField, targetImageField } = this.columnNames;
    const { sourceImageOption: { renderSetting: sourceRenderSetting = [] } = {}, targetImageOption: { renderSetting: targetRenderSetting = [] } = {} } = this.columns;
    const sourceUrl = getImageUrl(sourceItem?.[sourceImageField], sourceRenderSetting[0]);
    const targetUrl = getImageUrl(targetItem?.[targetImageField], targetRenderSetting[0]);
    let url = sourceUrl ?? targetUrl;
    if (url) url = 'image://' + url;
    return url;
  }

  private getNodeCategory = (sourceItem, targetItem): any => {
    const { sourceSeriesField, targetSeriesField } = this.columnNames; 
    return sourceItem?.[sourceSeriesField] ?? targetItem?.[targetSeriesField];
  }

  private setNodes = () => {
    const items = this.isMock ? mockItems : this.items;
    const { sourceNameField, targetNameField } = this.columnNames;
    const sourceNames = items.map(item => item[sourceNameField]);
    const targetNames = items.map(item => item[targetNameField]);
    this.nodeNames = Array.from(new Set([ ...sourceNames, ...targetNames ])).filter(i => i != null);

    const { graphOpacity } = this.properties;
    const noSelected = this.selectionManager.isEmpty();
    const selectedOpacity = graphOpacity / 100;
    const unselectedOpacity = selectedOpacity * 0.3;
    const nodes: any[] = this.nodeNames.map(name => {
      const { sourceNameField, targetNameField } = this.columnNames;
      const sourceItem = items.find(i => i[sourceNameField] === name);
      const targetItem = items.find(i => i[targetNameField] === name);
      const url = this.getImageUrl(sourceItem, targetItem);
      const selectionId = this.getNodeSelectionId(sourceItem, targetItem);
      const size = this.getNodeSize(items, name);
      const category = this.getNodeCategory(sourceItem, targetItem);
      return {
        name,
        value: size,
        symbolSize: size,
        category,
        symbol: url ?? 'circle',
        selectionId,
        itemStyle: {
          opacity: noSelected || this.isSelectedNode(name, selectionId) ? selectedOpacity : unselectedOpacity,
        },
      };
    });
    
    this.setLegend(nodes);
    const maxSize = Math.max(...nodes.map(node => node.symbolSize as number));
    this.chart.setOption({
      series: [{
        categories: nodes.map(node => ({ name: node.category as any })),
        nodes,
        force: {
          repulsion: [5 * maxSize, 10 * maxSize],
          edgeLength: [2 * maxSize, 3 * maxSize],
        }
      }],
    });
  }

  private setEdges = () => {
    const items = this.isMock ? mockItems : this.items;
    const { sourceNameField, targetNameField, weightField } = this.columnNames;
    const { graphOpacity } = this.properties;
    const noSelected = this.selectionManager.isEmpty();
    const selectedOpacity = graphOpacity / 100;
    const unselectedOpacity = selectedOpacity * 0.3;

    const edges: any[] = items.map((item, i) => ({
      source: item[sourceNameField],
      target: item[targetNameField],
      value: item[weightField] ?? 1,
      lineStyle: {
        opacity: noSelected || this.isSelectedEdge(item) ? selectedOpacity : unselectedOpacity,
        width: this.getEdgeWidth(items, i),
      },
    }));
    this.chart.setOption({
      series: [{
        edges,
      }],
    });
  }

  private setZoom = () => {
    const { autoZoom, zoom } = this.properties;
    let newZoom = zoom;
    if (autoZoom) {
      const height = this.chart.getHeight() * 0.7;
      const width = this.chart.getWidth() * 0.7;
      const obj = (this.chart as any).getModel().getSeriesByIndex(0).preservedPoints; // https://github.com/apache/incubator-echarts/issues/5614
      const xs = Object.values(obj).map(point => point[0]);
      const ys = Object.values(obj).map(point => point[1]);
      const maxX = Math.max(...xs);
      const minX = Math.min(...xs);
      const maxY = Math.max(...ys);
      const minY = Math.min(...ys);
      newZoom = Math.min(height / (maxY - minY), width / (maxX - minX));
    }
    this.chart.setOption({
      series: [{
        zoom: newZoom,
      }],
    });
  }

  private isSelectedNode = (name: string, selectionId: VisualNS.SelectionId) => {
    const { interactionMode } = this.properties;
    if (interactionMode === 'node') {
      if (this.selectionManager.contains(selectionId)) return true;
      return false;
    } 

    // interactionMode === 'edge'
    const { sourceNameField, targetNameField } = this.columnNames;
    const selectedItems = this.items.filter(item => {
      return this.selectionManager.getSelectionIds().includes(item.selectionId);
    });
    const sourceNames = selectedItems.map(item => item[sourceNameField]);
    const targetNames = selectedItems.map(item => item[targetNameField]);
    const selectedNames = Array.from(new Set([...sourceNames, ...targetNames]));
    return selectedNames.includes(name);
  }

  private isSelectedEdge = (item) => {
    return this.selectionManager.getSelectionIds().includes(item.selectionId);
  }

  private setLegend = (nodes: any[]) => {
    const { legend: { show, wrapLegend, textStyle, horizontalPosition, verticalPosition, orientation } } = this.properties;
    const hasSeries = nodes.some(node => node.category as any !== '');
    
    this.chart.setOption({
      legend: {
        show: hasSeries && show,
        type: wrapLegend ? 'scroll' : 'plain',
        left: horizontalPosition,
        top: verticalPosition,
        orient: orientation,
        textStyle: getEchartTextStyle(textStyle),
        data: nodes.map(node => ({ name: node.category as any})),
        animation: true,
      },
    })
  }

  private getEdgeWidth = (items: any[], index: number): number => {
    const { weightField } = this.columnNames;
    const { edge: { minWidth, maxWidth } } = this.properties;
    const edgeWeights = items.map(item => item[weightField] ?? 1);
    const edgeWidths = fromValuesToDisplays(edgeWeights, minWidth, maxWidth);
    return edgeWidths[index];
  }

  private getNodeWeights = (items: any[]) => {
    const { sourceNameField, targetNameField, weightField } = this.columnNames;
    return this.nodeNames.map(name => {
      let nodeWeight = 0;
      items.forEach(item => {
        if (item[sourceNameField] === name) nodeWeight += item[weightField] ?? 1;
        if (item[targetNameField] === name) nodeWeight += item[weightField] ?? 1;
      });
      return nodeWeight;
    });
  }

  private getNodeSize = (items: any[], name: string): number => {
    const { node: { sizeSource, minSize, maxSize, size } } = this.properties;
    if (sizeSource === 'byWeight') {
      const nodeWeights = this.getNodeWeights(items);
      const nodeSizes = fromValuesToDisplays(nodeWeights, minSize, maxSize);
      return nodeSizes[this.nodeNames.findIndex(n => n === name)];
    }
    // allEqual
    return size;
  }
  
  public update(options: VisualNS.IVisualUpdateOptions) {
    const { updateType } = options;
    switch (updateType) {
      case 'fullyChange':
        this.properties = options.properties;
      case 'dataViewChange': {
        this.items = [];
        this.columns = {};
        const { dataViews } = options;
        if (dataViews.length) {
          const dataView = options.dataViews[0];
          const getColumnValues = (columnName: string): VisualNS.IFieldProfile[] => dataView.plain.profile[columnName].values;
          const getColumnOptions = (columnName: string): any => dataView.plain.profile[columnName].options;
          const sourceNameValues = getColumnValues('sourceName');
          const targetNameValues = getColumnValues('targetName');
          const sourceSeriesValues = getColumnValues('sourceSeries');
          const sourceImageValues = getColumnValues('sourceImage');
          const targetSeriesValues = getColumnValues('targetSeries');
          const targetImageValues = getColumnValues('targetImage');
          const weightValues = getColumnValues('weight');
        
          this.columns.sourceNameValue = sourceNameValues[0];
          this.columns.targetNameValue = targetNameValues[0];
          if (sourceSeriesValues?.length) this.columns.sourceSeriesValue = sourceSeriesValues[0];
          if (sourceImageValues?.length) {
            this.columns.sourceImageValue = sourceImageValues[0];
            this.columns.sourceImageOption = getColumnOptions('sourceImage');
          };
          if (targetSeriesValues?.length) this.columns.targetSeriesValue = targetSeriesValues[0];
          if (targetImageValues?.length) {
            this.columns.targetImageValue = targetImageValues[0];
            this.columns.targetImageOption = getColumnOptions('targetImage');
          }
          if (weightValues?.length) this.columns.weightValue = weightValues[0];
          this.items = dataView.plain.data.map(item => {
            let selectionId = this.host.selectionService.createSelectionId()
              .withDimension(sourceNameValues[0], item)
              .withDimension(targetNameValues[0], item);
            if (sourceSeriesValues?.length) selectionId = selectionId.withDimension(sourceSeriesValues[0], item);
            if (sourceImageValues?.length) selectionId = selectionId.withDimension(sourceImageValues[0], item);
            if (targetSeriesValues?.length) selectionId = selectionId.withDimension(targetSeriesValues[0], item);
            if (targetImageValues?.length) selectionId = selectionId.withDimension(targetImageValues[0], item);
            
            return {
              ...item,
              selectionId,
            };
          });
        }
        this.chart.clear();
        this.render();
        if (this.timerId) clearTimeout(this.timerId);
        this.timerId = setTimeout(this.setZoom, 100);
        break;
      };
      case 'propertyChange':
        this.properties = options.properties;
        this.render();
        break;
      case 'environmentChange':
      case 'scaleChange':
      default:
        break;
    }
  }

  public onDestroy() {
    this.dom.removeEventListener('click', this.onContainerClick);
    this.chart.off('click', this.onClick);
    this.chart.dispose();
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public onResize() {
    this.chart.resize();
    this.setZoom();
  }

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    const { autoZoom, node: { showLabel, sizeSource }, legend: { show: showLegend } } = options.properties;
    const blackList = [];
    if (autoZoom) {
      blackList.push('zoom');
    }
    if (!showLabel) {
      blackList.push('node.labelTextStyle');
    }
    if (sizeSource === 'byWeight') {
      blackList.push('node.size');
    } else if (sizeSource === 'allEqual') {
      blackList.push('node.minSize', 'node.maxSize');
    }
    if (!showLegend) {
      blackList.push('legend.textStyle', 'legend.orientation', 'legend.horizontalPosition', 'legend.verticalPosition', 'legend.wrapLegend');
    }
    
    return blackList;
  }

  public getActionBarHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    return null;
  }

  public export() {
    return this.chart.getDataURL({ type: 'png'});
  }
}