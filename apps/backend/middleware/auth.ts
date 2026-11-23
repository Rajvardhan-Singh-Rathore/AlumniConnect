import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../lib/config";
import { touch } from "../lib/activity";

interface JwtPayload {
    id:string,
    email:string
    role:string
}
declare global {
    namespace Express {
        interface Request {
            id?: string;
            email?: string;
            role?:string
        }
    }
}

export const isLoggedIn = function(req:Request,res:Response,next:NextFunction){
    const tokenString = req.headers.authorization;
    if(!tokenString || !tokenString.toString().startsWith('Bearer ')){return res.status(401).json({message:'tokenString not found or malformed'})}
    const token = tokenString.toString().split(' ')[1];
    if(!token){return res.status(401).json({message:'check token string malformed,unable to find token in it'})}
    try{
        const {id,email,role} = jwt.verify(token,JWT_SECRET) as JwtPayload;
        if(!id || !email || !role){return res.status(401).json({message:'token may be malformed'})}
        req.id = id;
        req.email = email;
        req.role  = role;
        touch(id);
        next();
    }catch(err:any){
        return res.status(401).json({message:err.message})
    }
}