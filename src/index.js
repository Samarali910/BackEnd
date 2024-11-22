import connectDB from "./db/index.js";
import dotenv from 'dotenv';
import app from "./app.js";
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(` Server is running  at port number ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log('Mongodb connection failled !!!',err)
})
 dotenv.config({
    path:'./env'
 })