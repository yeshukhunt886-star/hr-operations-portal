import { createNotification } from "./src/services/notificationService.js";

try {
  const notification = await createNotification({
    userId: "cmtwizusg000ntxsgf9sqo607",
    title: "Test Notification",
    message: "This is a test notification for Rohit.",
    type: "GENERAL"
  });

  console.log("TEST NOTIFICATION CREATED");
  console.log(notification);
} catch (error) {
  console.error("NOTIFICATION ERROR:");
  console.error(error);
}