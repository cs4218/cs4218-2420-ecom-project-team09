import { test, expect } from "@playwright/test";
import {
  userRegister,
  assertUserRegisterSuccess,
  userLogin,
  assertUserLoginSuccess,
  assertUserLoginFailed,
  getSampleUser,
  userUpdateProfile,
  assertUserUpdateProfileSuccess,
  assertUserUpdateProfileFailed,
  userResetPassword,
  assertUserResetPasswordSuccess,
  assertUserResetPasswordFailed,
} from "./authHelper.js";
import userModel from "../../models/userModel.js";
import connectDB from "../../config/db.js";
import { resetDB } from "../../helpers/dbHelper.js";

test.beforeAll(async () => {
  await resetDB();
  await connectDB();
  await userModel.deleteMany({ email: "userRegisterAndLogin@example.com" });
  await userModel.deleteMany({ email: "userCannotLoginWithoutRegister@example.com"});
  await userModel.deleteMany({ email: "userUpdateProfile@example.com"});
  await userModel.deleteMany({ email: "userUpdateProfileFailWithIncorrectPassword@example.com"});
  await userModel.deleteMany({ email: "userResetPassword@example.com"});
  await userModel.deleteMany({ email: "userResetPasswordFailWithIncorrectEmail@example.com"});
  await userModel.deleteMany({ email: "userResetPasswordFailWithIncorrectAnswer@example.com"});
});

test("user register and login", async ({ page }) => {
  const user = getSampleUser('userRegisterAndLogin@example.com');
  await userRegister(page, user);
  await assertUserRegisterSuccess(page);
  await userLogin(page, user);
  await assertUserLoginSuccess(page);
});

test("user cannot login without register", async ({ page }) => {
  const user = getSampleUser('userCannotLoginWithoutRegister@example.com');
  await userLogin(page, user);
  await assertUserLoginFailed(page);
});

test("user update profile", async ({ page }) => {
  const user = getSampleUser('userUpdateProfile@example.com');
  await userRegister(page, user);
  await assertUserRegisterSuccess(page);
  await userLogin(page, user);
  await assertUserLoginSuccess(page);
  await userUpdateProfile(page, user);
  await assertUserUpdateProfileSuccess(page);
});

test("user update profile fail with incorrect password", async ({ page }) => {
  const user = getSampleUser('userUpdateProfileFailWithIncorrectPassword@example.com');
  await userRegister(page, user);
  await assertUserRegisterSuccess(page);
  await userLogin(page, user);
  await assertUserLoginSuccess(page);
  await userUpdateProfile(page, { 
    ...user,
    password: "",
  });
  await assertUserUpdateProfileFailed(page);
});

test("user reset password", async ({ page }) => {
  const user = getSampleUser('userResetPassword@example.com');
  await userRegister(page, user);
  await assertUserRegisterSuccess(page);
  await userResetPassword(page, {...user, newPassword: "newPassword"});
  await assertUserResetPasswordSuccess(page);
  await userLogin(page, {...user, password: "newPassword"});
  await assertUserLoginSuccess(page);
});

test("user reset password fail with incorrect email", async ({ page }) => {
  const user = getSampleUser('userResetPasswordFailWithIncorrectEmail@example.com');
  await userRegister(page, user);
  await assertUserRegisterSuccess(page);
  await userResetPassword(page, {...user, email: "incorrectEmail@example.com", newPassword: "newPassword"});
  await assertUserResetPasswordFailed(page);
});

test("user reset password fail with incorrect answer", async ({ page }) => {
  const user = getSampleUser('userResetPasswordFailWithIncorrectAnswer@example.com');
  await userRegister(page, user);
  await assertUserRegisterSuccess(page);
  await userResetPassword(page, {...user, answer: "incorrectAnswer", newPassword: "newPassword"});
  await assertUserResetPasswordFailed(page);
});


