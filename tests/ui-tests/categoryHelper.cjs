import { expect } from '@playwright/test';

export async function adminLogin(page) {
    await page.goto('http://localhost:3000/login');
    await page.getByRole('textbox', { name: 'Enter Your Email' }).click();
    await page.getByRole('textbox', { name: 'Enter Your Email' }).fill('test@test.com');
    await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
    await page.getByRole('textbox', { name: 'Enter Your Password' }).fill('123456');
    await page.getByRole('button', { name: 'LOGIN' }).click();
}

export async function goToManageCategory(page) {
    await page.getByRole('button', { name: 'test@test.com' }).click();
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.getByRole('link', { name: 'Create Category' }).click();
}

export async function createCategory(page, category) {
    await goToManageCategory(page);

    await page.getByRole('textbox', { name: 'Enter new category' }).click();
    await page.getByRole('textbox', { name: 'Enter new category' }).fill(category);
    await page.getByRole('button', { name: 'Submit' }).click();
}

export async function deleteCategory(page) {
    await goToManageCategory(page);
    await page.getByRole('button', { name: 'Delete' }).last().click();
}

export async function editCategory(page, updatedCategory) {
    await goToManageCategory(page);
    await page.getByRole('button', { name: 'Edit' }).last().click();
    await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).click();
    await page.getByRole('dialog').getByRole('textbox', { name: 'Enter new category' }).fill(updatedCategory);
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
}

export async function checkCategoryExists(page, category) {
    await goToManageCategory(page);
    await expect(page.getByRole('cell', { name: category })).toBeVisible();
}

export async function checkCategoryDoesNotExist(page, category) {
    await goToManageCategory(page);
    await expect(page.getByRole('cell', { name: category })).not.toBeVisible();
}

