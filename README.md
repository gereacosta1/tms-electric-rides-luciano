# TMS Electric Rides — second storefront preview (Luciano)

Independent responsive static storefront preview with no external build dependencies.

## What is working
- Responsive header and navigation, category cards, catalog grid.
- Product filters, text search, sorting, details dialog.
- Add to cart, quantity changes, delete item, localStorage persistence.
- No active checkout or fabricated Stripe integration. The demo checkout button explains that payments are not yet enabled.
- Netlify-ready: publish directory is the project root.

## What's still needed before showing a final, complete catalog to Luciano
1. Download the ~15 authentic product images from Luciano's Google Drive/WhatsApp and add the files to `assets/products/`.
2. Add each genuine product's name, price, category and photo path to `products.js`. Only two verified products have been entered from the WhatsApp screenshots: JBL Flip 6 ($100) and JBL Charge 3 ($300).
3. Replace stylized speaker illustrations with original product photographs. The illustration is a visual placeholder, NOT a verified product photo.
4. Verify the brand name, contact email, category lineup, prices, inventory and product details with Luciano. The preview uses the preexisting TMS identity, not a new registered brand.
5. Publish only after replacing unverified claims and removing preview labels.
6. Specify and agree on the price/scope for this NEW website separately from the outstanding $450 for GreenWay.

## Upload to Netlify
Go to https://app.netlify.com/drop . Drag the whole site folder (not just index.html) to publish a draft. The root directory contains index.html and netlify.toml. No npm/build required.

## How to add a product

```js
{
  id: 'unique-slug',
  name: 'Exact product name',
  category: 'Electric Bikes', // or 'Electric Scooters' or 'Speakers'
  price: 1200,                // USD numeric
  image: 'assets/products/actual-photo.jpg',
  tag: 'NEW ARRIVAL',
  description: 'Verified description',
  features: ['Verified feature 1', 'Verified feature 2'],
}
```

## Important
Do NOT enable payment processing until the server-side checkout integration validates canonical product IDs, prices and availability, and Stripe is fully configured for the right business account.

Source references: client WhatsApp screenshots provided in chat, TMS website reference: https://tmselectricrides.com/ and GreenWay website: https://greenwaydynamics.netlify.app/. Client images: https://drive.google.com/drive/folders/1UBSqcdg-4qSHH5DTKctQQT2oqEMCNuvs (not imported; browser-access limitations).
