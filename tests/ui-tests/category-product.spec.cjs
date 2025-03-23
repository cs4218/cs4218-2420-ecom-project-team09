import { test } from '@playwright/test';
import path from 'path';
import { resetDB } from "../../helpers/dbHelper.js";

import {
    createProduct,
    viewProductOnHomePage,
    deleteProduct,
    productRemovedFromHomePage,
} from './productHelper.cjs'

import {
    adminLogin,
    createCategory,
    checkCategoryExists,
    checkCategoryDoesNotExist,
    deleteCategory,
} from './categoryHelper.cjs'

const newCategory = 'Phones';
const iPhone = {
    name: 'iPhone 15',
    description: 'Apple',
    price: '1500',
    quantity: '5',
    category: newCategory,
    shipping: 'Yes',
    photo: path.resolve(__dirname, 'iPhone15.jpeg')
}

test.beforeAll(async () => {
    await resetDB();
});

test.beforeEach(async ({ page }) => {
    await adminLogin(page);
});

test('admin create new category, and create new product of the new category', async ({ page }) => {
    await createCategory(page, newCategory);
    await checkCategoryExists(page, newCategory);

    await createProduct(page, iPhone);
    await viewProductOnHomePage(page, iPhone);

    await deleteProduct(page, iPhone.name);
    await productRemovedFromHomePage(page, iPhone);

    await deleteCategory(page, newCategory);
    await checkCategoryDoesNotExist(page, newCategory);
});

