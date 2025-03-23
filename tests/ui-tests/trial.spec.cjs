const { test, expect } = require('@playwright/test');

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('link', { name: 'Categories' }).click();
  await page.getByRole('link', { name: 'All Categories' }).click();
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByLabel('watch collection').check();
  await page.getByLabel('watch collection').uncheck();
  await page.getByLabel('$60 to').check();
  await page.getByLabel('$60 to').check();
  await page.getByLabel('$100 or more').check();
  await page.getByRole('button', { name: 'ADD TO CART' }).nth(1).click();
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('link', { name: 'Login' }).click();
});

test('Navigate to Homepage', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('http://localhost:3000/');
    
    // Verify that the homepage is loaded successfully
    const pageTitle = await page.title();
    expect(pageTitle).toContain('ALL Products - Best offers');
  });
  
