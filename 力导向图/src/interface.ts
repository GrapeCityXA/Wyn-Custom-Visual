export interface TextStyle {
  fontFamily?: string;
  fontSize?: string;
  fontStyle?: 'Normal' | 'Italic';
  fontWeight?: 'Normal' | 'Light' | 'Bold' | 'Bolder';
  color?: string;
}

export interface echartTextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: 'normal' | 'italic';
  fontWeight?: 'normal' | 'lighter' | 'bold' | 'bolder';
  color?: string;
}

export interface Properties {
  palette: string[];
  graphOpacity: number;
  graphDraggable: boolean;
  graphZoomable: boolean;
  autoZoom: boolean;
  zoom: number;
  interactionMode: 'node' | 'edge';
  node: {
    draggable: boolean;
    sizeSource: 'byWeight' | 'allEqual',
    minSize: number,
    maxSize: number,
    size: number,
    showLabel: boolean,
    labelTextStyle: TextStyle,
  };
  edge: {
    isDirected: boolean,
    curveness: number,
    color: string,
    minWidth: number,
    maxWidth: number,
  };
  legend: {
    show: boolean,
    textStyle: TextStyle,
    orientation: 'horizontal' | 'vertical',
    horizontalPosition: 'left' | 'right' | 'center',
    verticalPosition: 'top' | 'bottom' | 'middle',
    wrapLegend: boolean,
  };
}

export interface ColumnNames {
  sourceNameField?: string,
  sourceSeriesField: string,
  sourceImageField: string,
  targetNameField?: string,
  targetSeriesField: string,
  targetImageField: string,
  weightField: string,
}

export enum ImageRenderSetting {
  ImageURL = 'imageUrl',
  ImageBinary = 'imageBinary',
}

export interface Columns {
  sourceNameValue?: VisualNS.IFieldProfile;
  sourceSeriesValue?: VisualNS.IFieldProfile;
  sourceImageValue?: VisualNS.IFieldProfile;
  targetNameValue?: VisualNS.IFieldProfile;
  targetSeriesValue?: VisualNS.IFieldProfile;
  targetImageValue?: VisualNS.IFieldProfile;
  weightValue?: VisualNS.IFieldProfile;
  sourceImageOption?: {
    renderSetting: ImageRenderSetting[];
  };
  targetImageOption?: {
    renderSetting: ImageRenderSetting[];
  }
}
