const Bithumb = require('bithumb.js')
const bithumb = new Bithumb('de363fbb5d8d7115a88aac3e66ce18ab', 'e201d9f0579ca6f13a6c3b2d56c87890');
const binance = require('node-binance-api');
const mongodb = require("mongodb");
const request = require('request');
const ObjectID = mongodb.ObjectID;
const TEST = 'spreads';
const ADD = 'count';
binance.options({
  'APIKEY':'pj8LcG8MKOewrzwTlkPnNlhaTqIyYVr4MSxqZ5WhTlpv6IaMKXKqrb4CBQTohlKy',
  'APISECRET':'BahF1uTx6x62W87E6mbnONYMDmE8M70EOqvFlNcrqeV32iuBqhuUJw6Zql1f8IB3',
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
  // Initialize the app.
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

/*async function main() {
  try {
    krwTousd = await getQuote();

    console.log(krwTousd)
  } catch(error) {
    console.error(error);
  }
}*/

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
  console.log("done");
}

async function oneMin() {
  await sleep(6000);
  console.log("done")
}
async function fiveMin() {
  await sleep(300000);
}


binance.prices(function(ticker) {
  USDtoBTC = parseInt(ticker.BTCUSDT);
  console.log(USDtoBTC);
	usXRP = parseFloat(ticker.XRPBTC) * USDtoBTC;
  usETH = parseFloat(ticker.ETHBTC) * USDtoBTC;
});
async function koreanPrices() {
  try {
    let promises = [bithumb.getTicker('XRP'), bithumb.getTicker('ETH'), bithumb.getTicker('ETH'), bithumb.getTicker('XRP'), waitForCurrency()]
    let prices = await Promise.all(promises);
    krwTousd = prices[4];
    krwTousd = parseFloat(krwTousd.substring(49,59));
    koreanXRPBuy = parseInt((prices[0]).data.buy_price) * krwTousd;
    koreanETHBuy = parseInt((prices[1]).data.buy_price) * krwTousd;
    koreanETHSell = parseInt((prices[2]).data.sell_price) * krwTousd;
    koreanXRPSell = parseInt((prices[3]).data.sell_price) * krwTousd;
    console.log(koreanXRPBuy, koreanETHBuy, koreanETHSell, koreanXRPSell, krwTousd);
    checkSpread(koreanXRPBuy, koreanETHBuy, koreanETHSell, koreanXRPSell);
  } catch(err) {
    console.log("I fucked up")
  }
}
function checkSpread(kXRPB, kETHB, kETHS, kXRPS) {
  let EthToXrpSpread;
  let XrpToEthSpread;
  EthToXrpSpread = ((kETHB / usETH) / (kXRPS/ usXRP));
  XrpToEthSpread = ((kXRPB / usXRP) / (kETHS/ usETH));
  if(XrpToEthSpread > 1.01) {
    console.log("XRP to ETH spread is good to go: ", XrpToEthSpread);
    db.collection(TEST).insertOne({spread: XrpToEthSpread});
    db.collection(ADD).insertOne(1);
    oneMin();
    koreanPrices();
  } else if (EthToXrpSpread > 1.01) {
    console.log("ETH to XRP spread is good to go: ", EthToXrpSpread);
    db.collection(TEST).insertOne(EthToXrpSpread);
    db.collection(ADD).insertOne(1);
    oneMin();
    koreanPrices();
  } else {
    console.log("The spread is too small. ETH to XRP is: ", EthToXrpSpread, " and XRP to ETH is: ", XrpToEthSpread);
    oneMin();
    koreanPrices();
  }
}
koreanPrices();
fiveSecs();
