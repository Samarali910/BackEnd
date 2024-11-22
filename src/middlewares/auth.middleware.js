import { User } from "../models/user.models.js";
import ApiError from "../utils/apiError.js";
import requestHandler from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';
 
  const jwtAuth = requestHandler(async(req,res,next)=>{
     try {
         const tocken = req.cookies?.accessTocken || req.header("Authorization").replace("Bearer ","");
         if(!tocken){
           throw new ApiError(401,"unAuthorized request")
         }
        //  decodeTocken {
        //   _id: '66122bdcee12a5554912894d',
        //   email: 'one@gmail.com',
        //   userName: 'one',
        //   fullName: 'one',
        //   iat: 1712552787,
        //   exp: 1712639187
        // }
         const decodeTocken = jwt.verify(tocken,process.env.ACCESS_TOKEN_SECRET);
          
         console.log("decodeTocken",decodeTocken)
         const user=await User.findById(decodeTocken._id).select(
           "-password -refreshToken"
         );
         if(!user){
           throw new ApiError(401,"Invalid access tocken")
         }
        
         req.user=user;
         next();
     } catch (error) {
         throw new ApiError(401,error?.messege || "Invalid acees tocken")
     }

  })
  export {jwtAuth}
     