import mongoose,{ Schema } from "mongoose";
import  jwt  from "jsonwebtoken";
import bcrypt from 'bcrypt';
const userShema=new Schema(
    {
    userName:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
        // index true for seacrhing in database
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        
    },
    avatar:{
        type:String,
        required:true,
    },
    coverImage:{
        typpe:String //cloudinery url
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:'video'
        }
    ],
    password:{
        type:String,
        required:[true, 'password is required']
    },
    refreshToken:{
        type:String,
    }
},
{
    timestamps:true 
}
)

// pre is a hook
userShema.pre('save', async function(next){
      if(!this.isModified('password')) return next();
    //   check maine isliye lagaya h taaki agar user username update kare to har bar ye function run nhi hona chahiye
     this.password =  await bcrypt.hash(this.password,10)
     next();
})

userShema.methods.isPasswordCorrect=async function(password){
       return await bcrypt.compare(password,this.password);
    //  this method return boolean value
}

userShema.methods.genrateAccessToken=function(){
    // this value meet in decode tocken  

   return jwt.sign(
        {
        _id:this._id,
        email:this.email,
        userName:this.userName,
        fullName:this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
    )
};
userShema.methods.genrateRefreshToken=function(){
    return jwt.sign(
        {
        _id:this._id,
        
    },
    process.env.REFRESH_TOKEN_SEKRET,
    {
      expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
    )
};
export const User=mongoose.model('User',userShema);