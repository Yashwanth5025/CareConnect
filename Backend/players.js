import mongoose from 'mongoose';

const playerAgentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Login', default: null },
    username: { type: String, default: '' },
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    linkedAt: { type: Date, default: null },
  },
  { _id: false }
);

const apif = new mongoose.Schema(
  {
    inMarket: { type: Boolean, default: false },
    marketStatus: { type: String, default: '' },
    agentUsername: { type: String, default: '' },
    agentName: { type: String, default: '' },
    agentEmail: { type: String, default: '' },
    agentPhone: { type: String, default: '' },
    managedByUsername: { type: String, default: '' },
    agentLinkedAt: { type: Date, default: null },
    lastMarketedAt: { type: Date, default: null },
    agent: { type: playerAgentSchema, default: null },
    generatedStats: { type: mongoose.Schema.Types.Mixed, default: null },
    videoAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { strict: false, timestamps: true, collection: 'players' }
);

const apip = mongoose.models.Player || mongoose.model("Player", apif);

export default apip;
