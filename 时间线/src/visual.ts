import '../style/visual.less';
import '../style/timeline.less';
import '../fonts/iconfont.css';
const { timeline } = require('./timeline');
import html2canvas from 'html2canvas';
import $ from 'jquery';
import _ = require('lodash');

let isTooltipModelShown = false;
const clickLeftMouse = 0;
const clickRightMouse = 2;
export default class Visual extends WynVisual {
  private static mockItems = [
    { name: "下达", value: 1, image: '../assets/icon.png', describe: '这个可能是一段文本' },
    { name: "确认", value: 1, image: '../assets/icon.png', describe: '这个可能是一段文本' },
    { name: "出厂", value: 2, image: '../assets/icon.png', describe: '这个可能是一段文本' },
    { name: "预约", value: 0, image: '../assets/icon.png', describe: '这个可能是一段文本' },
    { name: "到厂", value: 0, image: '../assets/icon.png', describe: '这个可能是一段文本' },
    { name: "入仓", value: 0, image: '../assets/icon.png', describe: '这个可能是一段文本' },
    { name: "完成", value: 0, image: '../assets/icon.png', describe: '这个可能是一段文本' }
  ];
  
  private root: JQuery<HTMLElement>;
  private container: HTMLDivElement;
  private _timeline: JQuery<HTMLElement>;
  private items = [];
  private selectionManager: any;
  private selection: any[] = [];

  private isMock = true;
  private isFirstRender: boolean;
  private options: any
  private visualHost: any;
  private renderTimer: any;
  private static width = 600;
  private static height = 100;

  private isName: boolean;
  private isValue: boolean;
  private isImage: boolean;
  private isDescribe: boolean;

  private name: any;
  private value: any;
  private image: any;
  private describe: any;
  private timerId = null;

  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    super(dom, host, options);
    this.root = $(dom);
    this.container = dom;
    this.isMock = true;
    this.visualHost = host;
    this.selectionManager = host.selectionService.createSelectionManager();
    this.isFirstRender = true;
  }
  
  private hideTooltip = () => {
    this.visualHost.contextMenuService.hide();
    isTooltipModelShown = false;
  }

  private showTooltip = _.debounce((params, asModel = false) => {
    if (asModel) isTooltipModelShown = true;
    this.visualHost.contextMenuService.show({
      position: {
        x: params.clientX,
        y: params.clientY,
      }
    })
  });
  createSelectionId = (sid?) => this.visualHost.selectionService.createSelectionId(sid);
 
  public getNodeSelectionId = (label: any) => {
    const  {selectionId}  = this.items.find((_item: any) => _item[this.name] === label)
    return selectionId
  }
  
  public bindEvents = (node, _label) => {
    const clickMouse = node.button;
    this.root.on('mousedown', (e: any) => {
      e.stopPropagation();
      this.visualHost.contextMenuService.hide();
      if (!e.seriesClick) {
        // clear tooltip
        this.hideTooltip();
        // clear selection
        this.selection = [];
        this.selectionManager.clear();
        return;
      }
    })

    const selectionId = this.getNodeSelectionId(_label)
    if (!this.selectionManager.contains(selectionId)) {
      this.selectionManager.select(selectionId, true);
    } else {
      this.selectionManager.clear(selectionId);
    }
    if (clickMouse === clickLeftMouse) {
      if (this.options.clickLeftMouse === 'none' || this.options.clickLeftMouse === 'showToolTip') {
        return
      } else {
        if (isTooltipModelShown) return;
        this.hideTooltip();
        const selectionIds = this.selectionManager.getSelectionIds();
        this.visualHost.commandService.execute([{
          name: this.options.clickLeftMouse,
          payload: {
            selectionIds,
            position: {
              x: node.clientX,
              y: node.clientY,
              },
          }
        }])
      }
    } else if (clickMouse === clickRightMouse) {  
      node.preventDefault();
      this.showTooltip(node, true);
    }
  }


  public update(updateOptions: VisualNS.IVisualUpdateOptions) {

    const options = updateOptions;
    const dataView = options.dataViews[0];
    this.isMock = !(dataView && dataView.plain.profile.name.values.length);
    const plainData: any = this.isMock ? {} : dataView.plain;
    if (!this.isMock) {
      this.items = plainData.data;
    }
    this.isValue = !!(dataView && dataView.plain.profile.value.values.length);
    this.isImage = !!(dataView && dataView.plain.profile.image.values.length);
    this.isDescribe = !!(dataView && dataView.plain.profile.describe.values.length);

    if (this.isMock) {
      this.name = 'name';
      this.value = 'value'
      this.image = 'image'
      this.describe = ['describes']
      this.items = Visual.mockItems
    } else {
      this.name = !this.isMock && plainData.profile.name.values[0].display || '';
      this.value = this.isValue && plainData.profile.value.values[0].display || '';
      this.image = this.isImage && plainData.profile.image.values[0].display || '';
      this.describe = this.isDescribe && plainData.profile.describe.values.map((_value: any) =>_value.display ) || []
      this.items = plainData.data;
      if (this.isDescribe) {
        const format = options.dataViews[0].plain.profile.describe.values.map((_item: any) => _item.options.itemFormat);
        const formatService = this.visualHost.formatService;
        this.items.map((_item: any) => {
          this.describe.map((_value: any, _index: number) => {
            _item[_value] = formatService.format(format[_index], _item[_value]) || _item[_value];
          })
        })
      }

      const sortFlags = plainData.sort[this.name].order;
        let newItems: any = sortFlags.map((flags) => {
          return newItems = this.items.find((item) => item[this.name] === flags && item)
        })
        this.items = newItems.filter((item) => item)
      // select id
      const getSelectionId = (_item) => {
        const selectionId = this.createSelectionId();
        this.name && selectionId.withDimension(plainData.profile.name.values[0], _item);
        return selectionId
      }
      this.items = this.items.map((_item) => {
        return {
          ..._item,
          selectionId: getSelectionId(_item)
        }
      });
    } 
    
    this.options = options.properties;
    this.render();
  }

  public _setStyleToAfterAndBefore = (labelBg, _options: any) => {
    // horizontal timeline content
    $(`<style>
      .timeline--horizontal
      .timeline__item
      .timeline__content::before{
        border-top: 12px solid ${labelBg}}

      .timeline--horizontal
      .timeline__item
      .timeline__content::after{
        border-top: 10px solid ${labelBg};}
      </style>`)
      .appendTo(document.head)

    // horizontal timeline bottom content
    $(`<style>
      .timeline--horizontal
      .timeline__item--bottom
      .timeline__content::before{
        border-bottom: 12px solid ${labelBg};
        border-top: none; }
        
      .timeline--horizontal
      .timeline__item--bottom
      .timeline__content::after{
        border-bottom: 10px solid ${labelBg};
        border-top: none;}
      </style>`)
      .appendTo(document.head)

    // mobile timeline content
    $(`<style>
      .timeline--mobile
      .timeline__item
      .timeline__content::before {
        border-right: 12px solid ${labelBg};}

      .timeline--mobile
      .timeline__item
      .timeline__content::after {
        border-right: 10px solid ${labelBg};}
      </style>`)
      .appendTo(document.head)

    // left and right content
    $(`<style>
      .timeline__content::before {
        border-left: 12px solid ${labelBg};}
      .timeline__content::after {
        border-left: 11px solid ${labelBg};}

      .timeline__item--right
      .timeline__content::before {
        border-right: 12px solid ${labelBg};}
      .timeline__item--right
      .timeline__content::after {
        border-right: 11px solid ${labelBg};}
        </style>`)
      .appendTo(document.head);
       // custom time line point color
      $(`<style>.timeline__item::after {
        content: '';
        border: ${_options.timeLinePointBorder}px solid ${ _options.timeLinePointBg};
        background: ${_options.timeLinePointColor};
        width: ${_options.timeLinePointSize}px; 
        height: ${_options.timeLinePointSize}px;}
        </style>`)
        .appendTo(document.head);
  }
  public _initHtml = (_options: any, timeLineData: any, clientWidth:number) => {
    this._timeline = $('<div class="timeline">').appendTo(this.root);
    let _timeline__wrap = $('<div class="timeline__wrap">').appendTo(this._timeline),
    _timeline__items = $('<div class="timeline__items">').appendTo(_timeline__wrap);
   
    // custom label text
    const { useToPoint, timeLinePointColor: pointBg, useToLabel, labelBg, timeLineCollection, showLabel } = _options;
    // add point and label point
    const _isFormatList = timeLineCollection.length;
    let _formatList = timeLineCollection[0];
    const _useToLabel = useToLabel && _isFormatList;
    const _labelBorderColor = _useToLabel || showLabel === 'text' ? 'transparent' : labelBg;
    this._setStyleToAfterAndBefore(_labelBorderColor, _options);
    const _useToPoint = useToPoint && _isFormatList;
    const _useToPointValue = _isFormatList ? _formatList.formatValue : '';
   
    const hiddenLabel = {
      visibility: 'hidden',
    }

    const _timeline__title__style = {
      ..._options.labelTextStyle,
      fontSize: _options.labelTextStyle.fontSize,
      textAlign: _options.showLabel === 'title' || _options.showLabel === 'text' ? _options.labelTitleAlign : _options.labelTitleContentAlign,
      whiteSpace: 'nowrap',
    }

    timeLineData.map((_element, index) => {
      // format value
      _formatList = timeLineCollection.find((_item: any) => _item.formatValue.toString() == _element[this.value].toString()) || false;
      const _timeline__item = $(`<div class="timeline__item timeline__item__${index}">`)
        .appendTo(_timeline__items);
      const _timeline__content = $('<div class="timeline__content">')
        .appendTo(_timeline__item);
      const _timeline__content_text = $('<div>');

      $(_timeline__content)
        .append(_timeline__content_text);
      const _timeline__title = $('<h2 class="timeline__title">');
      // add click event 
       $(_timeline__item).on('mouseup', (e:any) => {
         this.bindEvents(e, _element[this.name])
      })
      //  show label
     if (_options.showLabel === 'content' && this.isDescribe) {
        $(_timeline__content_text).addClass('timeline__content_text')
        $(_timeline__content_text).append(_timeline__title);
       _timeline__title.text(this.items[index][this.name]);
       let _contentText = ''
       this.describe.map((_item: any, _itemIndex: number) => {
        const _timeline__describe = $('<p class="timeline__describe">')
         if (this.describe.length <= 1) {
          //  only one data
          _contentText = this.items[index][_item]
         } else {
          _contentText = `${_item}: ${this.items[index][_item]}`
         }
         _timeline__describe.text(_contentText);
         $(_timeline__content_text).append(_timeline__describe);
       })
       

      } else {
        $(_timeline__content_text).addClass('timeline__content_text_title')
        $(_timeline__content_text).append(_timeline__title);
       _timeline__title.text(this.items[index][this.name]);
       if (_options.showLabel === 'none') {
          _timeline__content.css(hiddenLabel);
        } 
      }
      // custom label
      let _formatLabel = _useToLabel && _formatList;
      const timeline__content__fontStyle = {
        border: `1px solid ${_formatLabel ? _labelBorderColor : labelBg}`,
        background: _formatLabel ? _formatList.formatColor : labelBg,
      };
      const timeline__content_only_text = {
        border: `1px solid transparent`,
        background: 'transparent',
      }
      if (showLabel === 'text') {
        _timeline__content.css(timeline__content_only_text);
        _timeline__item.addClass('timeline__item_only_text');
      } else {
        _timeline__content.css(timeline__content__fontStyle);
        _timeline__item.removeClass('timeline__item_only_text');
      }
     
      _timeline__title.css(_timeline__title__style);
      $('.timeline__describe').css(_options.labelDescribeStyle);
      // _timeline__describe.css(_options.labelDescribeStyle);
      // point add data image 
      if (!this.isMock && this.isImage) {
        $(`<style>.timeline__item__${index}::after {
          border: ${_options.timeLinePointBorder}px solid ${_options.timeLinePointBg};
          background:  ${_element[this.image] ? `url(${_element[this.image]}) center center /cover no-repeat` : pointBg};
          </style>`)
        .appendTo(document.head);
      }
      let _formatPoint = _useToPoint && _formatList;
      const _usePointBg = _useToPoint ? (_formatList.formatImage ? `url(${_formatList.formatImage}) center center /cover no-repeat` : _formatList.formatColor) : pointBg;
      const _usePointBorder = _formatPoint ? (_formatList.formatBorderColor || _options.timeLinePointBg) : _options.timeLinePointBg
      // custom point
      if (_formatPoint) {
        $(`<style>.timeline__item__${index}::after {
          border: ${_options.timeLinePointBorder}px solid ${_usePointBorder};
          background:  ${_formatPoint ? _usePointBg : pointBg};
          </style>`)
        .appendTo(document.head);
      }
     
    });
    const visibleItems = () => {
      if (_options.visibleItems === 'default') {
        return timeLineData.length
      }
      if (_options.visibleItems === 'custom') {
        return _options.customVisibleItems
      }
    };
    const _forceVerticalMode = () => {
      if (_options.timeLineDirection === 'horizontal') {
        return 10
      } else {
        return _options.verticalItemsLayout === 'auto' ? 600 : 10;
      }
    }
    timeline(document.querySelectorAll('.timeline'), {
      forceVerticalMode: _options.timeLineDirection === 'auto' ? '600' : _forceVerticalMode(),
      mode: _options.timeLineDirection === 'auto' ? 'horizontal' : _options.timeLineDirection,
      visibleItems: visibleItems(),
      horizontalAllPosition: _options.horizontalItemsLayout,
      verticalAllPosition: _options.verticalItemsLayout,
      verticalTrigger: `${0}%`,
    });

    // custom vertical line color
    $(`<style>.timeline__wrap::before{
      background-color: ${_options.timeLineBg};

    }</style>`).appendTo(document.head)
    // custom horizontal line color
    $('.timeline-divider').css('backgroundColor', `${_options.timeLineBg}`);
    // Content align
    $('.timeline__content').css({ 'textAlign': _options.labelContentAlign });

     // add vertical line position
    if (_options.timeLineDirection === 'vertical') {
      const left = _options.verticalItemsLayout === 'left' && '3%' || _options.verticalItemsLayout === 'right' && '95%' || '50%';
      $(`<style>
        .timeline__wrap::before{
          left: ${left};}
        </style>`)
        .appendTo(document.head);
    }
    // control position 
    const _timeLinePosition = (_clientWidth) => {
      // horizontal
      let _basicPosition = {
        position: 'fixed',
        top: '0%',
        bottom: '0%',
        transform: 'translateY(-50%)',
      }
      
      if (_options.timeLineDirection === 'horizontal') {
        switch (_options.horizontalItemsLayout) {
          case 'top':
            delete _basicPosition.bottom;
            delete _basicPosition.transform;
            return _basicPosition;
          case 'bottom':
            delete _basicPosition.top;
            delete _basicPosition.transform;
            return _basicPosition;
          case 'auto':
            delete _basicPosition.bottom;
            _basicPosition.top = '50%';
            return _basicPosition;
        }
      } else {
        if (_options.timeLineDirection === 'auto') {
          if (_clientWidth < 600) {
            return {}
          } else {
            delete _basicPosition.bottom;
            _basicPosition.top = '50%';
            return _basicPosition;
          }
        } else {
          return {}
        }
      }
    }

    this._timeline.css(_timeLinePosition(clientWidth))
  };

  public render() {
    this.visualHost.eventService.renderStart();
    const options = this.options;
    this.root.html('').css({
      'position': 'relative',
    });

    let _data = this.isMock ? Visual.mockItems : this.items;
    this.resize();
    this._initHtml(options, _data, this.root.html('')[0].clientWidth);
    if (this.timerId) clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.visualHost.eventService.renderFinish();
    }, 1000);
  }



  public onDestroy() {
    if (this.renderTimer != null) {
      cancelAnimationFrame(this.renderTimer);
      this.renderTimer = null;
    }
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public onResize() {
    this.resize();
    this.render();
  }

  private resize() {
    var width = Visual.width,
      height = Visual.height,
      winWidth = $(window).width(),
      winHeight = $(window).height(),
      xZoom = winWidth / width,
      yZoom = winHeight / height,
      zoom = Math.min(xZoom, yZoom);
    const ua = navigator.userAgent;
    if (ua.indexOf("Firefox") != -1) {
      this.root.css({ 'transform': `scale(${zoom})`, 'transformOrigin': 'top left' });
    } else {
      this.root.css({ "zoom": 1 });
    }

  };

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    let hiddenOptions: Array<any> = [];

    if (options.properties.visibleItems === 'default') {
      hiddenOptions = hiddenOptions.concat(['customVisibleItems'])
    }

    // time line layout 
    if (options.properties.timeLineDirection === 'horizontal') {
      hiddenOptions = hiddenOptions.concat(['verticalItemsLayout'])
    } 
    if (options.properties.timeLineDirection === 'vertical') {
      hiddenOptions = hiddenOptions.concat(['horizontalItemsLayout'])
    }
    if (options.properties.timeLineDirection === 'auto') {
      hiddenOptions = hiddenOptions.concat(['verticalItemsLayout','horizontalItemsLayout'])
    } 

    // fonts setting 
    if (options.properties.showLabel === 'none') {
      hiddenOptions = hiddenOptions.concat(['labelTextStyle', 'labelDescribeStyle', 'labelTitleAlign', 'labelTitleContentAlign', 'labelContentAlign', 'labelBg', 'useToLabel', 'horizontalItemsLayout', 'verticalItemsLayout'])
    }
    if (options.properties.showLabel === 'title') {
      hiddenOptions = hiddenOptions.concat(['labelDescribeStyle', 'labelTitleContentAlign', 'labelContentAlign'])
    }

    if (options.properties.showLabel === 'content') {
      hiddenOptions = hiddenOptions.concat(['labelTitleAlign',])
    }
    if (options.properties.showLabel === 'text') {
      hiddenOptions = hiddenOptions.concat(['labelDescribeStyle',  'labelTitleContentAlign', 'labelContentAlign', 'labelBg', 'useToLabel', ])
    }
    // format list
    // if (options.properties.useToPoint && options.properties.useToPoint) {
    //   hiddenOptions = hiddenOptions.concat(['timeLineCollection'])
    // }
    return hiddenOptions;
  }

  public getActionBarHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    return null;
  }

  public export() {
    const def = this.visualHost.promiseFactory.defer();
    if (this.options.timeLineDirection === 'horizontal' && this.options.horizontalItemsLayout === 'auto') {
      this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this._timeline.removeAttr('style');
    }
    html2canvas(this.container, { backgroundColor: null }).then((canvas) => {
      def.resolve(canvas.toDataURL());
    });
    return def.promise;
  }
}
