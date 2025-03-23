import { test } from '@playwright/test';
import {
    adminLogin,
    createCategory,
    checkCategoryExists,
    checkCategoryDoesNotExist,
    deleteCategory,
    editCategory
} from './categoryHelper.cjs'
import { resetDB } from "../../helpers/dbHelper.js";

test.beforeAll(async () => {
    await resetDB();
});

test.beforeEach(async ({ page }) => {
    await adminLogin(page);
});

test('admin create category', async ({ page }) => {
    await createCategory(page, 'Food');
    await checkCategoryExists(page, 'Food');
    await deleteCategory(page, 'Food');
    await checkCategoryDoesNotExist(page, 'Food');
});

test('admin update category', async ({ page }) => {
    await createCategory(page, 'Food');
    await editCategory(page, 'Drinks');
    await checkCategoryExists(page, 'Drinks');
    await checkCategoryDoesNotExist(page, 'Food');
    await deleteCategory(page, 'Drinks');
    await checkCategoryDoesNotExist(page, 'Drinks');
});

test('admin delete category', async ({ page }) => {
    await createCategory(page, 'Food');
    await deleteCategory(page, 'Food');
    await checkCategoryDoesNotExist(page, 'Food');
});

