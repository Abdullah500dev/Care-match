import express from "express";

import userController from "../controllers/userController.js";
import authMiddleware from "../middlewares/auth.js";
import userFormValidation from "../middlewares/formValidation/userFormValidation.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdatePasswordRequest:
 *       type: object
 *       required:
 *         - oldPassword
 *         - newPassword
 *         - confirmPassword
 *       properties:
 *         oldPassword:
 *           type: string
 *           example: OldSecurePass123
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           example: NewSecurePass123
 *         confirmPassword:
 *           type: string
 *           example: NewSecurePass123
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 */

/**
 * @swagger
 * /api/user/logout:
 *   get:
 *     summary: Logout user
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User logged out successfully
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
 *                   example: Logged out successfully!
 */
router.route("/logout").get(userController.logout);

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: User not verified or blocked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
  .route("/profile")
  .get(
    authMiddleware.isAuthenticated,
    authMiddleware.isVerified,
    authMiddleware.isAccessible,
    userController.getUserDetails
  );

/**
 * @swagger
 * /api/user/profile/update:
 *   patch:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
  .route("/profile/update")
  .patch(
    authMiddleware.isAuthenticated,
    authMiddleware.isVerified,
    authMiddleware.isAccessible,
    userFormValidation.validateUpdateProfile,
    userController.updateUserDetails
  );

/**
 * @swagger
 * /api/user/password/update:
 *   put:
 *     summary: Update user password
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePasswordRequest'
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
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or incorrect old password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
  .route("/password/update")
  .put(
    authMiddleware.isAuthenticated,
    authMiddleware.isVerified,
    authMiddleware.isAccessible,
    userFormValidation.validateUpdatePassword,
    userController.updatePassword
  );

/**
 * @swagger
 * /api/user/account/status:
 *   get:
 *     summary: Get user account status
 *     tags: [User]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Account status retrieved successfully
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
 *                     isVerified:
 *                       type: boolean
 *                       example: true
 *                     isBlocked:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
  .route("/account/status")
  .get(authMiddleware.isAuthenticated, userController.getUserAccountStatus);

export default router;
