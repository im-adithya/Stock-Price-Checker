/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

"use strict";

var expect = require("chai").expect;
var MongoClient = require("mongodb");
require("dotenv").config();
const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});
const fetch = require("node-fetch");
const mongoose = require("mongoose");
mongoose.connect(process.env.DB || "mongodb://localhost/exercise-track", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const Schema = mongoose.Schema;

const stockSchema = new Schema({
  symbol: { type: String, required: true },
  price: Number,
  likes: Number
});

const ipSchema = new Schema({
  ip: { type: String, required: true },
  symbol: [String]
});

const IP = mongoose.model("IP", ipSchema);
const Stock = mongoose.model("Stock", stockSchema);

//obj is normal obj
const createStock = (obj, done) => {
  Stock.findOne({ symbol: obj.symbol }, (err, findData) => {
    if (err) {
      done(err);
    } else if (findData == null) {
      var nwStock = new Stock({
        symbol: obj.symbol,
        price: obj.price,
        likes: obj.likes ? 1 : 0
      });
      nwStock.save((err, data) => {
        if (err) {
          done(err);
        }
        done(null, data);
      });
    } else {
      done(null, "exists");
    }
  });
};

const ipFinder = (obj, done) => {
  IP.findOne({ ip: obj.ip }, (err, data) => {
    if (err) {
      return console.log(err);
    } else if (data == null) {
      done(null, false);
    } else {
      if (data.symbol.includes(obj.symbol)) {
        console.log(data.symbol.includes(obj.symbol))
        done(null, true);
      } else {
        done(null, false);
      }
    }
  });
};

//obj == {symbol: symbol, likes: true/false , ip: ip}
const addLikes = (obj, done) => {
  Stock.findOne({ symbol: obj.symbol }, (err, findData) => {
    if (findData == null) {
      done(null, "Not Found");
    } else {
      ipFinder(obj, (err, data) => {
        if (err) {
          console.log("err");
        } else {
          var ipFind = data;
          if (!ipFind && obj.likes) {
            findData.likes = findData.likes + 1;
          } else {
            /*Eat 5star, do nothing*/
          }

          findData.save((err, data) => {
            if (err) {
              done(err);
            } else {
              done(null, data);
            }
          });
        }
      });
    }
  });
};

var createAndSaveip = function(ipstuff, done) {
  IP.findOne({ ip: ipstuff.ip }, (err, data) => {
    if (err) {
      console.log("err");
    } else if (data != null) {
      if (data.symbol.includes(ipstuff.symbol)) {
        return console.log("exists",ipstuff.symbol);
      } else {
        data.symbol.push(ipstuff.symbol);
        data.save((err, saved) => {
          if (err) {
            console.log("err");
          } else {
            done(null, saved);
          }
        });
      }
    } else {
      var newip = new IP({ ip: ipstuff.ip, symbol: [ipstuff.symbol] });
      newip.save((err, data) => {
        if (err) {
          return console.log("err");
        }
        done(null, data);
      });
    }
  });
};

module.exports = function(app) {
  async function getStocks(sym) {
    var resp = await fetch(
      `https://repeated-alpaca.glitch.me/v1/stock/${sym}/quote`
    );
    resp = await resp.json();

    var obj = {
      symbol: resp.symbol,
      price: resp.latestPrice
    };
    return obj;
  }

  app.route("/api/all").get((req, res) => {
    Stock.find({}, (err, data) => {
      res.json(data);
    });
  });

  app.route("/api/stock-prices").get(async function(req, res) {
    
    var stonks = [];
    var currStocks = [];
    var newStock = [];
    var ip = require("ip").address();
    if (typeof req.query.stock === typeof "msft") {
      stonks = [req.query.stock];
    } else {
      stonks = [...req.query.stock];
    }
    for (let i = 0; i < stonks.length; i++) {
      newStock[i] = await getStocks(stonks[i]);
      newStock[i].symbol = newStock[i].symbol.toUpperCase();
      newStock[i].likes = req.query.like;
      var object = {
        symbol: newStock[i].symbol,
        likes: req.query.like,
        ip: ip
      };
      createStock(newStock[i], (err, data) => {
        if (err) {
          console.log("err");
        } else {
        }
      });

      addLikes(object, (err, data) => {
        if (err) {
          console.log("err");
        } else {
        }
      });

      var ipthings = {
        ip: ip,
        symbol: object.symbol
      };
      if (req.query.like) {
        createAndSaveip(ipthings, (err, data) => {
          if (err) {
            console.log("err");
          } else {
          }
        });
      }
      currStocks.push(object.symbol);
    }

    setTimeout(() => {
      Stock.find({ symbol: { $in: currStocks } }, (err, docs) => {
        if (docs.length == 1) {
          res.json({
            stockData: [
              {
                stock: docs[0].symbol,
                price: docs[0].price,
                likes: docs[0].likes
              }
            ]
          });
          //{"stockData":[{"stock":"MSFT","price":"62.30","rel_likes":-1},{"stock":"GOOG","price":"786.90","rel_likes":1}]}
        } else {
          res.json({
            stockData: [
              {
                stock: docs[0].symbol,
                price: docs[0].price,
                rel_likes: docs[0].likes - docs[1].likes
              },
              {
                stock: docs[1].symbol,
                price: docs[1].price,
                rel_likes: docs[1].likes - docs[0].likes
              }
            ]
          });
        }
      });
    }, 2500);
  });
};
