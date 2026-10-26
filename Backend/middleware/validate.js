// Request body validation. Each validator returns { value, errors }.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Not Started', 'In Progress', 'Completed'];
const EDITABLE_FIELDS = ['title', 'description', 'deadline', 'priority', 'category', 'notes'];

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt only uses the first 72 bytes

function isString(v) {
  return typeof v === 'string';
}

function checkText(errors, body, field, { required = false, max }) {
  const v = body[field];
  if (v === undefined || v === null || v === '') {
    if (required) errors.push(`${field} is required`);
    return undefined;
  }
  if (!isString(v)) {
    errors.push(`${field} must be a string`);
    return undefined;
  }
  const trimmed = v.trim();
  if (required && !trimmed) errors.push(`${field} is required`);
  if (trimmed.length > max) errors.push(`${field} must be at most ${max} characters`);
  return trimmed;
}

function checkEmail(errors, body) {
  const email = body.email;
  if (!isString(email) || !EMAIL_RE.test(email.trim()) || email.length > 255) {
    errors.push('a valid email is required');
    return undefined;
  }
  return email.trim().toLowerCase();
}

function checkNewPassword(errors, password) {
  if (!isString(password) || password.length < PASSWORD_MIN) {
    errors.push(`password must be at least ${PASSWORD_MIN} characters`);
  } else if (password.length > PASSWORD_MAX) {
    errors.push(`password must be at most ${PASSWORD_MAX} characters`);
  }
}

function checkDeadline(errors, body) {
  const v = body.deadline;
  if (v === undefined || v === null || v === '') return null;
  if (!isString(v) || !DATE_RE.test(v) || Number.isNaN(Date.parse(v))) {
    errors.push('deadline must be a date in YYYY-MM-DD format');
    return undefined;
  }
  return v;
}

function checkChoice(errors, body, field, choices, { required = false } = {}) {
  const v = body[field];
  if (v === undefined || v === null || v === '') {
    if (required) errors.push(`${field} is required`);
    return undefined;
  }
  if (!choices.includes(v)) {
    errors.push(`${field} must be one of: ${choices.join(', ')}`);
    return undefined;
  }
  return v;
}

function validateSignup(body = {}) {
  const errors = [];
  const name = checkText(errors, body, 'name', { required: true, max: 100 });
  const email = checkEmail(errors, body);
  checkNewPassword(errors, body.password);
  return { value: { name, email, password: body.password }, errors };
}

function validateLogin(body = {}) {
  const errors = [];
  const email = checkEmail(errors, body);
  if (!isString(body.password) || !body.password) errors.push('password is required');
  return { value: { email, password: body.password }, errors };
}

function validateTaskCreate(body = {}) {
  const errors = [];
  const value = {
    title: checkText(errors, body, 'title', { required: true, max: 200 }),
    description: checkText(errors, body, 'description', { max: 5000 }) ?? null,
    deadline: checkDeadline(errors, body),
    priority: checkChoice(errors, body, 'priority', PRIORITIES, { required: true }),
    status: checkChoice(errors, body, 'status', STATUSES) ?? 'Not Started',
    notes: checkText(errors, body, 'notes', { max: 5000 }) ?? '',
    category: checkText(errors, body, 'category', { max: 100 }) ?? null
  };
  return { value, errors };
}

// Partial update of task details. Status has its own endpoint.
function validateTaskEdit(body = {}) {
  const errors = [];
  const unknown = Object.keys(body).filter(k => !EDITABLE_FIELDS.includes(k));
  if (unknown.length) {
    errors.push(`cannot edit: ${unknown.join(', ')} (use PUT /api/tasks/:taskId/status to change status)`);
  }

  const value = {};
  for (const field of EDITABLE_FIELDS) {
    if (!(field in body)) continue;
    if (field === 'title') value.title = checkText(errors, body, 'title', { required: true, max: 200 });
    if (field === 'description') value.description = checkText(errors, body, 'description', { max: 5000 }) ?? null;
    if (field === 'deadline') value.deadline = checkDeadline(errors, body);
    if (field === 'priority') value.priority = checkChoice(errors, body, 'priority', PRIORITIES, { required: true });
    if (field === 'category') value.category = checkText(errors, body, 'category', { max: 100 }) ?? null;
    if (field === 'notes') value.notes = checkText(errors, body, 'notes', { max: 5000 }) ?? '';
  }
  if (!Object.keys(body).length) errors.push('no fields to update');
  return { value, errors };
}

function validateStatus(body = {}) {
  const errors = [];
  const status = checkChoice(errors, body, 'status', STATUSES, { required: true });
  return { value: { status }, errors };
}

function validateForgotPassword(body = {}) {
  const errors = [];
  const email = checkEmail(errors, body);
  return { value: { email }, errors };
}

function validateResetPassword(body = {}) {
  const errors = [];
  checkNewPassword(errors, body.password);
  return { value: { password: body.password }, errors };
}

// Wraps a validator into middleware that replaces req.body with the cleaned value.
function validate(validator) {
  return (req, res, next) => {
    const { value, errors } = validator(req.body || {});
    if (errors.length) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    req.body = value;
    next();
  };
}

module.exports = {
  validate,
  validateSignup,
  validateLogin,
  validateTaskCreate,
  validateTaskEdit,
  validateStatus,
  validateForgotPassword,
  validateResetPassword,
  PRIORITIES,
  STATUSES,
  PASSWORD_MIN
};
