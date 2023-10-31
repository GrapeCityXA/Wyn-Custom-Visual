import { Tween } from "@tweenjs/tween.js";
import DataTip from "src/ui/mods/DataTip";
import { BoxGeometry, BoxHelper, Mesh, MeshBasicMaterial } from "three";
import RoomStore, { Room } from "../data/RoomData";
import CameraService from "./CameraService";

export default class RoomService {
  // 依赖
  private _roomStore : RoomStore;
  private _cameraService : CameraService;
  private _animationLoop : AnimationNS.Registerable<(time:number) => void>;
  private _dataTip : DataTip;
  //////////////////////////////////////////////////////

  // selection manager中selection id变化时更新的属性
  // 通过selectionId找到对应的SelectBox
  private _mappingSelectionIdToSelectBox : Map<VisualNS.SelectionId, BoxHelper>;
  //////////////////////////////////////////////////////

  private _focusBox : BoxHelper | null; // 在模型上用于指示被聚焦的room
  private _currentFocusRoomId : string | number | null; // 被聚焦的room对象对应的id

  private _conditionFormatBoxList : Array<Mesh>;
  private _showAllConditionBox : boolean;

  private _conditionFormatAnimationUpdate : (time : number) => void;
  private _initialConditionBoxOpacity : number;

  private constructor(){

    this._initialConditionBoxOpacity = 0.7;

    this._mappingSelectionIdToSelectBox = new Map();

    this._conditionFormatBoxList = new Array();
  }
  private static instance : RoomService;
  public static getInstance() {
    if(!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  // 点击选择边框
  public updateModelWhenSelectionChanged(selectionIds : Array<VisualNS.SelectionId>) {
    if(!this._roomStore) throw 'Please call .setRoomStore() to inject a instance';

    // 找到要删除的box对应的id
    const willRemove = new Set(this._mappingSelectionIdToSelectBox.keys());
    const willAdd = new Set<VisualNS.SelectionId>();

    selectionIds.forEach(s => {
        if(!willRemove.delete(s)) {
          willAdd.add(s);
        }
      }
    );

    willRemove.forEach(s => {
      const selectBox = this._mappingSelectionIdToSelectBox.get(s);
      this._mappingSelectionIdToSelectBox.delete(s);
      selectBox.parent.remove(selectBox);
    });

    willAdd.forEach(s => {
      const room = this._roomStore.getRoomBySelectionId(s);
      // const selectBox = new BoxHelper(room.getObject(), 0x90d7ec);
      const selectBox = this.addBox(room.getObject(), 'red');
      this._mappingSelectionIdToSelectBox.set(s, selectBox);
      this._roomStore.getScene().add(selectBox);
    });
  }

//给模型套一层外壳
public addBox(clickedObject: any, color: string) {
  let animationBox = clickedObject.clone();
  animationBox.scale.multiplyScalar(1.01);
  clickedObject.getWorldPosition(animationBox.position);
  this.modifyMaterial(animationBox, color);
  return animationBox;
}
public modifyMaterial(object: any, color: string) {

  let material1 = new MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });

  const find = (root) => {

    const material = (root as Mesh).material;
    if (material) {
      const mesh = root as Mesh;
      mesh.material = material1;
      this._conditionFormatBoxList.push(mesh);    
    }
    root.children.forEach(m => find(m));
  }
  find(object);
}

  /**
   * 关注某个room
   * @param room 
   * @param moveCamera 是否移动相机
   * @returns 
   */
  public focusRoomById(roomId? : number|string, moveCamera:boolean = true) {
    if(!this._roomStore) throw 'Please call .setRoomStore() to inject a instance';
    if(!this._cameraService) throw 'Please call .setCameraService() to inject a instance';

    if(!roomId) {
      this.cancelFocus();
      this._cameraService.moveCurCameraTo();

      return;
    }
    
    const room = this._roomStore.getRoomById(roomId);
    // dataTip展示 动画效果
    this._dataTip.animateDisplay(room);
    ///////////////////////////////////////////////////////////

    this._currentFocusRoomId = roomId;
    if(moveCamera) {
      // 移动相机
      const tPosition = room.getCameraWorldPosition() || this._cameraService.getDefaultCameraPosition();
      const tLookAt = room.getRoomCenterWorldPosition();
      this._cameraService.moveCurCameraTo(tPosition, tLookAt);
    }
    
    //相机轮询选择边框
    // 添加一个boxHelper用来标识当前聚焦的对象
    // 添加之前先将上一次的删除
    this._focusBox && this._focusBox.parent.remove(this._focusBox);
    // const focusBox = new BoxHelper(room.getObject(), 0xffd400);
    const focusBox = this.addBox(room.getObject(), 'yellow');
    this._focusBox = focusBox;
    this._roomStore.getScene().add(focusBox);

    if(!this._showAllConditionBox) {
      // 如果不是所有符合条件的room都format（被聚焦时才显示）
      // 则在每次相机移动后进行更新
      this.resetConditionBox();
    }
  }

  public resetConditionBox() {

    while(this._conditionFormatBoxList.length) {
      const box = this._conditionFormatBoxList.pop();
      box.parent.remove(box);
    }
    const willFormat = new Set<Room>();
    if(this._showAllConditionBox) {
      // format所有的符合条件的room
      const rooms = this._roomStore.getSortedRoomsList();
      for(const room of rooms) {
        if(room.getFormatColors().length > 0) {
          willFormat.add(room);
        }
      }
    } else if(this._currentFocusRoomId){
      // 仅显示当前聚焦的room
      const room = this._roomStore.getRoomById(this._currentFocusRoomId);
      if(room && room.getFormatColors().length > 0) {
        willFormat.add(room);
      }
    }

    const scene = this._cameraService.getScene();
    willFormat.forEach(room => {
      const colors = room.getFormatColors();
      // const material = new MeshBasicMaterial({ transparent : true, color : colors[colors.length - 1], opacity : this._initialConditionBoxOpacity });
      // const roomSize = room.getRoomSize();
      // const geometry = new BoxGeometry(roomSize.x, roomSize.y, roomSize.z);
      // const roomCenter = room.getRoomCenterWorldPosition();
      // geometry.translate(roomCenter.x, roomCenter.y, roomCenter.z);
      // const mesh = new Mesh(geometry, material);
      // this._conditionFormatBoxList.push(mesh);
    
      //条件格式化修改
      const mesh = this.addBox(room.getObject(), colors[colors.length - 1]);
      scene.add(mesh);
    });

    this._conditionFormatAnimationUpdate && this._animationLoop.dismiss(this._conditionFormatAnimationUpdate);
    this._conditionFormatAnimationUpdate = null;

    if(this._conditionFormatBoxList && this._conditionFormatBoxList.length > 0) {
      // 设置“闪烁”效果
      const t = new Tween({opacity: this._initialConditionBoxOpacity})
      .to({opacity: 0}, 1000)
      .onUpdate( result => {
        // this._conditionFormatBoxMaterialOpacity = result.opacity;
        for(const box of this._conditionFormatBoxList) {
          const material = box.material as MeshBasicMaterial;
          material.opacity = result.opacity;
        }
      })
      .repeat(Infinity)
      .yoyo(true);
      
      this._conditionFormatAnimationUpdate = time => {
        t.update(time);
      }
      t.start();
      this._animationLoop.register(this._conditionFormatAnimationUpdate);
    }
  }


  public enableShowAllConditionBox() {
    this._showAllConditionBox = true;

    this.resetConditionBox();
  }

  public disableShowAllConditionBox() {
    this._showAllConditionBox = false;

    this.resetConditionBox();
  }

  public cancelFocus() {
    this._focusBox && this._focusBox.parent.remove(this._focusBox);
    this._focusBox = null;
    // this._conditionFormatBox && this._conditionFormatBox.parent.remove(this._conditionFormatBox);
    // this._conditionFormatBox = null;
    this._currentFocusRoomId = null;
    // 如果不是显示所有的condition format 取消聚焦后 也要取消condition format
    !this._showAllConditionBox && this.resetConditionBox();

    // 隐藏dataTip
    this._dataTip.hide();
    /////////////////////////////////////////////
  }

  public setRoomStore(roomStore : RoomStore) {
    this._roomStore = roomStore;
  }

  public setCameraService(cameraService : CameraService) {
    this._cameraService = cameraService;
  }

  public setAnimationLoopRegister(animationLoop : AnimationNS.Registerable<() => void>) {
    if(this._animationLoop || !animationLoop) return ;
    this._animationLoop = animationLoop;
  }

  public getSortedRoomsList() {
    return this._roomStore.getSortedRoomsList();
  }

  public getRoomById(id : number | string) {
    return this._roomStore.getRoomById(id);
  }

  public setDataTip(dataTip : DataTip) {
    this._dataTip = dataTip;
  }

  public getCurrentFocusRoomId() {
    return this._currentFocusRoomId;
  }
}
