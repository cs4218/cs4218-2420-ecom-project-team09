// tests/navbar.spec.js
import { test, expect } from '@playwright/test';

test.describe('Navbar and Navigation Tests', () => {
  // Setup for each test - visit the homepage
  test.beforeEach(async ({ page }) => {
    // Navigate to your running application
    await page.goto('http://localhost:3000/');
    
    // Optional: add a small wait to ensure the page is fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should have the correct brand name', async ({ page }) => {
    await expect(page.locator('.navbar-brand')).toContainText('Virtual Vault');
  });

  test('should navigate to homepage when clicking on brand logo', async ({ page }) => {
    await page.locator('.navbar-brand').click();
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('should navigate to homepage when clicking on Home link', async ({ page }) => {
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('should show categories dropdown when clicking on Categories', async ({ page }) => {
    await page.getByRole('link', { name: 'Categories' }).click();
    
    // Wait for the dropdown to be visible
    await expect(page.locator('.dropdown-menu')).toBeVisible();
  });

  test('should navigate to all categories page', async ({ page }) => {
    // First click on Categories to show the dropdown
    await page.getByRole('link', { name: 'Categories' }).click();
    
    // Wait for dropdown to be visible before clicking
    await expect(page.locator('.dropdown-menu')).toBeVisible();
    
    // Then click on All Categories
    await page.getByRole('link', { name: 'All Categories' }).click();
    
    // Verify navigation
    await expect(page).toHaveURL('http://localhost:3000/categories');
  });

  test('should navigate to cart page', async ({ page }) => {
    await page.getByRole('link', { name: 'Cart' }).click();
    await expect(page).toHaveURL('http://localhost:3000/cart');
  });

  test('should navigate to individual category pages from dropdown', async ({ page }) => {
    // First click on Categories dropdown toggle (using a more specific selector)
    await page.locator('.nav-link.dropdown-toggle').filter({ hasText: 'Categories' }).click();
    
    // Wait for dropdown to be visible
    await expect(page.locator('.dropdown-menu')).toBeVisible();
    
    // Get all category links
    const allCategoryItems = page.locator('.dropdown-menu .dropdown-item');
    const count = await allCategoryItems.count();
    
    // Skip the first link which is "All Categories"
    for (let i = 1; i < count; i++) {
      // Go back to homepage for each iteration
      await page.goto('http://localhost:3000/');
      await page.waitForLoadState('networkidle');
      
      // Click on Categories dropdown toggle again
      await page.locator('.nav-link.dropdown-toggle').filter({ hasText: 'Categories' }).click();
      
      // Wait for dropdown to be visible
      await expect(page.locator('.dropdown-menu')).toBeVisible();
      
      // Get the link text before clicking (for verification)
      const linkText = await allCategoryItems.nth(i).textContent();
      
      // Create a slug from the category name
      const slug = linkText.trim().toLowerCase().replace(/\s+/g, '-');
      
      // Click the category link
      await allCategoryItems.nth(i).click();
      
      // Verify navigation
      await expect(page).toHaveURL(`http://localhost:3000/category/${slug}`);
    }
  });

  // Display on individual category product page is tested in category product tests

  test('should show login and register links when user is not logged in', async ({ page }) => {
    // Check if we need to log out first (if already logged in)
    const userDropdown = page.locator('.nav-link.dropdown-toggle');
    
    if (await userDropdown.count() > 0) {
      // Check if it's visible to determine if we're logged in
      if (await userDropdown.isVisible()) {
        await userDropdown.click();
        
        // Look for the Logout link
        const logoutLink = page.getByRole('link', { name: 'Logout' });
        if (await logoutLink.count() > 0) {
          await logoutLink.click();
          // Wait for logout to complete and redirect
          await page.waitForURL('http://localhost:3000/login');
          // Go back to homepage
          await page.goto('http://localhost:3000/');
        }
      }
    }
    
    // Now check for login and register links
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.getByRole('link', { name: 'Login' }).click();
    await expect(page).toHaveURL('http://localhost:3000/login');
  });

  test('should navigate to register page', async ({ page }) => {
    await page.getByRole('link', { name: 'Register' }).click();
    await expect(page).toHaveURL('http://localhost:3000/register');
  });

  // test('should show search results when using search input', async ({ page }) => {
  //   // Find the search input
  //   const searchInput = page.locator('input[type="search"]');
    
  //   // If the search input exists, continue with the test
  //   if (await searchInput.count() > 0) {
  //     await searchInput.fill('test');
  //     await searchInput.press('Enter');
      
  //     // Wait for navigation to complete
  //     await page.waitForURL('**/search?keyword=test');
      
  //     // Verify we're on the search results page
  //     await expect(page.url()).toContain('/search?keyword=test');
  //   } else {
  //     // If search input doesn't exist, skip the test
  //     test.skip(true, 'Search input not found');
  //   }
  // });
});

// debug search