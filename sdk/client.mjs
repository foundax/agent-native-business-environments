export function createBusinessClient(baseUrl) {
  async function request(path, input) {
    const response = await fetch(
      new URL(`/api/${path}`, baseUrl),
      input === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Business-Client': 'reference' },
            body: JSON.stringify(input),
          },
    );
    const result = await response.json();
    if (!response.ok) {
      throw Object.assign(new Error(result.message), { code: result.code, details: result.details });
    }
    return result;
  }
  return {
    catalog: () => request('catalog'),
    read: (domain) => request(`data/${encodeURIComponent(domain)}`),
    media: () => request('media'),
    check: (campaignId) => request(`checks/${encodeURIComponent(campaignId)}`),
    campaign: (campaignId) => request(`campaigns/${encodeURIComponent(campaignId)}`),
    apply: (plan) => request('plans', plan),
    order: (input) => request('orders', input),
  };
}
