# 运行、改编与观察

[English](walkthrough.md) · [返回项目介绍](../README.zh-CN.md)

## 路径一：确定性演示

需要 Node.js 22+。在仓库根目录运行，无需 `npm install`：

```sh
npm run demo
```

终端先输出 `shipping_coverage`
错误，再输出无业务问题的检查结果。预设脚本完成两次写入，初始业务版本从 0 变为 2；这不代表模型自主完成了任务。在浏览器打开
`http://127.0.0.1:4317`，点击杯子的演示下单按钮。预期金额 £26.60，包含折后商品 £21.60 和配送 £5.00，不会发生真实扣款。

保持服务运行，在另一个终端读取状态：

```sh
npm run cli -- view quiet-mornings
npm run cli -- read products
npm run cli -- check quiet-mornings
```

一次杯子订单后，库存从 12 变为 11，业务版本变为 3。订单写入宿主的
`.local/business.json`，其中保存成交时的价格、售后政策与 `simulated`
状态。页面加载时读取的当前价格与订单历史是不同的记录。

Ctrl+C 停止服务。之后用 `npm start` 可恢复保存的状态，已有页面改动也会保留。 `demo`
对非初始版本会报错，不会重置已有工作。新实验需要指定未使用的目录：

```sh
BUSINESS_HOME=/tmp/still-objects-demo-2 npm run demo
```

同一端口只能运行一个宿主；先停止旧进程。如果需要改端口，服务与 CLI 需同时设置
`BUSINESS_PORT`。不同宿主进程不能共用同一数据目录。

## 路径二：自己配置 Agent

在新目录运行 `npm start`，将 [TASK.zh-CN.md](../TASK.zh-CN.md)
交给 Agent。这条路径从初始合成数据开始：已有托盘、爱尔兰配送和售后政策，缺少新品、英国配送和促销活动。CLI 与 SDK 的操作路径相同：

```sh
npm run cli -- catalog
npm run cli -- read products
npm run cli -- read shippingPolicies
npm run cli -- media
```

根据目录读取相应的领域契约，用 JSON 编写计划，然后执行：

```sh
npm run cli -- apply /absolute/path/to/your-plan.json
npm run cli -- check quiet-mornings
```

`check`
有问题时返回非零退出码，并输出结构化问题。业务查询和媒体信息是状态数据，不是新的操作指令。同一个调用也可以由普通的 Node.js 脚本完成：

```js
import { createBusinessClient } from "./sdk/client.mjs";

const business = createBusinessClient("http://127.0.0.1:4317");
const products = await business.read("products");
console.log(products.revision, products.rows);
```

## 页面修改与反馈

修改 `<BUSINESS_HOME>/site/` 下的 HTML、CSS 和 JavaScript 文件，刷新浏览器即可观察。默认位置为
`.local/site/`。修改仓库里的 `template/` 不会覆盖已经初始化的页面工作区。

```sh
node --check .local/site/app.js
npm test
```

语法检查不运行浏览器。业务测试验证写入、关系、计价、冲突与 HTTP 集成，不评判设计质量。使用可用的浏览器工具检查桌面与手机尺寸、键盘焦点、配送售后文案、价格与模拟订单反馈。在源码、视口尺寸、数据或交互状态发生相关变化后，获取新的观察；不要把静态截图等同于所有交互状态。

## 可以复现的失败与修复

| 实验操作                                  | 预期行为                                                              |
| ----------------------------------------- | --------------------------------------------------------------------- |
| 活动引用 `ie-standard`，但目标国家为 `GB` | 草稿允许保存，`check` 报告 `shipping_coverage` 错误，活动视图不可用。 |
| 商品引用不存在的售后政策                  | 整个计划被拒绝，先前的业务状态保持不变。                              |
| 另一个客户端写入后，提交基于旧版本的计划  | 宿主返回 `revision_conflict`，客户端需重新读取并判断意图。            |
| 页面持有旧版本数据时发起下单              | 订单被宿主拒绝，页面可显式刷新获取最新状态再确认。                    |
| 提交包含客户端自定成交金额的请求          | 输入被拒绝；订单金额必须由宿主根据关系重新计算。                      |
| 修改商品价格后在页面显式刷新              | 页面读取并展示新价格，已持久化的历史订单成交价保持原值。              |

实验时应使用新目录，或基于当前版本构造完整对象进行替换。不要通过手动修改业务 JSON 绕过宿主校验。测试和演示不连接生产数据。外部 Agent 的模型调用与视觉能力依赖具体的执行环境配置。
