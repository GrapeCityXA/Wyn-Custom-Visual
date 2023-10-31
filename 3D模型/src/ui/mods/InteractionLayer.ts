import CameraService from "src/engine/components/CameraService";
import RoomService from "src/engine/components/RoomService";
import { Raycaster } from "three";
import BaseWindow from "../BaseWindow";
import DataTip from "./DataTip";

export default class InteractionLayer extends BaseWindow {

  private _raycaster : Raycaster;
  private _dataTip : DataTip;

  constructor(dataTip : DataTip) {
    super('interaction-layer');
    this._dataTip = dataTip;

    this.dom.style.position = 'absolute';
    this.dom.style.width = '100%';
    this.dom.style.height = '100%';
    this.dom.style.top = '0';
    this.dom.style.left = '0';

    this._raycaster = new Raycaster();
  }


  public bindClickEvent(roomService : RoomService, selectionManager : VisualNS.SelectionManager, cameraService : CameraService, contextMenuService : VisualNS.ContextMenuService) {

    let action : 'drag' | null = null;

    const onLeftClick = (event : MouseEvent) => {

      roomService.cancelFocus();
      const x = (event.offsetX / this.dom.offsetWidth) * 2 - 1;
      const y = - (event.offsetY / this.dom.offsetHeight) * 2 + 1;

      this._raycaster.setFromCamera({x, y}, cameraService.getCurCamera());
      const canBeSelected = roomService.getSortedRoomsList().map(r => r.getObject());
      if(canBeSelected.length <= 0) {
        return ;
      }
      const intersects = this._raycaster.intersectObjects(canBeSelected, true);
      if(intersects.length > 0) {
        const object = intersects[0].object;
        let p = object;
        // 射线与对象相交后 找到的对象是子对象 所以要向上找到有id属性的对象
        while(p && (!p.userData || !p.userData['id'])) {
          p = p.parent;
        }
        if(p) {
          const id = p.userData['id'];
          const room = roomService.getRoomById(id);
          const selectionId = room.getSelectionId();
          if(selectionManager.contains(selectionId)){
            selectionManager.clear(selectionId);
            this._dataTip.hide();
          } else {
            selectionManager.select(selectionId, true);
            this._dataTip.animateDisplay(room);
          }
        }
      } else {
        // 没有点击Room对应的模型 
          // 判断是否点击了模型的某个部分 如果没有点击到模型（点击到了空白） 则清空selectionId
          this._raycaster.setFromCamera({x, y}, cameraService.getCurCamera());
          const is = this._raycaster.intersectObject(cameraService.getScene(), true);
          if(is.length === 0) {
            selectionManager.clear();
            this._dataTip.hide();
          }
      }
    } 
    
    const onRightClick = (event:MouseEvent) => {
      contextMenuService.show({
        position : {
          x : event.clientX,
          y : event.clientY
        }
      });
    }

    const onMouseMove = () => {
      action = 'drag';
      this.dom.removeEventListener('pointermove', onMouseMove, true);
    }

    const onMouseUp = (event : MouseEvent) => {
      this.dom.removeEventListener('pointermove', onMouseMove, true);
      this.dom.removeEventListener('pointerup', onMouseUp, true);
      if(action === 'drag') {
        return;
      }

      if(event.button === 0) {
        onLeftClick(event);
      } else if(event.button === 2) {
        onRightClick(event);
      }
    }
    const onMouseDown = () => {
      action = null;
      contextMenuService.hide();
      this.dom.addEventListener('pointermove', onMouseMove, true);
      this.dom.addEventListener('pointerup', onMouseUp, true);
    }

    this.dom.addEventListener('pointerdown', onMouseDown, true);
  }

  public bindCameraObitControls(cameraService :CameraService){
    cameraService.bindControllerEventListener(this.dom);
  }
}