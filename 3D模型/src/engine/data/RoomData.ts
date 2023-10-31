import { convertRGBA2RGB, getHexByWebColor } from "../../util/ColorUtils";
import { Vector3, Scene, Object3D, Camera, BoxHelper, Color } from "three";

export default class RoomStore implements RoomNS.RoomStore{
  // 每次数据变化时 需要更新的属性
  // 保存到map中 通过room的id快速找到room
  private _mappingIdToRoom : Map<number | string, Room>;
  // 通过selectionI的快速找到room
  private _mappingSelectionIdToRoom : Map<VisualNS.SelectionId, Room>;
  // 根据数据对room进行排序
  private _sortedRoomsList : Array<Room>;
  
  // private _roomsList : Array<Room>;
  ////////////////////////////////////////////////////////////

  // 保存模型中声明了id属性的模型 避免多次遍历Scene 只在加载模型时创建一次
  private _mappingIdToModelObjectInfo : Map<number | string, { object : Object3D, camera : Camera }>;
  private _modelObjectsList : Array<Object3D>;
  private _hasLoadedModelObject : boolean = false; // 映射是否创建完成
  private _scene : Scene;
  ////////////////////////////////////////////////////////////

  // 依赖
  private _selectionService : VisualNS.SelectionService;
  ////////////////////////////////////////////////////////////

  private constructor() {
    this._mappingIdToRoom = new Map();
    this._mappingSelectionIdToRoom = new Map();
    this._sortedRoomsList = new Array();
    this._mappingIdToModelObjectInfo = new Map();
    this._modelObjectsList = new Array();
  }

  private static instance : RoomStore;
  public static getInstance() {
    if(!RoomStore.instance) {
      RoomStore.instance = new RoomStore();
    }
    return RoomStore.instance;
  }

  public getMappingIdToRoom() {
    return this._mappingIdToRoom;
  }

  public getSortedRoomsList() {
    return this._sortedRoomsList;
  }

  public clearStore() {
    this._mappingIdToRoom.clear();
    this._sortedRoomsList.length = 0;
    this._mappingIdToModelObjectInfo.clear();

    this._modelObjectsList.length = 0;
    this._hasLoadedModelObject = false;

    return RoomStore.instance;
  }

  public loadScene(scene:Scene) {
    if(this._hasLoadedModelObject) throw 'Scene has been loaded, if you want to reload a new scene, please call .clear() before';
    findRoom.call(this, scene);
    this._hasLoadedModelObject = true;
    this._scene = scene;

    function findRoom(root:Object3D) {
      const id = root.userData && root.userData['id'];
      if(id !== undefined) {
        const camera = findCamera.call(this, root);
        this._mappingIdToModelObjectInfo.set(id, {object:root, camera});
        this._modelObjectsList.push(root);
        return;
      } else {
        for(const child of root.children) {
          findRoom.call(this, child);
        }
      }
    }

    function findCamera(root:Object3D):Camera | undefined {
      if((<Camera>root).isCamera) {
        return root as Camera;
      }

      for(const child of root.children) {
        const possibleCamera = findCamera.call(this, child);
        if(possibleCamera && (<Camera>possibleCamera).isCamera) {
          return possibleCamera;
        }
      }

      return undefined;
    }
  }

  public updateRoomWithPlainDataView(plainDataView:VisualNS.IPlainDataView, conditions?:any[]) {
    if(!this._selectionService) throw 'Please call .setSelectionService() to inject a instance of SelectionService before call .updateRoomByDataList()';
    if(!this._hasLoadedModelObject) throw 'Please call .loadScene() before call .updateRoomByDataList()';
    this._mappingIdToRoom.clear();
    this._mappingSelectionIdToRoom.clear();
    this._sortedRoomsList.length = 0;

    if(!plainDataView) {
      return ;
    }

    const dataList = plainDataView.data;
    const profiles = plainDataView.profile;
    const sort = plainDataView.sort;

    const idProfile = profiles.category.values[0];
    const mapFieldIdentifierToDisplay = this.getMapFieldIdentifierToDisplay(profiles);
    for(let i = 0; i < dataList.length; ++i) {
      const data = dataList[i];
      const id = data[idProfile.display];

      const objectInfo = this._mappingIdToModelObjectInfo.get(id);
      if(objectInfo) {
        const { object, camera } = objectInfo;
        const cameraWorldPosition = new Vector3();
        if(camera) {
          camera.getWorldPosition(cameraWorldPosition);
        }

        const selectionId = this._selectionService.createSelectionId().withDimension(idProfile, data);
        const room = new Room(
          id,
          object,
          camera ? cameraWorldPosition : null,
          i,
          data,
          selectionId
        );
        room.conditionalFormat(conditions, mapFieldIdentifierToDisplay);
        this._mappingIdToRoom.set(id, room);
        this._mappingSelectionIdToRoom.set(selectionId, room);
      }
    }
    const orderList = sort[idProfile.display].order;
    for(const roomId of orderList) {
      const room = this.getRoomById(roomId);
      room && this._sortedRoomsList.push(room);
    }
  }

  /**
   * 对于condition format, condition中存储的是fieldIdentifier, 从dataPoint取数据使用的是display
   * 所以 需要根据dataViewProfiles 将fieldIdentifier转换为display
   */
  private getMapFieldIdentifierToDisplay(profiles : VisualNS.IDataViewProfiles) {
    const map = new Map<string, string>();
    for(const p of Object.values(profiles)) {
      for(const v of p.values) {
        const fieldIdentifierJSON = JSON.stringify(v.id);
        map.set(fieldIdentifierJSON, v.display);
      }
    }
    return map;
  }

  public setSelectionService(selectionService : VisualNS.SelectionService) {
    this._selectionService = selectionService;
  }

  public hasLoadedScene() {
    return this._hasLoadedModelObject;
  }

  public getScene() {
    if(!this._scene) throw 'Please call .loadScene() to load scene';
    return this._scene;
  }

  public getModelObjectsList() {
    return this._modelObjectsList;
  }

  public getRoomById(roomId : number | string) {
    const room =  this._mappingIdToRoom.get(roomId);
    return room;
  }

  public getRoomBySelectionId(selectionId : VisualNS.SelectionId) {
    return this._mappingSelectionIdToRoom.get(selectionId);
  }
}

export class Room {
  // Room与模型相关的属性
  private _id : number | string;
  private _object : Object3D;
  private _roomCenterWorldPosition : Vector3;
  private _cameraWorldPosition : Vector3 | null; // 如果用户没有绑定相机 这个值为null 使用默认相机
  private _roomSize : Vector3;
  //////////////////////////////////////////
  
  // Room与数据相关的属性
  private _dataPoint : VisualNS.IDataPoint;
  private _selectionId : VisualNS.SelectionId;
  //////////////////////////////////////////

  // 样式相关属性
  private _formatColors : Array<Color>;


  private _dataIndex : number; // room绑定的数据对应的下标

  constructor(
    id : number | string,
    object : Object3D,
    cameraWorldPosition : Vector3 | null,
    dataIndex : number,
    dataPoint : VisualNS.IDataPoint,
    selectionId : VisualNS.SelectionId,
  ) {
    this._id = id;
    this._object = object;
    const boxHelper = new BoxHelper(object);
    boxHelper.geometry.computeBoundingBox();
    boxHelper.geometry.computeBoundingSphere();
    this._roomCenterWorldPosition = boxHelper.geometry.boundingSphere.center;
    this._cameraWorldPosition = cameraWorldPosition;
    this._roomSize = boxHelper.geometry.boundingBox.getSize(new Vector3());
    this._dataIndex = dataIndex;
    this._dataPoint = dataPoint;
    this._selectionId = selectionId;
    this._formatColors = new Array();
  }

  public getId() {
    return this._id;
  }

  public getRoomCenterWorldPosition() {
    return this._roomCenterWorldPosition;
  }

  public getCameraWorldPosition() : Vector3 | null {
    return this._cameraWorldPosition;
  }

  public getRoomSize() {
    return this._roomSize;
  }

  public getDataIndex() {
    return this._dataIndex;
  }

  public getSelectionId() {
    return this._selectionId;
  }

  public getObject() {
    return this._object;
  }

  public getFormatColors() {
    return this._formatColors;
  }

  public getDataPoint() {
    return this._dataPoint;
  }

  public conditionalFormat(conditions : ConditionFormatNS.ConditionFormat[], mapFieldIdentifierToDisplay : Map<string, string>) {
    const dataPoint = this._dataPoint;
    conditions && conditions.forEach(condition => {
      if(this.format(condition, dataPoint, mapFieldIdentifierToDisplay)) {
        let color = getHexByWebColor(condition.style.color) || // 如果是WebColor 转换为对应的16进制RGB值
                    convertRGBA2RGB(condition.style.color)  || // 如果不是WebColor 则判断是不是RGBA 如果是RGBA 则转换为RGB
                    condition.style.color; // 上述两个都不是 则本身可以被Three.js使用
        this._formatColors.push(new Color(color));
      }
    });
  }

  private format(conditionFormat: ConditionFormatNS.ConditionFormat, dataPoint:VisualNS.IDataPoint, mapFieldIdentifierToDisplay : Map<string, string>): boolean {

    const { condition, fieldIdentifier } = conditionFormat;
    const fieldIdentifierJSON = JSON.stringify(fieldIdentifier);
    const display = mapFieldIdentifierToDisplay.get(fieldIdentifierJSON);
    if(!display) {
      return ;
    }
    const value = dataPoint[display];
    function getValue(possibleValue : number | ConditionFormatNS.FieldIdentifier) {
      const value = (
        typeof possibleValue === 'number'
        ? possibleValue
        : dataPoint[mapFieldIdentifierToDisplay.get(JSON.stringify(possibleValue))]
      );
      return value;
    }

    switch (condition.rule) {
      case ConditionFormatRule.EQUAL : {
        const range = condition.range as ConditionFormatNS.NumberRange;
        return getValue(range.min) === value;
      }

      case ConditionFormatRule.NOT_EQUAL : {
        const range = condition.range as ConditionFormatNS.NumberRange;
        return getValue(range.min) !== value;
      }

      case ConditionFormatRule.GREATER : {
        const range = condition.range as ConditionFormatNS.NumberRange;
        return value > getValue(range.min);
      }

      case ConditionFormatRule.GREATER_EQUAL : {
        const range = condition.range as ConditionFormatNS.NumberRange;
        return value >= getValue(range.min);
      }

      case ConditionFormatRule.LESS: {
        const range = condition.range as ConditionFormatNS.NumberRange;
        return value < getValue(range.max);
      }

      case ConditionFormatRule.LESS_EQUAL: {
        const range = condition.range as ConditionFormatNS.NumberRange;
        return value <= getValue(range.max);
      }

      case ConditionFormatRule.BETWEEN: {
        const range = condition.range as ConditionFormatNS.NumberRange;
        const min = getValue(range.min);
        const max = getValue(range.max);
        return (min < value || (range.minIncluded && min === value))
            && (value < max || (range.maxIncluded && max === value));
      }

      case ConditionFormatRule.NOT_BETWEEN: {
        const range = condition.range as ConditionFormatNS.NumberRange;
        const min = getValue(range.min);
        const max = getValue(range.max);
        return !(min < value || (range.minIncluded && min === value))
            || !(value < max || (range.maxIncluded && max === value));
      }

      case ConditionFormatRule.START_WITH: {
        const range = condition.range as ConditionFormatNS.StringRange;
        const pattern = range.caseSensitive ? range.pattern : range.pattern.toUpperCase();
        const v = range.caseSensitive ? value.toString() : (<string>value).toUpperCase();
        return v.startsWith(pattern);
      }

      case ConditionFormatRule.END_WITH: {
        const range = condition.range as ConditionFormatNS.StringRange;
        const pattern = range.caseSensitive ? range.pattern : range.pattern.toUpperCase();
        const v = range.caseSensitive ? value.toString(): (<string>value).toUpperCase();
        return v.endsWith(pattern);
      }

      case ConditionFormatRule.CONTAIN: {
        const range = condition.range as ConditionFormatNS.StringRange;
        const pattern = range.caseSensitive ? range.pattern : range.pattern.toUpperCase();
        const v = range.caseSensitive ? value.toString(): (<string>value).toUpperCase();
        return v.includes(pattern);
      }

      case ConditionFormatRule.EXACTLY_MATCH: {
        const range = condition.range as ConditionFormatNS.StringRange;
        const pattern = range.caseSensitive ? range.pattern : range.pattern.toUpperCase();
        const v = range.caseSensitive ? value.toString() : (<string>value).toUpperCase();
        return v === pattern;
      }

      default : return false;
    }
  }
}

enum ConditionFormatRule {
  // number
  EQUAL = 0,
  NOT_EQUAL = 1,
  GREATER = 2,
  GREATER_EQUAL = 3,
  LESS = 4,
  LESS_EQUAL = 5,
  BETWEEN = 6,
  NOT_BETWEEN = 7,
  ///////////

  // string
  START_WITH = 8,
  END_WITH = 9,
  CONTAIN = 10,
  EXACTLY_MATCH = 11,
}