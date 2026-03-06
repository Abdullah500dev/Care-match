import express from "express";

import {
  register,
  activateUser,
  login,
  logoutUser,
  updateAccessToken,
  getUserInfo,
  updateUserInfo,
  updatePassword,
  resendVerificationToken,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

import {
  registerValidation,
  loginValidation,
  resetPasswordValidation,
  forgetPasswordEmailValidation,
  verifyActivationValidation,
} from "../middleware/formValidation/authFormValidation.js";

import { isAutheticated } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ['name', 'email', 'password', 'confirmPassword']
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Ahsan"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ahsan.dev.404@gmail.com"
 *               password:
 *                 type: string
 *                 example: "123Admin"
 *               confirmPassword:
 *                 type: string
 *                 example: "123Admin"
 *           example:
 *             name: "Ahsan"
 *             email: "ahsan.dev.404@gmail.com"
 *             password: "123Admin"
 *             confirmPassword: "123Admin"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Please check your email: ahsan.dev.404@gmail.com for your 6-digit verification code to activate your account!"
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email already exists"
 *                 status:
 *                   type: integer
 *                   example: 400
 */
router.post("/register", registerValidation, register);
/**
 * @swagger
 * /api/auth/activate-user:
 *   post:
 *     summary: Activate user account with 6-digit verification code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ['email', 'code']
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ahsan.dev.404@gmail.com"
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 pattern: "^[0-9]+$"
 *                 description: 6-digit code from verification email
 *                 example: "847291"
 *     responses:
 *       201:
 *         description: Account activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account activated successfully"
 *       400:
 *         description: Invalid or expired code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid or expired verification code"
 *                 status:
 *                   type: integer
 *                   example: 400
 */
router.post("/activate-user", verifyActivationValidation, activateUser);

// Login and logout
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ['email', 'password']
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ahsan.dev.404@gmail.com"
 *               password:
 *                 type: string
 *                 example: "123Admin"
 *           example:
 *             email: "ahsan.dev.404@gmail.com"
 *             password: "123Admin"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "64f8a1b2c3d4e5f6a7b8c9d0"
 *                     name:
 *                       type: string
 *                       example: "Ahsan"
 *                     email:
 *                       type: string
 *                       example: "ahsan.dev.404@gmail.com"
 *                     is_verified:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-09-06T10:30:00.000Z"
 *                 access_token:
 *                   type: string
 *                   description: "JWT access token"
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0ZjhhMWIyYzNkNGU1ZjZhN2I4YzlkMCIsImlhdCI6MTY5Mzk5NzIwMCwiZXhwIjoxNjkzOTk3NTAwfQ.example"
 *                 refresh_token:
 *                   type: string
 *                   description: "JWT refresh token"
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0ZjhhMWIyYzNkNGU1ZjZhN2I4YzlkMCIsImlhdCI6MTY5Mzk5NzIwMCwiZXhwIjoxNjk0MDgzNjAwfQ.example"
 *         headers:
 *           Set-Cookie:
 *             description: "Access and refresh tokens set as HTTP-only cookies"
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid email or password"
 *                 status:
 *                   type: integer
 *                   example: 400
 *       403:
 *         description: Email not verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Please verify your email to access your account!"
 *                 status:
 *                   type: integer
 *                   example: 403
 */
router.post("/login", loginValidation, login);
/**
 * @swagger
 * /api/auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - accessTokenAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Please login to access this resource"
 *                 status:
 *                   type: integer
 *                   example: 401
 */
router.get("/logout", isAutheticated, logoutUser);

// Token management
/**
 * @swagger
 * /api/auth/refresh-token:
 *   get:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     parameters:
 *       - in: header
 *         name: refresh-token
 *         required: true
 *         schema:
 *           type: string
 *         description: Refresh token from previous login
 *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0ZjhhMWIyYzNkNGU1ZjZhN2I4YzlkMCIsImlhdCI6MTY5Mzk5NzIwMCwiZXhwIjoxNjk0MDgzNjAwfQ.example"
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 access_token:
 *                   type: string
 *                   description: "New JWT access token"
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0ZjhhMWIyYzNkNGU1ZjZhN2I4YzlkMCIsImlhdCI6MTY5Mzk5NzIwMCwiZXhwIjoxNjkzOTk3NTAwfQ.example"
 *         headers:
 *           Set-Cookie:
 *             description: "New access token set as HTTP-only cookie"
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Could not refresh token"
 *                 status:
 *                   type: integer
 *                   example: 400
 */
router.get("/refresh-token", updateAccessToken);
/**
 * @swagger
 * /api/auth/request/token/new:
 *   post:
 *     summary: Resend verification code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ['email']
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ahsan.dev.404@gmail.com"
 *           example:
 *             email: "ahsan.dev.404@gmail.com"
 *     responses:
 *       200:
 *         description: Verification code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Verification code sent to your email!"
 *       400:
 *         description: Email not found or already verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email not found or already verified"
 *                 status:
 *                   type: integer
 *                   example: 400
 */
router.post("/request/token/new", resendVerificationToken);

// User profile management (protected routes)
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [User Management]
 *     security:
 *       - accessTokenAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "64f8a1b2c3d4e5f6a7b8c9d0"
 *                     name:
 *                       type: string
 *                       example: "Ahsan"
 *                     email:
 *                       type: string
 *                       example: "ahsan.dev.404@gmail.com"
 *                     is_verified:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-09-06T10:30:00.000Z"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Please login to access this resource"
 *                 status:
 *                   type: integer
 *                   example: 401
 */
router.get("/me", isAutheticated, getUserInfo);
/**
 * @swagger
 * /api/auth/update-user-info:
 *   put:
 *     summary: Update user profile information
 *     tags: [User Management]
 *     security:
 *       - accessTokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Ahsan"
 *           example:
 *             name: "Ahsan"
 *     responses:
 *       200:
 *         description: User information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "64f8a1b2c3d4e5f6a7b8c9d0"
 *                     name:
 *                       type: string
 *                       example: "Ahsan"
 *                     email:
 *                       type: string
 *                       example: "ahsan.dev.404@gmail.com"
 *                     is_verified:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-09-06T10:30:00.000Z"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email already exists"
 *                 status:
 *                   type: integer
 *                   example: 400
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Please login to access this resource"
 *                 status:
 *                   type: integer
 *                   example: 401
 */
router.put("/update-user-info", isAutheticated, updateUserInfo);
/**
 * @swagger
 * /api/auth/update-user-password:
 *   put:
 *     summary: Update user password
 *     tags: [Password Management]
 *     security:
 *       - accessTokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ['oldPassword', 'newPassword', 'confirmPassword']
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: Current password
 *                 example: "123Admin"
 *               newPassword:
 *                 type: string
 *                 description: New password
 *                 example: "123Admin@"
 *               confirmPassword:
 *                 type: string
 *                 description: New password confirmation
 *                 example: "123Admin@"
 *           example:
 *             oldPassword: "123Admin"
 *             newPassword: "123Admin@"
 *             confirmPassword: "123Admin@"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully"
 *       400:
 *         description: Invalid current password or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Current password is incorrect"
 *                 status:
 *                   type: integer
 *                   example: 400
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Please login to access this resource"
 *                 status:
 *                   type: integer
 *                   example: 401
 */
router.put("/update-user-password", isAutheticated, updatePassword);

// Password reset
/**
 * @swagger
 * /api/auth/password/reset:
 *   post:
 *     summary: Request password reset
 *     tags: [Password Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ['email']
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ahsan.dev.404@gmail.com"
 *           example:
 *             email: "ahsan.dev.404@gmail.com"
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password reset email sent successfully"
 *       400:
 *         description: Email not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email not found"
 *                 status:
 *                   type: integer
 *                   example: 400
 */
router.post("/password/reset", forgetPasswordEmailValidation, forgotPassword);
/**
 * @swagger
 * /api/auth/password/reset/{token}:
 *   post:
 *     summary: Reset password with token
 *     tags: [Password Management]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token from email
 *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: ['newPassword', 'confirmPassword']
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: "123Admin"
 *               confirmPassword:
 *                 type: string
 *                 example: "123Admin"
 *           example:
 *             newPassword: "123Admin"
 *             confirmPassword: "123Admin"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully"
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid or expired token"
 *                 status:
 *                   type: integer
 *                   example: 400
 */
router.post("/password/reset/:token", resetPasswordValidation, resetPassword);

export default router;
