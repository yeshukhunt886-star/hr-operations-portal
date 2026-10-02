import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Task Management API",
      version: "1.0.0",
      description: "Task Management Backend API"
    },
    servers: [
      {
        url: "http://localhost:5000/api"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },

  apis: [
  "./src/routes/*.js",
  "./src/swagger/*.js"
],
};

const swaggerSpec = swaggerJSDoc(options);

export const swaggerDocs = (app) => {

    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    app.get("/api-docs.json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(swaggerSpec);
    });

};