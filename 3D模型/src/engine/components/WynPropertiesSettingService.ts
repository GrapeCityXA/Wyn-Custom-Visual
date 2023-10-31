import { Vector3 } from "three";
import UpdateOptionsDispatcher from "./UpdateOptionsDispatcher";

export default class WynPropertiesSettingService implements AnimationNS.AnimationSettable {
  // 依赖
  private _propertyService : VisualNS.PropertyService;
  private _updateOptionsDispatcher : UpdateOptionsDispatcher;
  //////////////////////////////////////////////////

  // 可设置的属性名
  public static MODEL_URL = 'modelUrl';

  private static ANIMATIONS_LOAD = 'animations';

  private static DEFAULT_CAMERA_POS_X = 'defaultCameraX';
  private static DEFAULT_CAMERA_POS_Y = 'defaultCameraY';
  private static DEFAULT_CAMERA_POS_Z = 'defaultCameraZ';
  private static DEFAULT_CAMERA_TAR_X = 'defaultTargetX';
  private static DEFAULT_CAMERA_TAR_Y = 'defaultTargetY';
  private static DEFAULT_CAMERA_TAR_Z = 'defaultTargetZ';

  private static DATA_TIP_HORIZONTAL = 'horizontalPosition';
  private static DATA_TIP_VERTICAL   = 'verticalPosition';
  private static DATA_TIP_TOP  = 'dataTipTop';
  private static DATA_TIP_LEFT = 'dataTipLeft';
  //////////////////////////////////////////////////

  private constructor() {
  }
  private static instance : WynPropertiesSettingService;
  public static getInstance() {
    if(!WynPropertiesSettingService.instance) {
      WynPropertiesSettingService.instance = new WynPropertiesSettingService();
    }
    return WynPropertiesSettingService.instance;
  }

  public setPropertyService(propertyService : VisualNS.PropertyService) {
    this._propertyService = propertyService;
  }

  public setUpdateOptionsDispatcher(dispatcher : UpdateOptionsDispatcher) {
    this._updateOptionsDispatcher = dispatcher;
  }


  public setAnimationOptions(optionsJSON) {
    if(!this._propertyService) throw 'Please call .setPropertyService() to inject a instance of \
    VisualNS.PropertyService before call .setAnimationOptions()';

    this._propertyService.setProperty(WynPropertiesSettingService.ANIMATIONS_LOAD, optionsJSON);
  }

  public setDefaultCamera(position:Vector3, target:Vector3) {
    if(!this._propertyService) throw 'Please call .setPropertyService() to inject a instance of \
    VisualNS.PropertyService before call .setDefaultCamera()';
    if(!this._updateOptionsDispatcher) throw 'Please call .setUpdateOptionsDispatcher() to inject a instance of \
    VisualNS.PropertyService before call .setDefaultCamera()';

    this._updateOptionsDispatcher.disableAutoCommit();
    this._propertyService.setProperty(WynPropertiesSettingService.DEFAULT_CAMERA_POS_X, position.x);
    this._propertyService.setProperty(WynPropertiesSettingService.DEFAULT_CAMERA_POS_Y, position.y);
    this._propertyService.setProperty(WynPropertiesSettingService.DEFAULT_CAMERA_POS_Z, position.z);
    this._propertyService.setProperty(WynPropertiesSettingService.DEFAULT_CAMERA_TAR_X, target.x);
    this._propertyService.setProperty(WynPropertiesSettingService.DEFAULT_CAMERA_TAR_Y, target.y);
    this._propertyService.setProperty(WynPropertiesSettingService.DEFAULT_CAMERA_TAR_Z, target.z);
    setTimeout(() => {
      // 下一个事件循环会多次执行update()
      // 所以要在所有update()执行完成后 updateOptionsDispatcher才会拿到最后的options
      setTimeout(() => {
        // 提交最终的options
        this._updateOptionsDispatcher.enableAutoAndCommit();
      }, 0);
    }, 0);
  }

  public setModelURL(modelURL : string) {
    if(!this._propertyService) throw 'Please call .setPropertyService() to inject a instance of \
    VisualNS.PropertyService before call .setModelURL()';

    this._propertyService.setProperty(WynPropertiesSettingService.MODEL_URL, modelURL);
  }
}