// test-each-category.spec.js
import { test, expect } from '@playwright/test';

test.describe('Test Each Individual Category', () => {
  test('should test each category from the All Categories page', async ({ page }) => {
    // Navigate to the All Categories page
    await page.goto('http://localhost:3000/categories');
    await page.waitForLoadState('networkidle');
    
    // Wait for all category buttons to load
    await page.waitForSelector('.btn.btn-primary', { timeout: 10000 });
    
    // Get all category buttons
    const categoryButtons = await page.locator('.btn.btn-primary').all();
    
    // Verify we have at least one category
    expect(categoryButtons.length).toBeGreaterThan(0);
    
    // Store category names for reporting
    const categories = [];
    for (const button of categoryButtons) {
      const name = await button.textContent();
      categories.push({
        name: name.trim(),
        // We'll get the URLs after clicking
      });
    }
    
    // Test each category
    for (let i = 0; i < categories.length; i++) {      
      // Go back to All Categories page to get fresh state
      await page.goto('http://localhost:3000/categories');
      await page.waitForLoadState('networkidle');
      
      // Get fresh references to the category buttons
      const freshCategoryButtons = await page.locator('.btn.btn-primary').all();
      
      // Click on the current category
      await freshCategoryButtons[i].click();
      
      // Wait for navigation to complete
      await page.waitForLoadState('networkidle');
      
      // Store the URL for reference
      categories[i].url = page.url();
      
      // Use a more specific selector for the category title to avoid matching the footer
      // Look for h4 within the .container.mt-3.category section
      const categoryTitle = page.locator('.container.mt-3.category h4.text-center').first();
      
      // Check if the category title is visible
      await expect(categoryTitle).toBeVisible({ timeout: 5000 });
      
      // Verify the category page loaded with correct title
      const displayedCategoryText = await categoryTitle.textContent();
      expect(displayedCategoryText).toContain('Category -');
      
      // Get product count - similarly use a more specific selector
      const productCount = page.locator('.container.mt-3.category h6.text-center');
      
      // Check if product count exists (will fail if not found)
      await expect(productCount).toBeVisible({ timeout: 5000 });
      
      // Get the count text
      const countText = await productCount.textContent();

      // Check that the product grid is visible if there are products
      if (!countText.includes('0 result')) {
        // Look for the card container
        const cardContainer = page.locator('.d-flex.flex-wrap');
        await expect(cardContainer).toBeVisible({ timeout: 5000 });
        
        // Check for at least one product card
        const products = await page.locator('.card').all();
        
        // If products exist, test a sample product
        if (products.length > 0) {
            // Test the first producta
            const firstProduct = products[0];
            
            // Verify product image
            await expect(firstProduct.locator('img.card-img-top')).toBeVisible();
            
            // Check product title
            await expect(firstProduct.locator('.card-title:not(.card-price)')).toBeVisible();

            // Check product price
            await expect(firstProduct.locator('.card-title.card-price')).toBeVisible();
          
            // Check for buttons
            await expect(firstProduct.locator('button.btn-info')).toBeVisible();
            await expect(firstProduct.locator('button.btn-dark')).toBeVisible();
        }
      }
    }
  });
});
