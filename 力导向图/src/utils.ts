import { TextStyle, echartTextStyle, ImageRenderSetting } from './interface';

// fontSize others => px;
const convertOtherUnitToPx = (fontSize: string): number => {
    const divDom = document.createElement('div');
    divDom.style.visibility = 'hidden';
    divDom.style.position = 'absolute';
    divDom.style.padding = '0';
    divDom.style.border = '0';
    divDom.style.width = fontSize;
    document.body.appendChild(divDom);
    const info = divDom.getBoundingClientRect();
    document.body.removeChild(divDom);
    return info.width;
}

export const fromValuesToDisplays = (values: number[], min: number, max: number): number[] => {
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  if (min === max || minValue === maxValue) return values.map(() => min);

  const ratio = (maxValue - minValue) / (max - min);
  return values.map(value => min + (value - minValue) / ratio);
}

export const getEchartTextStyle = (textStyle: TextStyle): echartTextStyle => {
  const { color, fontFamily, fontStyle } = textStyle;
  let { fontSize, fontWeight } = textStyle;
  if (fontWeight === 'Light') {
    fontWeight = 'Lighter' as any;
  }
  return {
    color,
    fontFamily,
    fontStyle: fontStyle.toLowerCase() as any,
    fontWeight: fontWeight.toLowerCase() as any,
    fontSize: convertOtherUnitToPx(fontSize),
  };
}

export const getImageUrl = (url: string, renderSetting: ImageRenderSetting): string => {
  if (url == null) return null;
  return renderSetting === ImageRenderSetting.ImageBinary ? `data:image/*;base64,${url}` : url;
}
