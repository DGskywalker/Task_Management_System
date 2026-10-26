jest.mock('../db', () => require('./fakeDb').createFakePool());

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { makeApp, signupAndLogin, auth, sampleTask } = require('./helpers');

const app = makeApp();
let alice;
let bob;

beforeEach(async () => {
  pool.mockReset();
  alice = await signupAndLogin(app, { name: 'Alice', email: 'alice@example.com' });
  bob = await signupAndLogin(app, { name: 'Bob', email: 'bob@example.com' });
});

const createTask = (token, task = sampleTask()) =>
  request(app).post('/api/tasks').set(auth(token)).send(task);

describe('authentication', () => {
  test.each([
    ['no header', {}],
    ['wrong scheme', { Authorization: 'Basic abc' }],
    ['invalid token', { Authorization: 'Bearer not-a-jwt' }],
    ['token signed with another secret', { Authorization: `Bearer ${jwt.sign({ sub: '1' }, 'other')}` }],
    ['expired token', { Authorization: `Bearer ${jwt.sign({ sub: '1' }, 'test-secret', { expiresIn: -10 })}` }]
  ])('rejects requests with %s', async (_, headers) => {
    const res = await request(app).get('/api/tasks').set(headers);
    expect(res.status).toBe(401);
  });

  test('every task route requires a token', async () => {
    const calls = [
      request(app).get('/api/tasks'),
      request(app).post('/api/tasks').send(sampleTask()),
      request(app).get('/api/tasks/1'),
      request(app).put('/api/tasks/1').send({ title: 'x' }),
      request(app).put('/api/tasks/1/status').send({ status: 'Completed' }),
      request(app).delete('/api/tasks/1')
    ];
    for (const res of await Promise.all(calls)) expect(res.status).toBe(401);
  });
});

describe('task CRUD', () => {
  test('creates a task for the token user and ignores a client-sent userId', async () => {
    const res = await createTask(alice.token, sampleTask({ userId: bob.userId, user_id: bob.userId }));
    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({ title: 'Write report', priority: 'High', status: 'Not Started', user_id: alice.userId });
  });

  test('defaults status to Not Started and optional fields to empty', async () => {
    const res = await createTask(alice.token, { title: 'Minimal', priority: 'Low' });
    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({ status: 'Not Started', notes: '', description: null, category: null, deadline: null });
  });

  test('lists only the signed-in user\'s tasks, newest first', async () => {
    await createTask(alice.token, sampleTask({ title: 'First' }));
    await createTask(alice.token, sampleTask({ title: 'Second' }));
    await createTask(bob.token, sampleTask({ title: 'Bob task' }));

    const res = await request(app).get('/api/tasks').set(auth(alice.token));
    expect(res.status).toBe(200);
    expect(res.body.tasks.map(t => t.title)).toEqual(['Second', 'First']);
  });

  test('gets, edits, updates status and deletes a task', async () => {
    const { id } = (await createTask(alice.token)).body.task;

    const got = await request(app).get(`/api/tasks/${id}`).set(auth(alice.token));
    expect(got.status).toBe(200);
    expect(got.body.task.id).toBe(id);

    const edited = await request(app).put(`/api/tasks/${id}`).set(auth(alice.token))
      .send({ title: 'Updated', priority: 'Low', notes: '', category: 'Ops', description: 'New', deadline: '2027-01-15' });
    expect(edited.status).toBe(200);
    expect(edited.body.task).toMatchObject({ title: 'Updated', priority: 'Low', notes: '', category: 'Ops', description: 'New', status: 'Not Started' });

    const status = await request(app).put(`/api/tasks/${id}/status`).set(auth(alice.token)).send({ status: 'Completed' });
    expect(status.status).toBe(200);
    expect(status.body.task.status).toBe('Completed');

    await request(app).delete(`/api/tasks/${id}`).set(auth(alice.token)).expect(200);
    await request(app).get(`/api/tasks/${id}`).set(auth(alice.token)).expect(404);
    await request(app).delete(`/api/tasks/${id}`).set(auth(alice.token)).expect(404);
  });
});

describe('ownership', () => {
  let aliceTaskId;
  beforeEach(async () => {
    aliceTaskId = (await createTask(alice.token)).body.task.id;
  });

  test('another user cannot read, edit, change status of or delete the task', async () => {
    const asBob = [
      request(app).get(`/api/tasks/${aliceTaskId}`).set(auth(bob.token)),
      request(app).put(`/api/tasks/${aliceTaskId}`).set(auth(bob.token)).send({ title: 'Hacked' }),
      request(app).put(`/api/tasks/${aliceTaskId}/status`).set(auth(bob.token)).send({ status: 'Completed' }),
      request(app).delete(`/api/tasks/${aliceTaskId}`).set(auth(bob.token))
    ];
    for (const res of await Promise.all(asBob)) expect(res.status).toBe(404);

    const bobList = await request(app).get('/api/tasks').set(auth(bob.token));
    expect(bobList.body.tasks).toEqual([]);

    const task = (await request(app).get(`/api/tasks/${aliceTaskId}`).set(auth(alice.token))).body.task;
    expect(task).toMatchObject({ title: 'Write report', status: 'Not Started' });
  });
});

describe('validation', () => {
  test.each([
    [{ priority: 'High' }, 'title is required'],
    [sampleTask({ title: '   ' }), 'title is required'],
    [sampleTask({ priority: 'Urgent' }), 'priority must be one of: High, Medium, Low'],
    [sampleTask({ priority: undefined }), 'priority is required'],
    [sampleTask({ status: 'Done' }), 'status must be one of: Not Started, In Progress, Completed'],
    [sampleTask({ deadline: '01/12/2026' }), 'deadline must be a date in YYYY-MM-DD format'],
    [sampleTask({ deadline: '2026-13-45' }), 'deadline must be a date in YYYY-MM-DD format'],
    [sampleTask({ title: 'x'.repeat(201) }), 'title must be at most 200 characters'],
    [sampleTask({ notes: 5 }), 'notes must be a string']
  ])('rejects invalid task %#', async (body, error) => {
    const res = await createTask(alice.token, body);
    expect(res.status).toBe(400);
    expect(res.body.errors).toContain(error);
  });

  test('edit rejects status, unknown fields, empty bodies and bad values', async () => {
    const { id } = (await createTask(alice.token)).body.task;
    const put = body => request(app).put(`/api/tasks/${id}`).set(auth(alice.token)).send(body);

    expect((await put({ status: 'Completed' })).body.errors[0]).toMatch(/cannot edit: status/);
    expect((await put({ user_id: 99 })).body.errors[0]).toMatch(/cannot edit: user_id/);
    expect((await put({})).body.errors).toContain('no fields to update');
    expect((await put({ priority: 'Urgent' })).body.errors).toContain('priority must be one of: High, Medium, Low');
    expect((await put({ title: '' })).body.errors).toContain('title is required');
    expect((await put({ deadline: 'tomorrow' })).status).toBe(400);
  });

  test('status update rejects unknown statuses', async () => {
    const { id } = (await createTask(alice.token)).body.task;
    const res = await request(app).put(`/api/tasks/${id}/status`).set(auth(alice.token)).send({ status: 'Archived' });
    expect(res.status).toBe(400);
  });

  test.each(['abc', '0', '-1', '1.5'])('rejects task id %s', async id => {
    const res = await request(app).get(`/api/tasks/${id}`).set(auth(alice.token));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid task id');
  });
});
