import { test, expect } from '@playwright/test';
import path from 'path';
import { adminLogin } from './CRUD-category.spec.cjs';

const iPhone = {
    name: 'iPhone 15',
    description: 'Apple',
    price: '1500',
    quantity: '5',
    category: 'Electronics',
    shipping: 'Yes',
    photo: path.resolve(__dirname, 'iPhone15.jpeg')
}

const galaxy = {
    name: 'Galaxy 15',
    description: 'Samsung',
    price: '1200',
    quantity: '5',
    category: 'Electronics',
    shipping: 'Yes',
    photo: path.resolve(__dirname, 'galaxy.jpeg')
}

// HELPER FUNCTIONS
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

test.beforeEach(async ({ page }) => {
    await adminLogin(page);
});

test('admin create product', async ({ page }) => {
    await createProduct(page, iPhone);
    await viewProductOnHomePage(page, iPhone);
    await deleteProduct(page, 'iPhone 15 iPhone 15 Apple');
});

test('admin update product', async ({ page }) => {
    await createProduct(page, iPhone);
    await updateProduct(page, 'iPhone 15 iPhone 15 Apple', galaxy);
    await viewProductOnHomePage(page, galaxy);
    await deleteProduct(page, 'Galaxy 15 Galaxy 15 Samsung');
});

test('admin delete product', async ({ page }) => {
    await createProduct(page, iPhone);
    await deleteProduct(page, 'iPhone 15 iPhone 15 Apple');
    await productRemovedFromHomePage(page, iPhone);
});

