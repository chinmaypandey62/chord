import express from "express";
import bodyParser from "body-parser";

const app = express();

// Increase the file size limit
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
