import express from "express";

import countryStateCityController from "../controllers/countryStateCityController.js";

const router = express.Router();

/**
 * @swagger
 * /api/country-state-city/countries:
 *   get:
 *     summary: Get all countries
 *     tags: [Geographic Data]
 *     responses:
 *       200:
 *         description: List of countries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["United States", "Canada", "United Kingdom"]
 *       400:
 *         description: Error retrieving countries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/countries").get(countryStateCityController.getCountries);

/**
 * @swagger
 * /api/country-state-city/states:
 *   get:
 *     summary: Get states for a specific country
 *     tags: [Geographic Data]
 *     parameters:
 *       - in: query
 *         name: country
 *         required: true
 *         schema:
 *           type: string
 *         description: Country name
 *         example: United States
 *     responses:
 *       200:
 *         description: List of states retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["California", "New York", "Texas"]
 *       400:
 *         description: Error retrieving states
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/states").get(countryStateCityController.getStatesForCountry);

/**
 * @swagger
 * /api/country-state-city/cities:
 *   get:
 *     summary: Get cities for a specific state and country
 *     tags: [Geographic Data]
 *     parameters:
 *       - in: query
 *         name: country
 *         required: true
 *         schema:
 *           type: string
 *         description: Country name
 *         example: United States
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: State name
 *         example: California
 *     responses:
 *       200:
 *         description: List of cities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Los Angeles", "San Francisco", "San Diego"]
 *       400:
 *         description: Error retrieving cities
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
  .route("/cities")
  .get(countryStateCityController.getCitiesForStateAndCountry);

/**
 * @swagger
 * /api/country-state-city/zip:
 *   get:
 *     summary: Get ZIP codes for a specific city, state, and country
 *     tags: [Geographic Data]
 *     parameters:
 *       - in: query
 *         name: country
 *         required: true
 *         schema:
 *           type: string
 *         description: Country name
 *         example: United States
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: State name
 *         example: California
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         description: City name
 *         example: Los Angeles
 *     responses:
 *       200:
 *         description: List of ZIP codes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["90210", "90211", "90212"]
 *       400:
 *         description: Error retrieving ZIP codes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router
  .route("/zip")
  .get(countryStateCityController.getZipCodesForCitiesAndStateAndCountry);

export default router;
