import mongoose from 'mongoose';

const shortlistSchema = new mongoose.Schema(
  {
    scoutId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    players: [
      {
        playerId: {
          type: String,
          required: true,
        },
        name: String,
        team_name: String,
        position: String,
        image_url: String,
        agentUsername: String,
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true, collection: 'shortlists' }
);

shortlistSchema.index({ scoutId: 1 });
shortlistSchema.index({ 'players.playerId': 1 });

const Shortlist = mongoose.models.Shortlist || mongoose.model('Shortlist', shortlistSchema);

export default Shortlist;
