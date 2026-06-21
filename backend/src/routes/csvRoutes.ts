import { Router } from "express";
import multer from "multer";
import path from "path";
import {
  uploadCsvTrades,
  getCsvImports,
  getImportTrades,
} from "../controllers/csvController";
import { adminGuard } from "../middleware/auth";

const router = Router();

// Secure all CSV routes behind the adminGuard
router.use(adminGuard);

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads/csv"));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  },
});

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Accept only CSV files
  if (
    file.mimetype === "text/csv" ||
    file.mimetype === "application/vnd.ms-excel" ||
    file.originalname.endsWith(".csv")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV files are accepted"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

/**
 * POST /api/csv/upload
 * Upload and process broker CSV file
 * Body: { brokerName, accountNumber? }
 * File: CSV file
 */
router.post("/upload", upload.single("file"), uploadCsvTrades);

/**
 * GET /api/csv/imports
 * Get history of CSV imports
 * Query: page, limit, status, brokerName
 */
router.get("/imports", getCsvImports);

/**
 * GET /api/csv/imports/:importId/trades
 * Get trades from a specific import
 * Query: page, limit, outcome, pair
 */
router.get("/imports/:importId/trades", getImportTrades);

export default router;
