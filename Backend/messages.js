import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    clientId: { type: String, index: true },
    sender: { type: String, required: true, index: true },
    receiver: { type: String, required: true, index: true },
    text: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'messages' }
);

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
