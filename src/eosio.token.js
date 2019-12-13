const assert = require('assert')

module.exports = class EosioToken {

  constructor (value, decimal = 4, symbol = 'UOS') {
    let num = Number(parseFloat(value))

    assert.ok(!Number.isNaN(num), "Unexpected value")

    if (Number.isSafeInteger(num) && String(value).indexOf('.') === -1) {
      this.value = Number(num / Math.pow(10, decimal) ).toFixed(decimal)
    } else {
      this.value = num
    }

    this.decimal = decimal
    this.symbol = symbol
    this.format = new Intl.NumberFormat('en-US',{minimumFractionDigits: decimal, maximumFractionDigits: decimal})


  }

  toString () {
    return this.format.format(this.value) + ' ' + this.symbol
  }

}
