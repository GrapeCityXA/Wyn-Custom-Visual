export default class DemoData {
  public static GetDemoData(): VisualNS.IDataView {
    return {
      plain: {
        data: [
          { ['名称']: "A", ['x轴']: -1, ['纵轴']: 14 },
          { ['名称']: "B", ['x轴']: -17, ['纵轴']: 3 },
          { ['名称']: "C", ['x轴']: 15, ['纵轴']: 38 },
          { ['名称']: "D", ['x轴']: -12, ['纵轴']: -7 },
          { ['名称']: "E", ['x轴']: 8, ['纵轴']: 2 },
          { ['名称']: "F", ['x轴']: -11, ['纵轴']: -9 },
          { ['名称']: "G", ['x轴']: -9, ['纵轴']: 4 }
        ],
        profile: {
          name: {
            options: {},
            values: [{
              dataType: 'string',
              display: "名称",
              format: "@",
              method: undefined,
              name: "名称"
            }]
          },
          xAxis: {
            options: {},
            values: [{
              dataType: "number",
              display: "x轴",
              format: "General",
              method: "sum",
              name: "横轴"
            }]
          },
          yAxis: {
            options: {},
            values: [{
              dataType: "number",
              display: "纵轴",
              format: "General",
              method: "sum",
              name: "纵轴"
            }]
          }
        },
        sort: {
          ['名称']: {
            order: ["A", "B", "C", "D", "E", "F", "G"],
            priority: -1,
          }
        },
        options: {}
      },
      matrix: null,
      single: null
    };
  }
}