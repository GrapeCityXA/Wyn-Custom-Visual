
import { Chart, Geometry, Event, registerInteraction } from '@antv/g2';
import DataSet from '@antv/data-set';
import { mockItems, mockValueField, mockSeriesField } from './mockData';
import { TextStyle, G2TextStyle, Properties } from './interface';
import { Datum } from '@antv/g2/lib/interface';

import '../style/visual.less';

// fontSize others => px;
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

export default class Visual {
  private selectionManager: any;
  private chart: Chart;
  private items: any[] = [];
  private valueField: string;
  private seriesField: string;
  private frequencyField: string;
  private properties: any;
  private timerId = null;

  constructor(public dom: HTMLDivElement, public host: any, options: any) {
    this.selectionManager = host.selectionService.createSelectionManager();
    this.chart = new Chart({
      container: dom,
      autoFit: true,
    });
    this.properties = options.properties;
    this.frequencyField = host.localizationManager.getDisplay('frequency');
    registerInteraction('element-selected', {
      start: [{ trigger: 'plot:click', action: 'element-highlight:toggle' }]
    })
    this.render();
    this.chart.on('click', this.onClick);
    this.onClickRight()
  }

  private mouseupFunction = (params) => {
    params.preventDefault();
    params.stopPropagation();
    this.host.contextMenuService.show({
      position: {
        x: params.x,
        y: params.y,
      },
      menu: true
    }, 10)
    return;
  }
  private clickFunction = () => {
    this.host.contextMenuService.hide();
  }
  private onClickRight = () => {
    this.dom.addEventListener('click', this.clickFunction);
    this.dom.addEventListener('contextmenu', this.mouseupFunction);
  }

  private onClick = (e: Event) => {

    const items = this.items;
    if (!items.length || e.data == null) {
      if (this.selectionManager.isEmpty()) {
        return;
      }
      this.chart.clear();
      this.render();
      this.selectionManager.clear();
      this.host.toolTipService.hide();
      return;
    }

    const { data } = e.data;
    const valueField = this.valueField;
    const seriesField = this.seriesField;
    const selectedItems = items.filter(item => {
      const minValue = data[valueField][0];
      const maxValue = data[valueField][1];
      return item[valueField] >= minValue && item[valueField] < maxValue && item[seriesField] === data[seriesField];
    });
    const selectionIds = selectedItems.map(item => item.selectionId);
    const hasSomeIdNotContained = selectionIds.some(selectionId => !this.selectionManager.contains(selectionId));
    let leftMouseButton = this.properties.leftMouseButton;
    const sid = selectionIds;
    switch (leftMouseButton) {
      //鼠标联动设置    
      case "none": {
        this.doSelection(hasSomeIdNotContained, selectionIds);
        break
      }
      case "showToolTip": {
        this.host.toolTipService.show({
          position: {
            x: e.x,
            y: e.y,
          },
  
          fields: [{
            label: e.data[0],
            value: e.data[1],
          }],
          selected: this.selectionManager.getSelectionIds(),
          menu: true,
        }, 10);
        break;
      }
      case "Jump": {
        this.doSelection(hasSomeIdNotContained, selectionIds);
        this.host.commandService.execute([{
          name: leftMouseButton,
          payload: {
            selectionIds: sid,
            position: {
              x: e.x,
              y: e.y,
            },
          }
        }])
      }
      default: {
        this.host.commandService.execute([{
          name: leftMouseButton,
          payload: {
            selectionIds: sid,
            position: {
              x: e.x,
              y: e.y,
            },
          }
        }])
      }
    }
  }

  private doSelection(hasSomeIdNotContained, selectionIds) {
    if (hasSomeIdNotContained) {
      if (this.properties.onlySelect) {
        this.selectionManager.clear();
      }
      this.selectionManager.select(selectionIds, true);
    } else {
      selectionIds.forEach(selectionId => {
        this.selectionManager.clear(selectionId);
      });
    }
    if (this.selectionManager.isEmpty()) {
      this.host.toolTipService.hide();
      return;
    }
  }

  private render = () => {
    this.host.eventService.renderStart();
    const isMock = !this.items.length;
    this.dom.style.opacity = '1';

    const items = isMock ? mockItems : this.items;
    const valueField = isMock ? mockValueField : this.valueField;
    const seriesField = isMock ? mockSeriesField : this.seriesField;

    const dataSet = new DataSet();
    const dataView = dataSet.createView().source(items);

    const binWidth = this.getBinWidth(items, valueField);
    dataView.transform({
      type: 'bin.histogram',
      field: valueField,
      binWidth,
      groupBy: [seriesField],
      as: [valueField, this.frequencyField],
    });

    this.chart.data(dataView.rows);
    this.setGroupingAxis(valueField, binWidth);
    this.setFrequencyAxis(this.frequencyField);
    this.setLegend(seriesField);
    this.renderChart(valueField, this.frequencyField, seriesField);

    this.chart.interaction('element-selected');
    this.chart.render();
    this.chart.on('afterpaint', () => {
      if (this.timerId) clearTimeout(this.timerId);
      this.timerId = setTimeout(() => {
        this.host.eventService.renderFinish();
      }, 1000)
      this.chart.off('afterpaint');
    });
  }

  private renderChart = (valueField: string, frequencyField: string, seriesField: string) => {
    const { palette, graphOpacity } = this.properties;
    const geometry: Geometry = this.chart.interval()
      .position(`${valueField}*${frequencyField}`)
      .color(seriesField, palette)
      .adjust('stack')
      .style({
        fill: !seriesField ? palette[0] : null,
        fillOpacity: graphOpacity / 100,
      });
    this.setDataLabel(geometry, valueField, frequencyField, seriesField);
  }

  private getBinWidth = (items: any[], valueField: string) => {
    const { groupingInterval } = this.properties;
    const values = items.map(item => item[valueField]);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const defaultBinWidth = Math.round((maxValue - minValue) / 10);
    return groupingInterval ?? defaultBinWidth;
  }

  // Grouping Axis
  private setGroupingAxis = (valueField: string, binWidth: number) => {
    const { showGroupingAxis, groupingAxisLine, groupingAxisTickLabel, groupingAxisTickMark, groupingAxisTitle, groupingAxisLabelAutoRotate, groupingAxisFormat, groupingAxisTextStyle } = this.properties;
    this.chart.axis(valueField, false);
    if (showGroupingAxis) {
      this.chart.axis(valueField, {
        line: groupingAxisLine ? this.getG2AxisLineStyle() : null,
        label: groupingAxisTickLabel ? {
          style: this.getG2TextStyle(groupingAxisTextStyle),
          autoRotate: groupingAxisLabelAutoRotate,
          formatter: (text) => this.host.formatService.format(groupingAxisFormat, text),
        } : null,
        tickLine: groupingAxisTickMark ? this.getG2AxisLineStyle() : null,
        title: groupingAxisTitle ? {
          style: this.getG2TextStyle(groupingAxisTextStyle),
        } : null,
      });
      this.chart.scale(valueField, {
        tickInterval: binWidth,
      });
    }
  }

  // Frequency Axis
  private setFrequencyAxis = (frequencyField: string) => {
    const { showFrequencyAxis, frequencyAxisGridline, frequencyAxisGridlineColor, frequencyAxisInterval, frequencyAxisLabelAutoRotate, frequencyAxisLine, frequencyAxisMaxValue,
      frequencyAxisMinValue, frequencyAxisTextStyle, frequencyAxisTickLabel, frequencyAxisTickMark, frequencyAxisTitle } = this.properties;
    this.chart.axis(this.frequencyField, false);
    if (showFrequencyAxis) {
      this.chart.axis(this.frequencyField, {
        line: frequencyAxisLine ? this.getG2AxisLineStyle() : null,
        label: frequencyAxisTickLabel ? {
          style: this.getG2TextStyle(frequencyAxisTextStyle),
          autoRotate: frequencyAxisLabelAutoRotate,
        } : null,
        tickLine: frequencyAxisTickMark ? this.getG2AxisLineStyle() : null,
        title: frequencyAxisTitle ? {
          style: this.getG2TextStyle(frequencyAxisTextStyle),
        } : null,
        grid: frequencyAxisGridline ? {
          line: this.getG2AxisLineStyle(frequencyAxisGridlineColor),
        } : null,
      });
      this.chart.scale(this.frequencyField, {
        nice: true,
        min: frequencyAxisMinValue,
        max: frequencyAxisMaxValue,
        tickInterval: frequencyAxisInterval,
      });
    }
  }

  // Data Label
  private setDataLabel = (geometry: Geometry, valueField: string, frequencyField: string, seriesField: string) => {
    this.chart.getComponents()
    const { showDataLabel, dataLabelFrequency, dataLabelGrouping, dataLabelPosition, dataLabelSeries, dataLabelTextStyle } = this.properties;
    if (showDataLabel) {
      geometry.label(frequencyField, {
        position: dataLabelPosition,
        content: (data: Datum) => {
          const frequencyText = dataLabelFrequency ? data[frequencyField] : '';
          const groupingText = dataLabelGrouping ? `[${data[valueField]})` : '';
          const seriesText = dataLabelSeries ? data[seriesField] : '';
          return `${groupingText} ${seriesText} ${frequencyText}`.trim();
        },
        layout: {
          type: 'fixed-overlap',
        },
        style: this.getG2TextStyle(dataLabelTextStyle),
      });
    }
  }

  // Legend
  private setLegend = (seriesField: string) => {
    const { showLegend, legendPosition, legendTextStyle, legendTitle, legendWrap } = this.properties;
    this.chart.legend(false);
    if (showLegend) {
      this.chart.legend(seriesField, {
        title: legendTitle ? {
          style: this.getG2TextStyle(legendTextStyle),
        } : null,
        position: legendPosition,
        flipPage: !legendWrap,
        itemName: {
          style: this.getG2TextStyle(legendTextStyle),
        },
      });
    }
  }

  private getG2AxisLineStyle = (stroke?: string) => ({
    style: {
      stroke: stroke ?? '#898989',
      lineWidth: 1,
    }
  });

  // Dashboard TextStyle => G2 TextStyle
  private getG2TextStyle = (textStyle: TextStyle): G2TextStyle => {
    const { color, fontFamily, fontStyle } = textStyle;
    let { fontSize, fontWeight } = textStyle;
    if (fontWeight === 'Light') {
      fontWeight = 'Lighter' as any;
    }
    return {
      fill: color,
      fontFamily,
      fontStyle: fontStyle.toLowerCase() as any,
      fontWeight: fontWeight.toLowerCase() as any,
      fontSize: convertOtherUnitToPx(fontSize),
    }
  }

  public update(options: any) {
    const dataView = options.dataViews[0];
    this.items = [];
    this.seriesField = '';
    const valueValues = dataView?.plain.profile.values.values;
    const seriesValues = dataView?.plain.profile.series.values;
    if (valueValues?.length) {
      const plainData = dataView.plain;
      this.valueField = valueValues[0].display;
      if (seriesValues?.length) {
        this.seriesField = seriesValues[0].display;
      }
      const items = plainData.data.map((item, index) => {
        let selectionId = this.host.selectionService.createSelectionId().withDimension(valueValues[0], item);
        if (seriesValues?.length) {
          selectionId = selectionId.withDimension(seriesValues[0], item);
        }
        return {
          ...item,
          id: index,
          selectionId,
        };
      });
      this.items = items;
    }
    this.properties = options.properties;
    this.chart.clear();
    this.render();
  }
  public onDestroy() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.chart.off('click', this.onClick);
    this.chart.destroy();
    this.dom.removeEventListener('contextmenu', this.mouseupFunction);
    this.dom.removeEventListener('click', this.clickFunction);
  }
  public onResize() {
    this.chart.changeSize(this.dom.clientWidth, this.dom.clientHeight);
  }

  public getInspectorHiddenState(updateOptions: any): string[] {
    const blackList: string[] = [];
    const { showDataLabel, showLegend, showGroupingAxis, showFrequencyAxis, frequencyAxisGridline } = updateOptions.properties as Properties;

    if (!showDataLabel) {
      blackList.push('dataLabelPosition', 'dataLabelFrequency', 'dataLabelGrouping', 'dataLabelSeries', 'dataLabelTextStyle');
    }
    if (!showLegend) {
      blackList.push('legendTitle', 'legendTextStyle', 'legendPosition', 'legendWrap');
    }
    if (!showGroupingAxis) {
      blackList.push('groupingAxisLine', 'groupingAxisTickLabel', 'groupingAxisTickMark', 'groupingAxisTitle', 'groupingAxisLabelAutoRotate', 'groupingAxisTextStyle', 'groupingAxisFormat');
    }
    if (!showFrequencyAxis) {
      blackList.push('frequencyAxisGridline', 'frequencyAxisGridlineColor', 'frequencyAxisLine', 'frequencyAxisTickLabel', 'frequencyAxisTickMark', 'frequencyAxisTitle',
        'frequencyAxisLabelAutoRotate', 'frequencyAxisTextStyle', 'frequencyAxisMaxValue', 'frequencyAxisMinValue', 'frequencyAxisInterval');
    } else {
      if (!frequencyAxisGridline) {
        blackList.push('frequencyAxisGridlineColor');
      }
    }
    return blackList;
  }

  public getActionBarHiddenState(updateOptions: any): string[] {
    return null;
  }

  public onActionEventHandler = (name: string) => {

  }

  public export() {
    const canvas = this.chart.getCanvas();
    canvas.get('timeline').stopAllAnimations();
    return canvas.get('el').toDataURL('image/png');
  }
}