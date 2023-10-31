import BaseWindow from "./BaseWindow";
import AnimationSettingsWindow from "./mods/AnimationSettingsWindow";
import ImportWindow from "./mods/ImportWindow";
import { OptionBar } from "./mods/OptionBar";
import Viewport from "./mods/Viewport";
import LoadingTipWindow from "./mods/LoadingTipWindow";
import DataTip from "./mods/DataTip";
import InteractionLayer from "./mods/InteractionLayer";

export default class MainWindow extends BaseWindow {
  /**
   * Viewport本身也是一个BaseWindow
   * ViewPort将world放入自己的window
   * 主要的作用是开启事件循环 事件循环中调用world的update()方法
   */
  public viewport: Viewport;

  /**
   * 在加载过程中显示Loading...字样
   */
  // public loadingTip: LoadingTip;
  public loadingTip : LoadingTipWindow;

  /**
   * 加载模型的窗口
   */
  public importWindow: ImportWindow;

  public _animationSettingsWindow : AnimationSettingsWindow;
  
  public optionBar: OptionBar;
  public dataTip: DataTip;

  public interactionLayer : InteractionLayer;


  constructor(host :VisualNS.VisualHost) {
    super('wyn-3d-modeling-box');
    const localizationManager = host.localizationManager;
    this.viewport = new Viewport(host.eventService);
    this.loadingTip = new LoadingTipWindow(localizationManager);
    this.optionBar = new OptionBar(this, localizationManager);
    this.importWindow = new ImportWindow(this, localizationManager);
    this.dataTip = new DataTip(localizationManager);
    this._animationSettingsWindow = new AnimationSettingsWindow(localizationManager);
    this.interactionLayer = new InteractionLayer(this.dataTip);
    this.importWindow.applyInlineStyles(['zIndex', '100']);
    this._animationSettingsWindow.applyInlineStyles(['zIndex', '100'])
    this.dataTip.applyInlineStyles(['zIndex', '50']);
    this.optionBar.applyInlineStyles(['zIndex', '50']);
    this.interactionLayer.applyInlineStyles(['zIndex', '10']);

    this.viewport.render(this.dom);
    this.optionBar.render(this.dom);
    this.loadingTip.render(this.dom);
    this.dataTip.render(this.dom);
    this.importWindow.render(this.dom);
    this._animationSettingsWindow.render(this.dom);
    this.viewport.renderInteractionLayer(this.interactionLayer);
  }

  public render(dom: HTMLElement) {
    dom.appendChild(this.dom);
  }

  public destroy() {
    this.importWindow.destroy();
    // this.loadingTip.destroy();
    this.optionBar.destroy();
    this.viewport.destroy();
  }
}