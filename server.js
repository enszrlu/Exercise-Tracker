const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

// setup mongoose
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

var bodyParser = require('body-parser')

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(bodyParser.urlencoded({ extended: false }));

// Define mongoose schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  count: { type: Number, default: 0 },
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

let User = mongoose.model('User', userSchema);

// Define function to create and save new users
const createAndSaveUser = (_username, done) => {
  let document = new User({ username: _username, log: [] })
  document.save((err, data) => {
    if (err) return console.error(err);
    done(null, data);
  });
};

// Define function to create and save new exercises
const createAndSaveExercise = (_id, _exercise, done) => {
  User.findById(_id, (err, user) => {
    if (err) return console.error(err);
    user.log.push(_exercise);
    user.count++;
    user.save((err, data) => {
      done(null, data);
    })
  });
};

// Define function to find user by Id
const findUserById = (personId, done) => {
  User.findById(personId, (err, person) => {
    if (err) return console.error(err);
    done(null, person);
  });
};

// Define function to find all users
const findAllUSers = (done) => {
  User.find((err, users) => {
    if (err) return console.error(err);
    done(null, users);
  });
};

// Create User post API
app.route("/api/users").post((req, res) => {
  if (req.body.username) {
    createAndSaveUser(req.body.username, (_, data) => {
      res.json({ username: data.username, _id: data._id })
    });
  }
  else {
    res.json({ error: 'invalid username' })
  }
}).get((req, res) => {
  findAllUSers((_, data) => res.send(data))

});


// Create Add Exercise API
app.route("/api/users/:_id/exercises").post((req, res) => {
  if (isNaN(req.body.duration)) { res.json({ error: 'invalid duration' }); return console.error('invalid duration') }
  if (req.body.description === "") { res.json({ error: 'invalid description' }); return console.error('invalid description') }

  let date = new Date(req.body.date);

  if (!(Date.parse(req.body.date) > 0)) {
    if (req.body.date === "" || !req.body.date) {
      date = new Date();
    }
    else {
      res.json({ error: 'invalid date' }); return console.error('invalid date')
    }
  }


  let exercise = {
    description: req.body.description,
    duration: req.body.duration,
    date: date
  }
  createAndSaveExercise(req.params._id, exercise, (_, data) => {
    res.json({ username: data.username, description: req.body.description, duration: parseInt(req.body.duration), date: date.toDateString(), _id: data._id })
  });
});

// Create GET user's exercise log API
app.route("/api/users/:_id/logs").get((req, res) => {
  findUserById(req.params._id, (_, data) => {
    let limit = parseInt(req.query.limit);

    let exercises = data.log;

    if (!(req.query.from == "") && req.query.from) {
      let from = new Date(req.query.from);
      exercises = exercises.filter(exercise => exercise.date >= from);
    }
    if (!(req.query.to == "") && req.query.to) {
      let to = new Date(req.query.to);
      exercises = exercises.filter(exercise => exercise.date <= to);
    }

    if (limit) exercises = exercises.slice(0, limit);

    let exercisesStringDate = exercises.map((exercise) => {
      return {
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      }
    })

    res.json({ _id: data._id, username: data.username, count: data.count, log: exercisesStringDate })
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
