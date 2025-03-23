import { expect } from '@playwright/test';

export async function adminLogin(page) {
    await page.goto('http://localhost:3000/login');
    await page.getByRole('textbox', { name: 'Enter Your Email' }).click();
    await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('test@test.com');
    await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
    await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('123456');
    await page.getByRole('button', { name: 'LOGIN' }).click();
}

export async function createProduct(page, product) {
    const { name, description, price, quantity, category, shipping, photo } = product;

    await page.getByRole('button', { name: 'test@test.com' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Product' }).click();

    // Fill in the product details
    await page.getByRole('textbox', { name: 'write a name' }).click();
    await page.getByRole('textbox', { name: 'write a name' }).fill(name);
    await page.getByRole('textbox', { name: 'write a description' }).click();
    await page.getByRole('textbox', { name: 'write a description' }).fill(description);
    await page.getByPlaceholder('write a Price').click();
    await page.getByPlaceholder('write a Price').fill(price);
    await page.getByPlaceholder('write a quantity').click();
    await page.getByPlaceholder('write a quantity').fill(quantity);
    await page.locator('#rc_select_1').click();
    await page.getByText(shipping).click();
    await page.locator('#rc_select_0').click();
    await page.getByTitle(category).locator('div').click();
    await page.getByText('Upload Photo').click();
    await page.locator('input[type="file"]').setInputFiles(photo);

    // Create the product
    await page.getByRole('button', { name: 'CREATE PRODUCT' }).click();

    await expect(page).toHaveURL('http://localhost:3000/dashboard/admin/products');
}

export async function deleteProduct(page, name) {
    await page.getByRole('button', { name: 'test@test.com' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Products' }).click();

    const productLink = await page.getByRole('link', { name: name });
    await productLink.click();

    // Wait for 3 seconds
    await page.waitForTimeout(3000);

    await page.getByRole('button', { name: 'DELETE PRODUCT' }).click();

    await expect(page).toHaveURL('http://localhost:3000/dashboard/admin/products');
}

export async function updateProduct(page, existingName, updatedProduct) {
    await page.getByRole('button', { name: 'test@test.com' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Products' }).click();

    const productLink = await page.getByRole('link', { name: existingName });
    await productLink.click();

    // Wait for 3 seconds
    await page.waitForTimeout(3000);

    const { name, description, price, quantity, photo } = updatedProduct;
    
    // Fill in the product details
    await page.getByRole('textbox', { name: 'write a name' }).click();
    await page.getByRole('textbox', { name: 'write a name' }).fill(name);
    await page.getByRole('textbox', { name: 'write a description' }).click();
    await page.getByRole('textbox', { name: 'write a description' }).fill(description);
    await page.getByPlaceholder('write a Price').click();
    await page.getByPlaceholder('write a Price').fill(price);
    await page.getByPlaceholder('write a quantity').click();
    await page.getByPlaceholder('write a quantity').fill(quantity);
    await page.getByText('Upload Photo').click();
    await page.locator('input[type="file"]').setInputFiles(photo);

    // Update the product
    await page.getByRole('button', { name: 'UPDATE PRODUCT' }).click();

    await expect(page).toHaveURL('http://localhost:3000/dashboard/admin/products');
}

export async function viewProductOnHomePage(page, product) {
    await page.goto('http://localhost:3000/');
    await page.locator('.card-name-price > button').first().click();

    const { name, category, description } = product;

    await page.getByRole('heading', { name: `Name : ${name}` }).click();
    await page.getByRole('heading', { name: `Description : ${description}` }).click();
    await page.getByRole('heading', { name: `Category : ${category}` }).click();
}

export async function productRemovedFromHomePage(page, product) {
    const { name, category, description } = product;

    await page.goto('http://localhost:3000/');
    await page.locator('.card-name-price > button').first().click();

    await expect(page.locator(`text=Name : ${name}`)).not.toBeVisible();
    await expect(page.locator(`text=Description : ${description}`)).not.toBeVisible();
    await expect(page.locator(`text=Category : ${category}`)).not.toBeVisible();
}
