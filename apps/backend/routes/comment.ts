import express from 'express';
import { isLoggedIn } from '../middleware/auth';
import { db } from 'db/client';
import { usersById, ts } from '../lib/helpers';
import { notify } from '../lib/notify';
const router = express.Router();
router.use(express.json())

router.get('/:blogId',isLoggedIn,async(req,res)=>{
    try{
        const rows:any[] = await db.orm.public.Comment.where({blogId:req.params.blogId as string}).all();
        const users = await usersById(rows.map((c)=>c.userId));
        const Comments = rows.sort((a,b)=>ts(a.commentedAt)-ts(b.commentedAt)).map((c)=>({...c,author:users.get(c.userId)||null}));
        return res.json({Comments});
    }catch(e:any){return res.status(409).json(e.message)}
})
router.post('/:blogId',isLoggedIn,async (req,res)=>{
    const text = String(req.body.text||'').trim();
    if(!text) return res.status(411).json('comment is empty');
    try{
        const newComment = await db.orm.public.Comment.create({text,blogId:req.params.blogId as string,userId:req.id as string});
        try{
            const blog:any = await db.orm.public.Blog.where({id:req.params.blogId as string}).first();
            if(blog && blog.postedBy!==req.id){
                const me:any = await db.orm.public.User.where({id:req.id as string}).first();
                notify([blog.postedBy],{type:'comment',title:`${me?.name||'Someone'} commented on your post`,body:text.slice(0,80),link:'/'});
            }
        }catch{}
        return res.json({newComment});
    }catch(error:any){return res.status(409).json(error.message)}
})
router.delete('/:blogId/:commentId',isLoggedIn,async(req,res)=>{
    try{
        const id = req.params.commentId as string;
        const c:any = await db.orm.public.Comment.where({id}).first();
        if(!c) return res.status(404).json('not found');
        if(c.userId!==req.id && req.role!=='ADMIN') return res.status(403).json('not yours');
        await db.orm.public.Comment.where({id}).delete();
        return res.json({ok:true});
    }catch(e:any){return res.status(409).json(e.message)}
})
export default router;
