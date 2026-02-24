import express from "express";
import aiContentController from "../controllers/aiContentController.js";
import authMiddleware from "../middlewares/auth.js";
import aiFormValidation from "../middlewares/formValidation/aiFormValidation.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AIContentRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Campaign title (optional)
 *           example: Medical Research Fund
 *         description:
 *           type: string
 *           description: Campaign description (optional)
 *           example: Help fund critical medical research
 */

/**
 * @swagger
 * /api/ai-content/ai/generate:
 *   post:
 *     summary: Generate AI content for campaigns
 *     tags: [AI Content]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AIContentRequest'
 *     responses:
 *       200:
 *         description: AI content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIContent'
 *       400:
 *         description: User not authenticated, verified, or accessible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: AI generation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Failed to generate campaign content
 *                     details:
 *                       type: object
 *                       nullable: true
 */
router.post(
  "/ai/generate",
  authMiddleware.isAuthenticated,
  authMiddleware.isVerified,
  authMiddleware.isAccessible,
  aiFormValidation.validateAIContent,
  aiContentController.generateAIContent
);

export default router;
