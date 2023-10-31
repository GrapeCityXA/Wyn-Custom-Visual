import '../style/visual.less';
let html2canvas;

export default class Visual {
  private container: HTMLDivElement;
  private visualHost: any;
  private properties: any;
  private imageSrc: string;
  private animationId: any;

  constructor(dom: HTMLDivElement, host: any) {
    this.container = dom;
    this.container.classList.add('visual-rotate-image-3d');
    this.visualHost = host;
    html2canvas = host.moduleManager.getModule('html2canvas');
    this.properties = {
      X: 40,
      Y: 20,
      fps:60
    };
  }
  public update(options: any) {
    this.properties = options.properties;
    this.imageSrc = this.properties.maskImage || this.visualHost.assetsManager.getImage('testImg1');
    this.render();
  };

  private render() {
    this.visualHost.eventService.renderStart();
    this.container.innerHTML = "";
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    var maskImage = new Image();
    maskImage.className = "A image";
    maskImage.src = this.imageSrc;
    this.container.appendChild(maskImage);
    maskImage.onload = () => {
      this.visualHost.eventService.renderFinish();
    };
    const options = this.properties;
    var fps = options.fps;
    var interval = 1000 / fps;
    //当前执行时间
    var nowTime = 0;
    //记录每次动画执行结束的时间
    var lastTime = Date.now();
    //我们自己定义的动画时间差值
    var diffTime = 0;
    const animloop = () => {
      //记录当前时间
      nowTime = Date.now()
      diffTime = nowTime - lastTime
      // 当前时间-上次执行时间如果大于diffTime，那么执行动画，并更新上次执行时间
      if (diffTime > interval) {
        lastTime = nowTime - (diffTime % interval);
        let transform = "transform:rotateX(" + options.X + "deg) rotateY(" + options.Y + "deg) rotateZ(" + options.Z + "deg);";
        maskImage.setAttribute("style", transform);
        if (options.Z < 360) {
          options.Z++;
        } else {
          options.Z = -360;
        }
      }
      this.animationId = requestAnimationFrame(animloop);
    }
    animloop();
  }

  public onDestroy(): void {
    cancelAnimationFrame(this.animationId);
  }

  // 自定义属性可见性
  public getInspectorVisibilityState(properties: any): string[] {
    return null;
  }
  // 功能按钮可见性
  public getActionBarVisibilityState(updateOptions: any): string[] {
    return null;
  }
  public onActionEventHandler = (name: string) => {

  }

  private async onSuccessImage(exportedImg) {
    this.container.appendChild(exportedImg);
    const canvas = await html2canvas(this.container, { backgroundColor: null });
    return canvas.toDataURL();
  }

  private async onErrorImage() {
    this.container.innerHTML = 'Failed to fetch the image.';
    const canvas = await html2canvas(this.container, { backgroundColor: null });
    return canvas.toDataURL();
  }

  public export() {
    const def = this.visualHost.promiseFactory.defer();
    this.container.innerHTML = '';
    const exportedImg = new Image();
    if (/^(http|https):\/\//.test(this.imageSrc)) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = this.imageSrc;
        img.onload = () => {
          canvas.height = img.height;
          canvas.width = img.width;
          ctx.drawImage(img, 0, 0);
          exportedImg.src = canvas.toDataURL();
          this.onSuccessImage(exportedImg).then((result) => {
            def.resolve(result);
          });
        }
        img.onerror = () => {
          this.onErrorImage().then((result) => {
            def.resolve(result);
          });
        }
      } catch (error) {
        this.onErrorImage().then((result) => {
          def.resolve(result);
        });
      }
    } else {
      exportedImg.src = this.imageSrc;
      this.onSuccessImage(exportedImg).then((result) => {
        def.resolve(result);
      });
    }
    return def.promise;
  }
}