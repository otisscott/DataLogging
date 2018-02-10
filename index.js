const Bithumb = require('bithumb.js')
const bithumb = new Bithumb('deez', 'nutz');
const binance = require('node-binance-api');
const mongodb = require("mongodb");
const request = require('request');
const ObjectID = mongodb.ObjectID;
const TEST = 'spreads';
const ADD = 'count';
binance.options({
  'APIKEY':'deezy',
  'APISECRET':'nutz',
  'test': true
});

let db;

const connectString = "mongodb://otisscott:Zacharys13@ds251217.mlab.com:51217/korean_arb_data_gathering";

mongodb.MongoClient.connect(connectString, (err, database) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  db = database;
  console.log("Database connection ready");
});

let krwTousd;
async function waitForCurrency() {
  return new Promise(function(resolve, reject) {
    request('https://api.fixer.io/latest?base=KRW&symbols=USD', function(error, response, body) {
      if (error) return reject(error);
      resolve(body);
    });
  });
}
async function getConversion() {
  try {
    krwTousd = await waitForCurrency();
    krwTousd = parseFloat(krwTousd.substring(49,59));
  } catch(error) {
    console.error(error);
  }
}
let koreanXRPBuy;
let koreanXRPSell;
let usXRP;
let koreanETHBuy;
let koreanETHSell;
let usETH;
let USDtoBTC;

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

async function oneSec() {
  await sleep(1000);
}

async function fiveSecs() {
  await sleep(5000);
}

async function oneMin() {
  await sleep(6000000);
}
async function fiveMin() {
  await sleep(300000);
}


binance.prices(function(ticker) {
  USDtoBTC = parseInt(ticker.BTCUSDT);
	usXRP = parseFloat(ticker.XRPBTC) * USDtoBTC;
  usETH = parseFloat(ticker.ETHBTC) * USDtoBTC;
});
async function koreanPrices() {
  try {
    let promises = [bithumb.getTicker('XRP'), bithumb.getTicker('ETH'), bithumb.getTicker('ETH'), bithumb.getTicker('XRP')]
    let prices = await Promise.all(promises);
    koreanXRPBuy = parseInt((prices[0]).data.buy_price);
    koreanETHBuy = parseInt((prices[1]).data.buy_price);
    koreanETHSell = parseInt((prices[2]).data.sell_price);
    koreanXRPSell = parseInt((prices[3]).data.sell_price);
  } catch(err) {
    console.log("I fucked up")
  }
}
async function ready() {
  try {
    let promises = [koreanPrices(), getConversion(), ];
    await Promise.all(promises);
    koreanXRPBuy = koreanXRPBuy * krwTousd;
    koreanETHBuy = koreanETHBuy * krwTousd;
    koreanXRPSell = koreanXRPSell * krwTousd;
    koreanETHSell = koreanETHSell * krwTousd;
    checkSpread(koreanXRPBuy, koreanETHBuy, koreanETHSell, koreanXRPSell);
  } catch(err) {
    console.log("Korean prices or conversion rate not applying correctly ", err)
  }
}
function checkSpread(kXRPB, kETHB, kETHS, kXRPS) {
  let EthToXrpSpread;
  let XrpToEthSpread;
  EthToXrpSpread = ((kETHB / usETH) / (kXRPS / usXRP));
  XrpToEthSpread = ((kXRPB / usXRP) / (kETHS / usETH));
  if(XrpToEthSpread > 1.001) {
    const spread = JSON.stringify({spread: XrpToEthSpread});
    spread.createDate = new Date();
    db.collection(TEST).insertOne(spread);
    console.log("XRP to ETH spread is good to go: ", XrpToEthSpread);
    setTimeout(ready, 60000);
  } else if (EthToXrpSpread > 1.001) {
    const spread = JSON.stringify({spread: EthToXrpSpread});
    spread.createDate = new Date();
    db.collection(TEST).insertOne(spread);
    console.log("ETH to XRP spread is good to go: ", EthToXrpSpread);
    setTimeout(ready, 60000);
  } else {
    console.log("The spread is too small. ETH to XRP is: ", EthToXrpSpread, " and XRP to ETH is: ", XrpToEthSpread);
    setTimeout(ready, 60000);
  }
}
ready();
