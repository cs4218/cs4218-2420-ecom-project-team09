import { test, expect } from '@playwright/test';

const registerUrl = 'http://localhost:3000/register';

export function getSampleUser(email) {
  return {
    name: 'John Doe',
    email: email,
    password: 'password',
    phone: '1234567890',
    address: '123 Main St, Anytown, USA',
  dateOfBirth: '1990-12-12',
  answer: 'answer',
  }
}

export async function userRegister(page, user) {
  await page.goto(registerUrl);
  await page.locator('input[placeholder="Enter Your Name"]').click();
  await page.locator('input[placeholder="Enter Your Name"]').press('Control+A');
  await page.locator('input[placeholder="Enter Your Name"]').press('Backspace');
  await page.locator('input[placeholder="Enter Your Name"]').fill(user.name);
  await page.getByRole('textbox', { name: 'Enter Your Email' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(user.email);
  await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(user.password);
  await page.getByRole('textbox', { name: 'Enter Your Phone' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Phone' }).fill(user.phone);
  await page.getByRole('textbox', { name: 'Enter Your Address' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Address' }).fill(user.address);
  await page.locator('input[type="Date"]').fill(user.dateOfBirth);
  await page.getByRole('textbox', { name: 'What is Your Favorite Sports' }).click();
  await page.getByRole('textbox', { name: 'What is Your Favorite Sports' }).fill(user.answer);
  await page.getByRole('button', { name: 'Register' }).click();
}

export async function assertUserRegisterSuccess(page) {
  await expect(page.getByText('Register Successfully, please login'), { timeout: 10000 }).toBeVisible();
}

export async function userLogin(page, user) {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Enter Your Email' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Email' }).fill(user.email);
  await page.getByRole('textbox', { name: 'Enter Your Password' }).click();
  await page.getByRole('textbox', { name: 'Enter Your Password' }).fill(user.password);
  await page.getByRole('button', { name: 'LOGIN' }).click();
}

export async function assertUserLoginSuccess(page) {
  await expect(page.getByText('login successfully'), { timeout: 10000 }).toBeVisible();
}

export async function assertUserLoginFailed(page) {
  await expect(page.getByText('Something went wrong'), { timeout: 10000 }).toBeVisible();
}

export async function userUpdateProfile(page, user) {
  await page.goto('http://localhost:3000/dashboard/user/profile');
  await page.locator('input[placeholder="Enter Your Name"]').click();
  await page.locator('input[placeholder="Enter Your Name"]').press('Control+A');
  await page.locator('input[placeholder="Enter Your Name"]').press('Backspace');
  await page.locator('input[placeholder="Enter Your Name"]').fill(user.name);
  await page.locator('input[placeholder="Enter Your Password"]').click();
  await page.locator('input[placeholder="Enter Your Password"]').press('Control+A');
  await page.locator('input[placeholder="Enter Your Password"]').press('Backspace');
  await page.locator('input[placeholder="Enter Your Password"]').fill(user.password);
  await page.locator('input[placeholder="Enter Your Phone"]').click();
  await page.locator('input[placeholder="Enter Your Phone"]').press('Control+A');
  await page.locator('input[placeholder="Enter Your Phone"]').press('Backspace');
  await page.locator('input[placeholder="Enter Your Phone"]').fill(user.phone);
  await page.locator('input[placeholder="Enter Your Address"]').click();
  await page.locator('input[placeholder="Enter Your Address"]').press('Control+A');
  await page.locator('input[placeholder="Enter Your Address"]').press('Backspace');
  await page.locator('input[placeholder="Enter Your Address"]').fill(user.address);
  await page.getByRole('button', { name: 'UPDATE' }).click();
}

export async function assertUserUpdateProfileSuccess(page) {
  await expect(page.getByText('Profile Updated Successfully')).toBeVisible();
}

export async function assertUserUpdateProfileFailed(page) {
  await expect(page.getByText('Something went wrong')).toBeVisible();
}

export async function userResetPassword(page, user) {
  await page.goto("http://localhost:3000/forgot-password")
  await page.locator('input[placeholder="Enter Your Email"]').click();
  await page.locator('input[placeholder="Enter Your Email"]').press('Control+A');
  await page.locator('input[placeholder="Enter Your Email"]').press('Backspace');
  await page.locator('input[placeholder="Enter Your Email"]').fill(user.email);
  
  await page.locator('input[placeholder="Enter Your New Password"]').click();
  await page.locator('input[placeholder="Enter Your New Password"]').press('Control+A');
  await page.locator('input[placeholder="Enter Your New Password"]').press('Backspace');
  await page.locator('input[placeholder="Enter Your New Password"]').fill(user.newPassword);
  
  await page.locator('input[placeholder="What is Your Favorite sports"]').click();
  await page.locator('input[placeholder="What is Your Favorite sports"]').press('Control+A');
  await page.locator('input[placeholder="What is Your Favorite sports"]').press('Backspace');
  await page.locator('input[placeholder="What is Your Favorite sports"]').fill(user.answer);
  
  await page.getByRole('button', { name: 'RESET PASSWORD' }).click();
}

export async function assertUserResetPasswordSuccess(page) {
  await expect(page.getByText('Password reset successfully, please login')).toBeVisible();
}

export async function assertUserResetPasswordFailed(page) {
  await expect(page.getByText('Something went wrong')).toBeVisible();
}
