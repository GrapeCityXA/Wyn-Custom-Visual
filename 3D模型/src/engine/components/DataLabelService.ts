import { Box2, Box3, BoxHelper, PerspectiveCamera, Plane, Vector2, Vector3 } from "three";
import CameraService from "./CameraService";
import RoomService from "./RoomService";

export default class DataLabelService implements CanvasPainter2D {
  private static instance : DataLabelService;
  private constructor() {}
  public static getInstance() {
    if(!DataLabelService.instance) {
      DataLabelService.instance = new DataLabelService();
    }
    return DataLabelService.instance;
  }

  // 依赖
  private _canvasDrawable2D : CanvasDrawable2D;
  private _cameraService : CameraService;
  private _roomService : RoomService;
  //////////////////////////////////////////////////////////////////

  private _show : boolean;
  private _showRoomId : boolean;
  private _showColumnName : boolean;
  private _showValues : boolean;

  private _displayFieldProfile : VisualNS.IDataViewProfiles;
  private _formatMap : Map<string, dataUseFormatAndUnit>;

  // 计算dataLabel的大小
  // fontSize / _baseFontSizeValue = _baseDistance / distance
  // => fontSize = _baseFontSizeValue / distance * baseFontSize
  private _baseDistance : number;
  private _baseFontSizeValue : number;
  private _baseFontSizeUnit : string;

  // 字体样式
  private _fontFamily : string;
  private _fontColor : string;
  private _fontStyle : string;
  private _fontWeight : string;
  //////////////////////////////////////////

  private _delimiter : string;

  private _borderWidth : number;
  private _borderColor : string;

  private _paddingTop : number;
  private _paddingRight : number;
  private _paddingBottom : number;
  private _paddingLeft : number;

  private _backgroundColor : string;
  private _backgroundImage : HTMLImageElement | null;

  private _horizontalPosition : PropertiesShape['dataLabelHorizontalPosition'];
  private _verticalPosition : PropertiesShape['dataLabelVerticalPosition'];
  private _offsetLeft : number;
  private _offsetTop : number;

  public paintOneFrame(ctx : CanvasRenderingContext2D) {
    ctx.fillStyle = this._fontColor;
    ctx.strokeStyle = '#bdd';

    const roomsList = this._roomService.getSortedRoomsList();

    const canvas = ctx.canvas;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const camera = this._cameraService.getCurCamera();

    const currentFocusRoomId = this._roomService.getCurrentFocusRoomId();
    // 遍历每一个room 将room的外接长方体的8个点投影到屏幕
    // 找到投影后8个点的最大x, y和最小x, y，就会得到一个包围对象的矩形
    // 在这个矩形的相对位置添加dataLabel
    roomsList.sort((r1, r2) => {
      if(currentFocusRoomId) {
        if(r1.getId() === currentFocusRoomId) {
          return 1;
        }

        if(r2.getId() === currentFocusRoomId) {
          return -1;
        }
      }
      const cameraDistanceToR1 = r1.getRoomCenterWorldPosition().distanceTo(camera.getWorldPosition(new Vector3()));
      const cameraDistanceToR2 = r2.getRoomCenterWorldPosition().distanceTo(camera.getWorldPosition(new Vector3()));
      return cameraDistanceToR2 - cameraDistanceToR1;
    }).forEach(r => {
      const object = r.getObject();
      const boxHelper = new BoxHelper(object);
      boxHelper.geometry.computeBoundingBox();
      const boundingBox = boxHelper.geometry.boundingBox;
      const boundingRect = this.calculateBoundingRect(boundingBox, camera, canvasWidth, canvasHeight);
      const {
        min : { x : minX, y : minY },
        max : { x : maxX, y : maxY }
      } = boundingRect;

      // 调试使用
      // ctx.strokeRect(
      //   minX,
      //   minY,
      //   maxX - minX,
      //   maxY - minY
      // );

      const objectDistance = r.getRoomCenterWorldPosition().distanceTo(camera.getWorldPosition(new Vector3()));
      const scaleFactor = this._baseDistance / objectDistance;
      const fontSizeValue = Math.round(scaleFactor * this._baseFontSizeValue);
      ctx.font = `${this._fontStyle.toLowerCase()} normal ${this._fontWeight.toLowerCase()} ${fontSizeValue}${this._baseFontSizeUnit} ${this._fontFamily}`;

      // ctx.fillText('$23333.00M', minX, minY);
      const baseX = this._horizontalPosition === 'LEFT'
        ? boundingRect.min.x
        : this._horizontalPosition === 'RIGHT'
        ? boundingRect.max.x
        : (boundingRect.min.x + boundingRect.max.x) / 2;
      const baseY = this._verticalPosition === 'TOP'
        ? boundingRect.min.y
        : this._verticalPosition === 'BOTTOM'
        ? boundingRect.max.y
        : (boundingRect.min.y + boundingRect.max.y) / 2;
      this.drawDataLabel(r.getDataPoint(), ctx, baseX + this._offsetLeft, baseY - this._offsetTop, scaleFactor);
    });

  }

  private calculateBoundingRect(boundingBox : Box3, camera : PerspectiveCamera, canvasWidth : number, canvasHeight) {
    let minX, minY, maxX, maxY;
    const worldXs = [boundingBox.min.x, boundingBox.max.x];
    const worldYs = [boundingBox.min.y, boundingBox.max.y];
    const worldZs = [boundingBox.min.z, boundingBox.max.z];
    for(let i = 0; i < 8; ++i) {
      const xIndex = i & 0b001 ? 0 : 1;
      const yIndex = i & 0b010 ? 0 : 1;
      const zIndex = i & 0b100 ? 0 : 1;

      const worldX = worldXs[xIndex];
      const worldY = worldYs[yIndex];
      const worldZ = worldZs[zIndex];


      const worldPoint = new Vector3(worldX, worldY, worldZ);
      const standardVector = worldPoint.project(camera);

      const screenX = (standardVector.x + 1) / 2 * canvasWidth;
      const screenY = (1 - standardVector.y) / 2 * canvasHeight;

      if(!minX || minX > screenX) {
        minX = screenX;
      }
      if(!minY || minY > screenY) {
        minY = screenY;
      }
      if(!maxX || maxX < screenX) {
        maxX = screenX;
      }
      if(!maxY || maxY < screenY) {
        maxY = screenY;
      }
    }

    return new Box2(new Vector2(minX, minY), new Vector2(maxX, maxY));
  }

  private drawDataLabel(
    dataPoint : VisualNS.IDataPoint,
    ctx : CanvasRenderingContext2D,
    baseX : number,
    baseY : number,
    scaleFactor : number
  ) {
    const profile = this._displayFieldProfile;
    const roomIdDisplay = profile.category.values[0].display;
    const roomId = dataPoint[roomIdDisplay];

    const delimiterSize = ctx.measureText(this._delimiter);
    const delimiterHeight = delimiterSize.fontBoundingBoxAscent + delimiterSize.fontBoundingBoxDescent;

    const itemsPainted = new Array<{
      name : {
        display : string;
        width : number;
      },
      value : {
        display : string;
        width : number;
      },
      height : number;
      fontBoundingBoxDescent : number;
    }>();

    if(this._showRoomId) {
      const nameSize = ctx.measureText(roomIdDisplay);
      const valueSize = ctx.measureText(roomId.toString());
      const nameHeight = nameSize.fontBoundingBoxAscent + nameSize.fontBoundingBoxDescent;
      const valueHeight = valueSize.fontBoundingBoxAscent + valueSize.fontBoundingBoxDescent;
      itemsPainted.push({
        name : {
          display : roomIdDisplay,
          width : nameSize.actualBoundingBoxRight,
        },
        value : {
          display : roomId.toString(),
          width : valueSize.actualBoundingBoxRight,
        },
        height : Math.max(nameHeight, valueHeight, delimiterHeight),
        fontBoundingBoxDescent : Math.max(nameSize.fontBoundingBoxDescent, delimiterSize.fontBoundingBoxDescent, valueSize.fontBoundingBoxDescent),
      });
    }

    if(this._showValues) {
      for(const valueProfile of profile.values.values) {
        const display = valueProfile.display;
        const nameSize = ctx.measureText(display);
        const value = this._formatMap.get(display)(dataPoint[display]);
        const valueSize = ctx.measureText(value.toString());
        const nameHeight = nameSize.fontBoundingBoxAscent + nameSize.fontBoundingBoxDescent;
        const valueHeight = valueSize.fontBoundingBoxAscent + valueSize.fontBoundingBoxDescent;
        itemsPainted.push({
          name : {
            display,
            width : nameSize.actualBoundingBoxRight,
          },
          value : {
            display : value,
            width : valueSize.actualBoundingBoxRight,
          },
          height : Math.max(nameHeight, valueHeight, delimiterHeight),
          fontBoundingBoxDescent : Math.max(nameSize.fontBoundingBoxDescent, delimiterSize.fontBoundingBoxDescent, valueSize.fontBoundingBoxDescent),
        });
      }
    }

    let maxNameLength = 0;
    let maxValueLength = 0;
    let totalHeight = 0;
    itemsPainted.forEach(item => {
      maxNameLength = Math.max(item.name.width, maxNameLength);
      maxValueLength = Math.max(item.value.width, maxValueLength);
      totalHeight += item.height;
    });

    // 上面已经将要显示的内容都放入了itemsPainted中
    if(itemsPainted.length <= 0) {
      return ;
    }
    const totalWidth = maxValueLength + (this._showColumnName ? maxNameLength + delimiterSize.width : 0) ;
    const contentStartX = baseX - totalWidth / 2;
    const contentStartY = baseY - totalHeight / 2;
    this.drawBackground(ctx, contentStartX, contentStartY, totalWidth, totalHeight, scaleFactor);
    
    const justifyHeight = itemsPainted[itemsPainted.length - 1].fontBoundingBoxDescent;
    let offsetY = -justifyHeight;
    for(const item of itemsPainted) {
      let offsetX = 0;
      if(this._showColumnName) {
        ctx.fillText(item.name.display, contentStartX + maxNameLength - item.name.width, contentStartY + offsetY + item.height);
        ctx.fillText(this._delimiter, contentStartX + maxNameLength, contentStartY + offsetY + item.height);
        offsetX = maxNameLength + delimiterSize.width;
      } else {
        offsetX = (totalWidth - item.value.width) / 2;
      }
      ctx.fillText(item.value.display, contentStartX + offsetX, contentStartY + offsetY + item.height);
      offsetY += item.height;
    }
  }

  private drawBackground(ctx:CanvasRenderingContext2D, x:number, y:number, width:number, height:number, scaleFactor : number) {
    const borderWidth = this._borderWidth * scaleFactor;
    const paddingTop = this._paddingTop * scaleFactor;
    const paddingRight = this._paddingRight * scaleFactor;
    const paddingBottom = this._paddingBottom * scaleFactor;
    const paddingLeft = this._paddingLeft * scaleFactor;

    const backgroundStartX = x - paddingLeft;
    const backgroundStartY = y - paddingTop;
    const backgroundWidth = width + paddingLeft + paddingRight;
    const backgroundHeight = height + paddingTop + paddingBottom;
    const startX = backgroundStartX - borderWidth;
    const startY = backgroundStartY - borderWidth;
    const clientWidth = backgroundWidth + borderWidth * 2;
    const clientHeight = backgroundHeight + borderWidth * 2;
    
    ctx.save();
    if(borderWidth) {
      ctx.lineWidth = borderWidth;
      ctx.fillStyle = this._borderColor;
      ctx.fillRect(startX, startY, clientWidth, clientHeight);
    }
    ctx.lineWidth = 0;
    ctx.fillStyle = this._backgroundColor;
    ctx.clearRect(backgroundStartX, backgroundStartY, backgroundWidth, backgroundHeight);
    ctx.fillRect(backgroundStartX, backgroundStartY, backgroundWidth, backgroundHeight);

    if(this._backgroundImage) {
      ctx.drawImage(this._backgroundImage, backgroundStartX, backgroundStartY, backgroundWidth, backgroundHeight);
    }

    ctx.restore();
  }

  public showDataLabel() {
    if(this._show) {
      return ;
    }
    this._show = true;
    this.drawOnCanvas();
  }

  public hideDataLabel() {
    if(!this._show) {
      return ;
    }
    this._show = false;
    this.cancelDrawOnCanvas();
  }

  private drawOnCanvas() {
    if(!this._roomService) throw 'Please call .setRoomService() inject a instance';
    if(!this._canvasDrawable2D) throw 'Please call .setCanvasDrawable2d() inject a instance';
    if(!this._cameraService) 'Please call .setCameraService() inject a instance';
    this._canvasDrawable2D.registerPainter(this);
  }

  private cancelDrawOnCanvas() {
    if(!this._roomService) throw 'Please call .setRoomService() inject a instance';
    if(!this._canvasDrawable2D) throw 'Please call .setCanvasDrawable2d() inject a instance';
    if(!this._cameraService) 'Please call .setCameraService() inject a instance';
    this._canvasDrawable2D.dismissPainter(this);
  }

  public showValues() {
    this._showValues = true;
  }

  public hideValues() {
    this._showValues = false;
  }

  public showRoomId() {
    this._showRoomId = true;
  }

  public hideRoomId() {
    this._showRoomId = false;
  }

  public showColumnName() {
    this._showColumnName = true;
  }

  public hideColumnName() {
    this._showColumnName = false;
  }

  public setDisplayFiledProfileAndFormat(displayFieldProfile:VisualNS.IDataViewProfiles, formatMap : Map<string, dataUseFormatAndUnit>) {
    this._displayFieldProfile = displayFieldProfile;
    this._formatMap = formatMap;
  }


  public setCanvasDrawable2d(canvasDrawable2D : CanvasDrawable2D) {
    this._canvasDrawable2D = canvasDrawable2D;
  }

  public setCameraService(cameraService:CameraService) {
    this._cameraService = cameraService;
  }

  public setRoomService(roomService : RoomService) {
    this._roomService = roomService;
  }

  public setBaseDistance(baseDistance : number) {
    this._baseDistance = baseDistance;
  }

  public setBaseFontSize(baseFontSize : string, scale : number) {
    const valueAndUnitReg = /^([^a-zA-Z]+)([a-zA-Z]+)$/;
    if(valueAndUnitReg.test(baseFontSize)) {
      this._baseFontSizeValue = Number(RegExp.$1) * scale;
      this._baseFontSizeUnit = RegExp.$2;
    }
  }

  public setFontFamily(fontFamily : string) {
    this._fontFamily = fontFamily;
  }

  public setFontColor(fontColor : string) {
    this._fontColor = fontColor;
  }

  public setFontWeight(fontWeight : string) {
    this._fontWeight = fontWeight;
  }

  public setFontStyle(fontStyle : string) {
    this._fontStyle = fontStyle;
  }

  public setDelimiter(delimiter : string) {
    this._delimiter = delimiter;
  }

  public setBorderWidth(borderWidth : number) {
    this._borderWidth = borderWidth;
  }

  public setBackgroundColor(color : string) {
    this._backgroundColor = color;
  }

  public setBorderColor(color : string) {
    this._borderColor = color;
  }

  public setPadding(padding : Position) {
    this._paddingTop = padding.top;
    this._paddingRight = padding.right;
    this._paddingBottom = padding.bottom;
    this._paddingLeft = padding.left;
  }

  public setBackgroundImage(imgURL:string) {
    if(!imgURL || imgURL === '') {
      this._backgroundImage = null;
      return ;
    }

    const img = new Image();
    img.src = imgURL;
    img.onload = () => {
      this._backgroundImage = img;
    }

    img.onerror = () => {
      this._backgroundImage = null;
    }
  }

  public setPosition(
    horizontal:PropertiesShape['dataLabelHorizontalPosition'],
    vertical:PropertiesShape['dataLabelVerticalPosition'],
    top:number,
    left:number
  ) {
    this._horizontalPosition = horizontal;
    this._verticalPosition = vertical;
    this._offsetTop = top;
    this._offsetLeft = left;
  }
}