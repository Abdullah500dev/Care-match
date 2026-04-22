import catchAsyncError from "../middleware/catchAsyncErrors.js";
import { getApifySyncStatus } from "../services/apifySyncScheduler.js";

export const getApifySchedulerStatus = catchAsyncError(async (req, res) => {
  const status = getApifySyncStatus();
  res.status(200).json({
    success: true,
    scheduler: status,
  });
});
