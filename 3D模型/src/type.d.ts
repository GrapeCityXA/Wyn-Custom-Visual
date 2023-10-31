declare namespace AnimationNS {

  interface AnimationOptions {
    openingAnimation ?: {
      clipName : string;
      stopAtLastFrame : boolean
    };
  
    loopingAnimations ?: Array<{
      clipName : string;
      startAfterOpening : boolean;
      loopMode : THREE.LoopRepeat | THREE.LoopPingPang;
    }>
  }

  interface ClipsNamesAvailable {
    hasClips() : boolean;
    getClipsNames() : Array<string>;
  }

  interface AnimationSettable {
    setAnimationOptions(optionsJSON : string);
  }



  interface Registerable<T> {
    register(arg : T);
    dismiss(arg : T);
  }
}

declare namespace RoomNS {
  interface RoomStore {
    getMappingIdToRoom() : Map<number|string, Room>;
    getSortedRoomsList() : Array<Room>;
  }
}

declare namespace RenderNS {
  
  interface Item<T> {
    display : string;
    value : T;
  }

  interface Selectable {
    select();
    unselect();
  }
}

declare interface EventListenable {
  registerEventListener(eventName:string, handler:(event:Event) => void);
  dismissEventListener(eventName:string, handler:(event:Event) => void);
}

declare interface TextStyleOptions {
  color : string;
  fontFamily : string;
  fontSize : string;
  fontWeight : "Light" | "Normal" | "Bold" | "Heavy";
  fontStyle : "Normal" | "Italic";
}

declare interface PropertiesShape {
  animations : string;
  background : string | undefined;
  conditionalFormat : Array<any>;
  defaultCameraX : number | undefined;
  defaultCameraY : number | undefined;
  defaultCameraZ : number | undefined;
  defaultTargetX : number | undefined;
  defaultTargetY : number | undefined;
  defaultTargetZ : number | undefined;
  cameraFollow : boolean;
  loopSwitch : boolean;
  loopTime : number;

  horizontalPosition : "LEFT" | "MID" | "RIGHT";
  verticalPosition   : "TOP"  | "MID" | "BOTTOM";
  dataTipTop : number;
  dataTipLeft : number;
  dataTipBodyTextStyle : TextStyleOptions;
  dataTipBgColor : string;
  dataTipBgImg : string;
  modelUrl : string | undefined;
  onlyShowOnFocusRoom:boolean;

  showDataLabel : boolean;
  dataLabelShowValue : boolean;
  dataLabelShowRoomId : boolean;
  dataLabelShowColumnName : boolean;
  dataLabelDelimiter : string;
  dataLabelTextStyle : TextStyleOptions;
  dataLabelBorderWidth : number;
  dataLabelBorderColor : string;
  dataLabelBackgroundColor : string;
  dataLabelPadding : Position;
  dataLabelBackgroundImage : string;
  dataLabelHorizontalPosition : "LEFT" | "MID" | "RIGHT";
  dataLabelVerticalPosition   : "TOP"  | "MID" | "BOTTOM";
  dataLabelOffsetTop : number;
  dataLabelOffsetLeft : number;
}

declare namespace ConditionFormatNS {
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

  interface NumberRange {
    min ?: number | FieldIdentifier;
    max ?: number | FieldIdentifier;
    minIncluded ?: boolean;
    maxIncluded ?: boolean;
  } 
  interface StringRange {
    pattern: string; // 匹配串
    caseSensitive: boolean; // 大小写是否敏感
  }

  interface Condition{
    rule : ConditionFormatRule;
    range : NumberRange | StringRange;
  }

  interface FieldIdentifier {
    columnName : string;
    aggregationMethod : AggMethod;
  }

  interface ConditionFormat {
    condition : Condition;
    fieldIdentifier : FieldIdentifier;
    style : {
      color : string;
    }
  }
}

declare interface dataUseFormatAndUnit{
  (value:number | string) : string;
}

declare interface PropertiesAvailable {
  getPropertyByName(name: keyof PropertiesShape) : PropertiesShape[name];
}

declare type AggMethod = 'sum' | 'avg' | 'max' | 'min' | 'cnt' | 'dst' | 'fst';

declare interface CanvasPainter2D {
  paintOneFrame(canvasContext2D : CanvasRenderingContext2D);
}

declare interface CanvasDrawable2D {
  registerPainter(painter:CanvasPainter2D, priority ?: number);
  dismissPainter(painter:CanvasPainter2D);
}

declare interface Position {
  top : number;
  right : number;
  bottom : number;
  left : number;
}