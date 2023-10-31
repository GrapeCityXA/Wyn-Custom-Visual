import LoopFocusRoomService from "src/engine/components/LoopFocusRoomService";
import RoomService from "src/engine/components/RoomService";
import { Room } from "src/engine/data/RoomData";
import BaseWindow from "../BaseWindow"
import MainWindow from "../MainWindow";

const playSvg = `<svg style="width:24px;height:24px" viewBox="0 0 24 24">
<path fill="currentColor" d="M10,16.5V7.5L16,12M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
</svg>`;
const pauseSve = `<svg style="width:24px;height:24px" viewBox="0 0 24 24">
<path fill="currentColor" d="M15,16H13V8H15M11,16H9V8H11M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
</svg>`;

export class OptionBar extends BaseWindow {
  
  public cameraListBox: CameraListBox;

  /**
   * 是否轮询相机的按钮
   */
  public loopSwitch: LoopSwitch;

  constructor(mainWindow: MainWindow, localizationManager:VisualNS.LocalizationManager) {
    super('optionBar');


    this.loopSwitch = new LoopSwitch(localizationManager);
    this.cameraListBox = new CameraListBox(localizationManager);

    this.loopSwitch.render(this.dom);
    this.cameraListBox.render(this.dom);
    this.hide();
  }

  public refresh() {
    this.cameraListBox.cameraList.refresh();
  }

  public hide() {
    this.dom.style.display = 'none';
  }

  public show() {
    this.dom.style.display = 'flex';
  }

  public destroy() {
    this.loopSwitch.destroy();
  }
}

class LoopSwitch extends BaseWindow {

  private _loopFocusRoomService : LoopFocusRoomService;
  private _itemContainer : HTMLDivElement;

  private _loopToggleBtnIcon : HTMLDivElement;
  public cameraFollowCheck : HTMLInputElement;
  
  private _playing : boolean;
  public destroy: () => void;

  private _localizationManager : VisualNS.LocalizationManager;

  constructor(localizationManager:VisualNS.LocalizationManager) {
    super('loop-switch');
    this._localizationManager = localizationManager;
    this._itemContainer = document.createElement('div');
    this._itemContainer.className = 'item-container';

    const btn = document.createElement('div');
    btn.className='toggle-btn'
    const btnIcon = document.createElement('div');
    this._loopToggleBtnIcon = btnIcon;
    btnIcon.className = 'toggle-btn-icon';
    btn.appendChild(btnIcon);
    this.dom.appendChild(btn);

    const loopBtnClickHandler = (e:MouseEvent) => {
      e.stopPropagation();
      if(this._playing) {
        this.pause();
        this._loopFocusRoomService.pause();
      } else {
        this.play();
        if(this._loopFocusRoomService.isPause()) {
          this._loopFocusRoomService.runAgainAfterPause();
        } else {
          this._loopFocusRoomService.start();
        }
      }
    }

    btn.addEventListener('click', loopBtnClickHandler, true);


    const cameraFollow = document.createElement('div');
    cameraFollow.className = 'switch-item';
    const cameraFollowCheck = document.createElement('input');

    cameraFollowCheck.type = 'checkbox';
    cameraFollow.innerText = this._localizationManager.getDisplay('window.loopFocus.cameraFollowing')
    cameraFollow.appendChild(cameraFollowCheck);
    cameraFollowCheck.checked = true;

    const cameraFollowHandler = (e:MouseEvent) => {
      e.stopPropagation();
      const checkbox = e.target as HTMLInputElement;
      if(checkbox.checked) {
        this._loopFocusRoomService.enableCameraFollow();
      } else {
        this._loopFocusRoomService.disableCameraFollow();
      }
    }
    cameraFollowCheck.addEventListener('click', cameraFollowHandler, true);
    this.destroy = () => {
      cameraFollowCheck.removeEventListener('click', cameraFollowHandler);
    }

    this._itemContainer.appendChild(cameraFollow);

    this.dom.appendChild(this._itemContainer);
    const icon = document.createElement('div');
    icon.className = 'icon';

    this.cameraFollowCheck = cameraFollowCheck;
    this.dom.appendChild(icon);
  }

  public play() {
    this._playing = true;
    this._loopToggleBtnIcon.innerHTML = '';
    this._loopToggleBtnIcon.innerHTML = pauseSve;
  }
  
  public pause() {
    this._playing = false;
    this._loopToggleBtnIcon.innerHTML = '';
    this._loopToggleBtnIcon.innerHTML = playSvg;
  }

  public setLoopFocusRoomService(loopFocusRoomService : LoopFocusRoomService) {
    this._loopFocusRoomService = loopFocusRoomService;
  }
}

class CameraListBox extends BaseWindow {
  public cameraList: CameraList;
  constructor(localizationManager:VisualNS.LocalizationManager) {
    super('camera-list-box ');

    const btnIcon = document.createElement('div');
    btnIcon.className = 'icon';
    this.dom.appendChild(btnIcon);

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    const title = document.createElement('div');
    title.className = 'dialog-title';
    const titleText = document.createElement('span');
    titleText.className = 'dialog-title-text';
    titleText.innerHTML = localizationManager.getDisplay('window.cameraList.title');
    title.appendChild(titleText);
    dialog.appendChild(title);

    this.cameraList = new CameraList(localizationManager);
    this.cameraList.render(dialog);
    this.dom.appendChild(dialog);
  }
}

class CameraList extends BaseWindow {

  private _roomService : RoomService;

  private _localizationManager : VisualNS.LocalizationManager;

  constructor(localizationManager:VisualNS.LocalizationManager) {
    super('camera-list');
    this._localizationManager = localizationManager;
  }

  public refresh() {
    if(!this._roomService) throw 'Please call .setRoomService to inject a instance';
    this.dom.innerHTML = '';
    const roomList = this._roomService.getSortedRoomsList();
    this.addItem();
    roomList.forEach( e => {
      this.addItem(e);
    });
  }

  private addItem(room?: Room) {
    const item = document.createElement('div');
    item.className = 'item';
    if (room) {
      item.innerText = `${this._localizationManager.getDisplay('room')}: ${room.getId()}`;
    } else {
      item.innerText = this._localizationManager.getDisplay('window.cameraList.default');
    }
    item.addEventListener('click', () => {
      this._roomService.focusRoomById(room && room.getId());
    });
    this.dom.appendChild(item);
  }

  public setRoomService(roomService:RoomService) {
    this._roomService = roomService;
  }
}
