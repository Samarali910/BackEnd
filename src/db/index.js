import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
const connectDB= async()=>{
      try {
        const connection=await mongoose.connect('mongodb+srv://samarali5177:LSACbxUmr6bTvmIF@cluster0.jqurkhy.mongodb.net/myapp')
         console.log(" DB connection Sussessfully !!") 
      } catch (error) {
          console.log(" Mongodb connection error:", error);
          process.exit(1)
      }
}
export default connectDB;