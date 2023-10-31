import { Color, Vector3 } from "three";
import CameraService from './CameraService';
import MainWindow from "src/ui/MainWindow";
import RoomService from "./RoomService";
import RoomStore from "../data/RoomData";
import LoopFocusRoomService from "./LoopFocusRoomService";
import DataLabelService from "./DataLabelService";
import ModelingWorld from "../World";
import AnimationLoadService from "./AnimationLoadService";

export default class UpdateOptionsDispatcher implements PropertiesAvailable {

  private _mainWindow : MainWindow;

  private _cameraService = CameraService.getInstance();
  private _roomService = RoomService.getInstance();
  private _roomStore = RoomStore.getInstance();
  private _loopFocusRoomService = LoopFocusRoomService.getInstance();
  private _formatService : VisualNS.FormatService;
  private _dataLabelService : DataLabelService;
  private _modelingWorld : ModelingWorld;
  private _animationService : AnimationLoadService;

  /**
   * 用来进行比较的options 通常为上一次的options
   */
  private _options : VisualNS.IVisualUpdateOptions;
  /**
   * 当options变化时 是否更新
   * 在记录当前相机位置为默认相机位置时 不需要对当前相机位置进行更新
   */
  private _autoCommit : boolean;

  /**
   * 配合_autoCommit完成批量的属性更新
   * 在调用disable()后 dispatch()接收到的数据存储到_batchOptions
   * 调用enable() 调用dispatch(_batchOptions)
   */
  private _batchOptions : VisualNS.IVisualUpdateOptions;

  private static instance:UpdateOptionsDispatcher;
  private constructor() {
    this._autoCommit = true;
  }
  public static getInstance() {
    if(!UpdateOptionsDispatcher.instance) {
      UpdateOptionsDispatcher.instance = new UpdateOptionsDispatcher();
    }
    return UpdateOptionsDispatcher.instance;
  }

  public dispatchOptionsStored() {
    const options = this._options;
    this._updateBackgroundColor(options.properties['background']);
    const { defaultCameraX, defaultCameraY, defaultCameraZ } = options.properties;
    this._cameraService.setDefaultCameraPosition(defaultCameraX, defaultCameraY, defaultCameraZ);
    const { defaultTargetX, defaultTargetY, defaultTargetZ } = options.properties;
    this._cameraService.setDefaultCameraTarget(defaultTargetX, defaultTargetY, defaultTargetZ);
    this._loopFocusRoomService.setLoopInterval(options.properties.loopTime);
    
    const dataView = options.dataViews[0];
    const plain = dataView && dataView.plain;
    this._updateRoomStore(plain, options.properties['conditionalFormat']);

    
    if(options.properties.cameraFollow) {
      this._loopFocusRoomService.enableCameraFollow();
      this._mainWindow.optionBar.loopSwitch.cameraFollowCheck.checked = true;
    } else {
      this._loopFocusRoomService.disableCameraFollow();
      this._mainWindow.optionBar.loopSwitch.cameraFollowCheck.checked = false;
    }
    // 开启相机轮询一定要在数据加载之后 否则不会生成轮询的列表
    if(options.properties.loopSwitch) {
      this._loopFocusRoomService.start();
      this._mainWindow.optionBar.loopSwitch.play();
    } else {
      this._loopFocusRoomService.stop();
      this._mainWindow.optionBar.loopSwitch.pause();
    }
    
    const properties = options.properties as PropertiesShape;
    const horizontalPosition = properties.horizontalPosition;
    const verticalPosition = properties.verticalPosition;
    const dataTipTop = parseInt(options.properties.dataTipTop);
    const dataTipLeft = parseInt(options.properties.dataTipLeft);
    this._mainWindow.dataTip.setPosition(horizontalPosition, verticalPosition, dataTipTop, dataTipLeft);
    this._mainWindow.dataTip.setTextStyle(properties.dataTipBodyTextStyle, options.scale);
    this._mainWindow.dataTip.setBackgroundColor(properties.dataTipBgColor);
    this._mainWindow.dataTip.setBackgroundImg(properties.dataTipBgImg);

    const dataLabelService = this._dataLabelService;
    const dataLabelFontConfig = properties.dataLabelTextStyle;
    dataLabelService.setFontColor(dataLabelFontConfig.color);
    dataLabelService.setFontFamily(dataLabelFontConfig.fontFamily);
    dataLabelService.setFontStyle(dataLabelFontConfig.fontStyle);
    dataLabelService.setFontWeight(dataLabelFontConfig.fontWeight);
    dataLabelService.setBaseFontSize(dataLabelFontConfig.fontSize, options.scale);
    if(properties.showDataLabel) {
      dataLabelService.showDataLabel();
    } else {
      dataLabelService.hideDataLabel();
    }
    if(properties.dataLabelShowValue) {
      dataLabelService.showValues();
    } else {
      dataLabelService.hideValues();
    }
    if(properties.dataLabelShowRoomId) {
      dataLabelService.showRoomId();
    } else {
      dataLabelService.hideRoomId();
    }
    if(properties.dataLabelShowColumnName) {
      dataLabelService.showColumnName();
    } else {
      dataLabelService.hideColumnName();
    }
    dataLabelService.setDelimiter(properties.dataLabelDelimiter);
    dataLabelService.setPadding(properties.dataLabelPadding);
    dataLabelService.setBorderWidth(properties.dataLabelBorderWidth);
    dataLabelService.setBorderColor(properties.dataLabelBorderColor);
    dataLabelService.setBackgroundColor(properties.dataLabelBackgroundColor);
    dataLabelService.setBackgroundImage(properties.dataLabelBackgroundImage);
    dataLabelService.setPosition(
      properties.dataLabelHorizontalPosition,
      properties.dataLabelVerticalPosition,
      properties.dataLabelOffsetTop,
      properties.dataLabelOffsetLeft
    );

    properties.onlyShowOnFocusRoom
      ? this._roomService.disableShowAllConditionBox()
      : this._roomService.enableShowAllConditionBox();
  }

  public dispatchUpdate
  (
    nextOptions : VisualNS.IVisualUpdateOptions,
  ) {
    if(!this._autoCommit) {
      // 如果不自动提交 则记录本次的options
      this._batchOptions = nextOptions;
      return ;
    }
    const nextProperties = nextOptions.properties;

    if(nextProperties.modelUrl !== this._modelingWorld.getURL()) {
      if(nextProperties.modelUrl && nextProperties.modelUrl !== '') {
        const url = nextProperties.modelUrl;
        const preUrl = url.split('?')[0];
        const arr = preUrl.split('/');
        const fileName = arr[arr.length - 1];
        this._mainWindow.loadingTip.showLoadingModel();
        this._modelingWorld.load(url, fileName, () => {
          // 模型加载完毕后 配置动画
          const animationOptionsJSON = nextProperties['animations'];
          if(animationOptionsJSON && animationOptionsJSON !== '') {
            this._animationService.configWithOptionsJSON(animationOptionsJSON);
          }
          this._mainWindow._animationSettingsWindow.hidden();
          this._mainWindow.loadingTip.hide();
          this._mainWindow.optionBar.show();
          this._mainWindow.viewport.setModelLoaded();
          this._mainWindow.viewport.drawModelSceneOnCanvas();
          this.dispatchOptionsStored();
        }, () => {
          this._mainWindow.loadingTip.showLoadingError();
        })
      } else {
        this._mainWindow.loadingTip.showPleaseLoad();
        this._modelingWorld.unloadScene();
      }
    }
    
    // 只有在模型加载成功后 才能更改属性
    if(!this._roomStore.hasLoadedScene()) {
      // 模型没加载成功 记录本次options
      // 模型加载成功后 可以调用dispatchOptionsStored()将数据应用到模型上
      this._options = nextOptions;
      return;
    }

    const preOptions = this._options;
    this._options = nextOptions;
    switch(nextOptions.updateType) {
      case "propertyChange" : {
        this._onPropertyChanged(preOptions, nextOptions);
        break;
      }
      
      case "dataViewChange" : {
        this._onDataViewChanged(preOptions, nextOptions);
        break;
      }

      case "scaleChange" : {
        this._onScaleChanged(nextOptions);
        break;
      }
    }
  }

  private _onPropertyChanged(preOptions:VisualNS.IVisualUpdateOptions, nextOptions:VisualNS.IVisualUpdateOptions) {
    const preProperties = preOptions.properties as PropertiesShape;
    const nextProperties = nextOptions.properties as PropertiesShape;

    const preDefaultCameraPosition  = new Vector3(preProperties.defaultCameraX, preProperties.defaultCameraY, preProperties.defaultCameraZ);
    const nextDefaultCameraPosition = new Vector3(nextProperties.defaultCameraX, nextProperties.defaultCameraY, nextProperties.defaultCameraZ);
    if(!preDefaultCameraPosition.equals(nextDefaultCameraPosition)) {
      this._cameraService.setDefaultCameraPosition(nextProperties.defaultCameraX, nextProperties.defaultCameraY, nextProperties.defaultCameraZ);
    }

    const preDefaultCameraTarget  = new Vector3(preProperties.defaultTargetX, preProperties.defaultTargetY, preProperties.defaultTargetZ);
    const nextDefaultCameraTarget = new Vector3(nextProperties.defaultTargetX, nextProperties.defaultTargetY, nextProperties.defaultTargetZ);
    if(!preDefaultCameraTarget.equals(nextDefaultCameraTarget)) {
      this._cameraService.setDefaultCameraTarget(nextProperties.defaultTargetX, nextProperties.defaultTargetY, nextProperties.defaultTargetZ);
    }

    if(preProperties.background !== nextProperties.background) {
      this._updateBackgroundColor(nextProperties.background);
    }

    if(preProperties.loopTime !== nextProperties.loopTime) {
      // 如果修改间隔时间需要先“暂停”（clearInterval()）
      const isRunning = this._loopFocusRoomService.isRunning();
      if(isRunning) {
        this._loopFocusRoomService.pause();
      }

      // 更改间隔时间
      this._loopFocusRoomService.setLoopInterval(nextProperties.loopTime);

      // 以新的间隔时间轮询
      if(isRunning) {
        this._loopFocusRoomService.runAgainAfterPause();
      }
    }

    if(preProperties.loopSwitch !== nextProperties.loopSwitch) {
      if(nextProperties.loopSwitch) {
        if(!this._loopFocusRoomService.isRunning()) {
          this._loopFocusRoomService.start();
          this._mainWindow.optionBar.loopSwitch.play();
        }
      } else {
        this._loopFocusRoomService.stop();
        this._mainWindow.optionBar.loopSwitch.pause();
      }
    }

    if(preProperties.cameraFollow !== nextProperties.cameraFollow) {
      if(nextProperties.cameraFollow) {
        this._loopFocusRoomService.enableCameraFollow();
        this._mainWindow.optionBar.loopSwitch.cameraFollowCheck.checked = true;
      } else {
        this._loopFocusRoomService.disableCameraFollow();
        this._mainWindow.optionBar.loopSwitch.cameraFollowCheck.checked = false;
      }
    }

    if(preProperties.dataTipLeft !== nextProperties.dataTipLeft
      || preProperties.dataTipTop !== nextProperties.dataTipTop
      || preProperties.horizontalPosition !== nextProperties.horizontalPosition
      || preProperties.verticalPosition !== nextProperties.verticalPosition
      ) {
      this._mainWindow.dataTip.setPosition(
        nextProperties.horizontalPosition,
        nextProperties.verticalPosition,
        nextProperties.dataTipTop,
        nextProperties.dataTipLeft);
    }

    this._mainWindow.dataTip.setTextStyle(nextProperties.dataTipBodyTextStyle, nextOptions.scale);
    this._mainWindow.dataTip.setBackgroundColor(nextProperties.dataTipBgColor);
    if(preProperties.dataTipBgImg !== nextProperties.dataTipBgImg) {
      this._mainWindow.dataTip.setBackgroundImg(nextProperties.dataTipBgImg);
    }

    const dataLabelService = this._dataLabelService;
    const dataLabelFontConfig = nextProperties.dataLabelTextStyle;
    dataLabelService.setFontColor(dataLabelFontConfig.color);
    dataLabelService.setFontFamily(dataLabelFontConfig.fontFamily);
    dataLabelService.setFontStyle(dataLabelFontConfig.fontStyle);
    dataLabelService.setFontWeight(dataLabelFontConfig.fontWeight);
    dataLabelService.setBaseFontSize(dataLabelFontConfig.fontSize, nextOptions.scale);
    if(nextProperties.showDataLabel) {
      dataLabelService.showDataLabel();
    } else {
      dataLabelService.hideDataLabel();
    }
    if(nextProperties.dataLabelShowValue) {
      dataLabelService.showValues();
    } else {
      dataLabelService.hideValues();
    }
    if(nextProperties.dataLabelShowRoomId) {
      dataLabelService.showRoomId();
    } else {
      dataLabelService.hideRoomId();
    }
    if(nextProperties.dataLabelShowColumnName) {
      dataLabelService.showColumnName();
    } else {
      dataLabelService.hideColumnName();
    }
    dataLabelService.setDelimiter(nextProperties.dataLabelDelimiter);
    dataLabelService.setBorderWidth(nextProperties.dataLabelBorderWidth);
    dataLabelService.setBorderColor(nextProperties.dataLabelBorderColor);
    dataLabelService.setBackgroundColor(nextProperties.dataLabelBackgroundColor);
    dataLabelService.setPadding(nextProperties.dataLabelPadding);
    if(preProperties.dataLabelBackgroundImage !== nextProperties.dataLabelBackgroundImage) {
      dataLabelService.setBackgroundImage(nextProperties.dataLabelBackgroundImage);
    }

    dataLabelService.setPosition(
      nextProperties.dataLabelHorizontalPosition,
      nextProperties.dataLabelVerticalPosition,
      nextProperties.dataLabelOffsetTop,
      nextProperties.dataLabelOffsetLeft
    );

    if(preProperties.onlyShowOnFocusRoom !== nextProperties.onlyShowOnFocusRoom) {
      nextProperties.onlyShowOnFocusRoom
        ? this._roomService.disableShowAllConditionBox()
        : this._roomService.enableShowAllConditionBox();
    }

    const preDataView = preOptions.dataViews[0];
    const nextDataView = nextOptions.dataViews[0];
    if(JSON.stringify(preProperties.conditionalFormat) !== JSON.stringify(nextProperties.conditionalFormat)) {
      const plain = nextDataView && nextDataView.plain;
      this._updateRoomStore(plain, nextProperties.conditionalFormat);
      this._roomService.resetConditionBox();
    }
  }

  private _onDataViewChanged(preOptions:VisualNS.IVisualUpdateOptions, nextOptions:VisualNS.IVisualUpdateOptions) {
    const preDataView = preOptions.dataViews[0];
    const prePlain = preDataView && preDataView.plain;
    const nextDataView = nextOptions.dataViews[0];
    const nextProperties = nextOptions.properties;
    const nextPlain = nextDataView && nextDataView.plain;
    this._updateRoomStore(nextPlain, nextProperties.conditionalFormat);

    // 如果当前正在轮播（轮询相机）并且数据Room数量发生改变(crossFilter 或 filter) 则重新开始轮播
    const preDataLength = prePlain && prePlain.data.length;
    const nextDataLength = nextPlain && nextPlain.data.length;
    if(this._loopFocusRoomService.isRunning() && preDataLength !== nextDataLength) {
      this._loopFocusRoomService.start(); // 会重新加载数据
    }

    if(prePlain && nextPlain) {
      const preSortOrder  = prePlain.sort[prePlain.profile['category'].values[0].display].order;
      const nextSortOrder = nextPlain.sort[nextPlain.profile['category'].values[0].display].order;
      if(JSON.stringify(preSortOrder) !== JSON.stringify(nextSortOrder)) {
        this._loopFocusRoomService.resetLoopOrder();
      }
    }

    this._roomService.resetConditionBox();
  }

  private _updateBackgroundColor(colorStr:string) {
    const renderer = this._mainWindow.viewport.getRenderer();
    if (!colorStr) {
      renderer.setClearAlpha(0);
      return;
    }
    renderer.setClearColor(new Color(colorStr));
    let rgbaReg = /rgba\([\d ]+(?:\,([\d. ]+)){3}\)/;
    if (rgbaReg.test(colorStr)) {
      renderer.setClearAlpha(Number(colorStr.replace(rgbaReg, '$1')));
    }
  }

  private _updateRoomStore(plain:VisualNS.IPlainDataView, conditions:any[]) {

    // updateRoomWithPlainDataView的逻辑是先清理上一次的数据，再加载这一次的数据
    // 如果这一次的plain是undefined，那么就只会清理上一次的数据；因为没有下一次的数据，所以起到清理作用
    // 这里必须清理 如果与Room相关的数据不进行清理 页面的各种数据都不会更新
    this._roomStore.updateRoomWithPlainDataView(plain, conditions);
    this._mainWindow.optionBar.cameraListBox.cameraList.refresh();
    if(plain) {
      const formatMap = this.calculateFormatAndUnitMapping(plain);
      this._mainWindow.dataTip.setDisplayFiledProfileAndFormat(plain.profile, formatMap);
      this._dataLabelService.setDisplayFiledProfileAndFormat(plain.profile, formatMap);
    } else {
      this._mainWindow.dataTip.hide();
      // 相机恢复默认位置
      this._roomService.focusRoomById();
    }

    /**
     * roomStore更新完成后 roomService中记录的当前聚焦的resetConditionBox还没有更新完成
     * resetConditionBox()要在roomService.focusRoomById()更新当前聚焦的room后再调用
     * 在这里调用是不恰当的 会导致bug
     */
    // this._roomService.resetConditionBox();
  }

  private calculateFormatAndUnitMapping(plain:VisualNS.IPlainDataView) {
    const formatService = this._formatService;

    const profiles = Object.values(plain.profile).map(profile => profile.values).flat();

    const ret = new Map<string, dataUseFormatAndUnit>();
    for(const fieldProfile of profiles) {
      const { display, options } = fieldProfile;
      let { format } = fieldProfile;
      let unit = DisplayUnit.Auto;
      if(options) {
        const optionsFormat = options.format;
        const optionsUnit = options.unit;

        if(optionsFormat !== Format.General) {
          format = optionsFormat;
        }

        if(optionsUnit !== DisplayUnit.Auto) {
          unit = optionsUnit;
        }
      }

      let realUnit = unit;
      if(formatService.isAutoDisplayUnit(realUnit)) {
        const values = plain.data.map(dataPoint => dataPoint[display] as number);
        realUnit = formatService.getAutoDisplayUnit(values);
      }

      ret.set(display, value => {
        if(format.split('_')[0] === 'subDate') {
          format = Format.General;
        }
        return formatService.format(format, value, realUnit);
        }
      );
    }

    return ret;
  }

  private _onScaleChanged(options:VisualNS.IVisualUpdateOptions) {
    const properties = options.properties as PropertiesShape;
    this._mainWindow.dataTip.setTextStyle(properties.dataTipBodyTextStyle, options.scale);
    this._dataLabelService.setBaseFontSize(properties.dataLabelTextStyle.fontSize, options.scale);
  }

  public storeOptions(options:VisualNS.IVisualUpdateOptions) {
    this._options = options;
  }

  public setCameraService(cameraService : CameraService) {
    this._cameraService = cameraService;
  }

  public setMainWindow(mainWindow : MainWindow) {
    this._mainWindow = mainWindow;
  }

  public setFormatService(formatService : VisualNS.FormatService) {
    this._formatService = formatService;
  }

  public enableAutoAndCommit() {
    this._autoCommit = true;

    const batchOptions = this._batchOptions;
    this._batchOptions = undefined;
    batchOptions && this.dispatchUpdate(batchOptions);
  }

  public disableAutoCommit() {
    this._autoCommit = false;
  }

  public isBatching() {
    return this._autoCommit;
  }

  public getPropertyByName(name : string) {
    if(!name) {
      return ;
    }

    return this._options.properties[name];
  }

  public setDataLabelService(dataLabelService : DataLabelService) {
    this._dataLabelService = dataLabelService;
  }

  public setRoomService(roomService : RoomService) {
    this._roomService = roomService;
  }
  public setRoomStore(roomStore : RoomStore) {
    this._roomStore = roomStore;
  }

  public setLoopFocusRoomService(loopFocusRoomService : LoopFocusRoomService) {
    this._loopFocusRoomService = loopFocusRoomService;
  }

  public setModelingWorld(modelingWorld : ModelingWorld) {
    this._modelingWorld = modelingWorld;
  }

  public setAnimationLoadService(animationService : AnimationLoadService) {
    this._animationService = animationService;
  }
}


enum DisplayUnit {
  Auto = 'auto',
  None = 'none',
  Hundreds = 'hundreds',
  Thousands = 'thousands',
  TenThousand = 'tenThousands',
  HundredThousand = 'hundredThousand',
  Millions = 'millions',
  TenMillion = 'tenMillion',
  HundredMillion = 'hundredMillion',
  Billions = 'billions',
  Trillions = 'trillions',
}

enum Format {
  General = 'General',
}