# Shipping and returns / 配送与售后

`shippingPolicies` is a country-specific flat per-order charge:

```json
{ "id": "gb-standard", "country": "GB", "feeMinor": 500, "deliveryDays": "3–5" }
```

`country` is an uppercase two-letter country code. `feeMinor` is integer GBP pennies, 0–1,000,000.
`deliveryDays` is a merchant-supplied display range using an en dash. It is not a carrier promise computed by
this service. The seeded policy covers `IE`; referencing it from a `GB` campaign fails the campaign check.

配送按每单计算，费用为整数便士。预计天数来自商家提供的文本，不代表本服务计算了真实物流时效。初始政策只覆盖
`IE`，不能用它满足 `GB` 活动。

`returnPolicies` contains reusable merchant-supplied terms:

```json
{ "id": "standard", "days": 30, "description": "Unused items may be returned within 30 days." }
```

Products reference these terms by ID. The order stores a copy of the terms at transaction time. The numeric
`days` is 1–365; human-readable terms must remain consistent with it. The service validates the structure, not
the legal or semantic correctness of free text.

商品通过 ID 复用政策；订单复制成交时的条款。天数为 1–365，描述应与数值保持一致。宿主检查结构，不判断自然语言条款的法律有效性或语义正确性。

This example does not calculate taxes, duties, addresses, shipping zones, refunds, or carrier
fulfillment. 示例没有税费、关税、地址校验、区域细分、退款或承运商履约。
