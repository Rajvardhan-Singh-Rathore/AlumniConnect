import express from 'express';
import { db } from 'db/client';
import { isLoggedIn } from '../middleware/auth';
import { getApplications, myApplications } from '../controllers/userController';
const router = express.Router();
router.use(express.json());

router.post('/job/:id', isLoggedIn, async (req, res) => { // student applies for a job
    if (req.role !== 'STUDENT') return res.status(401).json('Only students can apply for jobs');
    try {
        const newJobApplication = await db.orm.public.Application.create({ userId: req.id as string, jobId: req.params.id as string, status: 'PENDING' });
        return res.json({ newJobApplication });
    } catch (e: any) { return res.status(409).json(e.message); }
});
router.post('/event/:id', isLoggedIn, async (req, res) => { // student registers for an event
    if (req.role !== 'STUDENT') return res.status(401).json('Only students can register for events');
    try {
        const newEventApplication = await db.orm.public.Event_Member.create({ userId: req.id as string, eventId: req.params.id as string });
        return res.json({ newEventApplication });
    } catch (e: any) { return res.status(409).json(e.message); }
});
router.delete('/event/:id', isLoggedIn, async (req, res) => { // un-register
    try {
        await db.orm.public.Event_Member.where({ userId: req.id as string, eventId: req.params.id as string }).delete();
        return res.json({ ok: true });
    } catch (e: any) { return res.status(409).json(e.message); }
});
router.get('/', isLoggedIn, getApplications);               // applications on jobs I posted (admin: all)
router.get('/myApplications', isLoggedIn, myApplications);   // student's own applications
router.put('/:id/status', isLoggedIn, async (req, res) => { // accept / reject an application
    if (req.role === 'STUDENT') return res.status(401).json('Not allowed');
    const status = req.body.status;
    if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) return res.status(411).json('invalid status');
    try {
        const app: any = await db.orm.public.Application.where({ id: req.params.id as string }).first();
        if (!app) return res.status(404).json('not found');
        const job: any = await db.orm.public.Job.where({ id: app.jobId }).first();
        if (req.role !== 'ADMIN' && job?.postedBy !== req.id) return res.status(403).json('Not your job');
        await db.orm.public.Application.where({ id: app.id }).update({ status });
        return res.json({ ok: true });
    } catch (e: any) { return res.status(409).json(e.message); }
});

export default router;
