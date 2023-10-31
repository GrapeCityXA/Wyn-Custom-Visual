import '../style/visual.less';
import Swiper from 'swiper';
import SwiperCore, { Autoplay, Navigation, Pagination, EffectCoverflow, EffectFade, EffectCube, EffectFlip } from 'swiper/core';
import 'swiper/swiper.less';
import 'swiper/swiper-bundle.css';
let html2canvas;

const EFFECT = {
  fadeEffect: {
    crossFade: true
  },
  coverflowEffect: {
    rotate: 50,
    stretch: 0,
    depth: 100,
    modifier: 1,
    slideShadows: true,
  },
  cubeEffect: {
    shadow: true,
    slideShadows: true,
    shadowOffset: 20,
    shadowScale: 0.94,
  },
  flipEffect: {
    slideShadows: false,
  }
}
const STYLENAME = {
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontStyle: "font-style",
  fontWeight: "font-weight",
  color: "color"
}

export default class Visual extends WynVisual {
  private container: HTMLDivElement;
  private swiperContainer: Element;
  private visualHost: any;
  private isMock: boolean;
  private properties: any;
  private swiper: any;
  private swiperOptions: any;
  private nextBtn: any;
  private prevBtn: any;
  private prevEffect: any;
  private firstRender: any;
  private MockData: any;
  private swiperData: any;
  private selectionIds: any;
  private selectionManager: any;
  private viewport: any;

  constructor(dom: HTMLDivElement, host: VisualNS.VisualHost, options: VisualNS.IVisualUpdateOptions) {
    super(dom, host, options);
    this.container = dom;
    this.visualHost = host;
    html2canvas = host.moduleManager.getModule('html2canvas');
    this.selectionManager = host.selectionService.createSelectionManager();
    SwiperCore.use([Autoplay, Navigation, Pagination, EffectCoverflow, EffectFade, EffectCube, EffectFlip]);
    this.container.innerHTML = `
    <div class="swiper-container mySwiper">
      <div class="swiper-wrapper">
      </div>
      <div class="swiper-button-next"></div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-pagination"></div>
    </div>`;
    this.nextBtn = document.getElementsByClassName('swiper-button-next')[0];
    this.prevBtn = document.getElementsByClassName('swiper-button-prev')[0];
    this.swiperOptions = {

      initialSlide: 1,
      speed: 1000,
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
      },
      effect: 'fade',
      fadeEffect: {
        crossFade: true
      },
      grabCursor: true,
      centeredSlides: true,
      spaceBetween: 30,
      loop: true,
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
    }
    this.prevEffect = 'fadeEffect';
    this.firstRender = true;
    this.MockData = Visual.prepareMockData(host);
    this.swiperContainer = document.getElementsByClassName('swiper-container')[0];
    this.bindEvents();
  }

  private clickFunction = (event) => {
    this.selectionManager.clear();
    // @ts-ignore
    if (event.target.nodeName.toLowerCase() === "img" && /^selection-\d/.test(event.target.id)) {
      // @ts-ignore
      const sidIndex = parseInt(event.target.id.match(/\d+/g)[0]);
      const sid = this.selectionIds[sidIndex];
      this.selectionManager.select(sid);
      if (this.properties.clickLeftMouse === "showToolTip") {
        this.visualHost.toolTipService.show({
          position: {
            // @ts-ignore
            x: event.x,
            // @ts-ignore
            y: event.y,
          },
          selected: this.selectionManager.getSelectionIds(),
          menu: true
        });
      } else {
        this.visualHost.commandService.execute([{
          name: this.properties.clickLeftMouse,
          payload: {
            selectionIds: sid,
            position: {
              // @ts-ignore
              x: event.x,
              // @ts-ignore
              y: event.y,
            }
          }
        }])
      }
    }
  }

  private bindEvents() {
    this.swiperContainer.addEventListener('click', this.clickFunction);
  }

  private static prepareMockData(host) {
    return [
      {
        imageUrl: host.assetsManager.getImage("image1"),
        imageDescription: '图片1'
      },
      {
        imageUrl: host.assetsManager.getImage("image2"),
        imageDescription: '图片2'
      },
      {
        imageUrl: host.assetsManager.getImage("image3"),
        imageDescription: '图片3'
      },
      {
        imageUrl: host.assetsManager.getImage("image4"),
        imageDescription: '图片4'
      }
    ]
  }

  public update(options: VisualNS.IVisualUpdateOptions) {
    const dataViews = options.dataViews;
    this.viewport = options.viewport;
    this.properties = options.properties;
    this.isMock = !dataViews.length;
    this.selectionIds = [];
    const bindData = [];
    if (dataViews.length) {
      const plainData = dataViews[0].plain.data || [];
      const profileItems = dataViews[0].plain.profile;
      const imageProfileName = profileItems.image.values[0].display;
      const imageDescProfileName = profileItems.imageDescription.values[0] && profileItems.imageDescription.values[0].display;
      plainData.forEach((data) => {
        const selectionId = this.visualHost.selectionService.createSelectionId();
        selectionId.withDimension(profileItems.image.values[0], data);
        this.selectionIds.push(selectionId);
        bindData.push({
          imageUrl: data[imageProfileName],
          imageDescription: data[imageDescProfileName] || '',
        })
      })
    }
    this.swiperData = this.isMock ? this.MockData : bindData;
    this.render();
  }

  private prepareStyle() {
    let styleString = '';
    for (const [key, value] of Object.entries(this.properties.imageDescSetting)) {
      styleString += `${STYLENAME[key]}:${value};`
    }
    return styleString;
  }

  private prepareSlides() {
    let slides = [];
    let styleString = this.prepareStyle()
    this.properties.imageDescriptionPosition;
    let imageDescriptionPosition;
    let imagePosition;
    if (this.properties.imageDescriptionPosition == "top") {
      imageDescriptionPosition = "top:0%";
      imagePosition = "bottom:0%;";
    } else {
      imageDescriptionPosition = "bottom:0%";
      imagePosition = "bottom:10%;";
    }
    slides = this.swiperData.map((data, index) => {
      return `
      <div class="swiper-slide">
      <div  class="swiper-desc" style="${styleString} ${imageDescriptionPosition}">${data.imageDescription}</div>
      <img style="height:90%; ${imagePosition} " src="${data.imageUrl}" id="selection-${index}"/>
      </div>`
    })
    return slides;
  }

  private configSwiper() {
    this.swiperOptions.initialSlide = this.firstRender ? 1 : 2;
    this.firstRender = false;
    this.swiperOptions.speed = this.properties.speed;
    this.swiperOptions.autoplay.delay = this.properties.delay;
    this.swiperOptions.effect = this.properties.effect;
    delete this.swiperOptions[this.prevEffect];
    const effectName = `${this.properties.effect}Effect`;
    this.swiperOptions[effectName] = EFFECT[effectName];
  }

  private configButton() {
    let buttonOpacity = this.properties.useButton ? 1 : 0;
    this.nextBtn.style.opacity = buttonOpacity;
    this.prevBtn.style.opacity = buttonOpacity;
  }

  private configAutoPlay() {
    if (this.properties.autoPlay) {
      this.swiper.autoplay.start();
    } else {
      this.swiper.autoplay.stop();
    }
  }

  public render(): void {
    this.visualHost.eventService.renderStart();
    this.container.style.opacity = '1';
    if (this.swiper) {
      this.swiper.destroy(true, true);
    }
    this.configSwiper();
    this.swiper = new Swiper(".swiper-container", this.swiperOptions);
    if (!this.properties.usetoggle) {
      this.swiper.pagination.$el[0].style.opacity = 0;
    } else {
      this.swiper.pagination.$el[0].style.opacity = 1;
    }
    this.swiper.removeAllSlides();
    const slides = this.prepareSlides();
    this.swiper.appendSlide(slides);
    this.configButton()
    this.configAutoPlay()
    this.swiper.update();
    this.visualHost.eventService.renderFinish();
  }

  public onResize() {
    if (this.swiper) {
      this.swiper.updateSize();
      this.swiper.update();
    }
  }

  public onDestroy(): void {
    if (this.swiper) {
      this.swiper.destroy(true, true);
    }
    this.swiperContainer.removeEventListener('click', this.clickFunction);
  }

  public getInspectorHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    let hiddenStates = [];
    if (!options.properties.autoPlay) {
      hiddenStates.push('delay');
    }
    return hiddenStates;
  }

  public getActionBarHiddenState(options: VisualNS.IVisualUpdateOptions): string[] {
    return null;
  }

  public getColorAssignmentConfigMapping(dataViews: VisualNS.IDataView[]): VisualNS.IColorAssignmentConfigMapping {
    return null;
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
    exportedImg.style.width = `${this.viewport.width}px`;
    exportedImg.style.height = `${this.viewport.height}px`;
    const firstImageUrl = this.swiperData[0].imageUrl;
    if (/^(http|https):\/\//.test(firstImageUrl)) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = firstImageUrl;
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
      exportedImg.src = firstImageUrl;
      this.onSuccessImage(exportedImg).then((result) => {
        def.resolve(result);
      });
    }
    return def.promise;
  }
}
