import { test } from '@playwright/test';
import path from 'path';
import {
    adminLogin,
    createProduct,
    viewProductOnHomePage,
    deleteProduct,
    productRemovedFromHomePage,
    updateProduct
} from './productHelper.cjs'

import {
    createCategory,
    deleteCategory,
} from './categoryHelper.cjs'
import { resetDB } from "../../helpers/dbHelper.js";


const iPhone = {
    name: 'iPhone 15',
    description: 'Apple',
    price: '1500',
    quantity: '5',
    category: 'Apt',
    shipping: 'Yes',
    photo: path.resolve(__dirname, 'iPhone15.jpeg')
}

const galaxy = {
    name: 'Galaxy 15',
    description: 'Samsung',
    price: '1200',
    quantity: '5',
    category: 'Apt',
    shipping: 'Yes',
    photo: path.resolve(__dirname, 'galaxy.jpeg')
}

test.beforeAll(async () => {
    await resetDB();
});

test.beforeEach(async ({ page }) => {
    await adminLogin(page);
    await createCategory(page, 'Apt');
});

test.afterEach(async ({ page }) => {
    await deleteCategory(page, 'Apt');
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
