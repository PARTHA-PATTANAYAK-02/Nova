import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  createCollection,
  deleteCollection,
  getCollectionById,
  getUserCollections,
  togglePostInCollection,
  updateCollection,
} from "../controllers/collection.controller.js";

const router = express.Router();

router.route("/all").get(isAuthenticated, getUserCollections);
router.route("/create").post(isAuthenticated, createCollection);
router.route("/:id").get(isAuthenticated, getCollectionById);
router.route("/:id").delete(isAuthenticated, deleteCollection);
router.route("/:id").put(isAuthenticated, updateCollection);
router.route("/:id/toggle-post").post(isAuthenticated, togglePostInCollection);

export default router;
