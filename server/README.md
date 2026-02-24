# 🚀 Care Match AI Backend

A powerful and flexible **starter template** for backend developers, crafted to speed up development and maintain scalability. This template combines modern tools and libraries with an optimized folder structure to help you kick off your next Node.js project with confidence.

---

## 🔧 Tech Stack

- ⚡ **Node.js + Express.js**
- 🗄️ **MongoDB + Mongoose**
- 🔐 **JWT Authentication + Passport.js**
- 🤖 **OpenAI Integration**
- 📧 **Email System (Nodemailer + SMTP)**
- 📍 **Geographic Data Management**
- 📁 **File Upload System (Multer)**
- 🔄 **Real-time Communication (Socket.io)**
- 📊 **Comprehensive API Documentation (Swagger)**
- ✅ **Input Validation & Trimming (Joi)**
- 🛡️ **Security & Error Handling**

## 📂 Folder Structure

---

The project is structured for clarity, scalability, and modularity. Key folders include:

```plaintext
config/
├── db.js              # Database connection
├── env.js              # Environment configuration
├── geocoder.js         # Google Maps integration
├── mail.js             # Email service
├── openai.js           # AI service
├── socket.js           # Real-time communication
└── swagger.js          # API documentation

controllers/
├── aiContentController.js
├── authController.js
├── countryStateCityController.js
├── emailTemplateController.js
└── userController.js

middlewares/
├── auth.js
├── catchAsyncErrors.js
├── formValidation/
│   ├── authFormValidation.js
│   ├── userFormValidation.js
│   └── aiFormValidation.js
├── upload.js
└── validation.js

models/
├── countryStateCityModel.js
├── emailTemplateModel.js
└── userModel.js

routes/
├── aiContentRouter.js
├── authRouter.js
├── countryStateCityRouter.js
└── userRouter.js

utils/
├── errorHandler.js
├── helpers.js
├── jwtToken.js
├── newsletter.js
├── oAuthClient.js
└── validationResponse.js

helpers/
├── csvHelper.js
└── excelHelper.js

scripts/
├── createDefaultCollections.js
└── defaultCollections/
    ├── countrystatecities.json
    └── emailtemplates.json

Root files:
├── .env
├── .gitignore
├── index.js
├── LICENSE
├── package.json
└── README.md
```

---

## 🧪 API Documentation

A comprehensive **Swagger/OpenAPI 3.0** documentation is integrated and accessible at `/api-docs` endpoint. All endpoints are documented with examples, schemas, and interactive testing capabilities.

### 📡 Available Endpoints

#### Authentication (`/api/auth/`)

- `POST /register` - User registration with email verification
- `POST /login` - User authentication
- `POST /password/reset` - Request password reset
- `POST /password/reset/:token` - Reset password with token
- `GET /verify/token/:token` - Verify token validity
- `POST /request/token/new/:token` - Resend verification token
- `GET /user/account/verify/:token` - Complete account verification

#### User Management (`/api/user/`)

- `GET /logout` - User logout
- `GET /profile` - Get user profile
- `PATCH /profile/update` - Update user profile
- `PUT /password/update` - Update password
- `GET /account/status` - Get account status

#### Geographic Data (`/api/country-state-city/`)

- `GET /countries` - Get all countries
- `GET /states?country=X` - Get states for country
- `GET /cities?country=X&state=Y` - Get cities for state/country
- `GET /zip?country=X&state=Y&city=Z` - Get ZIP codes

#### AI Content (`/api/ai-content/`)

- `POST /ai/generate` - Generate AI content for campaigns

---

## 🚀 Getting Started

1. **Clone or Fork the Repository**

   ```bash
   git clone https://github.com/moaz-ze69/node-express-starter-template.git
   cd node-express-starter-template
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file with the following variables:

   ```env
   # Core Application
   APP_NAME=Your App Name
   APP_VERSION=1.0.0
   CLIENT_BASE_URL=http://localhost:5173
   SERVER_BASE_URL=http://localhost:5274
   NODE_ENV=development
   PORT=5274

   # Database
   DB_HOST=localhost
   DB_PORT=27017
   DB_NAME=your_database
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   DB_AUTHSOURCE=admin
   DB_REPLICASET=replicaSet=rs0

   # Authentication
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=7d
   COOKIE_EXPIRES_IN=7

   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email
   SMTP_PASS=your_password

   # APIs
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   OPENAI_API_KEY=your_openai_key
   ```

4. **Start Development Server**

   ```bash
   npm run dev
   ```

5. **Populate Database (Optional)**

   ```bash
   npm run populate
   ```

6. **Open your browser and navigate to:**
   - **API Documentation**: http://localhost:5274/api-docs
   - **API Base**: http://localhost:5274

---

## 🛠️ Available Scripts

```bash
# Start the application
npm start

# Development with auto-reload
npm run dev

# Populate database with default data
npm run populate
```

---

## 🔒 Security Features

- **JWT Token Authentication** with secure cookie handling
- **Password Hashing** using Passport.js
- **Email Verification** system with token-based validation
- **CORS Configuration** for cross-origin requests
- **Input Validation & Trimming** with Joi schemas
- **File Upload Security** with type and size restrictions
- **Rate Limiting** for AI requests
- **Environment Variable Validation**

---

## 📈 Performance Optimizations

- **MongoDB Aggregation** for efficient database queries
- **Batch Processing** for large datasets (327K+ location records)
- **Stream-based File Processing** for CSV/Excel files
- **Connection Pooling** with Mongoose
- **Error Handling** with async/await patterns
- **Memory Management** for large file operations

---

## 🎯 Use Cases

Perfect for:

- **SaaS Applications** with user management
- **Nonprofit Platforms** with fundraising features
- **Content Management Systems** with AI integration
- **E-commerce Platforms** with geographic data
- **Real-time Applications** with Socket.io
- **Multi-tenant Applications** with organization support

---

## 📊 Project Metrics

- **Files**: 30+ files
- **Lines of Code**: 2000+ lines
- **Dependencies**: 25+ packages
- **API Endpoints**: 17+ routes
- **Database Models**: 3 schemas
- **Middleware**: 8+ custom middleware
- **ES6 Conversion**: 100% complete

---

## 🙌 Contributing

Feel free to fork the repo and suggest improvements or raise issues. Contributions are welcome!

## 📝 License

This project is open source and available under the [ISC License](LICENSE).

## 👨‍💻 Author

Built with ❤️ by [Muhammad Moaz Ahmed](https://www.linkedin.com/in/muhammad-moaz-ahmed).
