import { test } from '@playwright/test';
import path from 'path';

import { 
    adminLogin, 
    createCategory, 
    deleteCategory, 
    checkCategoryExists, 
    checkCategoryDoesNotExist  
} from './CRUD-category.spec.cjs';

import { 
    createProduct, 
    deleteProduct,
    viewProductOnHomePage,
    productRemovedFromHomePage
} from './CRUD-product.spec.cjs';

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

