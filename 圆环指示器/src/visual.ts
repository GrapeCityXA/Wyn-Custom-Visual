import '../style/visual.less';
export default class Visual {
    private container: HTMLDivElement;
    private chart: any;
    private items: any;
    private properties: any;
    private valueField: any;
    private ActualValue: any;
    private ContrastValue: any;
    static mockItems = 0.5;
    private host: any;
    constructor(dom: HTMLDivElement, host: any) {
        this.host = host;
        this.container = dom;
        this.chart = this.host.moduleManager.getModule('echarts').init(dom);
        this.fitSize();
        this.items = [];
        this.properties = {
            showSubTitle: false,
            subtitle: '示例',
            borderColor: '#20da97',
            scaleColor: '#fff',
            fontColor: '#f44e3b',
            fontSize: 10,
        };
        this.selectEvent();
    }

    private clickFunction = () => {
        this.host.contextMenuService.hide();
        return;
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

    private renderFinishHandler = () => {
        this.host.eventService.renderFinish();
        this.chart.off('finished');
    }

    private selectEvent() {
        this.container.addEventListener("click", this.clickFunction);

        this.container.addEventListener('contextmenu',  this.mouseupFunction );

    }


    public update(options: any) {
        const dataView = options.dataViews[0];
        this.items = [];
        if ((dataView &&
            dataView.plain.profile.values.values.length) || (dataView &&
                dataView.plain.profile.ActualValue.values.length && dataView.plain.profile.ContrastValue.values.length)) {
            const plainData = dataView.plain;
            this.valueField = plainData.profile.values.values;
            this.ActualValue = plainData.profile.ActualValue.values;
            this.ContrastValue = plainData.profile.ContrastValue.values;
            if (this.valueField.length == 1) {
                this.items = plainData.data[0][this.valueField[0].display].toFixed(4);
            } else {
                this.items = (plainData.data[0][this.ActualValue[0].display] / plainData.data[0][this.ContrastValue[0].display]).toFixed(4);
            }
        }
        this.properties = options.properties;
        this.render();
    };

    private render() {
        this.chart.clear();
        this.host.eventService.renderStart();
        const isMock = !this.items.length;
        let items = (isMock ? Visual.mockItems : (this.items > 1 ? 1 : this.items)) * 100;
        this.container.style.opacity = '1';
        const options = this.properties;
        let subtitle = options.showSubTitle ? options.subtitle : ''
        let Green = {
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
                offset: 0,
                color: '#99da69' // 0% 处的颜色
            }, {
                offset: 1,
                color: '#01babc' // 100% 处的颜色
            }],
            globalCoord: false // 缺省为 false
        };
        let icon = options.icon || this.host.assetsManager.getImage('default')
        var option = {
            title: {
                text: items.toFixed(2) + '%',
                subtext: subtitle,
                x: 'center',
                y: 'center',
                textStyle: {
                    color: options.fontSet.color,
                    fontFamily: options.fontSet.fontFamily,
                    fontSize: options.fontSet.fontSize.replace("pt", ""),
                    fontStyle: options.fontSet.fontStyle,
                    fontWeight: options.fontSet.fontWeight
                },
                subtextStyle: {
                    color: options.fontColor,
                    fontSize: options.fontSize,
                    align: 'center'
                }
            },
            series: [{
                //渐变圆环
                name: "",
                type: "pie",
                radius: ["68%", "88%"],
                startAngle: 180,
                hoverAnimation: false,
                avoidLabelOverlap: true,
                z: 0,
                zlevel: 0,
                label: {
                    show: false,
                    normal: {
                        show: false
                    }
                },
                data: [{
                    value: 0,
                    name: "",
                    itemStyle: {
                        normal: {
                            color: Green
                        }
                    }
                }]
            },
            {
                //仪表盘样式
                name: "",
                type: "gauge",
                radius: "88%",
                startAngle: 180,
                endAngle: 180 - items / 100 * 360,
                clockwise: true,
                splitNumber: items,
                hoverAnimation: false,
                axisTick: {
                    show: false
                },
                splitLine: {
                    length: 20,
                    lineStyle: {
                        width: 1,
                        color: options.scaleColor
                    }
                },
                axisLabel: {
                    show: false
                },
                pointer: {
                    show: false
                },
                axisLine: {
                    lineStyle: {
                        opacity: 0
                    }
                },
                detail: {
                    show: false
                },
                data: [{
                    value: Math.round(items),
                    name: ""
                }]
            },
            {
                //进度圆环
                name: 'Line 1',
                type: 'pie',
                startAngle: 180,
                clockWise: true,
                radius: ['94%', '97%'],
                itemStyle: {
                    normal: {
                        label: {
                            show: true
                        },
                        labelLine: {
                            show: false
                        },
                    }
                },
                hoverAnimation: true,
                data: [{
                    value: Math.round(items),
                    itemStyle: {
                        normal: {
                            color: options.borderColor
                        }
                    }
                }, { //画中间的图标
                    name: "",
                    value: 0,
                    label: {
                        position: 'inside',
                        backgroundColor: {
                            image: icon
                        },
                        padding: 12
                    }
                }, { //未完成的圆环的颜色
                    value: 100 - Math.round(items),
                    name: 'invisible',
                    itemStyle: {
                        normal: {
                            color: 'transparent',
                            label: {
                                show: false
                            },
                            labelLine: {
                                show: false
                            }
                        }
                    }
                }]
            }
            ]
        };
        this.chart.on('finished', this.renderFinishHandler);
        this.chart.setOption(option);
    }
    // 自适应大小
    private fitSize() {
        this.chart.resize();
    }
    
    public onDestroy(): void {
        this.container.removeEventListener('click', this.clickFunction)
        this.container.removeEventListener('contextmenu', this.mouseupFunction)
        this.chart.dispose();
    }

    // public abstract onDestroy(): void;
    public onResize() {
        this.fitSize();
        this.render();
    }
    // 自定义属性可见性
    public getInspectorHiddenState(updateOptions: any): string[] {
        if (!updateOptions.properties.showSubTitle) {
            return ['subtitle'];
        }
        return null;
    }

    // 功能按钮可见性
    public getActionBarHiddenState(updateOptions: any): string[] {
        return null;
    }

    public onActionEventHandler = (name: string) => {

    }

    public export() {
        const canvas = this.container.getElementsByTagName('canvas')[0];
        return canvas.toDataURL();
    }
}
