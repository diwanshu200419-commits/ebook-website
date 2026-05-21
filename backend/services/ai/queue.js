const Book = require("../../models/book");
const BookAI = require("../../models/BookAI");
const { processBookAI } = require("./pipeline");

const pendingQueue = [];
const queuedIds = new Set();

let workerActive = false;

function enqueueBookAIProcessing(bookId, options = {}) {
  const normalizedId = String(bookId || "").trim();
  if (!normalizedId || queuedIds.has(normalizedId)) {
    return false;
  }

  queuedIds.add(normalizedId);
  pendingQueue.push({
    bookId: normalizedId,
    options,
  });

  void drainQueue();
  return true;
}

async function drainQueue() {
  if (workerActive) {
    return;
  }

  workerActive = true;

  while (pendingQueue.length) {
    const task = pendingQueue.shift();
    if (!task) {
      continue;
    }

    try {
      await processBookAI(task.bookId, task.options || {});
    } catch (error) {
      console.error(`AI queue processing failed for ${task.bookId}:`, error.message);
    } finally {
      queuedIds.delete(String(task.bookId));
    }
  }

  workerActive = false;
}

async function initializeAIQueue() {
  const books = await Book.find({
    aiProcessingState: { $in: ["queued", "processing"] },
  }).select("_id");

  books.forEach((book) => {
    enqueueBookAIProcessing(book._id, { allowStatusChange: true });
  });

  await BookAI.updateMany(
    { processingState: "processing" },
    {
      $set: {
        processingState: "queued",
        lastError: "",
      },
    }
  );
}

function getAIQueueStatus() {
  return {
    pendingJobs: pendingQueue.length,
    queuedIds: queuedIds.size,
    workerActive,
    mode: "in-process",
  };
}

module.exports = {
  getAIQueueStatus,
  enqueueBookAIProcessing,
  initializeAIQueue,
};
