import '../style/visual.less';
import ModelingWorld from './engine/World';
import MainWindow from './ui/MainWindow';
import AnimationLoadService from './engine/components/AnimationLoadService';
import WynPropertiesSettingService from './engine/components/WynPropertiesSettingService'; 
import RoomStore from './engine/data/RoomData';
import RoomService from './engine/components/RoomService';
import CameraService from './engine/components/CameraService';
import LoopFocusRoomService from './engine/components/LoopFocusRoomService';
import UpdateOptionsDispatcher from './engine/components/UpdateOptionsDispatcher';
import DataLabelService from './engine/components/DataLabelService';
let html2canvas;

export default class Visual extends WynVisual {
  private mainWindow: MainWindow;
  private _selectionManager : VisualNS.SelectionManager;
  private _selectionService : VisualNS.SelectionService;
  private _roomService = RoomService.getInstance();
  private _updateOptionsDispatcher = UpdateOptionsDispatcher.getInstance();
  private _dom: HTMLDivElement;

  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    super(dom, host, options);

    this._dom = dom;
    this._updateOptionsDispatcher.storeOptions(options);
    html2canvas = host.moduleManager.getModule('html2canvas');

    this._selectionService = host.selectionService;
    this._selectionManager = host.selectionService.createSelectionManager();

    this.mainWindow = new MainWindow(host);
    this.mainWindow.render(dom);
    
    // 依赖注入
    this.injectDependencies(host);
    ////////////////////////////////////////////////////////////
    
    const cameraService = CameraService.getInstance();
    const propertiesSetting = WynPropertiesSettingService.getInstance();

    host.eventService.registerOnCustomEventCallback((name: string) => {
      switch(name) {
        case 'importModel': {
          this.mainWindow.importWindow.switchOpenOrHide();
          break;
        }
        case 'animationSettings':{
          this.mainWindow._animationSettingsWindow.switchOpenOrHide();
          break;
        }
        case 'setDefaultCamera' : {
            const position = cameraService.getCurrentCameraPosition();
            const target = cameraService.getCurrentCameraTarget();
            propertiesSetting.setDefaultCamera(position, target);
          break;
        }
        default:
          break;
        }
    });

    this.mainWindow.loadingTip.showPleaseLoad();
    this.mainWindow.viewport.start();
    this._selectionManager.registerOnSelectCallback(selectionIds => this._roomService.updateModelWhenSelectionChanged(selectionIds));
  }

  public update(options: VisualNS.IVisualUpdateOptions) {
    this._updateOptionsDispatcher.dispatchUpdate(options);
  }

  public onDestroy() {
    this.mainWindow.destroy();
  }

  public onResize() {
    this.mainWindow.viewport.resize();
  }

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    const hiddenSet = new Set<string>();
    const properties = options.properties as PropertiesShape;

    if(!properties.showDataLabel) {
      hiddenSet.add('dataLabelShowValue');
      hiddenSet.add('dataLabelValueFormat');
      hiddenSet.add('dataLabelValueUnit');
      hiddenSet.add('dataLabelShowColumnName');
      hiddenSet.add('dataLabelTextStyle');
      hiddenSet.add('dataLabelShowRoomId');
      hiddenSet.add('dataLabelDelimiter');
      hiddenSet.add('dataLabelPadding');
      hiddenSet.add('dataLabelBorderWidth');
      hiddenSet.add('dataLabelBorderColor');
      hiddenSet.add('dataLabelBackgroundColor');
      hiddenSet.add('dataLabelBackgroundImage');
      hiddenSet.add('dataLabelHorizontalPosition')
      hiddenSet.add('dataLabelVerticalPosition');
      hiddenSet.add('dataLabelOffsetLeft');
      hiddenSet.add('dataLabelOffsetTop');
    } else {
      if(!properties.dataLabelShowValue) {
        hiddenSet.add('dataLabelValueFormat');
        hiddenSet.add('dataLabelValueUnit');
      }
      if(!properties.dataLabelShowColumnName) {
        hiddenSet.add('dataLabelDelimiter');
      }
    }

    return Array.from(hiddenSet);
  }

  public getActionBarHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    const hiddenActionBar = new Set<string>();
    if(!options.properties.modelUrl || options.properties.modelUrl === '') {
      // 如果没有加载模型 不显示设置动画和设置默认相机
      hiddenActionBar.add('animationSettings');
      hiddenActionBar.add('setDefaultCamera');
    }

    // 显示这importModel animationSettings setDefaultCamera的时机
    // 1. 仅在编辑Dashboard的时候才显示 即 isViewer === false的情况下才可能显示
    // 2. 仅在模型chart为isEditing或者isFocus为true时才显示
    // 综上，显示的条件为 !isViewer && (isEditing || isFocus)
    // 则，  不显示的条件为 isViewer || (!isEditing && !isFocus)

    if(options.isViewer || (!options.isEditing && !options.isFocus)) {
      // 仅在聚焦或编辑状态下 才可以使用导入模型的操作
      hiddenActionBar.add('importModel');
      hiddenActionBar.add('animationSettings');
      hiddenActionBar.add('setDefaultCamera');
    }
    return Array.from(hiddenActionBar);
  }

  public async export() {
    this.mainWindow.viewport.forceRender();
    const canvas = await html2canvas(this._dom, { backgroundColor: null });
    return canvas.toDataURL()
  }

  private injectDependencies(host : VisualNS.VisualHost) {
    WynPropertiesSettingService.getInstance().setPropertyService(host.propertyService);
    WynPropertiesSettingService.getInstance().setUpdateOptionsDispatcher(UpdateOptionsDispatcher.getInstance());
    RoomStore.getInstance().setSelectionService(this._selectionService);
    AnimationLoadService.getInstance().setViewPort(this.mainWindow.viewport);
    this.mainWindow._animationSettingsWindow.setWynPropertiesSettingService(WynPropertiesSettingService.getInstance());
    this.mainWindow._animationSettingsWindow.setAnimationLoadService(AnimationLoadService.getInstance());
    RoomService.getInstance().setRoomStore(RoomStore.getInstance());
    RoomService.getInstance().setCameraService(CameraService.getInstance());
    CameraService.getInstance().setAnimationLoopRegister(this.mainWindow.viewport);
    CameraService.getInstance().setModelingWorld(ModelingWorld.getInstance())
    RoomService.getInstance().setAnimationLoopRegister(this.mainWindow.viewport);
    this.mainWindow.viewport.setCameraService(CameraService.getInstance());
    this.mainWindow.optionBar.cameraListBox.cameraList.setRoomService(RoomService.getInstance());
    RoomService.getInstance().setDataTip(this.mainWindow.dataTip);
    LoopFocusRoomService.getInstance().setRoomService(RoomService.getInstance());
    this.mainWindow.optionBar.loopSwitch.setLoopFocusRoomService(LoopFocusRoomService.getInstance());
    UpdateOptionsDispatcher.getInstance().setMainWindow(this.mainWindow);
    UpdateOptionsDispatcher.getInstance().setCameraService(CameraService.getInstance());
    UpdateOptionsDispatcher.getInstance().setFormatService(host.formatService);
    UpdateOptionsDispatcher.getInstance().setDataLabelService(DataLabelService.getInstance());
    UpdateOptionsDispatcher.getInstance().setRoomStore(RoomStore.getInstance());
    UpdateOptionsDispatcher.getInstance().setRoomService(RoomService.getInstance());
    UpdateOptionsDispatcher.getInstance().setLoopFocusRoomService(LoopFocusRoomService.getInstance());
    UpdateOptionsDispatcher.getInstance().setModelingWorld(ModelingWorld.getInstance());
    UpdateOptionsDispatcher.getInstance().setAnimationLoadService(AnimationLoadService.getInstance());
    this.mainWindow.importWindow.setWynPropertiesSettingService(WynPropertiesSettingService.getInstance());
    this.mainWindow.importWindow.setUpdateOptionsDispatcher(UpdateOptionsDispatcher.getInstance());
    this.mainWindow.importWindow.setModelingWorld(ModelingWorld.getInstance());
    this.mainWindow.dataTip.setRoomStore(RoomStore.getInstance());
    this.mainWindow._animationSettingsWindow.setPropertiesStore(UpdateOptionsDispatcher.getInstance());
    DataLabelService.getInstance().setCanvasDrawable2d(this.mainWindow.viewport);
    DataLabelService.getInstance().setCameraService(CameraService.getInstance());
    DataLabelService.getInstance().setRoomService(RoomService.getInstance());
    ModelingWorld.getInstance().setAnimationLoadService(AnimationLoadService.getInstance());
    ModelingWorld.getInstance().setCameraService(CameraService.getInstance());
    ModelingWorld.getInstance().setDataLabelService(DataLabelService.getInstance());
    ModelingWorld.getInstance().setRoomStore(RoomStore.getInstance());

    this.mainWindow.interactionLayer.bindClickEvent(RoomService.getInstance(), this._selectionManager, CameraService.getInstance(), host.contextMenuService);
    this.mainWindow.interactionLayer.bindCameraObitControls(CameraService.getInstance());
  }
}