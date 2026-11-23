import express from 'express';
import { isLoggedIn } from '../middleware/auth';
import { db, or, and } from 'db/client';
import { usersById, ts } from '../lib/helpers';
const router = express.Router();
router.use(express.json());

const mine = (c:any, me:string) => or(c.senderId.eq(me), c.receiverId.eq(me));
const enrich = async (rows:any[], me:string) => {
    const users = await usersById(rows.flatMap((r)=>[r.senderId,r.receiverId]));
    return rows.sort((a,b)=>ts(b.createdAt)-ts(a.createdAt)).map((r)=>{
        const incoming = r.receiverId===me;
        return {...r, direction: incoming?'incoming':'outgoing', other: users.get(incoming?r.senderId:r.receiverId)||null};
    });
};

router.get('/',isLoggedIn,async(req,res)=>{ // accepted connections
    const me = req.id as string;
    try{
        const rows:any[] = await db.orm.public.Connection.where((c:any)=>and(mine(c,me),c.status.eq('ACCEPTED'))).all();
        return res.json({myConnections:await enrich(rows,me)});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.get('/pending',isLoggedIn,async(req,res)=>{ // pending requests (sent + received)
    const me = req.id as string;
    try{
        const rows:any[] = await db.orm.public.Connection.where((c:any)=>and(mine(c,me),c.status.eq('PENDING'))).all();
        return res.json({pendingRequests:await enrich(rows,me)});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.get('/rejected',isLoggedIn,async(req,res)=>{
    const me = req.id as string;
    try{
        const rows:any[] = await db.orm.public.Connection.where((c:any)=>and(mine(c,me),c.status.eq('REJECTED'))).all();
        return res.json({rejectedRequests:await enrich(rows,me)});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.post('/accept/:id',isLoggedIn,async(req,res)=>{
    try{
        await db.orm.public.Connection.where({id:req.params.id as string,receiverId:req.id as string}).update({status:'ACCEPTED'});
        return res.json({ok:true});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.post('/reject/:id',isLoggedIn,async(req,res)=>{
    try{
        await db.orm.public.Connection.where({id:req.params.id as string,receiverId:req.id as string}).update({status:'REJECTED'});
        return res.json({ok:true});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.delete('/:id',isLoggedIn,async (req,res)=>{ // cancel request / remove connection
    const id = req.params.id as string, me = req.id as string;
    try{
        const c:any = await db.orm.public.Connection.where({id}).first();
        if(!c) return res.status(404).json('not found');
        if(c.senderId!==me && c.receiverId!==me) return res.status(403).json('not yours');
        await db.orm.public.Connection.where({id}).delete();
        return res.json({ok:true});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.post('/:id',isLoggedIn,async (req,res)=>{ // send request to user :id
    const senderId = req.id as string, receiverId = req.params.id as string;
    if(senderId===receiverId) return res.status(411).json('cannot connect with yourself');
    try{
        const existing = await db.orm.public.Connection.where((c:any)=>or(and(c.senderId.eq(senderId),c.receiverId.eq(receiverId)),and(c.senderId.eq(receiverId),c.receiverId.eq(senderId)))).first();
        if(existing) return res.status(409).json('request already exists');
        const newConnectionRequest = await db.orm.public.Connection.create({senderId,receiverId,status:'PENDING'});
        return res.json({newConnectionRequest});
    }catch(e:any){return res.status(409).json(e.message);}
})

export default router;
