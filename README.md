# Wyn-Custom-Visual

这里是Wyn商业智能软件的可视化插件, 涵盖了一些基础的可视化插件插件，展示了Wyn丰富的可定制化能力，使仪表板更加灵活开放 ！

[Wyn商业智能官网](https://www.grapecity.com.cn/solutions/wyn)

Wyn 从 4.0 版本开始支持用户自定义可视化插件功能。您可以开发自己的可视化组件，并且自定义数据绑定面板，属性设置和数据探索方式。通过开源图表库（例如d3和echarts）渲染视觉效果。

自定义的可视化组件可以像内置组件一样在仪表板中使用，进行数据分析和展示。

## Custom-Visual下载

我们已经提供了很多基础的可视化插件，可以通过[插件市场](https://marketplace.grapecity.com.cn/ProductList?productType=wyn&moduleType=wyn-plugin&sortBy=new)进行下载使用。

## Custom-Visual的帮助文档

[自定义可视化插件帮助文档](https://www.grapecity.com.cn/solutions/wyn/help/docs/create-dashboard/visual/cv)

## 开发维护规范

- 任何可以通过源代码生成的文件不应被提交到仓库中，应将其列入`.gitignore`中。包括：

  - `node_modules`文件夹
  - `dist`文件夹
  - 打包生成的`.viz`文件
- 插件可以在 iframe 中运行，也可以在 div 中运行，如果插件需要在 div 中运行，开发的时候需要注意：

  - 不要使用`#visualDom`作为提供的 dom 的选择器，这个选择器只在 iframe 下存在，在 div 中没有，一般情况不需要给该 dom 添加样式，如果需要的话可以通过 [Element.classList](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/classList) 给该 dom 添加 class 来控制；
  - 不要使用`window`上的`width/height`；
  - 不要通过`document.styleSheets`添加动画等样式；
  - 不要使用`document`上查找 dom 的接口（例如`document.querySelector`，`JQuery`）。
  - 不要随意修改`visual.json`中的`id`。
  - 不要修改`visual.ts`接口中提供的数据（`host`,`options`）。
  - `displayName/displayNameKey`：需要支持多语言则使用`displayNameKey`，否则使用`displayName`。
  - 不要写入无用的代码，导致打包不必要的东西。
  - 判断窗口大小发生变化：`updateType === 'viewportChange'`。
  - 在实现插件的时候，需要实现`onDestroy`方法(删除window上的事件、定时器、第三方库的实例等...)
- icon规范
  - Final size: 72px x 72px
  - Format: 32-bit PNG
  - Color space: sRGB
  - Max file size: 10KB
  - icon图片压缩工具：https://riot-optimizer.com/
- 插件更新流程
  - 更新插件时，应该将`package.json`中的`version`升级。
 



