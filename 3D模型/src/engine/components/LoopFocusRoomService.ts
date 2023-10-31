import RoomService from './RoomService';

export default class LoopFocusRoomService {

  private _cameraFollow : boolean = true; // 轮播时 相机是否跟随
  private _loopInterval : number; // 间隔(单位:s)
  private _interval : number; // setInterval()的返回值 用来取消
  private _loopRoomsId : Array<string | number>; // 轮询的roomId
  private _currentIndex : number; // 当前轮询的下标

  private _status : 'Running' | 'Stop' | 'Pause';

  // 依赖
  private _roomService : RoomService;
  /////////////////////////////////////////

  private static instance : LoopFocusRoomService;
  private constructor() {
    this._status = 'Stop';
  }
  public static getInstance() {
    if(!LoopFocusRoomService.instance) {
      LoopFocusRoomService.instance = new LoopFocusRoomService();
    }
    return LoopFocusRoomService.instance;
  }

  public setRoomService(roomService) {
    this._roomService = roomService;
  }

  public setLoopInterval(loopInterval) {
    this._loopInterval = loopInterval;
  }

  public enableCameraFollow() {
    this._cameraFollow = true;
  }

  public disableCameraFollow() {
    this._cameraFollow = false;
  }

  /**
   * 重置轮询顺序
   */
  public resetLoopOrder() {
    this._loopRoomsId = this._roomService.getSortedRoomsList().map(r => r.getId());
  }

  public start() {
    this.stop();

    this._status = 'Running';

    this._loopRoomsId = this._roomService.getSortedRoomsList().map(r => r.getId());
    this._currentIndex = 0;
    this._roomService.focusRoomById();
    this._interval = window.setInterval(this.loopStep.bind(this), this._loopInterval ? this._loopInterval * 1000 : 5000);
  }

  public pause() {
    if(this._status !== 'Running') throw '.pause() only should be called after Running(call .start())';
    this._status = 'Pause';
    this._interval && clearInterval(this._interval);
    this._interval = null;
  }

  public runAgainAfterPause() {
    if(this._status !== 'Pause') throw '.runAgainAfterPause() only should be called after Pause(call .pause())';
    this._status = 'Running';
    this._interval = window.setInterval(this.loopStep.bind(this), this._loopInterval ? this._loopInterval * 1000 : 5000);
  }

  public stop() {

    this._status = 'Stop';
    this._currentIndex = 0;
    this._interval && clearInterval(this._interval);
    this._interval = null;
  }

  private loopStep() {
    const loopLength = this._loopRoomsId.length;
    this._currentIndex = this._currentIndex % loopLength;
    const id = this._loopRoomsId[this._currentIndex++];
    this._roomService.focusRoomById(id, this._cameraFollow);
  }

  public isRunning() {
    return this._status === 'Running';
  }

  public isPause() {
    return this._status === 'Pause';
  }
}