import express from 'express';
import { isLoggedIn } from '../middleware/auth';
import { db } from 'db/client';
import { BlogSchema } from '../zod';
import { usersById, ts } from '../lib/helpers';
const router = express.Router();
router.use(express.json())

router.get('/',isLoggedIn,async(req,res)=>{//feed: blogs with author, like & comment counts
    try{
        const blogs:any[] = await db.orm.public.Blog.all();
        const likes:any[] = await db.orm.public.Like.all();
        const comments:any[] = await db.orm.public.Comment.all();
        const users = await usersById(blogs.map((b)=>b.postedBy));
        const Blogs = blogs.sort((a,b)=>ts(b.postedAt)-ts(a.postedAt)).map((b)=>({
            ...b, author:users.get(b.postedBy)||null,
            likeCount:likes.filter((l)=>l.blogId===b.id).length,
            liked:likes.some((l)=>l.blogId===b.id&&l.userId===req.id),
            commentCount:comments.filter((c)=>c.blogId===b.id).length,
        }));
        return res.json({Blogs});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.post('/',isLoggedIn,async (req,res)=>{//status hath se nhi likhna chahiye shyd ,default hona chahiye shyd
    if(req.role==="STUDENT"){return res.json('Only admins and alumni can post blog')}
    const isInputValid = BlogSchema.safeParse(req.body);
    if(!isInputValid.success){
        const message =  JSON.parse(isInputValid.error.message)[0].message;
        return res.status(411).json(message);
    }
    const {title,description} = isInputValid.data;
    try{
        const newBlog = await db.orm.public.Blog.create({description,title,postedBy:req.id as string,});
        return res.json({newBlog});
    }catch(e:any){return res.json(e.message);}
})
router.put('/:id',isLoggedIn,async (req,res)=>{//status hath se nhi likhna chahiye shyd ,default hona chahiye shyd
    if(req.role==="STUDENT"){return res.json('Only admins and alumni can update blog')}
    const isInputValid = BlogSchema.safeParse(req.body);
    const id = req.params.id as string;
    if(!isInputValid.success){
        const message =  JSON.parse(isInputValid.error.message)[0].message;
        return res.status(411).json(message);
    }
    const {title,description} = isInputValid.data;
    try{
        const updatedBlog = await db.orm.public.Blog.where({postedBy:req.id as string,id:id}).update({description,title});
        return res.json({updatedBlog});
    }catch(e:any){return res.json(e.message);}
})
router.delete('/delete/:id',isLoggedIn,async (req,res)=>{//delete a blog
    try{
        const deletedBlog = await db.orm.public.Blog.where(req.role==='ADMIN'?{id:req.params.id as string}:{id:req.params.id as string,postedBy:req.id as string}).delete();
        return res.json({deletedBlog});
    }catch(e:any){return res.json(e.message);}
})


export default router;