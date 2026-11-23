import express from 'express';
import { isLoggedIn } from '../middleware/auth';
import { SignIn } from '../controllers/userController';
import { db } from 'db/client';
const strip = (u:any)=>{ if(!u) return u; const { password, ...r } = u; return r; };
const router = express.Router();
router.use(express.json());

router.get('/',isLoggedIn,async (req,res)=>{
    try{
        const allUsers = await db.orm.public.User.all();
        return res.json({allUsers:allUsers.map(strip)});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.get('/alumni',isLoggedIn,async(req,res)=>{//alumni list for starting 1:1 chats
    try{
        const alumni = await db.orm.public.User.where({role:'ALUMNI'}).all();
        return res.json({alumni:alumni.filter((u:any)=>u.id!==req.id).map(strip)});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.get('/:id',isLoggedIn,async (req,res)=>{
    try{
        const searchedUser = await db.orm.public.User.where({id:req.params.id as string}).first();
        return res.json({searchedUser:strip(searchedUser)});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.delete('/:id',isLoggedIn,async (req,res)=>{//delete a user (admin only)
    if(req.role!=='ADMIN'||req.params.id===req.id){return res.status(403).json('only admins can delete other users');}
    try{
        const deletedUser = await db.orm.public.User.where({id:req.params.id as string}).delete();
        return res.json({deletedUser});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.post('/signin',SignIn);
export default router;