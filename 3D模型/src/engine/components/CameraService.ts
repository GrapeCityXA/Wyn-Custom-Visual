import { PerspectiveCamera, Plane, Vector2, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import TWEEN from '@tweenjs/tween.js';
import ModelingWorld from "../World";
import Viewport from "src/ui/mods/Viewport";

export default class CameraService {
  private _currentCamera : PerspectiveCamera;
  // 相机的默认位置
  private _defaultCameraX : number | undefined;
  private _defaultCameraY : number | undefined;
  private _defaultCameraZ : number | undefined;
  ///////////////////////////////////////////////
  
  // 相机默认的观察目标
  private _defaultTargetX : number | undefined;
  private _defaultTargetY : number | undefined;
  private _defaultTargetZ : number | undefined;
  ///////////////////////////////////////////////

  // 控制器以及控制器在主循环中执行的更新
  private _cameraOrbitController : OrbitControls;
  private _orbitControllerAnimate : () => void;
  ///////////////////////////////////////////////

  // 移动相机的动画
    // 在移动相机的过程中 再次移动相机 需要取消上一次的移动动画
  private _moveCameraAnimate : (time : number) => void;
  //////////////////////////////////////////////

  /**
   * 用来计算相机的远端 far = CAMERA_FAR_SCALE * 模型外接球半径
   */
  private static CAMERA_FAR_SCALE = 100;

  // 依赖
  private _viewport : Viewport;
  private _modelingWorld : ModelingWorld;
  //////////////////////////////////////////////////////////////

  private constructor() {
    this._currentCamera = new PerspectiveCamera();
  };
  private static instance : CameraService;
  public static getInstance() {
    if(!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  public initCameraController() {

    if(!this._cameraOrbitController) {
      return ;
    }

    const cameraFar = this._modelingWorld.getWorldBoundingSphereRadius() * CameraService.CAMERA_FAR_SCALE;

    const currentCamera = this.getCurCamera();
    currentCamera.position.copy(this.getDefaultCameraPosition());
    currentCamera.far = cameraFar;
    currentCamera.updateProjectionMatrix();

    // 相机移动到最远的距离不能超过相机的far 否则相机就无法看到模型
    this._cameraOrbitController.maxDistance = cameraFar;
    this._cameraOrbitController.target.copy(this.getDefaultCameraTarget());
    this._cameraOrbitController.update(); // 将上面更新的target应用到相机
  }

  public bindControllerEventListener(dom?:HTMLElement) {
    if(!dom) {
      return ;
    }
    this._cameraOrbitController = new OrbitControls(this.getCurCamera(), dom);
  }

  public getCurCamera() {
    // if(!this._currentCamera) throw 'Please call .initCamera()';
    return this._currentCamera;
  }

  // public disableOrbitController() {
  //   this._cameraOrbitController.enabled = false;
  // }

  // public enableOrbitController() {
  //   this._cameraOrbitController.enabled = true;
  // }

  /**
   * 修改相机的位置和面向
   * 如果不传递目标位置（面向） 使用默认的目标（面向）
   * @param tPosition 
   * @param tLookAt 
   */
  public moveCurCameraTo(tPosition?:Vector3, tLookAt?:Vector3) {
    if(!this._viewport) throw 'Please call .setAnimationLoopRegister() to inject \
    a instance of AnimationNS.Registerable'

    // 在一次相机移动结束前 再次移动相机 取消当前移动相机的动画
    this._moveCameraAnimate && this._viewport.dismiss(this._moveCameraAnimate);

    // this.disableOrbitController();

    const sPosition = new Vector3();
    this._currentCamera.getWorldPosition(sPosition);
    const sLookAt = this._cameraOrbitController.target.clone();

    tPosition = tPosition || this.getDefaultCameraPosition();
    tLookAt = tLookAt || this.getDefaultCameraTarget();

    const tween = new TWEEN.Tween({position:sPosition, lookAt:sLookAt})
    .to({position:tPosition, lookAt:tLookAt}, 1000)
    .easing(TWEEN.Easing.Cubic.InOut)
    .onUpdate(({position, lookAt}) => {
      this._currentCamera.position.copy(position);
      this._cameraOrbitController.target.copy(lookAt);
      this._cameraOrbitController.update();
    });

    const animate = (time:number) => {
      tween.update(time);
    }

    tween.onComplete(() => {
      this._viewport.dismiss(animate);
      // this.enableOrbitController();
    }).start();
    this._viewport.register(animate);

    this._moveCameraAnimate = animate;
  }

  public setAnimationLoopRegister(viewport:Viewport) {
    this._viewport = viewport;
  }

  public setDefaultCameraPosition(x : number, y : number, z : number) {
    this._defaultCameraX = x;
    this._defaultCameraY = y;
    this._defaultCameraZ = z;

    this.getCurCamera().position.copy(this.getDefaultCameraPosition());
    this._cameraOrbitController.update();
  }


  public getDefaultCameraPosition() {
    const originPosition = this._modelingWorld.getOriginCameraPosition();
    const x = this._defaultCameraX === undefined ? originPosition.x : this._defaultCameraX;
    const y = this._defaultCameraY === undefined ? originPosition.y : this._defaultCameraY;
    const z = this._defaultCameraZ === undefined ? originPosition.z : this._defaultCameraZ;
    return new Vector3(x, y, z);
  }

  public setDefaultCameraTarget(x : number, y : number, z : number) {
    this._defaultTargetX = x;
    this._defaultTargetY = y;
    this._defaultTargetZ = z;

    this._cameraOrbitController.target.copy(this.getDefaultCameraTarget());
    this._cameraOrbitController.update();
  }


  public getDefaultCameraTarget() {
    const originTarget = this._modelingWorld.getOriginCameraTarget();
    const x = this._defaultTargetX === undefined ? originTarget.x : this._defaultTargetX;
    const y = this._defaultTargetY === undefined ? originTarget.y : this._defaultTargetY;
    const z = this._defaultTargetZ === undefined ? originTarget.z : this._defaultTargetZ;
    return new Vector3(x, y, z);
  }


  public setModelingWorld(world:ModelingWorld) {
    this._modelingWorld = world;
  }

  public getScene() {
    return this._modelingWorld.getScene();
  }

  public getCurrentCameraPosition() {
    return this.getCurCamera().getWorldPosition(new Vector3());
  }

  public getCurrentCameraTarget() {
    return this._cameraOrbitController.target.clone();
  }
}