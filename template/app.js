import { createBusinessClient } from '/sdk.mjs';

const business = createBusinessClient(location.origin);
const campaignId = 'quiet-mornings';
const receipt = document.querySelector('#receipt');
let currentView;
let ordering = false;

async function loadCollection() {
  const errorOutput = document.querySelector('#load-error');
  errorOutput.hidden = true;
  document.querySelector('#products').replaceChildren();
  currentView = undefined;
  try {
    const view = await business.campaign(campaignId);
    currentView = view;
    document.querySelector('#offer').textContent =
      `An opening gesture: ${view.promotion.percent}% off this collection.`;
    const hero = document.querySelector('#hero-image');
    hero.src = view.products[0].media.src;
    hero.alt = view.products[0].media.alt;
    document.querySelector('#shipping').textContent =
      `Delivery to ${view.shipping.country}: ${view.shipping.fee} per order. Estimated ${view.shipping.deliveryDays} days.`;
    document.querySelector('#returns').textContent = [
      ...new Set(view.products.map((product) => product.returns.description)),
    ].join(' ');
    for (const product of view.products) {
      const article = document.createElement('article');
      const image = document.createElement('img');
      image.src = product.media.src;
      image.alt = product.media.alt;
      image.width = product.media.width;
      image.height = product.media.height;
      const heading = document.createElement('h3');
      heading.textContent = product.title;
      const description = document.createElement('p');
      description.textContent = product.description;
      const price = document.createElement('p');
      price.className = 'price';
      const previousPrice = document.createElement('s');
      previousPrice.textContent = product.price;
      price.append(`${product.offerPrice} `, previousPrice);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Try a demo order — ${product.title}`;
      button.disabled = ordering;
      button.addEventListener('click', () => order(product.id));
      article.append(image, heading, description, price, button);
      document.querySelector('#products').append(article);
    }
  } catch (error) {
    errorOutput.hidden = false;
    errorOutput.textContent = [error.message, ...(error.details ?? []).map((issue) => issue.message)].join(
      ' ',
    );
    document.querySelector('#offer').textContent = 'The collection is not ready.';
    document.querySelector('#shipping').textContent = 'Delivery details are unavailable.';
    document.querySelector('#returns').textContent = '';
  }
}

async function order(productId) {
  if (ordering) return;
  ordering = true;
  document.querySelectorAll('#products button').forEach((button) => {
    button.disabled = true;
  });
  try {
    const result = await business.order({
      expectedRevision: currentView.revision,
      campaignId,
      country: currentView.campaign.country,
      items: [{ productId, quantity: 1 }],
    });
    const total = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: result.order.currency,
    }).format(result.order.totalMinor / 100);
    receipt.textContent = `Demo order recorded: ${total}, including delivery. No payment was taken.`;
    await loadCollection();
  } catch (error) {
    receipt.textContent = `${error.message} Use “Refresh prices & availability” before trying again.`;
  } finally {
    ordering = false;
    document.querySelectorAll('#products button').forEach((button) => {
      button.disabled = false;
    });
  }
}

document.querySelector('#refresh').addEventListener('click', () => {
  receipt.textContent = '';
  return loadCollection();
});
await loadCollection();
