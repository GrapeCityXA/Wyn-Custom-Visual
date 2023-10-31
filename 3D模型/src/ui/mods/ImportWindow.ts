import ModelingWorld from "src/engine/World";
import UpdateOptionsDispatcher from "../../engine/components/UpdateOptionsDispatcher";
import WynPropertiesSettingService from "../../engine/components/WynPropertiesSettingService";
import BaseWindow from "../BaseWindow";
import MainWindow from "../MainWindow";

const fileFormatSupported = new Set(
  [
    'glb',
    'fbx',
    'dae',
    'gltf',
  ]
);

export default class ImportWindow extends BaseWindow {

  /**
   * 将每一个文件对应的div封装为一个item
   * item的作用仅仅是选中item.focus()和不选中某个文件item.unFocus()
   */
  private itemList: Item[];

  private urlItem : Item;

  /**
   * 可以通过url导入 用户输入url的输入框元素
   */
  private url: HTMLInputElement; 
  /**
   * file列表对应的div的容器
   */
  private filesListBox: HTMLDivElement;

  /**
   * 获取模型文件的api
   */
  private root = 'api/dashboards/modelfiles/';

  /**
   * 选中的文件
   */
  private file: string;

  /**
   * 对dom绑定事件处理器后，将对应的取消事件处理器的方法推入该列表
   * 当调用destroy方法时，遍历该事件列表的方法，并且调用，就可以实现对绑定的事件处理器进行取消
   */
  private eventList: (() => void)[];
  
  // 依赖
  private mainWindow: MainWindow;
  private _propertyService : WynPropertiesSettingService;
  private _localizationManager : VisualNS.LocalizationManager;
  private _updateOptionsDispatcher : UpdateOptionsDispatcher;
  private _modelingWorld : ModelingWorld;
  //////////////////////////////////////////////////////

  constructor(mainWindow: MainWindow, localizationManager:VisualNS.LocalizationManager) {
    super('import-window');
    this._localizationManager = localizationManager;
    this.dom.hidden = true;
    this.mainWindow = mainWindow;

    this.itemList = [];
    this.eventList = [];

    /**
     *    <div class='main'>
     *      <div class='top-line'>
     *      
     *      </div>
     * 
     *     <div class='box'>
              <div class='url-box'>
                Url : <input></input>
              </div>
              <div class='files-list-box'>
              </div>
              <div class='buttons-box'>
                <div class='apply'>Apply</div> 
                <div class='cancel'>Cancel</div>
              </div>
            </div>
     *    </div>
     */
    const main = document.createElement('div');
    main.className = 'main dialog';

    const title = document.createElement('div');
    title.className = 'dialog-title';
    main.appendChild(title);
    const titleLabel = document.createElement('span');
    titleLabel.className = 'dialog-title-text';
    titleLabel.innerHTML = localizationManager.getDisplay('window.importModel.title');
    title.appendChild(titleLabel);

    const box = document.createElement('div');
    box.className = 'box';

    const urlBox = this.initUrlBox();
    box.appendChild(urlBox);

    this.filesListBox = document.createElement('div');
    this.filesListBox.className = 'files-list-box';
    box.appendChild(this.filesListBox);

    const buttonsBox = document.createElement('div');
    buttonsBox.className = 'buttons-box';
    const apply = document.createElement('div');
    apply.className = 'btn ok';
    apply.innerText = localizationManager.getDisplay('apply');
    const applyEvent = () => { this.apply(); };
    apply.addEventListener('click', applyEvent);
    this.eventList.push( () => { apply.removeEventListener('click', applyEvent); } );
    const cancel = document.createElement('div');
    cancel.className = 'btn cancel';
    cancel.innerText = localizationManager.getDisplay('cancel');
    const cancelEvent = () => { this.cancel(); }
    cancel.addEventListener('click', cancelEvent);
    this.eventList.push( () => { cancel.removeEventListener('click', cancelEvent); } );
    buttonsBox.appendChild(apply);
    buttonsBox.appendChild(cancel);
    box.appendChild(buttonsBox);

    main.appendChild(box);
    this.dom.appendChild(main);
  }

  private initUrlBox(): HTMLDivElement {
    // <div class='url-box'>
    //   Url : <input></input>
    // </div>
    const urlBox = document.createElement('div');
    const urlItem = new Item(urlBox);
    this.urlItem = urlItem;
    this.itemList.push(urlItem);
    urlBox.className = 'url-box';
    urlBox.innerHTML = '<span>URL</span>';
    const urlInputBox = document.createElement('div');
    urlInputBox.className = 'url-input-box';
    const urlBoxEvent = () => {
      this.itemList.forEach(e => {
        e.unFocus();
      });
      this.file = undefined;
      urlItem.focus();
    }
    urlBox.addEventListener('mousedown', urlBoxEvent);
    this.eventList.push( () => { urlBox.removeEventListener('mousedown', urlBoxEvent); } );

    this.url = document.createElement('input');
    urlInputBox.appendChild(this.url);
    urlBox.appendChild(urlInputBox);
    return urlBox;
  }

  private apply() {
    this.dom.hidden = true;

    this.mainWindow.optionBar.hide();
    let url: string;
    // 选中了在.ModelFiles文件夹下的文件
    if (this.file !== undefined) {
      url = `${this.root}${this.file}`;
    } else {
      // 如果没有选中文件 判断是否输入了url
      if (this.url.value !== undefined && this.url.value.length > 0) {
        url = this.url.value;
      }
    }
    this._propertyService.setModelURL(url || '');
    if (url !== undefined) {
      this._propertyService.setAnimationOptions('');
    }

    this.itemList.length = 1;
    this.filesListBox.innerHTML = '';
  }

  public cancel() {
    this.dom.hidden = true;
    this.itemList.length = 1;
    this.filesListBox.innerHTML = '';
    this.file = undefined;
    this.url.value = '';
  }

  public open() {

    const modelURL = this._updateOptionsDispatcher.getPropertyByName(WynPropertiesSettingService.MODEL_URL) as string;
    const splitURL = modelURL.split('/');
    const fileNameInURL = splitURL.pop();
    const host = splitURL.join('/') + '/';
    this.dom.hidden = false;
    fetch(this.root).then( r => r.json() ).then(
      data => {
        // 根据支持的文件格式（后缀名） 过滤文件
        const fileNames = data.filesList.filter(
          fileName => fileFormatSupported.has(fileName.split('.').pop())
        );

        let selectFileLastTime = false; // 上一次选择的是文件
        this.file = undefined;
        fileNames.forEach( fileName => {
          this.newItem(fileName, host === this.root && fileNameInURL === fileName);

          /**
           * 判断文件列表中是否有上一次导入的文件
           */
          if( host === this.root && fileNameInURL === fileName) {
            selectFileLastTime = true;
            this.file = fileNameInURL;
          }
        });


        if(!selectFileLastTime && modelURL !== '') {
          this.url.value = modelURL;
          this.urlItem.focus();
        } else {
          this.url.value = '';
          this.urlItem.unFocus();
        }
      }
      ).catch(() => {
        this.url.value = modelURL;
        if(modelURL && modelURL !== '') {
          this.urlItem.focus();
        }
      });
    }


  public switchOpenOrHide() {
    if(this.dom.hidden) {
      this.open();
    } else {
      this.cancel();
    }
  }

  private newItem(fileName, focus:boolean = false) {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerText = fileName;
    const item = new Item(div); // 给div添加可以选中和取消选中的能力
    div.addEventListener('click', () => {
      this.itemList.forEach( e => { e.unFocus(); } );
      item.focus();
      this.file = fileName;
    } );
    this.itemList.push(item);
    if(focus) {
      item.focus();
    }
    this.filesListBox.appendChild(div);
  }

  public setWynPropertiesSettingService(propertyService : WynPropertiesSettingService) {
    this._propertyService = propertyService;
  }

  public setUpdateOptionsDispatcher(dispatcher : UpdateOptionsDispatcher) {
    this._updateOptionsDispatcher = dispatcher;
  }

  public setModelingWorld(modelingWorld : ModelingWorld) {
    this._modelingWorld = modelingWorld;
  }

  public destroy() {
    this.eventList.forEach( e => e() );
  }
}

class Item {
  private div: HTMLDivElement;
  constructor(div: HTMLDivElement) {
    this.div = div;
  }

  public focus() {
    this.div.classList.add('focus-item');
  }

  public unFocus() {
    this.div.classList.remove('focus-item');
  }
}