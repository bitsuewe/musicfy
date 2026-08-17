export const validatePlaylistInput = (req, res, next) => {
  const { title } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Playlist title is required' });
  }

  if (title.length > 100) {
    return res.status(400).json({ error: 'Playlist title cannot exceed 100 characters' });
  }

  next();
};

export const validateAddTrackInput = (req, res, next) => {
  const { track } = req.body;

  if (!track || typeof track !== 'object' || !track.id || !track.title) {
    return res.status(400).json({ error: 'Track details containing ID and title are required' });
  }

  next();
};
