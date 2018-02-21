const Bithumb = require("bithumb.js")
const bithumb = new Bithumb("no",	"sike");
const binance = require("node-binance-api");
const request = require("request");
binance.options({
  "APIKEY":"no",
  "APISECRET":"sike"
});
let spread = [];
let goodSpread = [];
let count = 0;
let goodCount = 0;
let krwTousd;
async function waitForCurrency() {
  return new Promise(function(resolve, reject) {
    request("https://api.fixer.io/latest?base=KRW&symbols=USD", function(error, response, body) {
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
let koreanCurrencyBBBuy, koreanCurrencyBSell, usCurrencyB, koreanCurrencyABuy, koreanCurrencyASell, usCurrencyA, USDtoBTC, usCurrencyABalance, usCurrencyBBalance, koreanCurrencyABalance, koreanCurrencyBBalance;
async function koreanPrices() {
  binance.prices((error, ticker) => {
    USDtoBTC = parseInt(ticker.BTCUSDT);
    usB = parseFloat(ticker.CurrencyBBTC) * USDtoBTC;
    usCurrencyA = parseFloat(ticker.CurrencyABTC) * USDtoBTC;
  });
  binance.useServerTime(function() {
    binance.balance((error, balances) => {
      usCurrencyABalance = balances.CurrencyA.available;
      usCurrencyBBalance = balances.CurrencyB.available;
    });
  })
  try {
    let promises = [bithumb.getTicker("CurrencyB"), bithumb.getTicker("CurrencyA"), bithumb.getTicker("CurrencyA"), bithumb.getTicker("B"), bithumb.getBalance("B"), bithumb.getBalance("CurrencyA")]
    let prices = await Promise.all(promises);
    koreanCurrencyBBuy = parseInt((prices[0]).data.buy_price);
    koreanCurrencyABuy = parseInt((prices[1]).data.buy_price);
    koreanCurrencyASell = parseInt((prices[2]).data.sell_price);
    koreanCurrencyBSell = parseInt((prices[3]).data.sell_price);
    koreanBBalance = prices[4].data.available_CurrencyB;
    koreanCurrencyABalance = prices[5].data.available_CurrencyA;
  } catch(err) {
    console.log("Korean Data not working")
  }
}
async function ready() {
  try {
    let promises = [koreanPrices(), getConversion(), ];
    await Promise.all(promises);
    koreanCurrencyBBuy = koreanCurrencyBBuy * krwTousd;
    koreanCurrencyABuy = koreanCurrencyABuy * krwTousd;
    koreanCurrencyBSell = koreanCurrencyBSell * krwTousd;
    koreanCurrencyASell = koreanCurrencyASell * krwTousd;
    checkSpread(koreanCurrencyBBuy, koreanCurrencyABuy, koreanCurrencyASell, koreanCurrencyBSell);
  } catch(err) {
    console.log("Korean prices or conversion rate not applying correctly ", err)
  }
}
function checkSpread(kCurrencyBB, kCurrencyAB, kCurrencyAS, kCurrencyBS) {
  let CurrencyAToCurrencyBSpread;
  let CurrencyBToCurrencyASpread;
  CurrencyAToCurrencyBSpread = ((kCurrencyAB / usCurrencyA) / (kCurrencyBS / usCurrencyB));
  BToCurrencyASpread = ((kCurrencyBB / usCurrencyB) / (kCurrencyAS / usCurrencyA));
  if(BToCurrencyASpread > 1.001) {
    console.log("CurrencyB to CurrencyA spread is good to go: ", CurrencyBToCurrencyASpread);
    spread.push(CurrencyBToCurrencyASpread);
    goodSpread.push(CurrencyBToCurrencyASpread);
    count += 1;
    goodCount += 1;
    setTimeout(ready, 5000);
  } else if (CurrencyAToCurrencyBSpread > 1.001) {
    console.log("CurrencyA to CurrencyB spread is good to go: ", CurrencyAToCurrencyBSpread);
    spread.push(CurrencyAToCurrencyBSpread);
    goodSpread.push(CurrencyAToCurrencyBSpread);
    count += 1;
    goodCount += 1;
    setTimeout(ready, 5000);
  } else {
    console.log("The spread is too small. CurrencyA to CurrencyB is: ", CurrencyAToCurrencyBSpread, " and CurrencyB to CurrencyA is: ", CurrencyBToCurrencyASpread);
    count += 1;
    if(typeof(CurrencyAToCurrencyCurrencyBSpread) == "number" && typeof(CurrencyBToCurrencyASpread) == "number") {
      if(CurrencyAToCurrencyBSpread < CurrencyBToCurrencyASpread) {
        spread.push(CurrencyBToCurrencyASpread);
      } else {
        spread.push(CurrencyAToCurrencyBSpread);
      }
    } else {
      console.log("CurrencyAPI lag on start")
    }
    setTimeout(ready, 5000);
  }
}
function dailyCurrencyAvg() {
  let avgSpread = 0;
  for(let i = 0; i < spread.length; i++) {
    avgSpread += spread[i];
  }
  avgSpread = ((avgSpread / count) - 1) * 100;
  console.log("The average spread in the past day has been ", avgSpread, "%");
  let percentage = 0;
  percentage = goodCount/count * 100;
  console.log("The margin has been tradable ", percentage, "% of the time in the past day");
  setTimeout(dailyCurrencyAvg, 120000);
}
function CurrencyBtoCurrencyAUS() {
    let quantity = usCurrencyBBalance / usCurrencyA - 1;
    binance.marketSell("CurrencyBCurrencyA", quantity);
}
async function CurrencyBKoreatoUS() {
  try {
    await bithumb.btcWithdrawl((koreanCurrencyBBalance - (1 / usCurrencyB)), "address", "key", "CurrencyB");
  } catch(err) {
    console.log("Korean CurrencyB withdraw failed")
  }
}
function CurrencyBUStoKorea() {
    let quantity = usCurrencyBBalance / usCurrencyB - 1;
    binance.withdraw("CurrencyB", "address", quantity, "key");
}
async function CurrencyBtoCurrencyAKorea() {
  try {
      let quantity = koreanCurrencyBBalance / koreanCurrencyABuy - 1;
      await bithumb.marketSell("B", "CurrencyA",);
  } catch(err) {
      console.log("Korean CurrencyB to CurrencyA failed")
  }
}
function CurrencyAtoCurrencyBUS() {
  if(usCurrencyABalance > (5000 / usCurrencyA)) {
    let quantity = 5000 / usCurrencyB - 1;
    binance.marketBuy("CurrencyBCurrencyA", quantity);
  } else {
    let quantity = usCurrencyABalance / usCurrencyB - 1;
    binance.marketBuy("CurrencyBCurrencyA", quantity);
  }
}
async function CurrencyAKoreatoUS() {
  try {
    await bithumb.btcWithdrawl((koreanCurrencyABalance - (1 / usCurrencyA)), "0x9fac38bd12df93d52fdd658222c3b3884a8376c8", "", "CurrencyA");
  } catch(err) {
    console.log("I probably buttered the destination part")
  }
}
function CurrencyAUStoKorea() {
  if(usCurrencyABalance > (5000 / usCurrencyA)) {
    let quantity = 5000 / usCurrencyA - 1;
    binance.withdraw("CurrencyA", "0xfbee64a423ebe49ff216474cca17be5681a824c6", quantity);
  } else {
    let quantity = usCurrencyABalance / usCurrencyA - 1;
    binance.withdraw("CurrencyA", "0xfbee64a423ebe49ff216474cca17be5681a824c6", quantity);
  }
}
async function CurrencyAtoCurrencyBKorea() {
  try {
      await bithumb.marketSell("CurrencyB", "CurrencyA",);
  } catch(err) {
      console.log("Korean CurrencyA to CurrencyB failed")
  }
}
ready();
setTimeout(dailyCurrencyAvg, 120000)
