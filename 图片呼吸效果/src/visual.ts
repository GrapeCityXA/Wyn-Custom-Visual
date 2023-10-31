import '../style/visual.less';
let html2canvas;

export default class Visual {
  private container: HTMLDivElement;
  private visualHost: any;
  private properties: any;
  private firstImageUrl: string;

  constructor(dom: HTMLDivElement, host: any) {
    this.container = dom;
    this.visualHost = host;
    this.properties = {
    };
    html2canvas = host.moduleManager.getModule('html2canvas');
  }
  public update(options: any) {
    this.properties = options.properties;
    this.render();
  };
  private render() {
    this.visualHost.eventService.renderStart();
    this.container.innerHTML = "";
    var maskImage1 = new Image();
    var maskImage2 = new Image();
    const options = this.properties;

    maskImage1.className = "A image"
    maskImage1.onload = () =>  {
      this.container.appendChild(maskImage1);
      this.visualHost.eventService.renderFinish();
    };
    this.firstImageUrl = options.Image1 || this.visualHost.assetsManager.getImage('testImg1');
    maskImage1.src = this.firstImageUrl;


    maskImage2.className = "B image"
    maskImage2.onload = () => {
      this.container.appendChild(maskImage2);
    };
    maskImage2.src = options.Image2 || this.visualHost.assetsManager.getImage('testImg2');
  }

  public onDestroy(): void {
    
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
    if (/^(http|https):\/\//.test(this.firstImageUrl)) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = this.firstImageUrl;
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
      exportedImg.src = this.firstImageUrl;
      this.onSuccessImage(exportedImg).then((result) => {
        def.resolve(result);
      });
    }
    return def.promise;
  }
}