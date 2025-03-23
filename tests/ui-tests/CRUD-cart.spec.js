import { test, expect } from "@playwright/test";

export async function addProductToCart(page, productIdx) {
  await page.goto("http://localhost:3000");
  const button = page.locator('text=ADD TO CART').nth(productIdx);
  await button.waitFor(); // Ensures the button is ready
  await button.click();
}

export async function assertProductAddedToCart(page) {
  await expect(page.getByText('Item Added to cart')).toBeVisible();
}

export async function addProductToCartInDetails(page, productIdx) {
  await page.goto("http://localhost:3000");
  const button = page.locator('text=More Details').nth(productIdx);
  await button.waitFor(); // Ensures the button is ready
  await button.click();

  const addToCartButton = page.locator('text=ADD TO CART');
  await addToCartButton.waitFor(); // Ensures the button is ready
  await addToCartButton.click();
}

export async function assertProductAddedToCartInDetails(page) {
  await expect(page.getByText('Item Added to cart')).toBeVisible();
}

export async function viewCart(page) {
  await page.goto("http://localhost:3000/cart");
  await expect(page.getByText('Cart Summary')).toBeVisible();
}

export async function assertItemsInCart(page, itemCount) {
  await viewCart(page);
  if (itemCount === 0) {
    await expect(page.getByText('Your Cart Is Empty')).toBeVisible();
  } else {
    await expect(page.getByText(`You Have ${itemCount} items in your cart`)).toBeVisible();
  }
}

export async function removeItemFromCart(page, productIdx) {
  await viewCart(page);
  const removeButton = page.locator('text=Remove').nth(productIdx);
  await removeButton.waitFor(); // Ensures the button is ready
  await removeButton.click();
}


