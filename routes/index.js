const router = require('express').Router();
const r = require('rethinkdb');
const Pusher = require('pusher');
const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_APP_KEY,
    secret: process.env.PUSHER_APP_SECRET,
    cluster: process.env.PUSHER_APP_CLUSTER
});
let connection;
r.connect({host: 'localhost', port: 28015, db: 'test'})
    .then(conn => {
      connection = conn;
      return r.table('posts').changes().run(connection);
    }).then(cursor => {
      cursor.each((err, row) => {
        if (err) throw err;
        const post = row.new_val;
        pusher.trigger('post-events', 'new-post', { post }, (err) => console.log(err));
    });
});

/* Render the feed. */
router.get('/', async (req, res, next) => {
  const posts = await r.table('posts').orderBy(r.desc('date')).run(connection)
      .then(cursor => cursor.toArray());
  res.render('index', { posts, appKey: process.env.PUSHER_APP_KEY });
});

/* Show the view to create a new post. */
router.get('/new', (req, res, next) => {
  res.render('new');
});

/* Save a new post to the database */
router.post('/new', async (req, res, next) => {
    const post = {
        title: req.body.title,
        content: req.body.content,
        date: new Date(),
    };
  r.table('posts').insert(post).run(connection)
      .then(() => res.redirect('/'));
});

module.exports = router;
