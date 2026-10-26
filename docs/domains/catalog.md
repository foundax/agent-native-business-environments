# Products and media / 商品与素材

Read only this contract when working with products. `/api/catalog` identifies other
domains. 处理商品时读取本契约；其他领域入口见目录。

| Field                  | Meaning / 含义                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `id`                   | Stable lowercase identifier; letters, digits, hyphens. / 稳定小写标识。            |
| `title`, `description` | Merchant facts and authored copy; no invented factual claims. / 商家事实与描述。   |
| `priceMinor`           | Integer GBP pennies, 1–1,000,000. / 整数便士。                                     |
| `stock`                | Available synthetic units, 0–1,000,000. / 模拟可用库存。                           |
| `mediaId`              | Reference to an entry returned by `media`. / 素材清单引用。                        |
| `returnPolicyId`       | Reference to a return policy, including one created in this plan. / 售后政策引用。 |

```sh
npm run cli -- read products
npm run cli -- read returnPolicies
npm run cli -- media
```

Data reads return `{ revision, shopId, rows }`. A plan replaces complete entities by ID. Every product must
reference known media and a return policy. A missing reference rejects the entire plan. Media is read-only in
this example; inspect `template/assets/` to view the actual illustrations.

读取返回版本、固定店铺范围和记录。计划按 ID 完整替换对象；缺失的素材或售后引用使整次计划失败。媒体清单在本例中只读，图片本身位于
`template/assets/`。页面通过 SDK 读取商品字段，不保存商品价格常量。

No SKU variants, tax, reservations, or warehouse allocation are
modeled. 本例没有规格 SKU、税务、库存预留或仓库分配。
