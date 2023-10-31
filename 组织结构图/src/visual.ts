import '../style/visual.less';
import G6, { TreeGraph } from '@antv/g6';
import defaultData from './data'
import { G6GraphEvent } from '@antv/g6/lib/interface/behavior';
import { ModelConfig, NodeConfig } from '@antv/g6/lib/types';
import Hsl from './palette';

const NODE_HEIGHT = 60;
const convertOtherUnitToPx = (fontSize: string): number => {
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

export default class Visual extends WynVisual {

  private host: VisualNS.VisualHost;
  private dom: HTMLDivElement;
  private selectionManager: VisualNS.SelectionManager;
  private graph: TreeGraph;
  private styleConfig: any;
  private plainDataView: any;
  private renderData: any;
  private idDisplay: string;
  private pidDisplay: string;
  private titleDisplay: string;
  private imageDisplay: string;
  private colorDisplay: string;
  private palettes: string[];
  private colors: string[];
  private isRender: boolean;
  private isStartDomClick: boolean;
  private isDragCanvas: boolean;
  private externalUrlSum: number;
  private internalUrlSum: number;
  private selectionIds: Array<VisualNS.SelectionId>;
  private timerId = null;

  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    super(dom, host, options);
    this.dom = dom;
    this.host = host;
    this.idDisplay = 'id';
    this.pidDisplay = 'pid';
    this.selectionManager = host.selectionService.createSelectionManager();
    this.selectionManager.registerOnSelectCallback(this.resetGraph);
    const graphOptions = {
      container: dom,
      width: this.dom.clientWidth,
      height: this.dom.clientHeight,
      linkCenter: true,
      fitView: true,
      modes: {
        default: ['drag-canvas', 'zoom-canvas'],
      },
    }
    this.graph = new G6.TreeGraph(graphOptions);
    this.graph.on('node:click', this.nodeClickHandler);
    this.graph.on('node:mouseover', this.nodeMouseoverHandler);
    this.graph.on('node:mouseout', this.nodeMouseoutHandler);
    this.graph.on('canvas:dragend', this.dragendHandler);
    this.dom.addEventListener('click', this.domClickHandler);
    this.registerNode();
    this.registerEdge();
  }

  private COLLAPSE_ICON = (x: number, y: number, r: number) => ([
    ['M', x- r, y ],
    ['a', r, r, 0, 1, 0, r * 2, 0],
    ['a', r, r, 0, 1, 0, -r * 2, 0],
    ['M', x + 2 - r, y],
    ['L', x + r - 2, y],
  ])

  private EXPAND_ICON = (x: number, y: number, r: number) => ([
    ['M', x - r, y ],
    ['a', r, r, 0, 1, 0, r * 2, 0],
    ['a', r, r, 0, 1, 0, -r * 2, 0],
    ['M', x + 2 - r, y ],
    ['L', x + r - 2, y],
    ['M', x, y - r + 2],
    ['L', x, y + r- 2],
  ])

  private dragendHandler = () => {
    this.isDragCanvas = true;
  }

  private setNodeOpacity = () => {
    const { opacity } = this.styleConfig;
    const nodes = this.graph.findAll('node', (node) => true);
    nodes.forEach(node => {
      const isSelected = this.getIsSelected(node.get('id'));
      this.graph.updateItem(node, {
        type: 'icon-node',
        style: {
          opacity: isSelected ? opacity / 100 : opacity / 100 * 0.3
        }
      })
    });
  }

  private isUpdate = () => {
    this.isRender ? this.setNodeOpacity() : this.render();
  }

  private resetGraph = (ids: VisualNS.SelectionId[]) => {
    this.host.toolTipService.hide();
    this.isUpdate();
  }

  private domClickHandler = (e) => {
    e.stopPropagation();
    if (this.isStartDomClick && !this.isDragCanvas && !this.selectionManager.isEmpty()) {
      this.selectionManager.clear();
    }
    this.isStartDomClick = true;
    this.isDragCanvas = false;
  }

  private registerNode = () => {
    G6.registerNode('icon-node', {
      draw(cfg: any, group) {
        const getFullShapeStyle =  (styles, group) => group.addShape('rect', {
          attrs: {
            ...styles,
            x: 0,
            y: 0,
          }
        });
        const getButtonSize = (buttonSize: string) => {
          switch (buttonSize) {
            case "large":
              return 10;
            case "medium":
              return 6;
            case "small":
              return 4;
          }
        }
        const imageShape = () => {
          const { nodeAspectRatio, imageNodeWidth, imageAspectRatio } = cfg.styleConfig;
          const nodeWidth = NODE_HEIGHT * nodeAspectRatio;
          const imageWidth = nodeWidth * imageNodeWidth / 100;
          const imageHeight = imageWidth / imageAspectRatio;
          group.addShape('image', {
              attrs: {
                x: (nodeWidth / 2 - imageWidth) / 3,
                y: -(imageHeight / 3),
                width: imageWidth,
                height: imageHeight,
                img: cfg.image,
              },
              name: 'image-shape',
          });
        }
        const nameShape = () => {
          const { nameCfg = {} } = cfg;
          const { nodeAspectRatio, nameTextStyle: { fontSize }, nameAlignment } = cfg.styleConfig;
          const nodeWidth = NODE_HEIGHT * nodeAspectRatio;
          const x = nameAlignment === 'left' ? nodeWidth * 0.1 : nameAlignment === 'right' ? nodeWidth * 0.9 : nodeWidth / 2;
          group.addShape('text', {
            attrs: {
              ...nameCfg.style,
              text: cfg.name,
              x,
              y: NODE_HEIGHT * 0.1,
              textAlign: nameAlignment,
              textBaseline: 'top'
            },
          });
        }
        const titleShape = () => {
          const { titleCfg = {} } = cfg;
          const { nodeAspectRatio, buttonSize,titleAlignment,titleBaseline, nameTextStyle: { fontSize } } = cfg.styleConfig;
          const nodeWidth = NODE_HEIGHT * nodeAspectRatio;
          const size = getButtonSize(buttonSize);
          const x = titleAlignment === 'left' ? nodeWidth * 0.1 : titleAlignment === 'right' ? nodeWidth * 0.9 : nodeWidth / 2;
          group.addShape('text', {
            attrs: {
              ...(titleCfg as any).style,
              text: cfg.title,
              x,
              y: titleBaseline === 'bottom'?NODE_HEIGHT - size: titleBaseline === 'top'?convertOtherUnitToPx(fontSize) + NODE_HEIGHT * 0.1 : (NODE_HEIGHT+convertOtherUnitToPx(fontSize)+NODE_HEIGHT * 0.1)/2,
              textAlign: titleAlignment,
              textBaseline: titleBaseline
            },
          });
        }
        const childrenShape = () => {
          const { graphLayout, nodeAspectRatio, buttonSize } = cfg.styleConfig;
          const nodeWidth = NODE_HEIGHT * nodeAspectRatio;
          const size = getButtonSize(buttonSize);
          const getMarketX = (graphLayout: string, nodeWidth: number) => {
            if (graphLayout === 'LR') {
              return nodeWidth;
            } else if (graphLayout === 'RL') {
              return 0;
            } else {
              return nodeWidth / 2
            }
          }
          const getMarketY = (graphLayout: string, nodeHeight: number) => {
            if (graphLayout === 'TB') {
              return nodeHeight;
            } else if (graphLayout === 'BT') {
              return 0;
            } else {
              return nodeHeight / 2
            }
          }
          group.addShape('marker', {
            attrs: {
              x: getMarketX(graphLayout, nodeWidth),
              y: getMarketY(graphLayout, NODE_HEIGHT),
              r: size,
              fill: '#ffffff',
              stroke: 'gray',
              cursor: 'pointer',
              symbol: cfg.COLLAPSE_ICON,
            },
            name: 'hidden-item',
          });
        }

        const styles = this.getShapeStyle(cfg);
        const keyShape = getFullShapeStyle(styles, group);
       
        if (cfg.image) {
          imageShape();
        }
        if (cfg.name) {
          nameShape();
        }
        if (cfg.title) {
          titleShape();
        }
        if (cfg.children) {
          childrenShape();
        }
        return keyShape;
      },
      update(cfg, item) {
        item.getKeyShape().attr('opacity', cfg.style.opacity);
      }
    }, 'rect');
  }

  private registerEdge = () => {
    G6.registerEdge('flow-line', {
      draw(cfg: any, group) {
        const getEdgePath = (startPoint: any, endPoint: any) => {
          const { graphLayout, nodeAspectRatio } = cfg.styleConfig;
          const nodeWidth = NODE_HEIGHT * nodeAspectRatio;
          switch (graphLayout) {
            case 'TB':
              return [
                ['M', startPoint.x, startPoint.y + NODE_HEIGHT / 2],
                ['L', startPoint.x, (startPoint.y + endPoint.y) / 2],
                ['L', endPoint.x, (startPoint.y + endPoint.y) / 2],
                ['L', endPoint.x, endPoint.y - NODE_HEIGHT / 2],
              ];
            case 'BT':
              return [
                ['M', startPoint.x, startPoint.y - NODE_HEIGHT / 2],
                ['L', startPoint.x, (startPoint.y + endPoint.y) / 2],
                ['L', endPoint.x, (startPoint.y + endPoint.y) / 2],
                ['L', endPoint.x, endPoint.y + NODE_HEIGHT / 2],
              ];
            case 'LR':
              return [
                ['M', startPoint.x + nodeWidth / 2, startPoint.y],
                ['L', (startPoint.x + endPoint.x) / 2, startPoint.y],
                ['L', (startPoint.x + endPoint.x) / 2, endPoint.y],
                ['L', endPoint.x - nodeWidth / 2, endPoint.y],
              ];
            case 'RL':
              return [
                ['M', startPoint.x - nodeWidth / 2, startPoint.y],
                ['L', (startPoint.x + endPoint.x) / 2, startPoint.y],
                ['L', (startPoint.x + endPoint.x) / 2, endPoint.y],
                ['L', endPoint.x + nodeWidth / 2, endPoint.y],
              ];
          }
        }
        const { style } = cfg;
        const shape = group.addShape('path', {
          attrs: {
            stroke: style.stroke,
            path: getEdgePath(cfg.startPoint, cfg.endPoint),
          },
        });
        return shape;
      },
    });
  }

  private recursionHideChildren = (children: any) => {
    children.forEach((child: any) => {
      const childGraph = this.graph.findById(child.id);
      this.graph.hideItem(childGraph);
      if (childGraph._cfg.children) {
        this.recursionHideChildren(childGraph._cfg.model.children);
      }
    });
  }

  private recursionShowChildren = (children: any) => {
    children.forEach((child: any) => {
      const childGraph = this.graph.findById(child.id);
      this.graph.showItem(childGraph);
      if (childGraph._cfg.children && childGraph._cfg.model.isShow) {
        this.recursionShowChildren(childGraph._cfg.model.children);
      }
    });
  }

  private getFields = (e: G6GraphEvent) => {
    const fields = [];
    const model = e.item.getModel();
    fields.push({
      label: this.idDisplay,
      value: model.id,
    });
    fields.push({
      label: this.pidDisplay,
      value: e.item._cfg.parent ? e.item._cfg.parent._cfg.id : this.host.localizationManager.getDisplay('visual.null')
    });
    if (model.color) {
      fields.push({
        label: this.colorDisplay,
        value: model.color
      });
    }
    if (model.title) {
      fields.push({
        label: this.titleDisplay,
        value: model.title
      });
    }
    return fields;
  }

  private nodeMouseoverHandler = (e: G6GraphEvent) => {
    const { showTooltip } = this.styleConfig;
    if (JSON.stringify(this.renderData) === JSON.stringify(defaultData) || !showTooltip) {
      return;
    }
    const model = e.item.getModel();
    const fields = this.getFields(e);
    if (this.selectionManager.isEmpty()) {
      this.host.toolTipService.show({
        position: {
          x: e.clientX,
          y: e.clientY,
        },
        title: model.id,
        fields,
        menu: false
      });
    }
  }

  private nodeMouseoutHandler = (e: G6GraphEvent) => {
    if (e.toShape) {
      return;
    }
    if (this.selectionManager.isEmpty()) {
      this.host.toolTipService.hide();
    }
  }

  private showClickToolTip = (e: G6GraphEvent) => {
    const { showTooltip } = this.styleConfig;
    if (JSON.stringify(this.renderData) === JSON.stringify(defaultData) || !showTooltip) {
      return;
    }
    const fields = this.getFields(e);
    this.host.toolTipService.show({
      position: {
        x: e.clientX,
        y: e.clientY,
      },
      fields,
      selected: this.selectionManager.getSelectionIds(),
      menu: true
    });
  }

  private clickHiddenHandler = (shape: any, model: NodeConfig) => {
    this.recursionHideChildren(model.children);
    shape.attrs.symbol = this.EXPAND_ICON;
    model.isShow = false;
    shape.cfg.name = 'show-item';
  }

  private clickShowHandler = (shape: any, model: NodeConfig) => {
    this.recursionShowChildren(model.children);
    shape.attrs.symbol = this.COLLAPSE_ICON;
    model.isShow = true;
    shape.cfg.name = 'hidden-item';
  }

  private changeSelectionManager = (model: NodeConfig) => {
    const selectionId = (this.selectionIds.filter((selectionId: any) => selectionId.dimensions[this.idDisplay] === model.id))[0];
    if (this.selectionManager.contains(selectionId)) {
      this.selectionManager.clear(selectionId);
    } else {
      this.selectionManager.select(selectionId, true);
    }
  }

  private nodeClickHandler = (e: G6GraphEvent) => {
    e.stopPropagation();
    this.isStartDomClick = false;
    const { item, target, shape } = e;
    const targetType = target.get('type');
    const name = target.get('name');
    const model = item.getModel();
    if (targetType === 'marker') {
      if (name === 'hidden-item') {
        this.clickHiddenHandler(shape, model as NodeConfig);
      } else if (name === 'show-item') {
        this.clickShowHandler(shape, model as NodeConfig);
      }
    } else {
      this.changeSelectionManager(model as NodeConfig);
      this.showClickToolTip(e);
    }
    item.refresh();
  }

  private defaultNameCfg = () => {
    const { nameTextStyle: { color, fontFamily, fontSize, fontStyle, fontWeight } } = this.styleConfig;
    return {
      style: {
        fill: color,
        fontFamily,
        fontStyle,
        fontWeight,
        fontSize: convertOtherUnitToPx(fontSize),
      }
    }
  }

  private defaultTitleCfg = () => {
    const { titleTextStyle: { color, fontFamily, fontSize, fontStyle, fontWeight } } = this.styleConfig;
    return {
      style: {
        fill: color,
        fontFamily,
        fontStyle,
        fontWeight,
        fontSize: convertOtherUnitToPx(fontSize),
      }
    }
  }

  private getIsSelected = (id: string) => {
    if (this.selectionIds && !this.selectionManager.isEmpty()) {
      const selectionId = (this.selectionIds.filter((selectionId: any) => selectionId.dimensions[this.idDisplay] === id))[0];
      return this.selectionManager.contains(selectionId);
    }
    return true;
  }

  private getPalette = () => {
    const { nodeColor } = this.styleConfig;
    const hsl = [];
    this.palettes = [];
    for (let i = 0; i < this.colors.length; i++) {
      i < 6 ? hsl.push(new Hsl(this.colors[i], nodeColor[i])) : hsl.push(new Hsl(this.colors[i], hsl[i - 6]));
      this.palettes.push(hsl[i].ToRgba(1));
    }
  }

  private getFillColor = (color: string) => {
    const { nodeColor, maintainColorAssignment } = this.styleConfig;
    if (maintainColorAssignment) {
      return maintainColorAssignment[color];
    } else {
      return this.colors.length === 0 ? nodeColor[0] : this.palettes[this.colors.indexOf(color)];
    }
  }

  private defaultNodeStyle = (node: NodeConfig) => {
    const { opacity, edgeColor, radius } = this.styleConfig;
    const isSelected = this.getIsSelected(node.id);
    return {
      fill: this.getFillColor(node.color),
      opacity: isSelected ? opacity / 100 : opacity / 100 * 0.3,
      stroke: edgeColor,
      radius: radius,
    }
  }

  private defaultEdgeStyle = () => {
    const { edgeColor } = this.styleConfig;
    return {
      stroke: edgeColor,
    }
  }

  private defaultLayout = () => {
    const { graphLayout, verticalSpacing, horizontalSpacing, nodeAspectRatio } = this.styleConfig;
    return {
      type: 'compactBox',
      direction: graphLayout,
      getId: (d: any) => d.id,
      getHeight: () => 0,
      getWidth: () => 0,
      getVGap: () => NODE_HEIGHT * (verticalSpacing + 0.5), // add 0.5: When verticalSpacing is equal to 0, the nodeHeight's gap is also equal to 0.
      getHGap: () => NODE_HEIGHT * nodeAspectRatio * (horizontalSpacing + 0.5),
    }
  }

  private configNode = () => {
    this.graph.node((node) => ({
      type: 'icon-node',
      size: [NODE_HEIGHT * this.styleConfig.nodeAspectRatio, NODE_HEIGHT],
      style: this.defaultNodeStyle(node),
      nameCfg: this.defaultNameCfg(),
      titleCfg: this.defaultTitleCfg(),
      isShow: true,
      styleConfig: this.styleConfig,
      COLLAPSE_ICON: this.COLLAPSE_ICON,
      EXPAND_ICON: this.EXPAND_ICON,
    }));
  }

  private configEdge = () => {
    this.graph.edge(() => ({
      type: 'flow-line',
      style: this.defaultEdgeStyle(),
      styleConfig: this.styleConfig,
    }));
  }

  private updateLayout = () => {
    this.graph.updateLayout(this.defaultLayout());
  }

  private render() {
    this.host.eventService.renderStart();
    this.graph.clear();
    this.configNode();
    this.configEdge();
    this.graph.data(this.renderData);
    this.updateLayout();
    this.graph.on('afteranimate', () => {
      if (this.timerId) clearTimeout(this.timerId);
      this.timerId = setTimeout(() => {
      this.host.eventService.renderFinish();
      }, 1000)
    });
    this.graph.render();
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

  private mergeData = (targetData: any, children = null) => {
    const data = {};
    data['id'] = this.dealNullText(targetData[this.idDisplay]);
    data['name'] = this.dealNullText(targetData[this.idDisplay]);
    if (this.colorDisplay) {
      data['color'] = this.dealNullText(targetData[this.colorDisplay]);
    }
    if (this.titleDisplay) {
      data['title'] = this.dealNullText(targetData[this.titleDisplay]);
    }
    if (this.imageDisplay) {
      this.judgeUrl(targetData[this.imageDisplay], data);
    }
    if (children) {
      data['children'] = children;
    }
    return data;
  }

  private appendChildren = (sourceData: any, rootParents: any, pid: any) => {
    const children = sourceData.filter((data: any) => data[this.pidDisplay] === pid);
    if (children) {
      children.forEach((child: any) => {
        if (sourceData.some((data: any) => data[this.pidDisplay] === child[this.idDisplay])) {
          const rootChildren = [];
          rootParents.push(this.mergeData(child, rootChildren));
          this.appendChildren(sourceData, rootChildren, child[this.idDisplay]);
        } else {
          rootParents.push(this.mergeData(child));
        }
      })
    }
  };

  private isOutLink = (url: string) => {
    return url.includes('.');
  }

  private judgeUrl = (url: string, data: any) => {
    if (this.isOutLink(url)) {
      this.isRender = false;
      this.getImage(url, data);
    } else {
      this.internalUrlSum++;
      this.setUrl(url, data);
    }
  }

  private getPromise = (url: string) => new Promise((resolve: (image: HTMLImageElement) => void, reject: () => void) => {
    const image = new Image(this.styleConfig.imageWidth, this.styleConfig.imageHeight);
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject();
    }
    image.src = url;
  })

  private promiseRender = () => {
    this.externalUrlSum++;
    if (this.externalUrlSum === this.plainDataView.data.length - this.internalUrlSum) {
      this.render();
    }
  }

  private getImage = (url: string, data: any) => {
    this.getPromise(url).then(
      (image) => {
        data['image'] = image;
        this.promiseRender();
      },
      () => {
        data['image'] = '';
        this.promiseRender();
      });
  }

  private setUrl = (url: string, data: any) => {
    const renderSetting = this.plainDataView.profile.image.options.renderSetting;
    if (renderSetting && renderSetting[0] === 'imageBinary') {
      data['image'] = this.getBinaryImageURL(url);
    } else {
      data['image'] = url;
    }
  }

  private getBinaryImageURL = (imageData: string) => `data:image/*;base64,${imageData}`;

  private getRoot = (sourceData: any) => {
    const ids = [];
    sourceData.forEach((data: any) => ids.push(data[this.idDisplay]));
    const root = sourceData.find((data: any) => !ids.includes(data[this.pidDisplay]));
    return root;
  }

  private formatData = (sourceData: any) => {
    const root = this.getRoot(sourceData);
    const rootChildren = [];
    this.appendChildren(sourceData, rootChildren, root[this.idDisplay]);
    return sourceData.some((data: any) => data[this.pidDisplay] === root[this.idDisplay]) ? this.mergeData(root, rootChildren) : this.mergeData(root);
  }

  private setSelectionIds = () => {
    this.selectionIds = [];
    this.plainDataView.data.forEach((dataPoint: any) => {
      const selectionId = this.host.selectionService.createSelectionId();
      const profile = this.plainDataView.profile;
      selectionId.withDimension(profile.name.values[0], dataPoint)
        .withDimension(profile.parentName.values[0], dataPoint);
      if (profile.title.values.length !== 0) {
        selectionId.withDimension(profile.title.values[0], dataPoint);
      }
      if (profile.image.values.length !== 0) {
        selectionId.withDimension(profile.image.values[0], dataPoint);
      }
      if (profile.color.values.length !== 0) {
        selectionId.withDimension(profile.color.values[0], dataPoint);
      }
      this.selectionIds.push(selectionId);
    })
  }

  private clearOtherDisplay = () => {
    this.colorDisplay = null;
    this.titleDisplay = null;
    this.imageDisplay = null;
  }

  private setRenderConfig = (options: VisualNS.IVisualUpdateOptions) => {
    this.plainDataView = options.dataViews[0] && options.dataViews[0].plain;
    if (this.plainDataView) {
      const profile = this.plainDataView.profile;
      this.idDisplay = profile.name.values[0].display;
      this.pidDisplay = profile.parentName.values[0].display;
      this.clearOtherDisplay();
      if (profile.title.values.length !== 0) {
        this.titleDisplay = profile.title.values[0].display;
      }
      if (profile.image.values.length !== 0) {
        this.imageDisplay = profile.image.values[0].display;
        this.externalUrlSum = 0;
        this.internalUrlSum = 0;
      }
      if (profile.color.values.length !== 0) {
        this.colorDisplay = profile.color.values[0].display;
        this.colors.push(...this.plainDataView.sort[this.colorDisplay].order);
        this.getPalette();
      }
      this.setSelectionIds();
      this.renderData = this.formatData(this.plainDataView.data);
    } else if (!this.plainDataView) {
      this.renderData = defaultData;
    }
  }

  public update(options: VisualNS.IVisualUpdateOptions) {
    this.isRender = true;
    this.colors = [];
    this.styleConfig = options.properties;
    this.setRenderConfig(options);
    if (this.isRender) {
      this.render();
    }
  }

  public onDestroy() {
    this.graph.off('node:click', this.nodeClickHandler);
    this.graph.off('node:mouseover', this.nodeMouseoverHandler);
    this.graph.off('node:mouseout', this.nodeMouseoutHandler);
    this.graph.off('canvas:dragend', this.dragendHandler);
    this.graph.destroy();
    this.dom.removeEventListener('click', this.domClickHandler);
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public onResize() {
    this.graph.changeSize(this.dom.clientWidth, this.dom.clientHeight);
    this.graph.render();
  }

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    const hiddenInspectors = [];
    if (options.properties.maintainColorAssignment) {
      hiddenInspectors.push('nodeColor');
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
    const colorProfile = plain.profile.color.values[0];
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
    return this.graph.toDataURL('image/png');
  }
}