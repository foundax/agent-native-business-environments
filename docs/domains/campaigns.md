# Campaigns, plans and orders / 活动、计划与订单

Promotions have `{ id, percent, productIds }`: an integer percentage from 1 to 90 and an explicit product
list. Campaigns have `{ id, title, country, productIds, shippingPolicyId, promotionId }`. Product selections
contain 1–20 unique IDs. One selected promotion must cover every selected product.

促销是 1–90 的整数百分比折扣，并显式引用商品。活动引用目标国家、商品、配送政策和促销。每个活动选择 1–20 个不重复商品，所选促销必须覆盖全部商品。

## Write contract / 写入契约

```json
{
  "expectedRevision": 0,
  "operations": [
    {
      "domain": "shippingPolicies",
      "value": { "id": "gb-standard", "country": "GB", "feeMinor": 500, "deliveryDays": "3–5" }
    }
  ]
}
```

Use `apply <file>` or `client.apply(plan)`. Each operation replaces the complete entity with that ID, or
creates it. The host fixes shop scope, rejects unknown fields, validates product/promotion references after
applying all operations, and increments one shop-wide revision after one save. Maximum 50 operations. Deletion
is not implemented.

用 `apply <文件>`
或 SDK 提交。每项操作按 ID 完整创建或替换，关联检查在全部操作组成候选状态后执行。固定店铺范围由宿主决定；一次保存后版本增加一。最多 50 项操作，没有删除接口。

Incomplete campaign drafts can be saved. `check <id>` reports missing products, shipping coverage, return
policies, media, stock, and promotion coverage. The view/order path requires these implemented checks to pass.
`check` returning no issues does not establish visual quality or production readiness.

活动草稿可以暂不完整；`check`
报告商品、配送、售后、素材、库存与促销覆盖问题。活动视图和订单要求这些已实现的检查通过；通过不等于视觉验收或生产就绪。

## Order contract / 订单契约

```json
{
  "expectedRevision": 2,
  "campaignId": "quiet-mornings",
  "country": "GB",
  "items": [{ "productId": "cup", "quantity": 1 }]
}
```

Read the current revision before submitting; `2` above is illustrative. Unit price is
`round(priceMinor * (100 - percent) / 100)`, multiplied by quantity, plus one shipping fee. Rounding occurs
per unit, not on the order subtotal. The host checks stock and destination, stores the order, and reduces
stock. Client-supplied amounts are rejected. Quantities are integers 1–100, with at most 20 unique product
lines.

提交前读取实际版本，示例中的 `2`
只是说明。优惠按单件四舍五入到便士，然后乘数量，再加一次配送费。宿主检查库存和目的地，保存订单并扣减库存；拒绝客户端传入金额。每行数量为整数 1–100，最多 20 行且商品不重复。

On `revision_conflict`, re-read and review the intended change; do not simply substitute the new revision and
retry. On an uncertain network outcome, inspect the local host state before repeating an order. There is no
payment or retry-idempotency service.

版本冲突后应重新理解当前状态，不能只替换版本号盲目重试。网络结果不确定时，先检查宿主状态再决定是否重发。本例没有真实支付或订单重试幂等服务。
