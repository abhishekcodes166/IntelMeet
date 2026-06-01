import express from "express";
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadCount,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.put("/:notificationId/read", protect, markNotificationAsRead);
router.put("/read-all", authMiddleware, markAllNotificationsAsRead);
router.delete("/:notificationId", authMiddleware, deleteNotification);

export default router;
