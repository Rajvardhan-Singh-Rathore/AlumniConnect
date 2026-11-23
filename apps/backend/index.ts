import express from 'express';
import 'temporal-polyfill/full/global';
import { PORT } from './lib/config';
import { startInactivityScheduler } from './lib/inactivity';

import adminRouter from './routes/admin'
import alumniRouter from './routes/alumni'
import userRouter from './routes/user'
import jobRouter from './routes/job'
import eventRouter from './routes/event'
import groupRouter from './routes/group'
import connectionRouter from './routes/connection'
import commentRouter from './routes/comment'
import likeRouter from './routes/like'
import blogRouter from './routes/blog'
import studentRouter from './routes/student'
import applicationRouter from './routes/application'
import messageRouter from './routes/message'
import notificationRouter from './routes/notification'

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api/v1/admin',adminRouter);
app.use('/api/v1/alumni',alumniRouter);
app.use('/api/v1/user',userRouter);
app.use('/api/v1/job',jobRouter);
app.use('/api/v1/event',eventRouter);
app.use('/api/v1/comment',commentRouter);
app.use('/api/v1/connection',connectionRouter);
app.use('/api/v1/like',likeRouter);
app.use('/api/v1/student',studentRouter);
app.use('/api/v1/blog',blogRouter);
app.use('/api/v1/group',groupRouter);
app.use('/api/v1/application',applicationRouter);
app.use('/api/v1/message',messageRouter);
app.use('/api/v1/notification',notificationRouter);

app.listen(PORT, () => { console.log(`API on :${PORT}`); startInactivityScheduler(); });
