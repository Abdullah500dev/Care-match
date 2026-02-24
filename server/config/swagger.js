import swaggerJsdoc from "swagger-jsdoc";
import config from "./env.js";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: `${config.APP_NAME} API Documentation`,
      version: config.APP_VERSION,
      description: `Comprehensive API documentation for the ${config.APP_NAME}`,
      contact: {
        name: "API Support",
        email: config.ADMIN_EMAIL || "support@example.com",
      },
      license: {
        name: "ISC",
        url: "https://opensource.org/licenses/ISC",
      },
    },
    servers: [
      {
        url: config.SERVER_BASE_URL,
        description: "Development server",
      },
      {
        url: config.SERVER_BASE_URL,
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "token",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "User ID",
              example: "507f1f77bcf86cd799439011",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
              example: "test@mailinator.com",
            },
            firstName: {
              type: "string",
              description: "User first name",
              example: "John",
            },
            lastName: {
              type: "string",
              description: "User last name",
              example: "Doe",
            },
            phone: {
              type: "string",
              description: "User phone number",
              example: "+1234567890",
            },
            street_address: {
              type: "string",
              description: "User street address",
              example: "123 Main St",
            },
            city: {
              type: "string",
              description: "User city",
              example: "New York",
            },
            country: {
              type: "string",
              description: "User country",
              example: "United States",
            },
            isVerified: {
              type: "boolean",
              description: "User verification status",
              example: true,
            },
            isBlocked: {
              type: "boolean",
              description: "User block status",
              example: false,
            },
            role: {
              type: "string",
              enum: ["user", "admin", "super_admin"],
              description: "User role",
              example: "user",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "User creation date",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "User last update date",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
              example: "Something went wrong",
            },
            statusCode: {
              type: "integer",
              description: "HTTP status code",
              example: 400,
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "Success status",
              example: true,
            },
            message: {
              type: "string",
              description: "Success message",
              example: "Operation completed successfully",
            },
          },
        },
        AIContent: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Generated campaign title",
              example: "Help Save Lives Through Medical Research",
            },
            tagline: {
              type: "string",
              description: "Generated campaign tagline",
              example:
                "Every donation brings us closer to breakthrough discoveries",
            },
            description: {
              type: "string",
              description: "Generated campaign description",
              example:
                "Join us in funding critical medical research that could save millions of lives...",
            },
          },
        },
        EmailTemplate: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Template ID",
              example: "507f1f77bcf86cd799439011",
            },
            name: {
              type: "string",
              description: "Template name",
              example: "account-verification",
            },
            subject: {
              type: "string",
              description: "Email subject",
              example: "Verify Your Account",
            },
            body: {
              type: "string",
              description: "Email body HTML",
              example: "<h1>Welcome {{user_full_name}}!</h1>",
            },
          },
        },
        CountryStateCity: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Record ID",
              example: "507f1f77bcf86cd799439011",
            },
            country: {
              type: "string",
              description: "Country name",
              example: "United States",
            },
            countryShortCode: {
              type: "string",
              description: "Country short code",
              example: "US",
            },
            state: {
              type: "string",
              description: "State name",
              example: "California",
            },
            stateShortCode: {
              type: "string",
              description: "State short code",
              example: "CA",
            },
            city: {
              type: "string",
              description: "City name",
              example: "Los Angeles",
            },
            zip: {
              type: "string",
              description: "ZIP code",
              example: "90210",
            },
          },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./controllers/*.js", "./models/*.js"],
};

const specs = swaggerJsdoc(options);

export default specs;
