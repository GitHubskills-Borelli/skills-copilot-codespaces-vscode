// Create web server

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

// Create app
const app = express();
// Use body-parser
app.use(bodyParser.json());
// Use cors
app.use(cors());

// Create comments
const commentsByPostId = {};

// Create route to get comments
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create route to create comments
app.post('/posts/:id/comments', async (req, res) => {
  // Create random id
  const commentId = randomBytes(4).toString('hex');
  // Get content from body
  const { content } = req.body;
  // Get comments from post id
  const comments = commentsByPostId[req.params.id] || [];
  // Push new comment
  comments.push({ id: commentId, content, status: 'pending' });
  // Set comments
  commentsByPostId[req.params.id] = comments;
  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });
  // Send response
  res.status(201).send(comments);
});

// Create route to receive events
app.post('/events', async (req, res) => {
  // Get type and data from body
  const { type, data } = req.body;
  // Check type
  if (type === 'CommentModerated') {
    // Get comments from post id
    const comments = commentsByPostId[data.postId];
    // Get comment from comments
    const comment = comments.find((comment) => comment.id === data.id);
    // Set status
    comment.status = data.status;
    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data,
    });
  }
  // Send response
  res.send({});
});

// Listen on port 4001
app.listen(4001, () => {
  console.log('Listening on port 400