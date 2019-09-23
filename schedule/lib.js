const moment = require('moment');
moment.locale('ko');

/**
 * get random
 * @param { Integer } min
 * @param { Integer } max
 * @param { Integer } num
 */
function getRandom(min, max, num) {
  let randomResult = [];
  let randomList = [];
  for (let i = min; i <= max; i++) {
    randomList.push(i);
  }
  for (let i = 0; i < (num || 1); i++) {
    let randomNumber = Math.floor(Math.random() * randomList.length);
    randomResult.push(randomList[randomNumber]);
    randomList.splice(randomNumber, 1);
  }
  return randomResult.length === 1 ? randomResult[0] : randomResult;
}

/**
 * string to date
 * @param { String } str
 */
function strToDate(str) {
  const result = str
    .split(' ')
    .map((data, i) => {
      return data.slice(0, -1);
    })
    .join('-');
  return moment(result, 'YYYY-MM-DD')
    .tz('Asia/Seoul')
    .format();
}

/**
 * object deep compare
 */
function deepCompare() {
  var i, l, leftChain, rightChain;

  function compare2Objects(x, y) {
    var p;

    if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
      return true;
    }

    if (x === y) {
      return true;
    }

    if (
      (typeof x === 'function' && typeof y === 'function') ||
      (x instanceof Date && y instanceof Date) ||
      (x instanceof RegExp && y instanceof RegExp) ||
      (x instanceof String && y instanceof String) ||
      (x instanceof Number && y instanceof Number)
    ) {
      return x.toString() === y.toString();
    }

    // At last checking prototypes as good as we can
    if (!(x instanceof Object && y instanceof Object)) {
      return false;
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
      return false;
    }

    if (x.constructor !== y.constructor) {
      return false;
    }

    if (x.prototype !== y.prototype) {
      return false;
    }

    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
      return false;
    }

    for (p in y) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        return false;
      } else if (typeof y[p] !== typeof x[p]) {
        return false;
      }
    }

    for (p in x) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        return false;
      } else if (typeof y[p] !== typeof x[p]) {
        return false;
      }

      switch (typeof x[p]) {
        case 'object':
        case 'function':
          leftChain.push(x);
          rightChain.push(y);

          if (!compare2Objects(x[p], y[p])) {
            return false;
          }

          leftChain.pop();
          rightChain.pop();
          break;

        default:
          if (x[p] !== y[p]) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  if (arguments.length < 1) {
    return true;
  }

  for (i = 1, l = arguments.length; i < l; i++) {
    leftChain = [];
    rightChain = [];

    if (!compare2Objects(arguments[0], arguments[i])) {
      return false;
    }
  }

  return true;
}

/**
 * object is undefined to null
 * @param { Object } obj
 */
function undefinedToNull(obj) {
  return Object.keys(obj).reduce((newObj, k) => {
    if (typeof obj[k] === 'object' && obj[k] instanceof Object) {
      Object.assign(newObj, { [k]: undefinedToNull(obj[k]) });
    } else {
      Object.assign(newObj, { [k]: obj[k] === undefined ? null : obj[k] });
    }
    return newObj;
  }, {});
}

/**
 * object key remove
 * @param { Object } obj
 * @param { Array } prop
 */
function objectKeyRemove(obj, prop) {
  return Object.keys(obj).reduce((newObj, key) => {
    if (!prop.includes(key)) {
      newObj[key] = obj[key];
    }
    return newObj;
  }, {});
}

/**
 * object key add
 * @param { Object } obj
 * @param { Array } prop
 */
function objectKeyAdd(obj, prop) {
  return Object.keys(obj).reduce((newObj, key) => {
    if (prop.includes(key)) {
      newObj[key] = obj[key];
    }
    return newObj;
  }, {});
}

/**
 * get cron rule
 */
function getCronRule() {
  /*
    #Cron-style Scheduling
      '* * * * * *'
      second (0 - 59, OPTIONAL)
      minute (0 - 59)
      hour (0 - 23)
      day of month (1 - 31)
      month (1 - 12)
      day of week (0 - 7) (0 or 7 is Sun)
  */
  //실제 적용할 크론 룰 (매일 00시 ~ 05시 사이 랜덤으로 분 초 적용)
  let rule = [getRandom(0, 59), getRandom(0, 59), getRandom(0, 4), '*', '*', '*'].join(' ');
  console.log('[CRON] rule:', rule);
  return rule;
}

module.exports = {
  getRandom,
  strToDate,
  deepCompare,
  undefinedToNull,
  objectKeyRemove,
  objectKeyAdd,
  getCronRule
};
