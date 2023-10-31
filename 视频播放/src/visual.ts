import '../style/visual.less';
export default class Visual {
  private container: HTMLDivElement;
  private properties: any;
  private items: any;
  private video: HTMLVideoElement;
  constructor(dom: HTMLDivElement, host: any) {
    this.container = dom;
    this.items = '';
    this.properties = {
      videoUrl: 'http://video1.grapecity.com.cn/WynEnterprise/online/wyn3.0.mp4',
    };
  }

  public update(options: any) {
    const dataView = options.dataViews[0];
    this.items = '';
    if (dataView &&
      dataView.plain.profile.dimensions.values.length) {
      const plainData = dataView.plain;
      let dimensions = plainData.profile.dimensions.values;
      this.items=plainData.data[0][dimensions[0].display];
    }
    this.properties = options.properties;
    this.render();
  }

  private getVideo () {
    if (this.video) {
      return this.video;
    }
    this.container.innerHTML = "";
    const video = document.createElement("video");
    video.muted = false;
    video.setAttribute("height", "100%");
    video.setAttribute("width", "100%");
    video.setAttribute("loop", "loop");
    video.setAttribute("preload", "auto");
    video.setAttribute("controls", "controls");
    this.video = video;
    this.container.appendChild(video);
    return video;
  }

  private render() {
    const options = this.properties;
    const items = options.custom ? options.videoUrl : this.items;
    let video: HTMLVideoElement = this.getVideo();
    if(options.autoplay){
      video.setAttribute("autoplay", "autoplay");
    } else {
      video.removeAttribute("autoplay");
    }
    video.setAttribute("src", items);
  }

  public onDestroy(): void {
    
  }


  // 自定义属性可见性
  public getInspectorHiddenState(updateOptions: any): string[] {
    if (!updateOptions.properties.custom) {
      return ['videoUrl'];
    }
    return null;
  }

  // 功能按钮可见性
  public getActionBarHiddenState(updateOptions: any): string[] {
    return null;
  }
  public onActionEventHandler = (name: string) => {

  }
}
