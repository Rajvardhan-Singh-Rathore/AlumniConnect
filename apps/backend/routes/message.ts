import express from 'express';
import { db, or, and } from 'db/client';
import { isLoggedIn } from '../middleware/auth';

const router = express.Router();
router.use(express.json());

// history of a 1:1 conversation between me and :id (oldest first)
router.get('/user/:id',isLoggedIn,async(req,res)=>{
    const me = req.id as string, other = req.params.id as string;
    try{
        const directMessages = await db.orm.public.Message
            .where((m)=>or(and(m.senderId.eq(me),m.receiverId.eq(other)),and(m.senderId.eq(other),m.receiverId.eq(me))))
            .orderBy((m)=>m.createdAt.asc())
            .all();
        return res.json({directMessages});
    }catch(e:any){return res.status(409).json(e.message)}
})

// history of a group (members only), with sender names
router.get('/group/:id',isLoggedIn,async(req,res)=>{
    const groupId = req.params.id as string;
    try{
        const rows0:any[] = await db.orm.public.GroupMember.where({groupId}).all();
        const member = rows0.some((m)=>m.userId===req.id);
        if(!member){return res.status(403).json('not a member of this group')}
        const rows = await db.orm.public.GroupMessage.where({groupId}).orderBy((m)=>m.sentAt.asc()).all();
        const ids = [...new Set(rows.map((r:any)=>r.userId))];
        const users = ids.length ? await db.orm.public.User.where((u)=>u.id.in(ids)).all() : [];
        const names = new Map(users.map((u:any)=>[u.id,u.name]));
        return res.json({groupMessages:rows.map((r:any)=>({...r,senderName:names.get(r.userId)||'Unknown'}))});
    }catch(e:any){return res.status(409).json(e.message)}
})

export default router;
