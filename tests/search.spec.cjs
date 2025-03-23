import { test, expect } from '@playwright/test';

// Define base URL
const baseURL = 'http://localhost:3000';

test.describe('Search functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage first
    await page.goto(baseURL);
  });

  test('should search for products and display results', async ({ page }) => {
    // Wait for products to load on homepage
    await page.waitForSelector('.card');
    
    // Store the name of the first product to search for
    const firstProductName = await page.locator('.card-title').first().textContent();
    const searchTerm = firstProductName.substring(0, 4); // Use first few characters of product name
    
    // Find the search input
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    
    // Perform search
    await searchInput.fill(searchTerm);
    await searchInput.press('Enter');
    
    // Wait for navigation to complete - the URL should be /search without query params
    await page.waitForURL(`${baseURL}/search`);
    
    // Verify we're on the search results page
    // Note: The heading is "Search Resuts" (with a typo) in the original component
    await expect(page.locator('h1').filter({ hasText: 'Search Resuts' })).toBeVisible();
    
    // Verify that search results are displayed
    const resultsText = await page.locator('h6').textContent();
    expect(resultsText).not.toContain('No Products Found');
    expect(resultsText).toContain('Found ');
    
    // Verify that at least one product card is displayed
    await expect(page.locator('.card')).toBeVisible();
    
    // Check if the searched product is in the results
    const resultTitles = await page.locator('.card-title').allTextContents();
    const foundMatchingProduct = resultTitles.some(title => 
      title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    expect(foundMatchingProduct).toBeTruthy();
  });
  
  test('should show no results message for non-existent product', async ({ page }) => {
    // Find the search input
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    
    // Search for a term unlikely to exist
    const randomSearchTerm = 'xyznonexistentproduct123456789';
    await searchInput.fill(randomSearchTerm);
    await searchInput.press('Enter');
    
    // Wait for navigation to complete
    await page.waitForURL(`${baseURL}/search`);
    
    // Verify we're on the search results page
    await expect(page.locator('h1').filter({ hasText: 'Search Resuts' })).toBeVisible();
    
    // Verify that "No Products Found" message is displayed in h6
    await expect(page.locator('h6').filter({ hasText: 'No Products Found' })).toBeVisible();
    
    // Check that no product cards are displayed in search results area
    // Either check count is 0 or check that product cards are not visible in the search results area
    const cardCount = await page.locator('.d-flex.flex-wrap.mt-4 .card').count();
    expect(cardCount).toBe(0);
  });
  
  test('should be able to add search result to cart', async ({ page }) => {
    // Wait for products to load
    await page.waitForSelector('.card');
    
    // Get the initial cart
    const initialCart = await page.evaluate(() => {
      const cartJson = localStorage.getItem('cart');
      return cartJson ? JSON.parse(cartJson) : [];
    });
    
    // Store the name of the first product to search for
    const firstProductName = await page.locator('.card-title').first().textContent();
    const searchTerm = firstProductName.substring(0, 4); // Use first few characters of product name
    
    // Find the search input
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill(searchTerm);
    await searchInput.press('Enter');
    
    // Wait for navigation to complete
    await page.waitForURL(`${baseURL}/search`);
    
    // Wait for results to load
    await page.waitForSelector('.card');
    
    // Get the product details before clicking "Add to Cart"
    const productName = await page.locator('.card-title').first().textContent();
    const productPrice = await page.locator('.card-text').filter({ hasText: '$' }).first().textContent();
    const productId = await page.evaluate(() => {
      // Get the product ID from the image src URL
      const imgSrc = document.querySelector('.card-img-top').getAttribute('src');
      return imgSrc.split('/').pop(); // Extract ID from the end of the URL
    });
    
    // Click the "ADD TO CART" button for the first product
    await page.locator('.btn.btn-secondary').first().click();
    
    // Verify that toast notification appears
    await expect(page.getByText('Item Added to cart')).toBeVisible({ timeout: 10000 });
    
    // Get the updated cart
    const updatedCart = await page.evaluate(() => {
      const cartJson = localStorage.getItem('cart');
      return cartJson ? JSON.parse(cartJson) : [];
    });
    
    // Verify that exactly one item was added to the cart
    expect(updatedCart.length).toBe(initialCart.length + 1);
    
    // Find the newly added item (it should be the last one in the cart)
    const addedItem = updatedCart[updatedCart.length - 1];
    
    // Verify the exact item was added to the cart
    expect(addedItem.name).toBe(productName);
    expect(addedItem._id).toBe(productId);
  });

  test('should navigate to product details page when clicking More Details button', async ({ page }) => {
    // Wait for products to load on homepage
    await page.waitForSelector('.card');
    
    // Store the name of the first product to search for
    const firstProductName = await page.locator('.card-title').first().textContent();
    const searchTerm = firstProductName.substring(0, 4); // Use first few characters of product name
    
    // Find the search input
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
    
    // Perform search
    await searchInput.fill(searchTerm);
    await searchInput.press('Enter');
    
    // Wait for navigation to complete
    await page.waitForURL(`${baseURL}/search`);
    
    // Wait for results to load
    await page.waitForSelector('.card');
    
    // Click on the "More Details" button for the first product
    await page.locator('.btn.btn-primary').first().click();
    
    // Wait for navigation to complete and check URL pattern
    await page.waitForURL(`${baseURL}/product/**`);
    
    // Verify the URL structure matches the expected pattern
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/^http:\/\/localhost:3000\/product\/[\w-]+$/);
  });
});
