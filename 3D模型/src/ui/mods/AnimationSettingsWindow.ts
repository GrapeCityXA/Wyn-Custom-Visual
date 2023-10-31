import { LoopOnce, LoopRepeat, LoopPingPong, AnimationActionLoopStyles } from 'three';
import AnimationLoadService from "../../engine/components/AnimationLoadService";
import BaseWindow from "../BaseWindow";
import WynPropertiesSettingService from '../../engine/components/WynPropertiesSettingService'; 

export default class AnimationSettingsWindow extends BaseWindow{

  /////////////开场动画相关设置的DOM元素////////
  // 开场动画的选择框
  private _openingAnimationSelectBox : SingleSelectBox<string>;
  // 是否
  private _openingAnimationStopAtLastFrameCheck : SingleSelectBox<boolean>;
  ////////////////////////////////////////////

  // 循环动画的选择框
  private _loopingAnimationSelectBox : MultiSelectBox<string>;
  private _loopingAnimationStartAfterOpeningCheck : SingleSelectBox<boolean>;
  private _loopingAnimationLoopModeSelectBox : SingleSelectBox<AnimationActionLoopStyles>;
  ///////////////////////////////////////////


  // 依赖
  private _optionsSetter : AnimationNS.AnimationSettable = WynPropertiesSettingService.getInstance();
  private _animationLoadService : AnimationLoadService = AnimationLoadService.getInstance();
  private _propertiesStore : PropertiesAvailable;
  private _localizationManager : VisualNS.LocalizationManager;
  ///////////////////////////////////////////

  private _isHidden : boolean;
  private _body : HTMLDivElement;

  constructor(localizationManager:VisualNS.LocalizationManager) {
    super('animation-settings dialog');
    const dialogTitle = document.createElement('div');
    dialogTitle.className = 'dialog-title';
    const dialogTitleText = document.createElement('span');
    dialogTitleText.innerHTML = localizationManager.getDisplay('window.animationSettings.title');
    dialogTitleText.className = 'dialog-title-text'
    dialogTitle.appendChild(dialogTitleText);
    this._body = document.createElement('div');
    this._body.className = 'sections-container';
    this.dom.appendChild(dialogTitle);
    this.dom.appendChild(this._body);
    this._localizationManager = localizationManager;
    this.hidden();
  }



  private renderWindow() {

    if(!this._animationLoadService) throw 'Please call .setAnimationLoadService() to inject a instance';
    if(!this._optionsSetter) throw 'Please call .setWynPropertiesSettingService() to inject a instance';

    let animationOptions : AnimationNS.AnimationOptions;
    try {
      animationOptions = JSON.parse(this._propertiesStore.getPropertyByName('animations')) as AnimationNS.AnimationOptions;
    } catch {
      animationOptions = {};
    }
    const clipNameItems = this._animationLoadService.getClipsNames().map(clipName => ({display : clipName, value : clipName}));
    
    this._body.innerHTML = '';
    if(clipNameItems.length === 0) {
      this.renderTips(); 
      return ;
    }
    
    const getDisplay = key => this._localizationManager.getDisplay(`window.animationSettings.${key}`);
    
    let hasOpeningAnimation = false;
    const openingItems = clipNameItems.map(clipNameItem => {
      if(animationOptions.openingAnimation && animationOptions.openingAnimation.clipName === clipNameItem.display) {
        hasOpeningAnimation = true;
      }
      return {
        ...clipNameItem,
        checked : animationOptions.openingAnimation && animationOptions.openingAnimation.clipName === clipNameItem.display,
      }
    });

    this._openingAnimationSelectBox = new SingleSelectBox(
      getDisplay('selectOpeningAnimation'),
      'opening-animation',
      [
        {
          display : getDisplay('none'),
          value:null,
          checked : !hasOpeningAnimation,
        },
        ...openingItems
      ]
    );
    
    const stopAtLastFrame = animationOptions.openingAnimation && animationOptions.openingAnimation.stopAtLastFrame;
    this._openingAnimationStopAtLastFrameCheck = new SingleSelectBox(
      getDisplay('openingStopWhere'),
      'opening-animation-end',
      [
        {
          display : getDisplay('stopAtFirstFrame'),
          value : true,
          checked : stopAtLastFrame,
        },
        {
          display : getDisplay('stopAtLastFrame'),
          value : false,
          checked : !stopAtLastFrame,
        },
      ]
    );

    let loopMode;
    let loopingStartAfterOpening;
    const loopingItems = clipNameItems.map(clipNameItem => {
      const loopingAnimations = animationOptions.loopingAnimations;
      const index = loopingAnimations && loopingAnimations.findIndex(animationOption => {
        loopMode = animationOption.loopMode;
        loopingStartAfterOpening = animationOption.startAfterOpening;
        return animationOption.clipName === clipNameItem.display;
      })
      return {
        ...clipNameItem,
        checked : index > -1,
      };
    });
    this._loopingAnimationSelectBox = new MultiSelectBox(
      getDisplay('selectLoopingAnimations'),
      'looping-animation',
      loopingItems,
    );
    this._loopingAnimationStartAfterOpeningCheck = new SingleSelectBox(
      getDisplay('whenLoopingAnimationStart'),
      'after-entrance-animation',
      [
        {
          display : getDisplay('atTheSameTimeWithOpening'),
          value : false,
          checked : !loopingStartAfterOpening,
        },
        {
          display : getDisplay('afterTheOpeningAnimationEnds'),
          value : true,
          checked : loopingStartAfterOpening,
        },
      ]
    );
    this._loopingAnimationLoopModeSelectBox = new SingleSelectBox(
      getDisplay('loopMode'),
      'looping-mode',
      [
        {
          display : getDisplay('repeat'),
          value : LoopRepeat,
          checked : !loopMode || LoopRepeat === loopMode,
        },
        {
          display : getDisplay('pingPong'),
          value : LoopPingPong,
          checked : LoopPingPong === loopMode,
        },
        {
          display : getDisplay('once'),
          value : LoopOnce,
          checked : LoopOnce === loopMode,
        },
      ],
    );

    this._openingAnimationSelectBox.setBodyMaxHeight('100px');
    this._openingAnimationSelectBox.render(this._body);
    this._openingAnimationStopAtLastFrameCheck.render(this._body);
    this._loopingAnimationSelectBox.render(this._body);
    this._loopingAnimationSelectBox.setBodyMaxHeight('100px');
    this._loopingAnimationStartAfterOpeningCheck.render(this._body);
    this._loopingAnimationLoopModeSelectBox.render(this._body);

    const buttonsBox = document.createElement('div');
    buttonsBox.className = 'buttons-box';
    const apply = document.createElement('div');
    apply.className = 'btn ok';
    apply.innerText = this._localizationManager.getDisplay('apply');
    apply.addEventListener('click', this._onclickApply.bind(this));
    const cancel = document.createElement('div');
    cancel.className = 'btn cancel';
    cancel.innerText = this._localizationManager.getDisplay('cancel');
    cancel.addEventListener('click', this._onclickCancel.bind(this));
    buttonsBox.appendChild(apply);
    buttonsBox.appendChild(cancel);
    this._body.appendChild(buttonsBox);
  }

  private renderTips() {
    const tip = document.createElement('div');
    tip.innerHTML = this._localizationManager.getDisplay('window.animationSettings.tipWhenNoAnimation');

    this._body.appendChild(tip);
    const buttonsBox = document.createElement('div');
    buttonsBox.className = 'buttons-box';

    const cancel = document.createElement('div');
    cancel.className = 'btn cancel';
    cancel.innerText = this._localizationManager.getDisplay('cancel');
    cancel.addEventListener('click', this._onclickCancel.bind(this));
    buttonsBox.appendChild(cancel);
    this._body.appendChild(buttonsBox);
  }

  private _onclickApply() {
    const animationOptions : AnimationNS.AnimationOptions = {};

    if(this._openingAnimationSelectBox.getValue()) {
      animationOptions['openingAnimation'] = {
        clipName : this._openingAnimationSelectBox.getValue(),
        stopAtLastFrame : this._openingAnimationStopAtLastFrameCheck.getValue(),
      };
    }

    if(this._loopingAnimationSelectBox.getValues()[0]) {
      animationOptions['loopingAnimations'] = this._loopingAnimationSelectBox.getValues().map(clipName => ({
        clipName,
        startAfterOpening : this._loopingAnimationStartAfterOpeningCheck.getValue(),
        loopMode : this._loopingAnimationLoopModeSelectBox.getValue(),
      }));
    }

    const optionJSON = JSON.stringify(animationOptions);
    this._optionsSetter.setAnimationOptions(optionJSON);

    this._animationLoadService.configWithOptionsJSON(optionJSON);
    this.hidden();
  }

  private _onclickCancel() {
    this.hidden();
  }

  public show() {
    this.renderWindow();
    this._isHidden = false;
    this.dom.style.display = 'flex';
  }

  public hidden() {
    this._isHidden = true;
    this.dom.style.display = 'none';
  }

  public switchOpenOrHide() {
    this._isHidden ? this.show() : this.hidden();
  }

  public setWynPropertiesSettingService(wynPropertiesSettingService : WynPropertiesSettingService) {
    this._optionsSetter = wynPropertiesSettingService;
  }

  public setAnimationLoadService(animationLoadService : AnimationLoadService) {
    this._animationLoadService = animationLoadService;
  }

  public setPropertiesStore(propertiesStore : PropertiesAvailable) {
    this._propertiesStore = propertiesStore;
  }
}

class MultiSelectBox<T> extends BaseWindow {
  private _selectedValues : Set<T>;
  private _selectedItems : SelectItem<T>[];
  private _optionsContainer : HTMLDivElement;
  constructor(topic:string, prefix:string, items : Array<RenderNS.Item<T> & { checked : boolean }>) {
    super('section');
    const topicElement = document.createElement('div');
    topicElement.className = 'section-topic';
    topicElement.innerHTML = topic;

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'section-options-container';
    this._optionsContainer = optionsContainer;
    
    let cnt = 0;
    this._selectedValues = new Set();
    this._selectedItems = new Array();
    for(const item of items) {
      if(item.checked) {
        this._selectedValues.add(item.value);
      }
      const selectItem = new SelectItem('multi', item, prefix, ++cnt+'', (value, checked) => {
        if(checked) {
          this._selectedValues.add(value);
        } else {
          this._selectedValues.delete(value);
        }
      });

      this._selectedItems.push(selectItem);
      selectItem.render(optionsContainer);
    }

    this.dom.appendChild(topicElement);
    this.dom.appendChild(optionsContainer);
  }
  
  public getValues() {
    return Array.from(this._selectedValues);
  }

  public setBodyMaxHeight(maxHeight:string) {
    this._optionsContainer.style.maxHeight = maxHeight;
  }
}


class SingleSelectBox<T> extends BaseWindow {

  private _selectedValue : T;
  private _selectedItems : SelectItem<T>[];
  private _optionsContainer : HTMLDivElement;

  constructor(topic:string, prefix:string, items : Array<RenderNS.Item<T> & { checked : boolean }>) {
    super('section');
    const topicElement = document.createElement('div');
    topicElement.className = 'section-topic';
    topicElement.innerHTML = topic;

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'section-options-container';
    this._optionsContainer = optionsContainer;

    let cnt = 0;
    this._selectedItems = new Array();
    for(const item of items) {
      if(item.checked) {
        this._selectedValue = item.value;
      }
      const selectItem = new SelectItem('single', item, prefix, ++cnt+'', (value, checked) => {
        if(checked) {
          this._selectedValue = value;
        }
      });

      this._selectedItems.push(selectItem);
      selectItem.render(optionsContainer);
    }

    this.dom.appendChild(topicElement);
    this.dom.appendChild(optionsContainer);
  }

  public getValue() {
    return this._selectedValue;
  }

  public setBodyMaxHeight(maxHeight:string) {
    this._optionsContainer.style.maxHeight = maxHeight;
  }
}

class SelectItem<T> extends BaseWindow implements RenderNS.Selectable {

  private _value : T;
  private _itemElement : HTMLInputElement;

  constructor(type:'single' | 'multi', item : RenderNS.Item<T> & { checked : boolean }, prefix:string, id : string, onClick? : (value:T, checked : boolean) => void) {
    super('section-option');

    const { display, value, checked } = item;
    this._value = value;
    this.dom.title = item.display;

    const itemElement = document.createElement('input');
    itemElement.type = type === 'single' 
                     ? 'radio'
                     : type === 'multi'
                     ? 'checkbox'
                     : null;
    itemElement.id = `${prefix}-${id}`;
    itemElement.name = `${prefix}`;
    itemElement.checked = checked;
    this._itemElement = itemElement;

    const label = document.createElement('label');
    label.htmlFor = itemElement.id;
    
    const optionText = document.createElement('span');
    optionText.className = 'section-option-text';
    optionText.innerHTML = display;

    this.dom.appendChild(itemElement);
    label.appendChild(optionText);
    this.dom.appendChild(label);

    this.dom.addEventListener('click', () => onClick && onClick(this._value, this._itemElement.checked));
  }

  public select() {
    this._itemElement.checked = true;
  }

  public unselect() {
    this._itemElement.checked = false;
  }

  public getValue() {
    return this._value;
  }
}