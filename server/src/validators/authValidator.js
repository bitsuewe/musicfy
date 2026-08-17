export const validateRegisterInput = (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_USERNAME', message: 'Valid username is required.' }
    });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_EMAIL', message: 'Valid email address is required.' }
    });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PASSWORD', message: 'Password must be at least 8 characters long.' }
    });
  }

  next();
};

export const validateLoginInput = (req, res, next) => {
  const { email, password, emailOrUsername } = req.body;
  const input = email || emailOrUsername;

  if (!input || typeof input !== 'string' || !input.trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Email or username is required.' }
    });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Password is required.' }
    });
  }

  next();
};
