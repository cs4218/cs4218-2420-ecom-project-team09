import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByPlaceholder('Enter Your Email ').fill('test@test.com');
  await page.getByPlaceholder('Enter Your Password').click();
  await page.getByPlaceholder('Enter Your Password').fill('123456');
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await page.locator('div:nth-child(2) > .card-body > div:nth-child(3) > button').first().click();
  await page.getByRole('button', { name: 'ADD TO CART' }).click();
  await page.getByRole('link', { name: 'Categories' }).click();
  await page.getByRole('link', { name: 'All Categories' }).click();
  await page.getByRole('link', { name: 'Categories' }).click();
  await page.locator('#navbarTogglerDemo01').getByRole('link', { name: 'Clothing' }).click();
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByLabel('Clothing').check();
  await page.getByLabel('$40 to').check();
  await page.getByRole('button', { name: 'test' }).click();
  await page.getByRole('link', { name: 'Dashboard' }).click();
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('link', { name: 'Home' }).click();
  await page.locator('div:nth-child(2) > .card-body > div:nth-child(3) > button:nth-child(2)').click();
  await page.getByRole('link', { name: 'Cart' }).click();
});