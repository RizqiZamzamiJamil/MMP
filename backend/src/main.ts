import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { mentionsRouter } from "./mentions/routes.js";

const app = express();

app.use(express.json());
app.use(mentionsRouter);

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(config.port, () => {
  console.log(`Media Monitor API listening on http://localhost:${config.port}`);
});
