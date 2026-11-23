import express from 'express';
import { adminSignup } from '../controllers/userController';
import { isLoggedIn } from '../middleware/auth';
import { db } from 'db/client';
import { sendMail } from '../lib/mailer';
import { approvedEmail, rejectedEmail } from '../lib/emailTemplates';
import { runInactiveCheck } from '../lib/inactivity';
const router = express.Router();
router.use(express.json());

router.post('/signup',adminSignup);

const adminOnly = (req:any,res:any,next:any)=> req.role==='ADMIN' ? next() : res.status(401).json('Only admins are authorised for this');

router.get('/pendingApprovals',isLoggedIn,adminOnly,async (req,res)=>{
    try{
        const rows:any[] = await db.orm.public.PendingApproval.all();
        const pendingApprovals = rows.map(({passwordHash,...r})=>r);
        return res.json({pendingApprovals})
    }catch(e:any){return res.status(409).json(e.message);}
})
router.post('/approval/accept/:id',isLoggedIn,adminOnly,async (req,res)=>{
    const id = req.params.id as string;
    try{
        const p:any = await db.orm.public.PendingApproval.where({id}).first();
        if(!p) return res.status(404).json('approval not found');
        const newUser:any = await db.orm.public.User.create({email:p.email,name:p.name,role:p.role,password:p.passwordHash,graduationYear:p.graduationYear});
        if(newUser.role==="ALUMNI"){
            await db.orm.public.Alumni.create({graduationYear:p.graduationYear,company:p.company||'',jobTitle:p.jobTitle||'',bio:p.bio||'',linkedinUrl:p.linkedinUrl||'',userId:newUser.id});
        }
        await db.orm.public.PendingApproval.where({id}).delete();
        const {password,...user} = newUser;
        const m = approvedEmail(newUser.name);
        void sendMail(newUser.email,m.subject,m.html,m.text); // fire-and-forget, never blocks approval
        return res.json({newUser:user});
    }catch(e:any){return res.status(409).json(e.message);}
})
router.post('/approval/reject/:id',isLoggedIn,adminOnly,async (req,res)=>{
    try{
        const id = req.params.id as string;
        const p:any = await db.orm.public.PendingApproval.where({id}).first(); // read before delete: we need name/email
        await db.orm.public.PendingApproval.where({id}).delete();
        if(p){ const reason = typeof req.body?.reason==='string' ? req.body.reason.slice(0,300) : undefined; const m = rejectedEmail(p.name,reason); void sendMail(p.email,m.subject,m.html,m.text); }
        return res.json({ok:true});
    }catch(e:any){return res.status(409).json(e.message);}
})

// Admin: preview or trigger inactive-alumni reminders now.  POST /admin/notify/inactive?days=60&dryRun=true
router.post('/notify/inactive',isLoggedIn,adminOnly,async (req,res)=>{
    try{
        const days = req.query.days ? Number(req.query.days) : undefined;
        return res.json(await runInactiveCheck({days,dryRun:req.query.dryRun==='true'}));
    }catch(e:any){return res.status(409).json(e.message);}
})

export default router;
