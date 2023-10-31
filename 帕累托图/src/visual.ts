import '../style/visual.less';
let _;

let isTooltipModelShown = false;

export default class Visual extends WynVisual {
  private container: HTMLDivElement;
  private host: any;
  private chart: any;
  private properties: any;
  private items: any;
  private selectionManager: any;
  private selection: any[] = [];
  private ActualValue: string;
  private dimension: string;
  private format: any;

  static mockItems: any = [
    ["1月", "2月", "3月", "4月", "5月", "6月", "7月"], [56, 44, 38, 25, 20, 12, 7]
  ];

  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    super(dom, host, options)
    this.container = dom;
    this.chart = host.moduleManager.getModule('echarts').init(dom);
    _ = host.moduleManager.getModule('lodash');
    this.items = [];
    this.properties = options.properties;
    this.host = host;
    this.bindEvents();
    this.selectionManager = host.selectionService.createSelectionManager();
  }

  private clickFunction = (e: any) => {
    this.host.contextMenuService.hide();
    if (!e.seriesClick) {
      // clear tooltip
      this.hideTooltip();
      // clear selection
      this.selection.forEach(i => this.dispatch('downplay', i));
      this.selection = [];
      this.selectionManager.clear();
      return;
    }
  }
  private mouseleaveFunction = (e: any) => {
    if (isTooltipModelShown) return;
    this.hideTooltip();
  }

  private contextmenuFunction = (params) => {
    params.preventDefault();
    params.stopPropagation();
    this.host.contextMenuService.show({
      position: {
        //跳转的selectionsId(左键需要)
        x: params.x,
        y: params.y,
      },
      menu: true
    }, 10)
    return;
  }

  private hideTooltip = () => {
    this.host.toolTipService.hide();
    isTooltipModelShown = false;
  }

  createSelectionId = (sid?) => this.host.selectionService.createSelectionId(sid);

  private dispatch = (type, payload) => this.chart.dispatchAction({ ...payload, type });

  public bindEvents = () => {
    // lister click 
    this.container.addEventListener('click', this.clickFunction);

    this.container.addEventListener('mouseleave', this.mouseleaveFunction);

    //鼠标左键
    this.chart.on('click', (params) => {
      this.host.contextMenuService.hide();
      params.event.event.stopPropagation();
      if (params.event.event.button == 0) {
        //鼠标左键功能
        let leftMouseButton = this.properties.leftMouseButton;
        switch (leftMouseButton) {
          //鼠标联动设置    
          case "none": {
            this.doSelection(params);
            break;
          }
          case "showTool": {
             // toolTip
            const showTooltip = _.debounce((params, asModel = false) => {
              if (asModel) isTooltipModelShown = true;
              this.host.toolTipService.show({
                position: {
                  x: params.event.event.x,
                  y: params.event.event.y,
                },

                fields: [{
                  label: params.name,
                  value: params.data,
                }],
                selected: this.selectionManager.getSelectionIds(),
                menu: true,
              }, 10);
            });
            showTooltip(params, true);
            break;
          }
          case "Jump": {
            this.doSelection(params);
            const selectionIds = this.items[2][params.dataIndex];
            this.host.commandService.execute([{
              name: leftMouseButton,
              payload: {
                selectionIds,
                position: {
                  x: params.event.event.x,
                  y: params.event.event.y,
                },
              }
            }])
            break;
          }
          default: {
            const selectionIds = this.items[2][params.dataIndex];
            this.host.commandService.execute([{
              name: leftMouseButton,
              payload: {
                selectionIds,
                position: {
                  x: params.event.event.x,
                  y: params.event.event.y,
                },
              }
            }])
          }
        }
      }

    })

    this.container.addEventListener('contextmenu', this.contextmenuFunction);

  }

  private doSelection(params) {
    if (this.selectionManager.isEmpty()) {
      this.selection.push(this.items[2][params.dataIndex]);
      this.selectionManager.select(this.selection, true);
      return
    }

    if (!this.selectionManager.contains(this.items[2][params.dataIndex])) {
      this.selection.push(this.items[2][params.dataIndex]);
    } else {
      this.selection.splice(this.selection.indexOf(this.items[2][params.dataIndex]), 1);
      this.selectionManager.clear(this.items[2][params.dataIndex])
    }
    if (this.selection.length == this.items[2].length) {
      this.selectionManager.clear();
      this.selection = new Array<any>();
      this.host.toolTipService.hide();
      return;
    }
    this.selectionManager.select(this.selection, true);
  }

  public update(options: VisualNS.IVisualUpdateOptions) {
    this.format = "General";
    const dataView = options.dataViews[0];
    this.items = [];
    if (dataView &&
      dataView.plain.profile.ActualValue.values.length && dataView.plain.profile.dimension.values.length) {
      const plainData = dataView.plain;
      this.dimension = plainData.profile.dimension.values[0].display;
      this.ActualValue = plainData.profile.ActualValue.values[0].display;
      this.format = plainData.profile.ActualValue.values[0].format;

      let items = plainData.data;
      const isSort = plainData.sort[this.dimension].priority === 0 ? true : false;

      // data sort 
      if (isSort) {
        const sortFlage = plainData.sort[this.dimension].order;
        let newItems: any = sortFlage.map((flage) => {
          return newItems = items.find((item) => item[this.dimension] === flage && item)
        })
        items = newItems.filter((item) => item)
      }

      this.items[0] = items.map((item) => item[this.dimension]);
      this.items[1] = items.map((item) => item[this.ActualValue]);
      const getSelectionId = (item) => {
        const selectionId = this.createSelectionId();
        this.dimension && selectionId.withDimension(plainData.profile.dimension.values[0], item)
        return selectionId
      }
      this.items[2] = items.map((item) => getSelectionId(item));
    }

    this.properties = options.properties;
    this.render();
  }

  public getLineData = (data: Array<number>) => {
    const initData = data
    const totalNumber = _.sum(initData)
    const lineData = []
    initData.map((data: number, index: number) => {
      if (index) {
        lineData[index] = (Number((data / totalNumber).toFixed(2)) * 100) + lineData[index - 1]
      } else {
        lineData[index] = (Number((initData[0] / totalNumber).toFixed(2)) * 100);
      }
    })
    lineData[lineData.length - 1] = 100
    return lineData
  }


  public formatUnit = (value: any, dataUnit) => {
    if (value) {
      const units = [{
        value: 1,
        unit: ''
      },
      {
        value: 100,
        unit: '百'
      }, {
        value: 1000,
        unit: '千'
      }, {
        value: 10000,
        unit: '万'
      }, {
        value: 100000,
        unit: '十万'
      }, {
        value: 1000000,
        unit: '百万'
      }, {
        value: 10000000,
        unit: '千万'
      }, {
        value: 100000000,
        unit: '亿'
      }, {
        value: 1000000000,
        unit: '十亿'
      }, {
        value: 100000000000,
        unit: '万亿'
      }]
      const format = units.find((item) => item.value === Number(dataUnit))
      return value / format.value + format.unit
    } else {
      return value
    }
  }

  public render() {
    this.host.eventService.renderStart();
    this.chart.clear();
    // get data
    const isMock = !this.items.length;
    this.container.style.opacity = '1';
    const options = this.properties;
    let columnarData = isMock ? Visual.mockItems[1] : this.items[1];

    const lineData = this.getLineData(columnarData);

    // lengend position
    const lengendBarName = isMock ? '质量' : this.ActualValue
    const orient = options.legendPosition === 'left' || options.legendPosition === 'right' ? 'vertical' : 'horizontal'
    const gridPosition = !options.showLegend
      ? {
        left: '8%',
        right: '10%',
        top: '10%',
        bottom: '10%',
      }
      : {
        left: options.legendPosition === 'left' ? '15%' : '8%',
        right: options.legendPosition === 'right' ? '15%' : '10%',
        top: options.legendPosition === 'top' ? '15%' : '10%',
        bottom: options.legendPosition === 'bottom' ? '15%' : '10%',
      }
    // get properties
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: (params, ticket) => {
          params.data = this.formatData(params.data)
          const value = params.componentSubType === 'bar' ? params.data : params.data + '%'
          return `${params.name}: ${value}`
        },
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: [lengendBarName, { name: options.legendName, icon: 'circle' }],
        show: options.showLegend,
        left: options.legendPosition === 'left' || options.legendPosition === 'right' ? options.legendPosition : options.legendVerticalPosition,
        top: options.legendPosition === 'top' || options.legendPosition === 'bottom' ? options.legendPosition : options.legendHorizontalPosition,
        align: 'auto',
        icon: 'roundRect',
        textStyle: {
          color: options.legendTextStyle.color,
          fontStyle: options.legendTextStyle.fontStyle,
          fontWeight: options.legendTextStyle.fontWeight,
          fontFamily: options.legendTextStyle.fontFamily,
          fontSize: parseFloat(options.legendTextStyle.fontSize)
        },
        orient: orient,
      },
      grid: gridPosition,
      xAxis: [
        {
          show: options.xAxis,
          axisTick: {
            show: options.xAxisTick
          },
          axisLine: {
            show: options.xAxisLine
          },
          axisLabel: {
            show: options.xAxisLabel,
            textStyle: {
              color: options.xTextStyle.color,
              fontStyle: options.xTextStyle.fontStyle,
              fontWeight: options.xTextStyle.fontWeight,
              fontFamily: options.xTextStyle.fontFamily,
              fontSize: parseFloat(options.xTextStyle.fontSize)
            }
          },
          data: isMock ? Visual.mockItems[0] : this.items[0]
        },
        {
          splitLine: {
            show: false
          },
          boundaryGap: true,
          axisLabel: {
            show: false
          },
          data: isMock ? Visual.mockItems[0] : this.items[0]
        }
      ],
      yAxis: [
        {
          type: 'value',
          max: Number(options.yMax) || null,
          min: Number(options.yMin) || null,
          interval: Number(options.interval) || null,
          axisLabel: {
            show: options.leftAxisLabel,
            formatter: (value) => {
              return this.formatUnit(value, options.dataUnit)
            },
            color: options.leftTextStyle.color,
            fontStyle: options.leftTextStyle.fontStyle,
            fontWeight: options.leftTextStyle.fontWeight,
            fontFamily: options.leftTextStyle.fontFamily,
            fontSize: parseFloat(options.leftTextStyle.fontSize)
          },
          axisTick: {
            show: options.leftAxisTick
          },
          axisLine: {
            show: options.leftAxisLine
          },
          splitLine: {
            show: options.leftSplitLine
          }
        },
        {
          type: 'value',
          // max: 100,
          axisLabel: {
            formatter: `{value}%`,
            show: options.rightAxisLabel,
            textStyle: {
              color: options.rightTextStyle.color,
              fontStyle: options.rightTextStyle.fontStyle,
              fontWeight: options.rightTextStyle.fontWeight,
              fontFamily: options.rightTextStyle.fontFamily,
              fontSize: parseFloat(options.rightTextStyle.fontSize)
            }
          },
          axisTick: {
            show: options.rightAxisTick
          },
          axisLine: {
            show: options.rightAxisLine
          },
          splitLine: {
            show: options.rightSplitLine
          }
        }
      ],
      series: [
        {
          name: lengendBarName,
          type: 'bar',
          xAxisIndex: 0,
          yAxisIndex: 0,
          barCategoryGap: `${options.barCategoryGap}%`,
          itemStyle: {
            opacity: options.opacity / 100,
            color: options.chartColors[0].colorStops ? options.chartColors[0].colorStops[0] : options.chartColors[0]
          },
          label: {
            color: options.leftTextStyle.color,
            normal: {
              show: options.dataindicate,
              position: options.dataindicatePosition,
              formatter: (params) => {
                params.data = this.formatData(params.data)
                return params.data
              },
              textStyle: {
                color: options.dataindicateTextStyle.color,
                fontStyle: options.dataindicateTextStyle.fontStyle,
                fontWeight: options.dataindicateTextStyle.fontWeight,
                fontFamily: options.dataindicateTextStyle.fontFamily,
                fontSize: parseFloat(options.dataindicateTextStyle.fontSize)
              }
            }
          },
          data: columnarData
        },
        {
          name: options.legendName,
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          // silent: true,
          smooth: true,
          clipOverflow: false,
          symbolSize: 9,
          itemStyle: {
            normal: {
              opacity: options.opacity / 100,
              color: options.chartColors[1].colorStops ? options.chartColors[1].colorStops[0] : options.chartColors[1],
              //borderColor:,
              borderWidth: 3,
            }
          },
          lineStyle: {
            normal: {
              //color:,
              width: 2,
            }
          },
          data: lineData
        }
      ]
    };
    this.chart.on('finished', () => {
      this.host.eventService.renderFinish();
      this.chart.off('finished');
    });
    this.chart.setOption(option)

  }
  public onDestroy() {
    this.container.removeEventListener('click', this.clickFunction);
    this.container.removeEventListener('mouseleave', this.mouseleaveFunction);
    this.container.removeEventListener('contextmenu', this.contextmenuFunction);
    this.chart.dispose();
  }

  public onResize() {

    this.chart.resize();
    this.render();
  }

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    if (!options.properties.showLegend) {
      return ['legendName', 'legendPosition', 'legendVerticalPosition', 'legendHorizontalPosition', 'legendTextStyle']
    } else {

      if (options.properties.legendPosition === 'top' || options.properties.legendPosition === 'bottom') {
        return ['legendHorizontalPosition']
      }

      if (options.properties.legendPosition === 'right' || options.properties.legendPosition === 'left') {
        return ['legendVerticalPosition']
      }

    }

    if (!options.properties.dataindicate) {
      return ['dataindicatePosition', 'dataindicateTextStyle']
    }

    return null;
  }

  public getActionBarHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    return null;
  }

  private formatData = (number) => {
    const formatService = this.host.formatService;
    let realDisplayUnit = formatService.getAutoDisplayUnit([number]);
    return formatService.format(this.format, number, realDisplayUnit);
  }

  public export() {
    return this.chart.getDataURL({ type: 'png' });
  }
}