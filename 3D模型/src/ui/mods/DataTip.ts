import BaseWindow from "../BaseWindow";
import RoomStore, { Room } from "../../engine/data/RoomData";


/**
 * 打开轮询后 显示数据信息
 */
export default class DataTip extends BaseWindow {

  public dataTipTitle : DataTipTitle;
  public dataTipBox : HTMLDivElement;
  public dataTipItems : DataTipItems;

  private _currentRoomId : string|number;
  
  private _horizontal : PropertiesShape['horizontalPosition'];
  private _vertical : PropertiesShape['verticalPosition'];
  private _left : number;
  private _top : number;

  
  private _displayFieldProfile : VisualNS.IDataViewProfiles;
  private _formatMap : Map<string, dataUseFormatAndUnit>;

  private _localizationManager : VisualNS.LocalizationManager;
  private _roomStore : RoomStore;

  constructor(localizationManager : VisualNS.LocalizationManager) {
    super('data-tip-container');
    
    this._localizationManager = localizationManager;

    const box = document.createElement('div');
    box.className = 'data-tip-box dialog';
    this.dataTipBox = box;
    this.dom.style.backgroundColor = '#00000000';
    box.style.opacity = "1";
    
    this.dom.appendChild(box);

    this.dataTipTitle = new DataTipTitle(localizationManager.getDisplay('dataTip.display'));
    this.dataTipItems = new DataTipItems();
    this.dataTipTitle.render(box);
    this.dataTipItems.render(box);
  }

  public setDisplayFiledProfileAndFormat(displayFieldProfile:VisualNS.IDataViewProfiles, formatMap : Map<string, dataUseFormatAndUnit>) {
    this._displayFieldProfile = displayFieldProfile;
    this._formatMap = formatMap;

    // 当添加或减少显示的字段时 _propertyStrings会更新 因此需要重新调用staticUpdateData更新数据
    const room = this._roomStore.getRoomById(this._currentRoomId);
    room && this.staticUpdateData(room);
  }

  /**
   * 显示DataTip
   */
  private show() {
    this.dom.classList.add('data-tip-show');
  }

  /**
   * 给staticUpdateData()添加动画效果
   * @param dataPoint 
   */
  public animateDisplay(room:Room) {

    this.show();
    this.out();

    this.staticUpdateData(room);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.dataTipBox.classList.add('data-tip-act')
      });
    });
  }

  /**
   * 更新dataTip
   * @param room 
   */
  private staticUpdateData(room:Room) {

    this._currentRoomId = room.getId();
    const dataPoint = room.getDataPoint();
    const fields = new Array();

    const { category, values, properties } = this._displayFieldProfile;

    for(const fieldProfile of category.values) {
      const { display } = fieldProfile;
      fields.push({
        label : display,
        value : dataPoint[display].toString(),
      });
    }

    const profiles = [...values.values, ...properties.values];
    
    for(const fieldProfile of profiles) {
      const { dataType, display } = fieldProfile;
      const value = dataPoint[display];
      const format = this._formatMap.get(display);
      fields.push({
        label : display,
        value : format(value),
      });
    }
    this.dataTipItems.update(fields);
    this.calculatePosition();
  }

  /**
   * 消除数据
   */
  private out() {
    this.dataTipBox.classList.remove('data-tip-act');
    this._currentRoomId = null;
  }
  
  /**
   * 隐藏DataTip
   */
  public hide() {
    this.dom.classList.remove('data-tip-show');
    this._currentRoomId = null;
  }

  public setPosition(
    horizontal:PropertiesShape['horizontalPosition'],
    vertical:PropertiesShape['verticalPosition'],
    top:number,
    left:number
  ) {
    this._horizontal = horizontal;
    this._vertical = vertical;
    this._top = top;
    this._left = left;
    this.calculatePosition();
  }

  private calculatePosition() {

    const parent = this.dom.parentNode as HTMLDivElement;
    const horizontal = this._horizontal;
    const vertical = this._vertical;
    const top = this._top;
    const left = this._left;

    let leftOffset = 0;
    if(horizontal === 'MID') {
      leftOffset = Math.floor(parent.clientWidth / 2 - this.dom.clientWidth / 2);
    }
    if(horizontal === 'RIGHT') {
      leftOffset = Math.floor(parent.clientWidth - this.dom.clientWidth);
    }

    let topOffset = 0;
    if(vertical === 'MID') {
      topOffset = Math.floor(parent.clientHeight / 2 - this.dom.clientHeight / 2);
    }
    if(vertical === 'BOTTOM') {
      topOffset = Math.floor(parent.clientHeight - this.dom.clientHeight);
    }

    this.dom.style.top = -top + topOffset + 'px';
    this.dom.style.left = left + leftOffset + 'px';
  }

  public setTextStyle(textStyle : PropertiesShape['dataTipBodyTextStyle'], scale) {
    this.dataTipBox.style.color = textStyle.color;
    this.dataTipBox.style.fontFamily = textStyle.fontFamily;

    this.dataTipTitle.applyInlineStyles(
      // ['fontSize', (DataTip.FONT_SIZE_BASE + 0.1) * fontSizeScale + "px"],
      ['fontFamily', textStyle.fontFamily],
      ['fontWeight', 'bold'],
      ['fontStyle', 'normal'],
    );
    const valueAndUnitReg = /^([^a-zA-Z]+)([a-zA-Z]+)$/;
    if(!valueAndUnitReg.test(textStyle.fontSize)) {
      return ;
    }
    const fontSizeValue = Number(RegExp.$1) * scale;
    const fontSizeUnit = RegExp.$2;
    
    const bodyLineHeight = fontSizeValue * 2 - 1;
    this.dataTipItems.applyInlineStyles(
      ['fontSize', `${fontSizeValue}${fontSizeUnit}`],
      ['lineHeight', `${bodyLineHeight}${fontSizeUnit}`],
      ['fontWeight', textStyle.fontWeight],
      ['fontStyle', textStyle.fontStyle],
      ['color', textStyle.color]
    );

    // 字体更改后 dataTip的位置需要重新计算
    this.calculatePosition();
  }

  public setBackgroundImg(imgURL : string) {
    if(imgURL && imgURL !== '') {
      this.dataTipBox.style.backgroundImage = `url(${imgURL})`;
      this.dataTipBox.style.borderStyle = 'none';
      this.dataTipTitle.applyInlineStyles(['borderStyle', 'none']);
    } else {
      this.dataTipBox.style.backgroundImage = '';
      this.dataTipBox.style.borderStyle = 'solid';
      this.dataTipTitle.applyInlineStyles(['borderStyle', 'solid']);
    }
  }

  public setBackgroundColor(color : string) {
    if(color) {
      this.dataTipBox.style.backgroundColor = color;
    }
  }

  public setRoomStore(roomStore : RoomStore) {
    this._roomStore = roomStore;
  }
}

class DataTipTitle extends BaseWindow {
  constructor(titleText:string) {
    super('dialog-title');
    const titleLabel = document.createElement('span');
    titleLabel.className = 'dialog-title-text';
    titleLabel.innerText = titleText;
    this.dom.appendChild(titleLabel);
  }
}

class DataTipItems extends BaseWindow {
  private _itemsContainer : HTMLDivElement;
  private _labelBox : HTMLDivElement;
  private _valueBox : HTMLDivElement;
  constructor() {
    super('data-tip-items');

    this._itemsContainer = document.createElement('div');
    this._itemsContainer.className = 'items-container';

    this._labelBox = document.createElement('div');
    this._labelBox.className = 'label-box';
    
    this._valueBox = document.createElement('div');
    this._valueBox.className = 'value-box';
    this._itemsContainer.appendChild(this._labelBox);
    this._itemsContainer.appendChild(this._valueBox);

    this.dom.appendChild(this._itemsContainer);
  }

  public update(fields: Array<VisualNS.ILabelFields>) {
    this.clear();
    if (fields === undefined) return;
    for (let i = 0; i < fields.length; i++) {
      this.createItem(fields[i]);
    }
  }

  private clear() {
    this._labelBox.innerHTML = '';
    this._valueBox.innerHTML = ''
  }

  private createItem(field: VisualNS.ILabelFields) {

    const label = document.createElement('div');
    label.innerText = field.label;
    label.title = field.label;

    const value = document.createElement('div');
    value.innerText = field.value;
    value.title = field.value;

    this._labelBox.appendChild(label);
    this._valueBox.appendChild(value);
  }
}