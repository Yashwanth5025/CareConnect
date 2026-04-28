import mongoose from 'mongoose';

const userlogin = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    phno: { type: String, required: true },
    usermail: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["Player", "Scout", "Agent"], required: true },
    path: { type: String },
    profileImage: { type: String, default: '' },
    managedPlayers: {
      type: [
        {
          playerId: { type: String, default: '' },
          playerName: { type: String, default: '' },
          linkedAt: { type: Date, default: Date.now },
        }
      ],
      default: []
    }
  },
  { collection: 'logins' }
);

const Lform = mongoose.models.Login || mongoose.model("Login", userlogin);
Lform.init();

export default Lform;
