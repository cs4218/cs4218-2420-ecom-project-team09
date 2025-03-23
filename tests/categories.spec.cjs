// categories.spec.js
import { test, expect } from '@playwright/test';

test.describe('Categories Page', () => {
  test('should display all categories', async ({ page }) => {
    // Navigate to the categories page
    await page.goto('http://localhost:3000/categories');
    
    // Verify the page title
    await expect(page).toHaveTitle(/All Categories/);
    
    // Wait for the category links to be visible
    await page.waitForSelector('.btn.btn-primary');
    
    // Get all category buttons
    const categoryButtons = await page.locator('.btn.btn-primary').all();
    
    // Verify we have at least one category
    expect(categoryButtons.length).toBeGreaterThan(0);
    
    // Check if we can extract the category names
    for (const button of categoryButtons) {
      const categoryName = await button.textContent();
      expect(categoryName.trim()).not.toBe('');
    }
    
    // Navigation to a category page tested in category product tests
    if (categoryButtons.length > 0) {
      const firstCategoryName = await categoryButtons[0].textContent();
      await categoryButtons[0].click();
      
      // Check that we're on the correct category page now
      const url = page.url();
      expect(url).toContain('/category/');
    }
  });
});
