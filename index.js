const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

const app = express();

app.use(morgan('combined'));

app.use(bodyParser.json());

app.use(cors());

const sensorDir = process.env.SENSOR_DIR || "/sys/bus/w1/devices";

function getSensors() {
  return new Promise((resolve, reject) => {
    fs.readdir(process.env.SENSOR_DIR, (err, list) => {
      if (err) {
        reject(err);
      } else {
        resolve(list.filter(l => l.indexOf('28') == 0));
      }
    })
  })
}

function getSensor(id) {
  return new Promise((resolve, reject) => {
    fs.readFile(`${sensorDir}/${id}/w1_slave`, `utf8`, (err, data) => {
      if (err) {
        reject(err);
      } else {
        const ndx = data.indexOf('t=');
        if (ndx !== -1) {
          resolve(parseInt(data.slice(ndx + 2), 10) / 1000);
        } else {
          reject(`sensor read failed ${id}`);
        }
      }
    })
  })
}

app.get('/sensors', async (req, res) => {
  try {
    const sensors = await getSensors();
    res.json(sensors);
  } catch (e) {
    res.sendStatus(500);
  }
});

app.get('/sensor/:id', async (req, res) => {
  try {
    const temp = await getSensor(req.params.id);
    res.json({ tempC: temp.toFixed(2), tempF: ((temp * 9 / 5) + 32).toFixed(2) });
  } catch (e) {
    res.sendStatus(500);
  }
})

app.get('/images/:file', (req, res) => {
  console.log(path.join(__dirname, 'images', req.params.file));
  res.sendFile(path.join(__dirname, 'images', req.params.file));
});

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, '../brewv2/build')));
  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, '../brewv2/build', 'index.html'));
  });
}

app.listen(process.env.PORT || 9090, () => {
  console.log(`listening on ${process.env.PORT || 9090}`);
});

