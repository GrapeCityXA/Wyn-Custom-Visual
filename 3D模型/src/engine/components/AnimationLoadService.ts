import * as THREE from 'three';

export default class AnimationLoadService implements AnimationNS.ClipsNamesAvailable {
  private _scene : THREE.Object3D; // 被加载的对象

  private _mixer : THREE.AnimationMixer;
  

  private _clipsAvailable : Array<THREE.AnimationClip> = new Array();

  private _openingAnimationClip : THREE.AnimationClip;
  private _openingAnimationAction : THREE.AnimationAction | null;
  
  private _loopingAnimationClips : Array<THREE.AnimationClip> = new Array();
  private _loopingAnimationActions : Array<THREE.AnimationAction> = new Array();

  private _loaded : boolean = false;
  private _running : boolean = false;

  private _clock = new THREE.Clock();

  private _mainAnimationLoop : AnimationNS.Registerable<(times?:number) => void>; // 

  private constructor() {
  }

  private static _singleInstance : AnimationLoadService;

  public static getInstance() {
    if(!this._singleInstance) {
      this._singleInstance = new AnimationLoadService();
    }
    return this._singleInstance;
  }

  public init() {

    this.clear();
    this._scene = null;
    this._mixer = null;
    this._clipsAvailable.length = 0;

    return AnimationLoadService.getInstance();
  }

  private clear() {
    this._mixer && this._mixer.stopAllAction();
    this._mixer && this._scene && this._mixer.uncacheRoot(this._scene);
    this._openingAnimationClip = null;
    this._openingAnimationAction = null;
    this._loopingAnimationClips.length = 0;
    this._loopingAnimationActions.length = 0;
    this._mainAnimationLoop && this._mainAnimationLoop.dismiss(this.update);

    this._loaded = false;
    this._running = false;
    return AnimationLoadService.getInstance();
  }

  public setViewPort(viewport : AnimationNS.Registerable<(times?:number) => void>) {
    this._mainAnimationLoop = viewport;
  }

  public setScene(scene : THREE.Object3D) {
    this._scene = scene;
    return AnimationLoadService.getInstance();
  }

  public setClips(clips : Array<THREE.AnimationClip>) {
    this._clipsAvailable = clips.filter(clip => clip.duration > 0);
    return AnimationLoadService.getInstance();
  }

  public configWithOptionsJSON(json:string) {
    if(!this._mainAnimationLoop) throw 'Please call .setViewPort() to inject a instance of ViewPort, \
      animationLoad use the viewport instance to login update in main animation loop';
    if(!this._scene) throw 'please call .setScene() to inject a instance of THREE.Scene before call .configWithOptionsJSON()';
    if(!this._clipsAvailable) throw 'please call .setClips() to inject a array of instance \
    of THREE.AnimationClip before call .configWithOptionsJSON()';

    // 停止动画 --> 载入新动画
    this.clear();
    this._mixer = new THREE.AnimationMixer(this._scene);
    const nameToClip = new Map(this._clipsAvailable.map(v => [v.name, v]));
    const animationOptions = JSON.parse(json) as AnimationNS.AnimationOptions;
    const openingAnimationOption = animationOptions.openingAnimation;
    if(openingAnimationOption) {
      const clip = nameToClip.get(openingAnimationOption.clipName);
      this._openingAnimationClip = clip;
      if(!clip) throw `Animation Options valid : clip name ${openingAnimationOption.clipName} is not exist !`;
      
      const openingAnimationAction = this._mixer.clipAction(clip);
      openingAnimationAction.loop = THREE.LoopOnce;
      animationOptions.openingAnimation.stopAtLastFrame && (openingAnimationAction.clampWhenFinished = true);
      this._openingAnimationAction = openingAnimationAction;
    }

    const loopingAnimationOptions = animationOptions.loopingAnimations
    if(loopingAnimationOptions) {
      for(const option of loopingAnimationOptions) {
        const clip = nameToClip.get(option.clipName);
        if(!clip) throw `Animation Options valid : clip name ${option.clipName} is not exist !`;
  
        this._loopingAnimationClips.push(clip);
        const action = this._mixer.clipAction(clip);
        action.loop = option.loopMode;
        option.startAfterOpening && action.startAt((this._openingAnimationAction && this._openingAnimationClip.duration) || 0);
        this._loopingAnimationActions.push(action);
      }
    }

    this._loaded = true;
    this.play();
  }

  private play() {
    if(!this._loaded) throw 'Please call .configWithOptionsJSON() to load animation before call play()';
    this._running = true;

    this._openingAnimationAction && this._openingAnimationAction.play();
    for(const a of this._loopingAnimationActions) {
      a.play();
    }

    this._clock.start();

    // 将更新动画的动作注册到主事件循环
    this._mainAnimationLoop.register(this.update);
  }

  private update = () => {
    if(!this._running) throw 'please call already() before update()';
    this._mixer.update(this._clock.getDelta());
  }

  public getClipsNames() {
    if(!this._clipsAvailable) throw 'Can not call .getClipNames before load animation clips'
    return this._clipsAvailable.map(clip => clip.name);
  }

  public hasClips() {
    return this._clipsAvailable.length > 0;
  }
}