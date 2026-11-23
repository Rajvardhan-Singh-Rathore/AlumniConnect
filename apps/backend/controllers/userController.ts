import 'dotenv/config'
import express, { type Request, type Response } from "express"
import { adminSignupSchema, alumniSignupSchema, SigninSchema, studentSignupSchema } from "../zod";
import { db } from "db/client";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../lib/config";
import { touch } from "../lib/activity";
import { usersById, ts } from "../lib/helpers";

const publicUser = (u:any)=>{ if(!u) return u; const { password, ...rest } = u; return rest; }
export const alumniSignup = async function(req:Request,res:Response){
    const isInputValid = alumniSignupSchema.safeParse(req.body);
    if(!isInputValid.success){
        const message = JSON.parse(isInputValid.error.message)[0].message;
        return res.status(411).json({message});
    }
    const { email,password,Role,name,GraduationYear,company,jobTitle,bio,linkedInUrl } = isInputValid.data;
    const foundInPending = await db.orm.public.PendingApproval.where({email}).first();
    if(foundInPending){return res.status(409).json('you are pending to be approved by admin');}
    const foundInUser = await db.orm.public.User.where({email}).first();
    if(foundInUser){return res.status(401).json('you may login');}
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password,salt);
    const newAdminApproval = await db.orm.public.PendingApproval.create({email,passwordHash,role:'ALUMNI',name,graduationYear:GraduationYear,company,bio,linkedinUrl:linkedInUrl,jobTitle});
    return res.json({newAdminApproval});
}
export const userSignup = async function(req:Request,res:Response){
    const isInputValid = studentSignupSchema.safeParse(req.body);
    if(!isInputValid.success){
        const message = JSON.parse(isInputValid.error.message)[0].message;
        return res.status(411).json({message});
    }
    const { email,password,Role,name,GraduationYear } = isInputValid.data;
    const foundInPending = await db.orm.public.PendingApproval.where({email}).first();
    if(foundInPending){return res.status(409).json('you are pending to be approved by admin');}
    const foundInUser = await db.orm.public.User.where({email}).first();
    if(foundInUser){return res.status(401).json('you may login');}
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password,salt);
    const newStudentApproval = await db.orm.public.PendingApproval.create({email,passwordHash,role:'STUDENT',name,graduationYear:GraduationYear});
    return res.json({newStudentApproval});
}
export const adminSignup = async function(req:Request,res:Response){
    const isInputValid = adminSignupSchema.safeParse(req.body);
    if(!isInputValid.success){
        const message = JSON.parse(isInputValid.error.message)[0].message;
        return res.status(411).json({message});
    }
    const { email,password,Role,name } = isInputValid.data;
    const foundInUser = await db.orm.public.User.where({email}).first();
    if(foundInUser){return res.status(403).json('you may login');}
    // Admin accounts: allowed freely only while NO admin exists (bootstrap). After that an ADMIN_SIGNUP_KEY is required.
    const existingAdmin = await db.orm.public.User.where({role:'ADMIN'}).first();
    const key = process.env.ADMIN_SIGNUP_KEY;
    if(existingAdmin && (!key || req.body.adminKey!==key)){return res.status(403).json('admin signup is closed (valid admin key required)');}
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password,salt);
    const newAdmin = await db.orm.public.User.create({email,password:passwordHash,role:'ADMIN',name});
    const token = jwt.sign({id:newAdmin.id,role:newAdmin.role,email:newAdmin.email},JWT_SECRET);
    const tokenString = "Bearer "+token;
    return res.json({user:publicUser(newAdmin),token:tokenString});
}
export const SignIn = async function(req:Request,res:Response){
    // console.log('reached admin signin in userController',"password : ",req.body.password);
    const isInputValid = SigninSchema.safeParse(req.body);
    if(!isInputValid.success){
        const message = JSON.parse(isInputValid.error.message)[0].message;
        return res.status(411).json({message});
    }
    const { email,password } = isInputValid.data;
    const foundInPending = await db.orm.public.PendingApproval.where({email}).first();
    if(foundInPending){return res.status(409).json('you are pending to be approved by admin');}
    const foundInUser:any = await db.orm.public.User.where({email}).first();
    if(!foundInUser){return res.status(401).json(' you may signup ');}
    // console.log('foundInUser  : ',foundInUser);
    // console.log('foundInUser.password  : ',foundInUser.password);
    const isPasswordCorrect = await bcrypt.compare(password,foundInUser.password);
    if(!isPasswordCorrect){return res.status(403).json('email or password incorrect');}
    const token = jwt.sign({id:foundInUser.id,role:foundInUser.role,email:foundInUser.email},JWT_SECRET);
    const tokenString = "Bearer "+token;
    touch(foundInUser.id);
    return res.json({token:tokenString,user:publicUser(foundInUser)});
}
const enrichApps = async (apps:any[])=>{
    const jobs:any[] = apps.length ? await db.orm.public.Job.all() : [];
    const jobMap = new Map(jobs.map((j:any)=>[j.id,j]));
    const users = await usersById(apps.map((a:any)=>a.userId));
    return apps.map((a:any)=>({...a, job:jobMap.get(a.jobId)||null, user:users.get(a.userId)||null}))
        .sort((x:any,y:any)=>ts(y.appliedAt)-ts(x.appliedAt));
}
export const getApplications = async (req:Request,res:Response)=>{
    if(req.role=="STUDENT"){return res.status(401).json('only admins and alumni can view all student applications')}
    try{
        let applications:any[] = await enrichApps(await db.orm.public.Application.all());
        if(req.role!=="ADMIN") applications = applications.filter((a:any)=>a.job?.postedBy===req.id);
        return res.json({applications})
    }catch(e:any){return res.status(409).json(e.message);}
}
export const myApplications = async (req:Request,res:Response)=>{
    try{
        const myApplications = await enrichApps(await db.orm.public.Application.where({userId:req.id as string}).all());
        return res.json({myApplications})
    }catch(e:any){return res.status(409).json(e.message);}
}
