import * as THREE from "three";
import { AmbientLight, DirectionalLight, Object3D, Scene, Vector3 } from "three";
import RoomStore from "./data/RoomData";
import AnimationLoadService from "./components/AnimationLoadService";
import CameraService from "./components/CameraService";
import DataLabelService from "./components/DataLabelService";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

export default class ModelingWorld {

  private _scene : Scene;
  private _loadedObj : Object3D;
  private _originCameraPosition : Vector3;
  private _originCameraTarget : Vector3;
  private _worldCenterPosition : Vector3;
  private _worldBoundingSphereRadius : number;
  private _modelURL : string;

  // 在导入新模型后 通知其他组件更新
  private _roomStore : RoomStore;
  private _animationLoadService : AnimationLoadService;
  private _cameraService : CameraService;
  private _dataLabelService : DataLabelService;
  ////////////////////////////////////////////////////

  private constructor() {
    this.updateActList = new Array();
  }
  private static instance:ModelingWorld;
  /**
   * 单例
   */
  public static getInstance() {
    if (!ModelingWorld.instance) {
      ModelingWorld.instance = new ModelingWorld();
    }
    return ModelingWorld.instance;
  }

  public load(url: string, fileName: string, onSuccess?: () => void, onError?: () => void) {
    this._modelURL = url;
    const extension = fileName.split( '.' ).pop().toLowerCase();
    switch (extension) {
      case 'dae':
      case 'glb':
      case 'gltf':
        const loader = new GLTFLoader();
        loader.load(url, (obj) => {

          this.initScene(obj.scene.clone());
          this._animationLoadService.setClips(obj.animations);
          if (onSuccess) { onSuccess(); };

        }, (e) => {}, (e) => {
          if (onError) { onError(); };
        });
        break;

      case 'fbx':
        const fbxLoader = new FBXLoader();
        fbxLoader.load(url, (obj) => {

          this.initScene(obj.clone());
          this._animationLoadService.setClips((obj as any).animations);
          if (onSuccess) { onSuccess(); };

        }, (e) => { }, (e) => {
          if (onError) { onError(); };
        });
        break;
    }
  }

  private initScene(obj : Object3D) {

    this._scene = new Scene();
    this._loadedObj = obj;
    this._scene.add(this._loadedObj);

    // 计算相机的初始位置
    const boxHelper = new THREE.BoxHelper(this._scene);
    const center = boxHelper.geometry.boundingSphere.center;
    const radius = boxHelper.geometry.boundingSphere.radius;
    this._worldBoundingSphereRadius = radius;
    const cameraPos = new Vector3(center.x + radius, center.y + radius, center.z + radius);
    this._originCameraPosition = cameraPos;
    this._originCameraTarget = center;
    this.addLights(center, radius);

    this._dataLabelService.setBaseDistance(radius);
    this._roomStore.clearStore().loadScene(this._scene);
    this._animationLoadService.init().setScene(this._loadedObj);
    this._cameraService.initCameraController();
  }

  public unloadScene() {
    this._scene = null;
    this._loadedObj = null;
    this._modelURL = null;

    this._roomStore.clearStore();
    this._animationLoadService.init();
  }

  // 给模型添加光源
  private addLights(center:Vector3, radius:number) {
    // for(let cnt = 0; cnt < 8; ++cnt) {
    //   const x = (cnt & 0b001 ? 1 : -1) * radius;
    //   const y = (cnt & 0b010 ? 1 : -1) * radius;
    //   const z = (cnt & 0b100 ? 1 : -1) * radius;
      

    //   const light = new DirectionalLight(0xffffff, 1);
    //   const lightPosition = new Vector3(x, y, z).add(center);
    //   light.position.copy(lightPosition);
    //   this._scene.add(light);
    // }
    const directionalLight = new DirectionalLight(0xffffff, 1);
    const lightPosition = new Vector3(radius, radius, radius).add(center);
    directionalLight.position.copy(lightPosition);
    this._scene.add(directionalLight);

    const ambientLight = new AmbientLight(0xffffff, 0.4);
    this._scene.add(ambientLight);
  }

  public getURL() {
    return this._modelURL;
  }

  public getScene() {
    return this._scene;
  }

  private updateActList: (()=>void)[];
  public update() {
    this.updateActList.forEach(func => { func(); });
  }

  public addUpdateAct(func: ()=>void) {
    this.updateActList.push(func);
  }

  public clearUpdateAct() {
    this.updateActList.length = 0;
  }

  public getOriginCameraPosition() {
    return this._originCameraPosition;
  }

  public getWorldCenterPosition() {
    return this._worldCenterPosition;
  }

  public getOriginCameraTarget() {
    return this._originCameraTarget;
  }

  public getWorldBoundingSphereRadius() {
    return this._worldBoundingSphereRadius;
  }

  public setCameraService(cameraService : CameraService) {
    this._cameraService = cameraService;
  }

  public setAnimationLoadService(animationLoadService : AnimationLoadService) {
    this._animationLoadService = animationLoadService;
  }

  public setRoomStore(roomStore : RoomStore) {
    this._roomStore = roomStore;
  }

  public setDataLabelService(dataLabelService : DataLabelService) {
    this._dataLabelService = dataLabelService;
  }
}