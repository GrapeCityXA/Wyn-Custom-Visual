import '../style/visual.less';
let html2canvas;

export default class Visual {
  private container: HTMLDivElement;
  private visualHost: any;
  private properties: any;
  private imageSrc: any;

  constructor(dom: HTMLDivElement, host: any) {
    this.container = dom;
    this.container.classList.add('visual-rotate-image-2d');
    this.visualHost = host;
    html2canvas = host.moduleManager.getModule('html2canvas');
    this.properties = {
    };
  }
  public update(options: any) {
    this.properties = options.properties;
    this.render();
  };

  private render() {
    this.visualHost.eventService.renderStart();
    this.container.innerHTML = ""
    const options = this.properties;
    this.imageSrc = options.maskImage || this.visualHost.assetsManager.getImage('testImg1');
    var maskImage = new Image();
    let animationStyleName = options.animationStyle
    maskImage.className = animationStyleName + " sty image"
    maskImage.src = this.imageSrc;
    const style = document.createElement('style');
    switch (options.animationStyle) {
      case "move": {
        if (options.moveFor == "moveForX") {
          style.innerHTML = `
            @keyframes animation {
              0% {
                left: ${options.beginPosition}%;
              }
              100% {
                left: ${options.endPosition}%;
              }
            }
          `;
        } else {
          style.innerHTML = `
            @keyframes animation {
              0% {
                top: ${options.beginPosition}%;
              }
              100% {
                top: ${options.endPosition}%;
              }
            }
          `;
        }
        break;
      }
      case "Rotate": {
        switch (options.rotateStyle) {
          case "myRotate": {
            style.innerHTML = `
              @keyframes animation {
                0% {
                  transform: rotate(0deg);
                }
                100% {
                  transform: rotate(360deg);
                }
              }
            `;
            break;
          }
          case "myRotateX": {
            style.innerHTML = `
              @keyframes animation {
                0% {
                  transform: rotateX(0deg);
                }
                100% {
                  transform: rotateX(360deg);
                }
              }
            `;
            break;
          }
          case "myRotateY": {
            style.innerHTML = `
              @keyframes animation {
                0% {
                  transform: rotateY(0deg);
                }
                100% {
                  transform: rotateY(360deg);
                }
              }
            `;
            break;
          }
        }
        break;
      }
      case "Zoom": {
        style.innerHTML = `
          @keyframes animation {
            0% {
              transform: scale(${options.maxSize / 50});
            }
            50% {
              transform: scale(${options.minSize / 50});
            }
            100% {
              transform: scale(${options.maxSize / 50});
            }
          }
        `;
        break;
      }

      case "Ripples": {
        style.innerHTML = `
          @keyframes animation {
            0% {
              transform: scale(0);
              top: ${100 - options.beginPosition}%;
            }
            100% {
              transform: scale(${options.maxSize / 50});
              top: ${100 - options.endPosition}%};
            }
          }
        `;
        this.container.style.transform = `rotateX(${options.tilt}deg)`;
        break;
      }
    }
    maskImage.style.animationDuration = (options.animationSpeed == 0 ? 0 : (options.animationSpeed == 100 ? 0.01 : 40 - (options.animationSpeed / 2.5))) + 's'
    maskImage.style.animationIterationCount = options.repeat ? "infinite" : options.frequency;
    maskImage.style.animationDelay = options.animationDelay + "s";
    this.container.appendChild(maskImage);
    this.container.appendChild(style);
    maskImage.onload = () => {
      if (this.container.clientHeight / 2 < maskImage.offsetHeight) {
        maskImage.setAttribute("height", (maskImage.offsetHeight / 2) + '')
      }
      if (this.container.clientWidth / 2 < maskImage.offsetWidth) {
        maskImage.setAttribute("width", (maskImage.offsetWidth / 2) + '')
      }
      this.visualHost.eventService.renderFinish();
    };
  }

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    let option = options.properties;
    let hiddenOptions: Array<string> = ['']
    if (option.repeat) {
      hiddenOptions = hiddenOptions.concat(['frequency'])
    }
    if (option.animationStyle != "Rotate") {
      hiddenOptions = hiddenOptions.concat(['rotateStyle'])
    } else {
      hiddenOptions = hiddenOptions.concat(['beginPosition', 'endPosition', 'minSize', 'maxSize'])
    }
    if (option.animationStyle != "move") {
      hiddenOptions = hiddenOptions.concat(['moveFor'])
    } else {
      hiddenOptions = hiddenOptions.concat(['minSize', 'maxSize'])
    }
    if (option.animationStyle == "Zoom") {
      hiddenOptions = hiddenOptions.concat(['beginPosition', 'endPosition'])
    }
    if (option.animationStyle == "Ripples") {
      hiddenOptions = hiddenOptions.concat(['minSize'])
    } else {
      hiddenOptions = hiddenOptions.concat(['tilt'])
    }
    return hiddenOptions;
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