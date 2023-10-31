import CameraService from "src/engine/components/CameraService";
import { WebGLRenderer } from "three";
import BaseWindow from "../BaseWindow";
import InteractionLayer from "./InteractionLayer";

enum ModelLoadState {
  NotLoad = 0,
  Loaded = 1,
  Rendered = 2,
}
export default class Viewport 
  extends 
    BaseWindow 
  implements
    AnimationNS.Registerable<(time?:number) => void>,
    CanvasDrawable2D
  {
  // 依赖
  private _cameraService : CameraService;
  /////////////////////////////////////////////////////////
  
  private _renderer : WebGLRenderer;
  private _renderSceneAnimate : () => void;

  // 动画主循环执行的更新
  private _registeredUpdates : Set<(time?:number) => void>;
  public register(fn) {
    this._registeredUpdates.add(fn);
  }
  public dismiss(fn) {
    this._registeredUpdates.delete(fn);
  }
  /////////////////////////////////////////////////////////

  private _overCanvas : HTMLCanvasElement;
  private _overCanvasContext2D : CanvasRenderingContext2D;
  private _overCanvasPainters : Array<CanvasPainter2D>;
  private _modelLoadState = ModelLoadState.NotLoad;
  private _eventService:VisualNS.EventService;


  public destroy = () => {};

  constructor(eventService) {

    super('viewport');
    this._eventService = eventService;
    this._renderer = new WebGLRenderer({ alpha : true });
    this._registeredUpdates = new Set();

    this._overCanvas = document.createElement('canvas');
    this._overCanvas.style.position = 'absolute';
    this.dom.appendChild(this._overCanvas);

    this._overCanvasContext2D = this._overCanvas.getContext('2d');
    this._overCanvasPainters = new Array();
  }

  setModelLoaded() {
    this._modelLoadState = ModelLoadState.Loaded;
  }

  public render(dom: HTMLElement) {
    this.dom.appendChild(this._renderer.domElement);
    dom.appendChild(this.dom);
  }

  /**
   * 开启动画
   */
  public start() {
    if(!this._cameraService) throw 'Please call .setCameraService() to inject a instance';
    
    this.resize();
    const animate = (time) => {
      this._registeredUpdates.forEach(update => update(time));
      this._renderSceneAnimate && this._renderSceneAnimate();

      const overCanvasContext = this._overCanvasContext2D;
      overCanvasContext.clearRect(0, 0, this._overCanvas.width, this._overCanvas.height);
      this._overCanvasPainters.forEach(painter => {
        overCanvasContext.save();
        painter.paintOneFrame(overCanvasContext);
        overCanvasContext.restore();
      });
      if (this._modelLoadState === ModelLoadState.Loaded) {
        this._eventService.renderFinish();
        this._modelLoadState = ModelLoadState.Rendered;
      } 
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  public resize() {
    if(!this._cameraService.getCurCamera()) return;
    const canvas = this._renderer.domElement;
    const width = this.dom.clientWidth;
    const height = this.dom.clientHeight;
    if(canvas.width !== width || canvas.height !== height) {
      this._renderer.setPixelRatio(window.devicePixelRatio);
      this._renderer.setSize(width, height);
      this._cameraService.getCurCamera().aspect = width / height;
      this._cameraService.getCurCamera().updateProjectionMatrix();

      this._overCanvas.width = width;
      this._overCanvas.height = height;
    }

  }

  public drawModelSceneOnCanvas(){
    const animate = () => {
      const renderer = this._renderer;
      const scene = this._cameraService.getScene();
      const camera = this._cameraService.getCurCamera();
      if(renderer && scene && camera) {
        if (this._modelLoadState === ModelLoadState.Loaded) {
          this._eventService.renderStart();
        } 
        renderer.render(scene, camera);
      } else {
        renderer.clear();
        this._renderSceneAnimate = null;
      }
    }

    this._renderSceneAnimate = animate;
  }

  public registerPainter(painter:CanvasPainter2D, priority = 0) {
    this._overCanvasPainters.push(painter);
  }

  public dismissPainter(painter) {
    this._overCanvasPainters.pop();
  }

  public setCameraService(cameraService : CameraService) {
    this._cameraService = cameraService;
  }

  public getModelSceneCanvas() {
    return this._renderer.domElement;
  }

  public getOverCanvas() {
    return this._overCanvas;
  }

  public getRenderer() {
    return this._renderer;
  }

  public renderInteractionLayer(interactionLayer : InteractionLayer) {
    interactionLayer.render(this.dom);
  }

  public forceRender() {
    this._renderSceneAnimate && this._renderSceneAnimate();
  }
}