import mongoose from "mongoose";
const oplayer = new mongoose.Schema({
    username:{type:String, required: true, unique: true },
    teamname:{type:String, required: true },
    position:{type:String, required: true },
    country:{type:String, required: true },
    jersey:{type:String, required: true },
    image:{type:String, required: true },
    age:{type:String, required: true },
    height:{type:String, required: true },
    weight:{type:String, required: true },
    foot:{type:String, required: true },
}, { collection: 'offplayers' });

const inplayer = mongoose.models.Offplayers || mongoose.model("Offplayers", oplayer);

export default inplayer;
