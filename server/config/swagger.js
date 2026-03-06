import swaggerJsdoc from "swagger-jsdoc";

const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT;
const serverUrl = process.env.API_BASE_URL;

const servers = [
  {
    url: serverUrl,
    description: isProduction
      ? "Production server"
      : "Development server",
  },
];

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CareMatch AI API",
      version: "1.0.0",
      description:
        "Backend API for **CareMatch AI**, the care matching platform. " +
        "CareMatch AI helps users find and connect with care providers, manage profiles, and access care-related services. " +
        "This API provides authentication (sign up, login, email verification), user profile management, and password reset—used by the CareMatch AI web client and mobile app.",
    },
    servers,
    components: {
      securitySchemes: {
        accessTokenAuth: {
          type: "apiKey",
          in: "header",
          name: "access-token",
          description:
            "Optional: paste token here. If you login via Swagger, the token is stored in a cookie and sent automatically—no need to use the lock.",
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description:
          "Sign up, login, email activation, and token refresh. Used by CareMatch AI for user onboarding and session handling.",
      },
      {
        name: "User Management",
        description:
          "Profile and account management for CareMatch AI users. Required for profile, settings, and app preferences.",
      },
      {
        name: "Password Management",
        description:
          "Forgot password, reset via email, and change password. Used in CareMatch AI app forgot-password flow and account settings.",
      },
    ],
  },
  apis: ["./routes/*.js", "./controllers/*.js"],
};

const specs = swaggerJsdoc(options);

export default specs;
