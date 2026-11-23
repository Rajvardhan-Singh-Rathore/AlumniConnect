import express from 'express';
import { isLoggedIn } from '../middleware/auth';
import { db } from 'db/client';
import { usersById, ts } from '../lib/helpers';
const router = express.Router();
router.use(express.json())

// Groups: created by ALUMNI/ADMIN. Members = students, alumni, admins. Only alumni/admin members can post (enforced in websocket server); students view only.
const canManage = (g:any, req:any) => g && (g.createdBy===req.id || req.role==='ADMIN');

router.get('/',isLoggedIn,async (req,res)=>{ // groups I belong to
    try{
        const memberships:any[] = await db.orm.public.GroupMember.where({userId:req.id as string}).all();
        const ids = memberships.map((m)=>m.groupId);
        const groups:any[] = ids.length ? await db.orm.public.Group.where((g:any)=>g.id.in(ids)).all() : [];
        const allMembers:any[] = ids.length ? await db.orm.public.GroupMember.where((m:any)=>m.groupId.in(ids)).all() : [];
        const myGroups = groups.sort((a,b)=>ts(b.createdAt)-ts(a.createdAt)).map((g)=>({...g,memberCount:allMembers.filter((m)=>m.groupId===g.id).length,canManage:canManage(g,req)}));
        return res.json({myGroups});
    }catch(e:any){return res.status(409).json(e.message)}
})
router.get('/:id',isLoggedIn,async (req,res)=>{ // group + members
    try{
        const id = req.params.id as string;
        const group:any = await db.orm.public.Group.where({id}).first();
        if(!group) return res.status(404).json('group not found');
        const rows:any[] = await db.orm.public.GroupMember.where({groupId:id}).all();
        if(!rows.some((m)=>m.userId===req.id) && req.role!=='ADMIN') return res.status(403).json('not a member');
        const users = await usersById(rows.map((m)=>m.userId));
        const members = rows.map((m)=>users.get(m.userId)).filter(Boolean);
        return res.json({searchedGroup:{...group,canManage:canManage(group,req)},members});
    }catch(e:any){return res.status(409).json(e.message)}
})
router.post('/',isLoggedIn,async (req,res)=>{
    if(req.role==='STUDENT') return res.status(401).json('Only alumni and admins can create groups');
    const name = String(req.body.name||'').trim();
    if(!name) return res.status(411).json('group name required');
    const ids:string[] = [...new Set<string>((req.body.members||[]).map((m:any)=>typeof m==='string'?m:m.id))].filter((i)=>i&&i!==req.id);
    try{
        const newGroup:any = await db.orm.public.Group.create({createdBy:req.id as string,name});
        await db.orm.public.GroupMember.create({userId:req.id as string,groupId:newGroup.id});
        for(const userId of ids) await db.orm.public.GroupMember.create({userId,groupId:newGroup.id});
        return res.json({newGroup});
    }catch(e:any){return res.status(409).json(e.message)}
})
router.post('/:id/members',isLoggedIn,async (req,res)=>{ // add members
    try{
        const groupId = req.params.id as string;
        const group:any = await db.orm.public.Group.where({id:groupId}).first();
        if(!canManage(group,req)) return res.status(403).json('only the creator or an admin can add members');
        const existing:any[] = await db.orm.public.GroupMember.where({groupId}).all();
        const have = new Set(existing.map((m)=>m.userId));
        const ids:string[] = [...new Set<string>(req.body.userIds||[])].filter((i)=>!have.has(i));
        for(const userId of ids) await db.orm.public.GroupMember.create({userId,groupId});
        return res.json({added:ids.length});
    }catch(e:any){return res.status(409).json(e.message)}
})
router.delete('/:id/members/:userId',isLoggedIn,async (req,res)=>{ // remove member (or leave)
    try{
        const groupId = req.params.id as string, userId = req.params.userId as string;
        const group:any = await db.orm.public.Group.where({id:groupId}).first();
        if(!canManage(group,req) && userId!==req.id) return res.status(403).json('not allowed');
        await db.orm.public.GroupMember.where({groupId,userId}).delete();
        return res.json({ok:true});
    }catch(e:any){return res.status(409).json(e.message)}
})
router.put('/:id',isLoggedIn,async (req,res)=>{
    try{
        const group:any = await db.orm.public.Group.where({id:req.params.id as string}).first();
        if(!canManage(group,req)) return res.status(403).json('not allowed');
        const updatedGroup = await db.orm.public.Group.where({id:group.id}).update({name:String(req.body.name||group.name)});
        return res.json({updatedGroup});
    }catch(e:any){return res.status(409).json(e.message)}
})
router.delete('/:id',isLoggedIn,async (req,res)=>{
    try{
        const group:any = await db.orm.public.Group.where({id:req.params.id as string}).first();
        if(!canManage(group,req)) return res.status(403).json('not allowed');
        await db.orm.public.Group.where({id:group.id}).delete();
        return res.json({ok:true});
    }catch(e:any){return res.status(409).json(e.message)}
})
export default router;
