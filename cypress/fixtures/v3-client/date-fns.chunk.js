(self["webpackChunk_padloc_pwa"] = self["webpackChunk_padloc_pwa"] || []).push([["date-fns"],{

/***/ "../app/node_modules/date-fns/_lib/getTimezoneOffsetInMilliseconds/index.js":
/*!**********************************************************************************!*\
  !*** ../app/node_modules/date-fns/_lib/getTimezoneOffsetInMilliseconds/index.js ***!
  \**********************************************************************************/
/***/ ((module) => {

var MILLISECONDS_IN_MINUTE = 60000

/**
 * Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
 * They usually appear for dates that denote time before the timezones were introduced
 * (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
 * and GMT+01:00:00 after that date)
 *
 * Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
 * which would lead to incorrect calculations.
 *
 * This function returns the timezone offset in milliseconds that takes seconds in account.
 */
module.exports = function getTimezoneOffsetInMilliseconds (dirtyDate) {
  var date = new Date(dirtyDate.getTime())
  var baseTimezoneOffset = date.getTimezoneOffset()
  date.setSeconds(0, 0)
  var millisecondsPartOfTimezoneOffset = date.getTime() % MILLISECONDS_IN_MINUTE

  return baseTimezoneOffset * MILLISECONDS_IN_MINUTE + millisecondsPartOfTimezoneOffset
}


/***/ }),

/***/ "../app/node_modules/date-fns/add_days/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/add_days/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Day Helpers
 * @summary Add the specified number of days to the given date.
 *
 * @description
 * Add the specified number of days to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of days to be added
 * @returns {Date} the new date with the days added
 *
 * @example
 * // Add 10 days to 1 September 2014:
 * var result = addDays(new Date(2014, 8, 1), 10)
 * //=> Thu Sep 11 2014 00:00:00
 */
function addDays (dirtyDate, dirtyAmount) {
  var date = parse(dirtyDate)
  var amount = Number(dirtyAmount)
  date.setDate(date.getDate() + amount)
  return date
}

module.exports = addDays


/***/ }),

/***/ "../app/node_modules/date-fns/add_hours/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/add_hours/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addMilliseconds = __webpack_require__(/*! ../add_milliseconds/index.js */ "../app/node_modules/date-fns/add_milliseconds/index.js")

var MILLISECONDS_IN_HOUR = 3600000

/**
 * @category Hour Helpers
 * @summary Add the specified number of hours to the given date.
 *
 * @description
 * Add the specified number of hours to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of hours to be added
 * @returns {Date} the new date with the hours added
 *
 * @example
 * // Add 2 hours to 10 July 2014 23:00:00:
 * var result = addHours(new Date(2014, 6, 10, 23, 0), 2)
 * //=> Fri Jul 11 2014 01:00:00
 */
function addHours (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addMilliseconds(dirtyDate, amount * MILLISECONDS_IN_HOUR)
}

module.exports = addHours


/***/ }),

/***/ "../app/node_modules/date-fns/add_iso_years/index.js":
/*!***********************************************************!*\
  !*** ../app/node_modules/date-fns/add_iso_years/index.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getISOYear = __webpack_require__(/*! ../get_iso_year/index.js */ "../app/node_modules/date-fns/get_iso_year/index.js")
var setISOYear = __webpack_require__(/*! ../set_iso_year/index.js */ "../app/node_modules/date-fns/set_iso_year/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Add the specified number of ISO week-numbering years to the given date.
 *
 * @description
 * Add the specified number of ISO week-numbering years to the given date.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of ISO week-numbering years to be added
 * @returns {Date} the new date with the ISO week-numbering years added
 *
 * @example
 * // Add 5 ISO week-numbering years to 2 July 2010:
 * var result = addISOYears(new Date(2010, 6, 2), 5)
 * //=> Fri Jun 26 2015 00:00:00
 */
function addISOYears (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return setISOYear(dirtyDate, getISOYear(dirtyDate) + amount)
}

module.exports = addISOYears


/***/ }),

/***/ "../app/node_modules/date-fns/add_milliseconds/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/add_milliseconds/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Millisecond Helpers
 * @summary Add the specified number of milliseconds to the given date.
 *
 * @description
 * Add the specified number of milliseconds to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of milliseconds to be added
 * @returns {Date} the new date with the milliseconds added
 *
 * @example
 * // Add 750 milliseconds to 10 July 2014 12:45:30.000:
 * var result = addMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
 * //=> Thu Jul 10 2014 12:45:30.750
 */
function addMilliseconds (dirtyDate, dirtyAmount) {
  var timestamp = parse(dirtyDate).getTime()
  var amount = Number(dirtyAmount)
  return new Date(timestamp + amount)
}

module.exports = addMilliseconds


/***/ }),

/***/ "../app/node_modules/date-fns/add_minutes/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/add_minutes/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addMilliseconds = __webpack_require__(/*! ../add_milliseconds/index.js */ "../app/node_modules/date-fns/add_milliseconds/index.js")

var MILLISECONDS_IN_MINUTE = 60000

/**
 * @category Minute Helpers
 * @summary Add the specified number of minutes to the given date.
 *
 * @description
 * Add the specified number of minutes to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of minutes to be added
 * @returns {Date} the new date with the minutes added
 *
 * @example
 * // Add 30 minutes to 10 July 2014 12:00:00:
 * var result = addMinutes(new Date(2014, 6, 10, 12, 0), 30)
 * //=> Thu Jul 10 2014 12:30:00
 */
function addMinutes (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addMilliseconds(dirtyDate, amount * MILLISECONDS_IN_MINUTE)
}

module.exports = addMinutes


/***/ }),

/***/ "../app/node_modules/date-fns/add_months/index.js":
/*!********************************************************!*\
  !*** ../app/node_modules/date-fns/add_months/index.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var getDaysInMonth = __webpack_require__(/*! ../get_days_in_month/index.js */ "../app/node_modules/date-fns/get_days_in_month/index.js")

/**
 * @category Month Helpers
 * @summary Add the specified number of months to the given date.
 *
 * @description
 * Add the specified number of months to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of months to be added
 * @returns {Date} the new date with the months added
 *
 * @example
 * // Add 5 months to 1 September 2014:
 * var result = addMonths(new Date(2014, 8, 1), 5)
 * //=> Sun Feb 01 2015 00:00:00
 */
function addMonths (dirtyDate, dirtyAmount) {
  var date = parse(dirtyDate)
  var amount = Number(dirtyAmount)
  var desiredMonth = date.getMonth() + amount
  var dateWithDesiredMonth = new Date(0)
  dateWithDesiredMonth.setFullYear(date.getFullYear(), desiredMonth, 1)
  dateWithDesiredMonth.setHours(0, 0, 0, 0)
  var daysInMonth = getDaysInMonth(dateWithDesiredMonth)
  // Set the last day of the new month
  // if the original date was the last day of the longer month
  date.setMonth(desiredMonth, Math.min(daysInMonth, date.getDate()))
  return date
}

module.exports = addMonths


/***/ }),

/***/ "../app/node_modules/date-fns/add_quarters/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/add_quarters/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addMonths = __webpack_require__(/*! ../add_months/index.js */ "../app/node_modules/date-fns/add_months/index.js")

/**
 * @category Quarter Helpers
 * @summary Add the specified number of year quarters to the given date.
 *
 * @description
 * Add the specified number of year quarters to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of quarters to be added
 * @returns {Date} the new date with the quarters added
 *
 * @example
 * // Add 1 quarter to 1 September 2014:
 * var result = addQuarters(new Date(2014, 8, 1), 1)
 * //=> Mon Dec 01 2014 00:00:00
 */
function addQuarters (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  var months = amount * 3
  return addMonths(dirtyDate, months)
}

module.exports = addQuarters


/***/ }),

/***/ "../app/node_modules/date-fns/add_seconds/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/add_seconds/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addMilliseconds = __webpack_require__(/*! ../add_milliseconds/index.js */ "../app/node_modules/date-fns/add_milliseconds/index.js")

/**
 * @category Second Helpers
 * @summary Add the specified number of seconds to the given date.
 *
 * @description
 * Add the specified number of seconds to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of seconds to be added
 * @returns {Date} the new date with the seconds added
 *
 * @example
 * // Add 30 seconds to 10 July 2014 12:45:00:
 * var result = addSeconds(new Date(2014, 6, 10, 12, 45, 0), 30)
 * //=> Thu Jul 10 2014 12:45:30
 */
function addSeconds (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addMilliseconds(dirtyDate, amount * 1000)
}

module.exports = addSeconds


/***/ }),

/***/ "../app/node_modules/date-fns/add_weeks/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/add_weeks/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addDays = __webpack_require__(/*! ../add_days/index.js */ "../app/node_modules/date-fns/add_days/index.js")

/**
 * @category Week Helpers
 * @summary Add the specified number of weeks to the given date.
 *
 * @description
 * Add the specified number of week to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of weeks to be added
 * @returns {Date} the new date with the weeks added
 *
 * @example
 * // Add 4 weeks to 1 September 2014:
 * var result = addWeeks(new Date(2014, 8, 1), 4)
 * //=> Mon Sep 29 2014 00:00:00
 */
function addWeeks (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  var days = amount * 7
  return addDays(dirtyDate, days)
}

module.exports = addWeeks


/***/ }),

/***/ "../app/node_modules/date-fns/add_years/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/add_years/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addMonths = __webpack_require__(/*! ../add_months/index.js */ "../app/node_modules/date-fns/add_months/index.js")

/**
 * @category Year Helpers
 * @summary Add the specified number of years to the given date.
 *
 * @description
 * Add the specified number of years to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of years to be added
 * @returns {Date} the new date with the years added
 *
 * @example
 * // Add 5 years to 1 September 2014:
 * var result = addYears(new Date(2014, 8, 1), 5)
 * //=> Sun Sep 01 2019 00:00:00
 */
function addYears (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addMonths(dirtyDate, amount * 12)
}

module.exports = addYears


/***/ }),

/***/ "../app/node_modules/date-fns/are_ranges_overlapping/index.js":
/*!********************************************************************!*\
  !*** ../app/node_modules/date-fns/are_ranges_overlapping/index.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Range Helpers
 * @summary Is the given date range overlapping with another date range?
 *
 * @description
 * Is the given date range overlapping with another date range?
 *
 * @param {Date|String|Number} initialRangeStartDate - the start of the initial range
 * @param {Date|String|Number} initialRangeEndDate - the end of the initial range
 * @param {Date|String|Number} comparedRangeStartDate - the start of the range to compare it with
 * @param {Date|String|Number} comparedRangeEndDate - the end of the range to compare it with
 * @returns {Boolean} whether the date ranges are overlapping
 * @throws {Error} startDate of a date range cannot be after its endDate
 *
 * @example
 * // For overlapping date ranges:
 * areRangesOverlapping(
 *   new Date(2014, 0, 10), new Date(2014, 0, 20), new Date(2014, 0, 17), new Date(2014, 0, 21)
 * )
 * //=> true
 *
 * @example
 * // For non-overlapping date ranges:
 * areRangesOverlapping(
 *   new Date(2014, 0, 10), new Date(2014, 0, 20), new Date(2014, 0, 21), new Date(2014, 0, 22)
 * )
 * //=> false
 */
function areRangesOverlapping (dirtyInitialRangeStartDate, dirtyInitialRangeEndDate, dirtyComparedRangeStartDate, dirtyComparedRangeEndDate) {
  var initialStartTime = parse(dirtyInitialRangeStartDate).getTime()
  var initialEndTime = parse(dirtyInitialRangeEndDate).getTime()
  var comparedStartTime = parse(dirtyComparedRangeStartDate).getTime()
  var comparedEndTime = parse(dirtyComparedRangeEndDate).getTime()

  if (initialStartTime > initialEndTime || comparedStartTime > comparedEndTime) {
    throw new Error('The start of the range cannot be after the end of the range')
  }

  return initialStartTime < comparedEndTime && comparedStartTime < initialEndTime
}

module.exports = areRangesOverlapping


/***/ }),

/***/ "../app/node_modules/date-fns/closest_index_to/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/closest_index_to/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Return an index of the closest date from the array comparing to the given date.
 *
 * @description
 * Return an index of the closest date from the array comparing to the given date.
 *
 * @param {Date|String|Number} dateToCompare - the date to compare with
 * @param {Date[]|String[]|Number[]} datesArray - the array to search
 * @returns {Number} an index of the date closest to the given date
 * @throws {TypeError} the second argument must be an instance of Array
 *
 * @example
 * // Which date is closer to 6 September 2015?
 * var dateToCompare = new Date(2015, 8, 6)
 * var datesArray = [
 *   new Date(2015, 0, 1),
 *   new Date(2016, 0, 1),
 *   new Date(2017, 0, 1)
 * ]
 * var result = closestIndexTo(dateToCompare, datesArray)
 * //=> 1
 */
function closestIndexTo (dirtyDateToCompare, dirtyDatesArray) {
  if (!(dirtyDatesArray instanceof Array)) {
    throw new TypeError(toString.call(dirtyDatesArray) + ' is not an instance of Array')
  }

  var dateToCompare = parse(dirtyDateToCompare)
  var timeToCompare = dateToCompare.getTime()

  var result
  var minDistance

  dirtyDatesArray.forEach(function (dirtyDate, index) {
    var currentDate = parse(dirtyDate)
    var distance = Math.abs(timeToCompare - currentDate.getTime())
    if (result === undefined || distance < minDistance) {
      result = index
      minDistance = distance
    }
  })

  return result
}

module.exports = closestIndexTo


/***/ }),

/***/ "../app/node_modules/date-fns/closest_to/index.js":
/*!********************************************************!*\
  !*** ../app/node_modules/date-fns/closest_to/index.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Return a date from the array closest to the given date.
 *
 * @description
 * Return a date from the array closest to the given date.
 *
 * @param {Date|String|Number} dateToCompare - the date to compare with
 * @param {Date[]|String[]|Number[]} datesArray - the array to search
 * @returns {Date} the date from the array closest to the given date
 * @throws {TypeError} the second argument must be an instance of Array
 *
 * @example
 * // Which date is closer to 6 September 2015: 1 January 2000 or 1 January 2030?
 * var dateToCompare = new Date(2015, 8, 6)
 * var result = closestTo(dateToCompare, [
 *   new Date(2000, 0, 1),
 *   new Date(2030, 0, 1)
 * ])
 * //=> Tue Jan 01 2030 00:00:00
 */
function closestTo (dirtyDateToCompare, dirtyDatesArray) {
  if (!(dirtyDatesArray instanceof Array)) {
    throw new TypeError(toString.call(dirtyDatesArray) + ' is not an instance of Array')
  }

  var dateToCompare = parse(dirtyDateToCompare)
  var timeToCompare = dateToCompare.getTime()

  var result
  var minDistance

  dirtyDatesArray.forEach(function (dirtyDate) {
    var currentDate = parse(dirtyDate)
    var distance = Math.abs(timeToCompare - currentDate.getTime())
    if (result === undefined || distance < minDistance) {
      result = currentDate
      minDistance = distance
    }
  })

  return result
}

module.exports = closestTo


/***/ }),

/***/ "../app/node_modules/date-fns/compare_asc/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/compare_asc/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Compare the two dates and return -1, 0 or 1.
 *
 * @description
 * Compare the two dates and return 1 if the first date is after the second,
 * -1 if the first date is before the second or 0 if dates are equal.
 *
 * @param {Date|String|Number} dateLeft - the first date to compare
 * @param {Date|String|Number} dateRight - the second date to compare
 * @returns {Number} the result of the comparison
 *
 * @example
 * // Compare 11 February 1987 and 10 July 1989:
 * var result = compareAsc(
 *   new Date(1987, 1, 11),
 *   new Date(1989, 6, 10)
 * )
 * //=> -1
 *
 * @example
 * // Sort the array of dates:
 * var result = [
 *   new Date(1995, 6, 2),
 *   new Date(1987, 1, 11),
 *   new Date(1989, 6, 10)
 * ].sort(compareAsc)
 * //=> [
 * //   Wed Feb 11 1987 00:00:00,
 * //   Mon Jul 10 1989 00:00:00,
 * //   Sun Jul 02 1995 00:00:00
 * // ]
 */
function compareAsc (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var timeLeft = dateLeft.getTime()
  var dateRight = parse(dirtyDateRight)
  var timeRight = dateRight.getTime()

  if (timeLeft < timeRight) {
    return -1
  } else if (timeLeft > timeRight) {
    return 1
  } else {
    return 0
  }
}

module.exports = compareAsc


/***/ }),

/***/ "../app/node_modules/date-fns/compare_desc/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/compare_desc/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Compare the two dates reverse chronologically and return -1, 0 or 1.
 *
 * @description
 * Compare the two dates and return -1 if the first date is after the second,
 * 1 if the first date is before the second or 0 if dates are equal.
 *
 * @param {Date|String|Number} dateLeft - the first date to compare
 * @param {Date|String|Number} dateRight - the second date to compare
 * @returns {Number} the result of the comparison
 *
 * @example
 * // Compare 11 February 1987 and 10 July 1989 reverse chronologically:
 * var result = compareDesc(
 *   new Date(1987, 1, 11),
 *   new Date(1989, 6, 10)
 * )
 * //=> 1
 *
 * @example
 * // Sort the array of dates in reverse chronological order:
 * var result = [
 *   new Date(1995, 6, 2),
 *   new Date(1987, 1, 11),
 *   new Date(1989, 6, 10)
 * ].sort(compareDesc)
 * //=> [
 * //   Sun Jul 02 1995 00:00:00,
 * //   Mon Jul 10 1989 00:00:00,
 * //   Wed Feb 11 1987 00:00:00
 * // ]
 */
function compareDesc (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var timeLeft = dateLeft.getTime()
  var dateRight = parse(dirtyDateRight)
  var timeRight = dateRight.getTime()

  if (timeLeft > timeRight) {
    return -1
  } else if (timeLeft < timeRight) {
    return 1
  } else {
    return 0
  }
}

module.exports = compareDesc


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_calendar_days/index.js":
/*!*************************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_calendar_days/index.js ***!
  \*************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfDay = __webpack_require__(/*! ../start_of_day/index.js */ "../app/node_modules/date-fns/start_of_day/index.js")

var MILLISECONDS_IN_MINUTE = 60000
var MILLISECONDS_IN_DAY = 86400000

/**
 * @category Day Helpers
 * @summary Get the number of calendar days between the given dates.
 *
 * @description
 * Get the number of calendar days between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of calendar days
 *
 * @example
 * // How many calendar days are between
 * // 2 July 2011 23:00:00 and 2 July 2012 00:00:00?
 * var result = differenceInCalendarDays(
 *   new Date(2012, 6, 2, 0, 0),
 *   new Date(2011, 6, 2, 23, 0)
 * )
 * //=> 366
 */
function differenceInCalendarDays (dirtyDateLeft, dirtyDateRight) {
  var startOfDayLeft = startOfDay(dirtyDateLeft)
  var startOfDayRight = startOfDay(dirtyDateRight)

  var timestampLeft = startOfDayLeft.getTime() -
    startOfDayLeft.getTimezoneOffset() * MILLISECONDS_IN_MINUTE
  var timestampRight = startOfDayRight.getTime() -
    startOfDayRight.getTimezoneOffset() * MILLISECONDS_IN_MINUTE

  // Round the number of days to the nearest integer
  // because the number of milliseconds in a day is not constant
  // (e.g. it's different in the day of the daylight saving time clock shift)
  return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_DAY)
}

module.exports = differenceInCalendarDays


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_calendar_iso_weeks/index.js":
/*!******************************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_calendar_iso_weeks/index.js ***!
  \******************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfISOWeek = __webpack_require__(/*! ../start_of_iso_week/index.js */ "../app/node_modules/date-fns/start_of_iso_week/index.js")

var MILLISECONDS_IN_MINUTE = 60000
var MILLISECONDS_IN_WEEK = 604800000

/**
 * @category ISO Week Helpers
 * @summary Get the number of calendar ISO weeks between the given dates.
 *
 * @description
 * Get the number of calendar ISO weeks between the given dates.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of calendar ISO weeks
 *
 * @example
 * // How many calendar ISO weeks are between 6 July 2014 and 21 July 2014?
 * var result = differenceInCalendarISOWeeks(
 *   new Date(2014, 6, 21),
 *   new Date(2014, 6, 6)
 * )
 * //=> 3
 */
function differenceInCalendarISOWeeks (dirtyDateLeft, dirtyDateRight) {
  var startOfISOWeekLeft = startOfISOWeek(dirtyDateLeft)
  var startOfISOWeekRight = startOfISOWeek(dirtyDateRight)

  var timestampLeft = startOfISOWeekLeft.getTime() -
    startOfISOWeekLeft.getTimezoneOffset() * MILLISECONDS_IN_MINUTE
  var timestampRight = startOfISOWeekRight.getTime() -
    startOfISOWeekRight.getTimezoneOffset() * MILLISECONDS_IN_MINUTE

  // Round the number of days to the nearest integer
  // because the number of milliseconds in a week is not constant
  // (e.g. it's different in the week of the daylight saving time clock shift)
  return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_WEEK)
}

module.exports = differenceInCalendarISOWeeks


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_calendar_iso_years/index.js":
/*!******************************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_calendar_iso_years/index.js ***!
  \******************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getISOYear = __webpack_require__(/*! ../get_iso_year/index.js */ "../app/node_modules/date-fns/get_iso_year/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Get the number of calendar ISO week-numbering years between the given dates.
 *
 * @description
 * Get the number of calendar ISO week-numbering years between the given dates.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of calendar ISO week-numbering years
 *
 * @example
 * // How many calendar ISO week-numbering years are 1 January 2010 and 1 January 2012?
 * var result = differenceInCalendarISOYears(
 *   new Date(2012, 0, 1),
 *   new Date(2010, 0, 1)
 * )
 * //=> 2
 */
function differenceInCalendarISOYears (dirtyDateLeft, dirtyDateRight) {
  return getISOYear(dirtyDateLeft) - getISOYear(dirtyDateRight)
}

module.exports = differenceInCalendarISOYears


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_calendar_months/index.js":
/*!***************************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_calendar_months/index.js ***!
  \***************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Month Helpers
 * @summary Get the number of calendar months between the given dates.
 *
 * @description
 * Get the number of calendar months between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of calendar months
 *
 * @example
 * // How many calendar months are between 31 January 2014 and 1 September 2014?
 * var result = differenceInCalendarMonths(
 *   new Date(2014, 8, 1),
 *   new Date(2014, 0, 31)
 * )
 * //=> 8
 */
function differenceInCalendarMonths (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var dateRight = parse(dirtyDateRight)

  var yearDiff = dateLeft.getFullYear() - dateRight.getFullYear()
  var monthDiff = dateLeft.getMonth() - dateRight.getMonth()

  return yearDiff * 12 + monthDiff
}

module.exports = differenceInCalendarMonths


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_calendar_quarters/index.js":
/*!*****************************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_calendar_quarters/index.js ***!
  \*****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getQuarter = __webpack_require__(/*! ../get_quarter/index.js */ "../app/node_modules/date-fns/get_quarter/index.js")
var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Quarter Helpers
 * @summary Get the number of calendar quarters between the given dates.
 *
 * @description
 * Get the number of calendar quarters between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of calendar quarters
 *
 * @example
 * // How many calendar quarters are between 31 December 2013 and 2 July 2014?
 * var result = differenceInCalendarQuarters(
 *   new Date(2014, 6, 2),
 *   new Date(2013, 11, 31)
 * )
 * //=> 3
 */
function differenceInCalendarQuarters (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var dateRight = parse(dirtyDateRight)

  var yearDiff = dateLeft.getFullYear() - dateRight.getFullYear()
  var quarterDiff = getQuarter(dateLeft) - getQuarter(dateRight)

  return yearDiff * 4 + quarterDiff
}

module.exports = differenceInCalendarQuarters


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_calendar_weeks/index.js":
/*!**************************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_calendar_weeks/index.js ***!
  \**************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfWeek = __webpack_require__(/*! ../start_of_week/index.js */ "../app/node_modules/date-fns/start_of_week/index.js")

var MILLISECONDS_IN_MINUTE = 60000
var MILLISECONDS_IN_WEEK = 604800000

/**
 * @category Week Helpers
 * @summary Get the number of calendar weeks between the given dates.
 *
 * @description
 * Get the number of calendar weeks between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @param {Object} [options] - the object with options
 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
 * @returns {Number} the number of calendar weeks
 *
 * @example
 * // How many calendar weeks are between 5 July 2014 and 20 July 2014?
 * var result = differenceInCalendarWeeks(
 *   new Date(2014, 6, 20),
 *   new Date(2014, 6, 5)
 * )
 * //=> 3
 *
 * @example
 * // If the week starts on Monday,
 * // how many calendar weeks are between 5 July 2014 and 20 July 2014?
 * var result = differenceInCalendarWeeks(
 *   new Date(2014, 6, 20),
 *   new Date(2014, 6, 5),
 *   {weekStartsOn: 1}
 * )
 * //=> 2
 */
function differenceInCalendarWeeks (dirtyDateLeft, dirtyDateRight, dirtyOptions) {
  var startOfWeekLeft = startOfWeek(dirtyDateLeft, dirtyOptions)
  var startOfWeekRight = startOfWeek(dirtyDateRight, dirtyOptions)

  var timestampLeft = startOfWeekLeft.getTime() -
    startOfWeekLeft.getTimezoneOffset() * MILLISECONDS_IN_MINUTE
  var timestampRight = startOfWeekRight.getTime() -
    startOfWeekRight.getTimezoneOffset() * MILLISECONDS_IN_MINUTE

  // Round the number of days to the nearest integer
  // because the number of milliseconds in a week is not constant
  // (e.g. it's different in the week of the daylight saving time clock shift)
  return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_WEEK)
}

module.exports = differenceInCalendarWeeks


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_calendar_years/index.js":
/*!**************************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_calendar_years/index.js ***!
  \**************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Year Helpers
 * @summary Get the number of calendar years between the given dates.
 *
 * @description
 * Get the number of calendar years between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of calendar years
 *
 * @example
 * // How many calendar years are between 31 December 2013 and 11 February 2015?
 * var result = differenceInCalendarYears(
 *   new Date(2015, 1, 11),
 *   new Date(2013, 11, 31)
 * )
 * //=> 2
 */
function differenceInCalendarYears (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var dateRight = parse(dirtyDateRight)

  return dateLeft.getFullYear() - dateRight.getFullYear()
}

module.exports = differenceInCalendarYears


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_days/index.js":
/*!****************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_days/index.js ***!
  \****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var differenceInCalendarDays = __webpack_require__(/*! ../difference_in_calendar_days/index.js */ "../app/node_modules/date-fns/difference_in_calendar_days/index.js")
var compareAsc = __webpack_require__(/*! ../compare_asc/index.js */ "../app/node_modules/date-fns/compare_asc/index.js")

/**
 * @category Day Helpers
 * @summary Get the number of full days between the given dates.
 *
 * @description
 * Get the number of full days between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of full days
 *
 * @example
 * // How many full days are between
 * // 2 July 2011 23:00:00 and 2 July 2012 00:00:00?
 * var result = differenceInDays(
 *   new Date(2012, 6, 2, 0, 0),
 *   new Date(2011, 6, 2, 23, 0)
 * )
 * //=> 365
 */
function differenceInDays (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var dateRight = parse(dirtyDateRight)

  var sign = compareAsc(dateLeft, dateRight)
  var difference = Math.abs(differenceInCalendarDays(dateLeft, dateRight))
  dateLeft.setDate(dateLeft.getDate() - sign * difference)

  // Math.abs(diff in full days - diff in calendar days) === 1 if last calendar day is not full
  // If so, result must be decreased by 1 in absolute value
  var isLastDayNotFull = compareAsc(dateLeft, dateRight) === -sign
  return sign * (difference - isLastDayNotFull)
}

module.exports = differenceInDays


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_hours/index.js":
/*!*****************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_hours/index.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var differenceInMilliseconds = __webpack_require__(/*! ../difference_in_milliseconds/index.js */ "../app/node_modules/date-fns/difference_in_milliseconds/index.js")

var MILLISECONDS_IN_HOUR = 3600000

/**
 * @category Hour Helpers
 * @summary Get the number of hours between the given dates.
 *
 * @description
 * Get the number of hours between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of hours
 *
 * @example
 * // How many hours are between 2 July 2014 06:50:00 and 2 July 2014 19:00:00?
 * var result = differenceInHours(
 *   new Date(2014, 6, 2, 19, 0),
 *   new Date(2014, 6, 2, 6, 50)
 * )
 * //=> 12
 */
function differenceInHours (dirtyDateLeft, dirtyDateRight) {
  var diff = differenceInMilliseconds(dirtyDateLeft, dirtyDateRight) / MILLISECONDS_IN_HOUR
  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
}

module.exports = differenceInHours


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_iso_years/index.js":
/*!*********************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_iso_years/index.js ***!
  \*********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var differenceInCalendarISOYears = __webpack_require__(/*! ../difference_in_calendar_iso_years/index.js */ "../app/node_modules/date-fns/difference_in_calendar_iso_years/index.js")
var compareAsc = __webpack_require__(/*! ../compare_asc/index.js */ "../app/node_modules/date-fns/compare_asc/index.js")
var subISOYears = __webpack_require__(/*! ../sub_iso_years/index.js */ "../app/node_modules/date-fns/sub_iso_years/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Get the number of full ISO week-numbering years between the given dates.
 *
 * @description
 * Get the number of full ISO week-numbering years between the given dates.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of full ISO week-numbering years
 *
 * @example
 * // How many full ISO week-numbering years are between 1 January 2010 and 1 January 2012?
 * var result = differenceInISOYears(
 *   new Date(2012, 0, 1),
 *   new Date(2010, 0, 1)
 * )
 * //=> 1
 */
function differenceInISOYears (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var dateRight = parse(dirtyDateRight)

  var sign = compareAsc(dateLeft, dateRight)
  var difference = Math.abs(differenceInCalendarISOYears(dateLeft, dateRight))
  dateLeft = subISOYears(dateLeft, sign * difference)

  // Math.abs(diff in full ISO years - diff in calendar ISO years) === 1
  // if last calendar ISO year is not full
  // If so, result must be decreased by 1 in absolute value
  var isLastISOYearNotFull = compareAsc(dateLeft, dateRight) === -sign
  return sign * (difference - isLastISOYearNotFull)
}

module.exports = differenceInISOYears


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_milliseconds/index.js":
/*!************************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_milliseconds/index.js ***!
  \************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Millisecond Helpers
 * @summary Get the number of milliseconds between the given dates.
 *
 * @description
 * Get the number of milliseconds between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of milliseconds
 *
 * @example
 * // How many milliseconds are between
 * // 2 July 2014 12:30:20.600 and 2 July 2014 12:30:21.700?
 * var result = differenceInMilliseconds(
 *   new Date(2014, 6, 2, 12, 30, 21, 700),
 *   new Date(2014, 6, 2, 12, 30, 20, 600)
 * )
 * //=> 1100
 */
function differenceInMilliseconds (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var dateRight = parse(dirtyDateRight)
  return dateLeft.getTime() - dateRight.getTime()
}

module.exports = differenceInMilliseconds


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_minutes/index.js":
/*!*******************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_minutes/index.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var differenceInMilliseconds = __webpack_require__(/*! ../difference_in_milliseconds/index.js */ "../app/node_modules/date-fns/difference_in_milliseconds/index.js")

var MILLISECONDS_IN_MINUTE = 60000

/**
 * @category Minute Helpers
 * @summary Get the number of minutes between the given dates.
 *
 * @description
 * Get the number of minutes between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of minutes
 *
 * @example
 * // How many minutes are between 2 July 2014 12:07:59 and 2 July 2014 12:20:00?
 * var result = differenceInMinutes(
 *   new Date(2014, 6, 2, 12, 20, 0),
 *   new Date(2014, 6, 2, 12, 7, 59)
 * )
 * //=> 12
 */
function differenceInMinutes (dirtyDateLeft, dirtyDateRight) {
  var diff = differenceInMilliseconds(dirtyDateLeft, dirtyDateRight) / MILLISECONDS_IN_MINUTE
  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
}

module.exports = differenceInMinutes


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_months/index.js":
/*!******************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_months/index.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var differenceInCalendarMonths = __webpack_require__(/*! ../difference_in_calendar_months/index.js */ "../app/node_modules/date-fns/difference_in_calendar_months/index.js")
var compareAsc = __webpack_require__(/*! ../compare_asc/index.js */ "../app/node_modules/date-fns/compare_asc/index.js")

/**
 * @category Month Helpers
 * @summary Get the number of full months between the given dates.
 *
 * @description
 * Get the number of full months between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of full months
 *
 * @example
 * // How many full months are between 31 January 2014 and 1 September 2014?
 * var result = differenceInMonths(
 *   new Date(2014, 8, 1),
 *   new Date(2014, 0, 31)
 * )
 * //=> 7
 */
function differenceInMonths (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var dateRight = parse(dirtyDateRight)

  var sign = compareAsc(dateLeft, dateRight)
  var difference = Math.abs(differenceInCalendarMonths(dateLeft, dateRight))
  dateLeft.setMonth(dateLeft.getMonth() - sign * difference)

  // Math.abs(diff in full months - diff in calendar months) === 1 if last calendar month is not full
  // If so, result must be decreased by 1 in absolute value
  var isLastMonthNotFull = compareAsc(dateLeft, dateRight) === -sign
  return sign * (difference - isLastMonthNotFull)
}

module.exports = differenceInMonths


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_quarters/index.js":
/*!********************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_quarters/index.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var differenceInMonths = __webpack_require__(/*! ../difference_in_months/index.js */ "../app/node_modules/date-fns/difference_in_months/index.js")

/**
 * @category Quarter Helpers
 * @summary Get the number of full quarters between the given dates.
 *
 * @description
 * Get the number of full quarters between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of full quarters
 *
 * @example
 * // How many full quarters are between 31 December 2013 and 2 July 2014?
 * var result = differenceInQuarters(
 *   new Date(2014, 6, 2),
 *   new Date(2013, 11, 31)
 * )
 * //=> 2
 */
function differenceInQuarters (dirtyDateLeft, dirtyDateRight) {
  var diff = differenceInMonths(dirtyDateLeft, dirtyDateRight) / 3
  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
}

module.exports = differenceInQuarters


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_seconds/index.js":
/*!*******************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_seconds/index.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var differenceInMilliseconds = __webpack_require__(/*! ../difference_in_milliseconds/index.js */ "../app/node_modules/date-fns/difference_in_milliseconds/index.js")

/**
 * @category Second Helpers
 * @summary Get the number of seconds between the given dates.
 *
 * @description
 * Get the number of seconds between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of seconds
 *
 * @example
 * // How many seconds are between
 * // 2 July 2014 12:30:07.999 and 2 July 2014 12:30:20.000?
 * var result = differenceInSeconds(
 *   new Date(2014, 6, 2, 12, 30, 20, 0),
 *   new Date(2014, 6, 2, 12, 30, 7, 999)
 * )
 * //=> 12
 */
function differenceInSeconds (dirtyDateLeft, dirtyDateRight) {
  var diff = differenceInMilliseconds(dirtyDateLeft, dirtyDateRight) / 1000
  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
}

module.exports = differenceInSeconds


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_weeks/index.js":
/*!*****************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_weeks/index.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var differenceInDays = __webpack_require__(/*! ../difference_in_days/index.js */ "../app/node_modules/date-fns/difference_in_days/index.js")

/**
 * @category Week Helpers
 * @summary Get the number of full weeks between the given dates.
 *
 * @description
 * Get the number of full weeks between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of full weeks
 *
 * @example
 * // How many full weeks are between 5 July 2014 and 20 July 2014?
 * var result = differenceInWeeks(
 *   new Date(2014, 6, 20),
 *   new Date(2014, 6, 5)
 * )
 * //=> 2
 */
function differenceInWeeks (dirtyDateLeft, dirtyDateRight) {
  var diff = differenceInDays(dirtyDateLeft, dirtyDateRight) / 7
  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
}

module.exports = differenceInWeeks


/***/ }),

/***/ "../app/node_modules/date-fns/difference_in_years/index.js":
/*!*****************************************************************!*\
  !*** ../app/node_modules/date-fns/difference_in_years/index.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var differenceInCalendarYears = __webpack_require__(/*! ../difference_in_calendar_years/index.js */ "../app/node_modules/date-fns/difference_in_calendar_years/index.js")
var compareAsc = __webpack_require__(/*! ../compare_asc/index.js */ "../app/node_modules/date-fns/compare_asc/index.js")

/**
 * @category Year Helpers
 * @summary Get the number of full years between the given dates.
 *
 * @description
 * Get the number of full years between the given dates.
 *
 * @param {Date|String|Number} dateLeft - the later date
 * @param {Date|String|Number} dateRight - the earlier date
 * @returns {Number} the number of full years
 *
 * @example
 * // How many full years are between 31 December 2013 and 11 February 2015?
 * var result = differenceInYears(
 *   new Date(2015, 1, 11),
 *   new Date(2013, 11, 31)
 * )
 * //=> 1
 */
function differenceInYears (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var dateRight = parse(dirtyDateRight)

  var sign = compareAsc(dateLeft, dateRight)
  var difference = Math.abs(differenceInCalendarYears(dateLeft, dateRight))
  dateLeft.setFullYear(dateLeft.getFullYear() - sign * difference)

  // Math.abs(diff in full years - diff in calendar years) === 1 if last calendar year is not full
  // If so, result must be decreased by 1 in absolute value
  var isLastYearNotFull = compareAsc(dateLeft, dateRight) === -sign
  return sign * (difference - isLastYearNotFull)
}

module.exports = differenceInYears


/***/ }),

/***/ "../app/node_modules/date-fns/distance_in_words/index.js":
/*!***************************************************************!*\
  !*** ../app/node_modules/date-fns/distance_in_words/index.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var compareDesc = __webpack_require__(/*! ../compare_desc/index.js */ "../app/node_modules/date-fns/compare_desc/index.js")
var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var differenceInSeconds = __webpack_require__(/*! ../difference_in_seconds/index.js */ "../app/node_modules/date-fns/difference_in_seconds/index.js")
var differenceInMonths = __webpack_require__(/*! ../difference_in_months/index.js */ "../app/node_modules/date-fns/difference_in_months/index.js")
var enLocale = __webpack_require__(/*! ../locale/en/index.js */ "../app/node_modules/date-fns/locale/en/index.js")

var MINUTES_IN_DAY = 1440
var MINUTES_IN_ALMOST_TWO_DAYS = 2520
var MINUTES_IN_MONTH = 43200
var MINUTES_IN_TWO_MONTHS = 86400

/**
 * @category Common Helpers
 * @summary Return the distance between the given dates in words.
 *
 * @description
 * Return the distance between the given dates in words.
 *
 * | Distance between dates                                            | Result              |
 * |-------------------------------------------------------------------|---------------------|
 * | 0 ... 30 secs                                                     | less than a minute  |
 * | 30 secs ... 1 min 30 secs                                         | 1 minute            |
 * | 1 min 30 secs ... 44 mins 30 secs                                 | [2..44] minutes     |
 * | 44 mins ... 30 secs ... 89 mins 30 secs                           | about 1 hour        |
 * | 89 mins 30 secs ... 23 hrs 59 mins 30 secs                        | about [2..24] hours |
 * | 23 hrs 59 mins 30 secs ... 41 hrs 59 mins 30 secs                 | 1 day               |
 * | 41 hrs 59 mins 30 secs ... 29 days 23 hrs 59 mins 30 secs         | [2..30] days        |
 * | 29 days 23 hrs 59 mins 30 secs ... 44 days 23 hrs 59 mins 30 secs | about 1 month       |
 * | 44 days 23 hrs 59 mins 30 secs ... 59 days 23 hrs 59 mins 30 secs | about 2 months      |
 * | 59 days 23 hrs 59 mins 30 secs ... 1 yr                           | [2..12] months      |
 * | 1 yr ... 1 yr 3 months                                            | about 1 year        |
 * | 1 yr 3 months ... 1 yr 9 month s                                  | over 1 year         |
 * | 1 yr 9 months ... 2 yrs                                           | almost 2 years      |
 * | N yrs ... N yrs 3 months                                          | about N years       |
 * | N yrs 3 months ... N yrs 9 months                                 | over N years        |
 * | N yrs 9 months ... N+1 yrs                                        | almost N+1 years    |
 *
 * With `options.includeSeconds == true`:
 * | Distance between dates | Result               |
 * |------------------------|----------------------|
 * | 0 secs ... 5 secs      | less than 5 seconds  |
 * | 5 secs ... 10 secs     | less than 10 seconds |
 * | 10 secs ... 20 secs    | less than 20 seconds |
 * | 20 secs ... 40 secs    | half a minute        |
 * | 40 secs ... 60 secs    | less than a minute   |
 * | 60 secs ... 90 secs    | 1 minute             |
 *
 * @param {Date|String|Number} dateToCompare - the date to compare with
 * @param {Date|String|Number} date - the other date
 * @param {Object} [options] - the object with options
 * @param {Boolean} [options.includeSeconds=false] - distances less than a minute are more detailed
 * @param {Boolean} [options.addSuffix=false] - result indicates if the second date is earlier or later than the first
 * @param {Object} [options.locale=enLocale] - the locale object
 * @returns {String} the distance in words
 *
 * @example
 * // What is the distance between 2 July 2014 and 1 January 2015?
 * var result = distanceInWords(
 *   new Date(2014, 6, 2),
 *   new Date(2015, 0, 1)
 * )
 * //=> '6 months'
 *
 * @example
 * // What is the distance between 1 January 2015 00:00:15
 * // and 1 January 2015 00:00:00, including seconds?
 * var result = distanceInWords(
 *   new Date(2015, 0, 1, 0, 0, 15),
 *   new Date(2015, 0, 1, 0, 0, 0),
 *   {includeSeconds: true}
 * )
 * //=> 'less than 20 seconds'
 *
 * @example
 * // What is the distance from 1 January 2016
 * // to 1 January 2015, with a suffix?
 * var result = distanceInWords(
 *   new Date(2016, 0, 1),
 *   new Date(2015, 0, 1),
 *   {addSuffix: true}
 * )
 * //=> 'about 1 year ago'
 *
 * @example
 * // What is the distance between 1 August 2016 and 1 January 2015 in Esperanto?
 * var eoLocale = require('date-fns/locale/eo')
 * var result = distanceInWords(
 *   new Date(2016, 7, 1),
 *   new Date(2015, 0, 1),
 *   {locale: eoLocale}
 * )
 * //=> 'pli ol 1 jaro'
 */
function distanceInWords (dirtyDateToCompare, dirtyDate, dirtyOptions) {
  var options = dirtyOptions || {}

  var comparison = compareDesc(dirtyDateToCompare, dirtyDate)

  var locale = options.locale
  var localize = enLocale.distanceInWords.localize
  if (locale && locale.distanceInWords && locale.distanceInWords.localize) {
    localize = locale.distanceInWords.localize
  }

  var localizeOptions = {
    addSuffix: Boolean(options.addSuffix),
    comparison: comparison
  }

  var dateLeft, dateRight
  if (comparison > 0) {
    dateLeft = parse(dirtyDateToCompare)
    dateRight = parse(dirtyDate)
  } else {
    dateLeft = parse(dirtyDate)
    dateRight = parse(dirtyDateToCompare)
  }

  var seconds = differenceInSeconds(dateRight, dateLeft)
  var offset = dateRight.getTimezoneOffset() - dateLeft.getTimezoneOffset()
  var minutes = Math.round(seconds / 60) - offset
  var months

  // 0 up to 2 mins
  if (minutes < 2) {
    if (options.includeSeconds) {
      if (seconds < 5) {
        return localize('lessThanXSeconds', 5, localizeOptions)
      } else if (seconds < 10) {
        return localize('lessThanXSeconds', 10, localizeOptions)
      } else if (seconds < 20) {
        return localize('lessThanXSeconds', 20, localizeOptions)
      } else if (seconds < 40) {
        return localize('halfAMinute', null, localizeOptions)
      } else if (seconds < 60) {
        return localize('lessThanXMinutes', 1, localizeOptions)
      } else {
        return localize('xMinutes', 1, localizeOptions)
      }
    } else {
      if (minutes === 0) {
        return localize('lessThanXMinutes', 1, localizeOptions)
      } else {
        return localize('xMinutes', minutes, localizeOptions)
      }
    }

  // 2 mins up to 0.75 hrs
  } else if (minutes < 45) {
    return localize('xMinutes', minutes, localizeOptions)

  // 0.75 hrs up to 1.5 hrs
  } else if (minutes < 90) {
    return localize('aboutXHours', 1, localizeOptions)

  // 1.5 hrs up to 24 hrs
  } else if (minutes < MINUTES_IN_DAY) {
    var hours = Math.round(minutes / 60)
    return localize('aboutXHours', hours, localizeOptions)

  // 1 day up to 1.75 days
  } else if (minutes < MINUTES_IN_ALMOST_TWO_DAYS) {
    return localize('xDays', 1, localizeOptions)

  // 1.75 days up to 30 days
  } else if (minutes < MINUTES_IN_MONTH) {
    var days = Math.round(minutes / MINUTES_IN_DAY)
    return localize('xDays', days, localizeOptions)

  // 1 month up to 2 months
  } else if (minutes < MINUTES_IN_TWO_MONTHS) {
    months = Math.round(minutes / MINUTES_IN_MONTH)
    return localize('aboutXMonths', months, localizeOptions)
  }

  months = differenceInMonths(dateRight, dateLeft)

  // 2 months up to 12 months
  if (months < 12) {
    var nearestMonth = Math.round(minutes / MINUTES_IN_MONTH)
    return localize('xMonths', nearestMonth, localizeOptions)

  // 1 year up to max Date
  } else {
    var monthsSinceStartOfYear = months % 12
    var years = Math.floor(months / 12)

    // N years up to 1 years 3 months
    if (monthsSinceStartOfYear < 3) {
      return localize('aboutXYears', years, localizeOptions)

    // N years 3 months up to N years 9 months
    } else if (monthsSinceStartOfYear < 9) {
      return localize('overXYears', years, localizeOptions)

    // N years 9 months up to N year 12 months
    } else {
      return localize('almostXYears', years + 1, localizeOptions)
    }
  }
}

module.exports = distanceInWords


/***/ }),

/***/ "../app/node_modules/date-fns/distance_in_words_strict/index.js":
/*!**********************************************************************!*\
  !*** ../app/node_modules/date-fns/distance_in_words_strict/index.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var compareDesc = __webpack_require__(/*! ../compare_desc/index.js */ "../app/node_modules/date-fns/compare_desc/index.js")
var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var differenceInSeconds = __webpack_require__(/*! ../difference_in_seconds/index.js */ "../app/node_modules/date-fns/difference_in_seconds/index.js")
var enLocale = __webpack_require__(/*! ../locale/en/index.js */ "../app/node_modules/date-fns/locale/en/index.js")

var MINUTES_IN_DAY = 1440
var MINUTES_IN_MONTH = 43200
var MINUTES_IN_YEAR = 525600

/**
 * @category Common Helpers
 * @summary Return the distance between the given dates in words.
 *
 * @description
 * Return the distance between the given dates in words, using strict units.
 * This is like `distanceInWords`, but does not use helpers like 'almost', 'over',
 * 'less than' and the like.
 *
 * | Distance between dates | Result              |
 * |------------------------|---------------------|
 * | 0 ... 59 secs          | [0..59] seconds     |
 * | 1 ... 59 mins          | [1..59] minutes     |
 * | 1 ... 23 hrs           | [1..23] hours       |
 * | 1 ... 29 days          | [1..29] days        |
 * | 1 ... 11 months        | [1..11] months      |
 * | 1 ... N years          | [1..N]  years       |
 *
 * @param {Date|String|Number} dateToCompare - the date to compare with
 * @param {Date|String|Number} date - the other date
 * @param {Object} [options] - the object with options
 * @param {Boolean} [options.addSuffix=false] - result indicates if the second date is earlier or later than the first
 * @param {'s'|'m'|'h'|'d'|'M'|'Y'} [options.unit] - if specified, will force a unit
 * @param {'floor'|'ceil'|'round'} [options.partialMethod='floor'] - which way to round partial units
 * @param {Object} [options.locale=enLocale] - the locale object
 * @returns {String} the distance in words
 *
 * @example
 * // What is the distance between 2 July 2014 and 1 January 2015?
 * var result = distanceInWordsStrict(
 *   new Date(2014, 6, 2),
 *   new Date(2015, 0, 2)
 * )
 * //=> '6 months'
 *
 * @example
 * // What is the distance between 1 January 2015 00:00:15
 * // and 1 January 2015 00:00:00?
 * var result = distanceInWordsStrict(
 *   new Date(2015, 0, 1, 0, 0, 15),
 *   new Date(2015, 0, 1, 0, 0, 0),
 * )
 * //=> '15 seconds'
 *
 * @example
 * // What is the distance from 1 January 2016
 * // to 1 January 2015, with a suffix?
 * var result = distanceInWordsStrict(
 *   new Date(2016, 0, 1),
 *   new Date(2015, 0, 1),
 *   {addSuffix: true}
 * )
 * //=> '1 year ago'
 *
 * @example
 * // What is the distance from 1 January 2016
 * // to 1 January 2015, in minutes?
 * var result = distanceInWordsStrict(
 *   new Date(2016, 0, 1),
 *   new Date(2015, 0, 1),
 *   {unit: 'm'}
 * )
 * //=> '525600 minutes'
 *
 * @example
 * // What is the distance from 1 January 2016
 * // to 28 January 2015, in months, rounded up?
 * var result = distanceInWordsStrict(
 *   new Date(2015, 0, 28),
 *   new Date(2015, 0, 1),
 *   {unit: 'M', partialMethod: 'ceil'}
 * )
 * //=> '1 month'
 *
 * @example
 * // What is the distance between 1 August 2016 and 1 January 2015 in Esperanto?
 * var eoLocale = require('date-fns/locale/eo')
 * var result = distanceInWordsStrict(
 *   new Date(2016, 7, 1),
 *   new Date(2015, 0, 1),
 *   {locale: eoLocale}
 * )
 * //=> '1 jaro'
 */
function distanceInWordsStrict (dirtyDateToCompare, dirtyDate, dirtyOptions) {
  var options = dirtyOptions || {}

  var comparison = compareDesc(dirtyDateToCompare, dirtyDate)

  var locale = options.locale
  var localize = enLocale.distanceInWords.localize
  if (locale && locale.distanceInWords && locale.distanceInWords.localize) {
    localize = locale.distanceInWords.localize
  }

  var localizeOptions = {
    addSuffix: Boolean(options.addSuffix),
    comparison: comparison
  }

  var dateLeft, dateRight
  if (comparison > 0) {
    dateLeft = parse(dirtyDateToCompare)
    dateRight = parse(dirtyDate)
  } else {
    dateLeft = parse(dirtyDate)
    dateRight = parse(dirtyDateToCompare)
  }

  var unit
  var mathPartial = Math[options.partialMethod ? String(options.partialMethod) : 'floor']
  var seconds = differenceInSeconds(dateRight, dateLeft)
  var offset = dateRight.getTimezoneOffset() - dateLeft.getTimezoneOffset()
  var minutes = mathPartial(seconds / 60) - offset
  var hours, days, months, years

  if (options.unit) {
    unit = String(options.unit)
  } else {
    if (minutes < 1) {
      unit = 's'
    } else if (minutes < 60) {
      unit = 'm'
    } else if (minutes < MINUTES_IN_DAY) {
      unit = 'h'
    } else if (minutes < MINUTES_IN_MONTH) {
      unit = 'd'
    } else if (minutes < MINUTES_IN_YEAR) {
      unit = 'M'
    } else {
      unit = 'Y'
    }
  }

  // 0 up to 60 seconds
  if (unit === 's') {
    return localize('xSeconds', seconds, localizeOptions)

  // 1 up to 60 mins
  } else if (unit === 'm') {
    return localize('xMinutes', minutes, localizeOptions)

  // 1 up to 24 hours
  } else if (unit === 'h') {
    hours = mathPartial(minutes / 60)
    return localize('xHours', hours, localizeOptions)

  // 1 up to 30 days
  } else if (unit === 'd') {
    days = mathPartial(minutes / MINUTES_IN_DAY)
    return localize('xDays', days, localizeOptions)

  // 1 up to 12 months
  } else if (unit === 'M') {
    months = mathPartial(minutes / MINUTES_IN_MONTH)
    return localize('xMonths', months, localizeOptions)

  // 1 year up to max Date
  } else if (unit === 'Y') {
    years = mathPartial(minutes / MINUTES_IN_YEAR)
    return localize('xYears', years, localizeOptions)
  }

  throw new Error('Unknown unit: ' + unit)
}

module.exports = distanceInWordsStrict


/***/ }),

/***/ "../app/node_modules/date-fns/distance_in_words_to_now/index.js":
/*!**********************************************************************!*\
  !*** ../app/node_modules/date-fns/distance_in_words_to_now/index.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var distanceInWords = __webpack_require__(/*! ../distance_in_words/index.js */ "../app/node_modules/date-fns/distance_in_words/index.js")

/**
 * @category Common Helpers
 * @summary Return the distance between the given date and now in words.
 *
 * @description
 * Return the distance between the given date and now in words.
 *
 * | Distance to now                                                   | Result              |
 * |-------------------------------------------------------------------|---------------------|
 * | 0 ... 30 secs                                                     | less than a minute  |
 * | 30 secs ... 1 min 30 secs                                         | 1 minute            |
 * | 1 min 30 secs ... 44 mins 30 secs                                 | [2..44] minutes     |
 * | 44 mins ... 30 secs ... 89 mins 30 secs                           | about 1 hour        |
 * | 89 mins 30 secs ... 23 hrs 59 mins 30 secs                        | about [2..24] hours |
 * | 23 hrs 59 mins 30 secs ... 41 hrs 59 mins 30 secs                 | 1 day               |
 * | 41 hrs 59 mins 30 secs ... 29 days 23 hrs 59 mins 30 secs         | [2..30] days        |
 * | 29 days 23 hrs 59 mins 30 secs ... 44 days 23 hrs 59 mins 30 secs | about 1 month       |
 * | 44 days 23 hrs 59 mins 30 secs ... 59 days 23 hrs 59 mins 30 secs | about 2 months      |
 * | 59 days 23 hrs 59 mins 30 secs ... 1 yr                           | [2..12] months      |
 * | 1 yr ... 1 yr 3 months                                            | about 1 year        |
 * | 1 yr 3 months ... 1 yr 9 month s                                  | over 1 year         |
 * | 1 yr 9 months ... 2 yrs                                           | almost 2 years      |
 * | N yrs ... N yrs 3 months                                          | about N years       |
 * | N yrs 3 months ... N yrs 9 months                                 | over N years        |
 * | N yrs 9 months ... N+1 yrs                                        | almost N+1 years    |
 *
 * With `options.includeSeconds == true`:
 * | Distance to now     | Result               |
 * |---------------------|----------------------|
 * | 0 secs ... 5 secs   | less than 5 seconds  |
 * | 5 secs ... 10 secs  | less than 10 seconds |
 * | 10 secs ... 20 secs | less than 20 seconds |
 * | 20 secs ... 40 secs | half a minute        |
 * | 40 secs ... 60 secs | less than a minute   |
 * | 60 secs ... 90 secs | 1 minute             |
 *
 * @param {Date|String|Number} date - the given date
 * @param {Object} [options] - the object with options
 * @param {Boolean} [options.includeSeconds=false] - distances less than a minute are more detailed
 * @param {Boolean} [options.addSuffix=false] - result specifies if the second date is earlier or later than the first
 * @param {Object} [options.locale=enLocale] - the locale object
 * @returns {String} the distance in words
 *
 * @example
 * // If today is 1 January 2015, what is the distance to 2 July 2014?
 * var result = distanceInWordsToNow(
 *   new Date(2014, 6, 2)
 * )
 * //=> '6 months'
 *
 * @example
 * // If now is 1 January 2015 00:00:00,
 * // what is the distance to 1 January 2015 00:00:15, including seconds?
 * var result = distanceInWordsToNow(
 *   new Date(2015, 0, 1, 0, 0, 15),
 *   {includeSeconds: true}
 * )
 * //=> 'less than 20 seconds'
 *
 * @example
 * // If today is 1 January 2015,
 * // what is the distance to 1 January 2016, with a suffix?
 * var result = distanceInWordsToNow(
 *   new Date(2016, 0, 1),
 *   {addSuffix: true}
 * )
 * //=> 'in about 1 year'
 *
 * @example
 * // If today is 1 January 2015,
 * // what is the distance to 1 August 2016 in Esperanto?
 * var eoLocale = require('date-fns/locale/eo')
 * var result = distanceInWordsToNow(
 *   new Date(2016, 7, 1),
 *   {locale: eoLocale}
 * )
 * //=> 'pli ol 1 jaro'
 */
function distanceInWordsToNow (dirtyDate, dirtyOptions) {
  return distanceInWords(Date.now(), dirtyDate, dirtyOptions)
}

module.exports = distanceInWordsToNow


/***/ }),

/***/ "../app/node_modules/date-fns/each_day/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/each_day/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Day Helpers
 * @summary Return the array of dates within the specified range.
 *
 * @description
 * Return the array of dates within the specified range.
 *
 * @param {Date|String|Number} startDate - the first date
 * @param {Date|String|Number} endDate - the last date
 * @param {Number} [step=1] - the step between each day
 * @returns {Date[]} the array with starts of days from the day of startDate to the day of endDate
 * @throws {Error} startDate cannot be after endDate
 *
 * @example
 * // Each day between 6 October 2014 and 10 October 2014:
 * var result = eachDay(
 *   new Date(2014, 9, 6),
 *   new Date(2014, 9, 10)
 * )
 * //=> [
 * //   Mon Oct 06 2014 00:00:00,
 * //   Tue Oct 07 2014 00:00:00,
 * //   Wed Oct 08 2014 00:00:00,
 * //   Thu Oct 09 2014 00:00:00,
 * //   Fri Oct 10 2014 00:00:00
 * // ]
 */
function eachDay (dirtyStartDate, dirtyEndDate, dirtyStep) {
  var startDate = parse(dirtyStartDate)
  var endDate = parse(dirtyEndDate)
  var step = dirtyStep !== undefined ? dirtyStep : 1

  var endTime = endDate.getTime()

  if (startDate.getTime() > endTime) {
    throw new Error('The first date cannot be after the second date')
  }

  var dates = []

  var currentDate = startDate
  currentDate.setHours(0, 0, 0, 0)

  while (currentDate.getTime() <= endTime) {
    dates.push(parse(currentDate))
    currentDate.setDate(currentDate.getDate() + step)
  }

  return dates
}

module.exports = eachDay


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_day/index.js":
/*!********************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_day/index.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Day Helpers
 * @summary Return the end of a day for the given date.
 *
 * @description
 * Return the end of a day for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the end of a day
 *
 * @example
 * // The end of a day for 2 September 2014 11:55:00:
 * var result = endOfDay(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Tue Sep 02 2014 23:59:59.999
 */
function endOfDay (dirtyDate) {
  var date = parse(dirtyDate)
  date.setHours(23, 59, 59, 999)
  return date
}

module.exports = endOfDay


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_hour/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_hour/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Hour Helpers
 * @summary Return the end of an hour for the given date.
 *
 * @description
 * Return the end of an hour for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the end of an hour
 *
 * @example
 * // The end of an hour for 2 September 2014 11:55:00:
 * var result = endOfHour(new Date(2014, 8, 2, 11, 55))
 * //=> Tue Sep 02 2014 11:59:59.999
 */
function endOfHour (dirtyDate) {
  var date = parse(dirtyDate)
  date.setMinutes(59, 59, 999)
  return date
}

module.exports = endOfHour


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_iso_week/index.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_iso_week/index.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var endOfWeek = __webpack_require__(/*! ../end_of_week/index.js */ "../app/node_modules/date-fns/end_of_week/index.js")

/**
 * @category ISO Week Helpers
 * @summary Return the end of an ISO week for the given date.
 *
 * @description
 * Return the end of an ISO week for the given date.
 * The result will be in the local timezone.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the end of an ISO week
 *
 * @example
 * // The end of an ISO week for 2 September 2014 11:55:00:
 * var result = endOfISOWeek(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Sun Sep 07 2014 23:59:59.999
 */
function endOfISOWeek (dirtyDate) {
  return endOfWeek(dirtyDate, {weekStartsOn: 1})
}

module.exports = endOfISOWeek


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_iso_year/index.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_iso_year/index.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getISOYear = __webpack_require__(/*! ../get_iso_year/index.js */ "../app/node_modules/date-fns/get_iso_year/index.js")
var startOfISOWeek = __webpack_require__(/*! ../start_of_iso_week/index.js */ "../app/node_modules/date-fns/start_of_iso_week/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Return the end of an ISO week-numbering year for the given date.
 *
 * @description
 * Return the end of an ISO week-numbering year,
 * which always starts 3 days before the year's first Thursday.
 * The result will be in the local timezone.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the end of an ISO week-numbering year
 *
 * @example
 * // The end of an ISO week-numbering year for 2 July 2005:
 * var result = endOfISOYear(new Date(2005, 6, 2))
 * //=> Sun Jan 01 2006 23:59:59.999
 */
function endOfISOYear (dirtyDate) {
  var year = getISOYear(dirtyDate)
  var fourthOfJanuaryOfNextYear = new Date(0)
  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4)
  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0)
  var date = startOfISOWeek(fourthOfJanuaryOfNextYear)
  date.setMilliseconds(date.getMilliseconds() - 1)
  return date
}

module.exports = endOfISOYear


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_minute/index.js":
/*!***********************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_minute/index.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Minute Helpers
 * @summary Return the end of a minute for the given date.
 *
 * @description
 * Return the end of a minute for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the end of a minute
 *
 * @example
 * // The end of a minute for 1 December 2014 22:15:45.400:
 * var result = endOfMinute(new Date(2014, 11, 1, 22, 15, 45, 400))
 * //=> Mon Dec 01 2014 22:15:59.999
 */
function endOfMinute (dirtyDate) {
  var date = parse(dirtyDate)
  date.setSeconds(59, 999)
  return date
}

module.exports = endOfMinute


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_month/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_month/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Month Helpers
 * @summary Return the end of a month for the given date.
 *
 * @description
 * Return the end of a month for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the end of a month
 *
 * @example
 * // The end of a month for 2 September 2014 11:55:00:
 * var result = endOfMonth(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Tue Sep 30 2014 23:59:59.999
 */
function endOfMonth (dirtyDate) {
  var date = parse(dirtyDate)
  var month = date.getMonth()
  date.setFullYear(date.getFullYear(), month + 1, 0)
  date.setHours(23, 59, 59, 999)
  return date
}

module.exports = endOfMonth


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_quarter/index.js":
/*!************************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_quarter/index.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Quarter Helpers
 * @summary Return the end of a year quarter for the given date.
 *
 * @description
 * Return the end of a year quarter for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the end of a quarter
 *
 * @example
 * // The end of a quarter for 2 September 2014 11:55:00:
 * var result = endOfQuarter(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Tue Sep 30 2014 23:59:59.999
 */
function endOfQuarter (dirtyDate) {
  var date = parse(dirtyDate)
  var currentMonth = date.getMonth()
  var month = currentMonth - currentMonth % 3 + 3
  date.setMonth(month, 0)
  date.setHours(23, 59, 59, 999)
  return date
}

module.exports = endOfQuarter


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_second/index.js":
/*!***********************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_second/index.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Second Helpers
 * @summary Return the end of a second for the given date.
 *
 * @description
 * Return the end of a second for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the end of a second
 *
 * @example
 * // The end of a second for 1 December 2014 22:15:45.400:
 * var result = endOfSecond(new Date(2014, 11, 1, 22, 15, 45, 400))
 * //=> Mon Dec 01 2014 22:15:45.999
 */
function endOfSecond (dirtyDate) {
  var date = parse(dirtyDate)
  date.setMilliseconds(999)
  return date
}

module.exports = endOfSecond


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_today/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_today/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var endOfDay = __webpack_require__(/*! ../end_of_day/index.js */ "../app/node_modules/date-fns/end_of_day/index.js")

/**
 * @category Day Helpers
 * @summary Return the end of today.
 *
 * @description
 * Return the end of today.
 *
 * @returns {Date} the end of today
 *
 * @example
 * // If today is 6 October 2014:
 * var result = endOfToday()
 * //=> Mon Oct 6 2014 23:59:59.999
 */
function endOfToday () {
  return endOfDay(new Date())
}

module.exports = endOfToday


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_tomorrow/index.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_tomorrow/index.js ***!
  \*************************************************************/
/***/ ((module) => {

/**
 * @category Day Helpers
 * @summary Return the end of tomorrow.
 *
 * @description
 * Return the end of tomorrow.
 *
 * @returns {Date} the end of tomorrow
 *
 * @example
 * // If today is 6 October 2014:
 * var result = endOfTomorrow()
 * //=> Tue Oct 7 2014 23:59:59.999
 */
function endOfTomorrow () {
  var now = new Date()
  var year = now.getFullYear()
  var month = now.getMonth()
  var day = now.getDate()

  var date = new Date(0)
  date.setFullYear(year, month, day + 1)
  date.setHours(23, 59, 59, 999)
  return date
}

module.exports = endOfTomorrow


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_week/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_week/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Week Helpers
 * @summary Return the end of a week for the given date.
 *
 * @description
 * Return the end of a week for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @param {Object} [options] - the object with options
 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
 * @returns {Date} the end of a week
 *
 * @example
 * // The end of a week for 2 September 2014 11:55:00:
 * var result = endOfWeek(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Sat Sep 06 2014 23:59:59.999
 *
 * @example
 * // If the week starts on Monday, the end of the week for 2 September 2014 11:55:00:
 * var result = endOfWeek(new Date(2014, 8, 2, 11, 55, 0), {weekStartsOn: 1})
 * //=> Sun Sep 07 2014 23:59:59.999
 */
function endOfWeek (dirtyDate, dirtyOptions) {
  var weekStartsOn = dirtyOptions ? (Number(dirtyOptions.weekStartsOn) || 0) : 0

  var date = parse(dirtyDate)
  var day = date.getDay()
  var diff = (day < weekStartsOn ? -7 : 0) + 6 - (day - weekStartsOn)

  date.setDate(date.getDate() + diff)
  date.setHours(23, 59, 59, 999)
  return date
}

module.exports = endOfWeek


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_year/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_year/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Year Helpers
 * @summary Return the end of a year for the given date.
 *
 * @description
 * Return the end of a year for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the end of a year
 *
 * @example
 * // The end of a year for 2 September 2014 11:55:00:
 * var result = endOfYear(new Date(2014, 8, 2, 11, 55, 00))
 * //=> Wed Dec 31 2014 23:59:59.999
 */
function endOfYear (dirtyDate) {
  var date = parse(dirtyDate)
  var year = date.getFullYear()
  date.setFullYear(year + 1, 0, 0)
  date.setHours(23, 59, 59, 999)
  return date
}

module.exports = endOfYear


/***/ }),

/***/ "../app/node_modules/date-fns/end_of_yesterday/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/end_of_yesterday/index.js ***!
  \**************************************************************/
/***/ ((module) => {

/**
 * @category Day Helpers
 * @summary Return the end of yesterday.
 *
 * @description
 * Return the end of yesterday.
 *
 * @returns {Date} the end of yesterday
 *
 * @example
 * // If today is 6 October 2014:
 * var result = endOfYesterday()
 * //=> Sun Oct 5 2014 23:59:59.999
 */
function endOfYesterday () {
  var now = new Date()
  var year = now.getFullYear()
  var month = now.getMonth()
  var day = now.getDate()

  var date = new Date(0)
  date.setFullYear(year, month, day - 1)
  date.setHours(23, 59, 59, 999)
  return date
}

module.exports = endOfYesterday


/***/ }),

/***/ "../app/node_modules/date-fns/format/index.js":
/*!****************************************************!*\
  !*** ../app/node_modules/date-fns/format/index.js ***!
  \****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getDayOfYear = __webpack_require__(/*! ../get_day_of_year/index.js */ "../app/node_modules/date-fns/get_day_of_year/index.js")
var getISOWeek = __webpack_require__(/*! ../get_iso_week/index.js */ "../app/node_modules/date-fns/get_iso_week/index.js")
var getISOYear = __webpack_require__(/*! ../get_iso_year/index.js */ "../app/node_modules/date-fns/get_iso_year/index.js")
var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var isValid = __webpack_require__(/*! ../is_valid/index.js */ "../app/node_modules/date-fns/is_valid/index.js")
var enLocale = __webpack_require__(/*! ../locale/en/index.js */ "../app/node_modules/date-fns/locale/en/index.js")

/**
 * @category Common Helpers
 * @summary Format the date.
 *
 * @description
 * Return the formatted date string in the given format.
 *
 * Accepted tokens:
 * | Unit                    | Token | Result examples                  |
 * |-------------------------|-------|----------------------------------|
 * | Month                   | M     | 1, 2, ..., 12                    |
 * |                         | Mo    | 1st, 2nd, ..., 12th              |
 * |                         | MM    | 01, 02, ..., 12                  |
 * |                         | MMM   | Jan, Feb, ..., Dec               |
 * |                         | MMMM  | January, February, ..., December |
 * | Quarter                 | Q     | 1, 2, 3, 4                       |
 * |                         | Qo    | 1st, 2nd, 3rd, 4th               |
 * | Day of month            | D     | 1, 2, ..., 31                    |
 * |                         | Do    | 1st, 2nd, ..., 31st              |
 * |                         | DD    | 01, 02, ..., 31                  |
 * | Day of year             | DDD   | 1, 2, ..., 366                   |
 * |                         | DDDo  | 1st, 2nd, ..., 366th             |
 * |                         | DDDD  | 001, 002, ..., 366               |
 * | Day of week             | d     | 0, 1, ..., 6                     |
 * |                         | do    | 0th, 1st, ..., 6th               |
 * |                         | dd    | Su, Mo, ..., Sa                  |
 * |                         | ddd   | Sun, Mon, ..., Sat               |
 * |                         | dddd  | Sunday, Monday, ..., Saturday    |
 * | Day of ISO week         | E     | 1, 2, ..., 7                     |
 * | ISO week                | W     | 1, 2, ..., 53                    |
 * |                         | Wo    | 1st, 2nd, ..., 53rd              |
 * |                         | WW    | 01, 02, ..., 53                  |
 * | Year                    | YY    | 00, 01, ..., 99                  |
 * |                         | YYYY  | 1900, 1901, ..., 2099            |
 * | ISO week-numbering year | GG    | 00, 01, ..., 99                  |
 * |                         | GGGG  | 1900, 1901, ..., 2099            |
 * | AM/PM                   | A     | AM, PM                           |
 * |                         | a     | am, pm                           |
 * |                         | aa    | a.m., p.m.                       |
 * | Hour                    | H     | 0, 1, ... 23                     |
 * |                         | HH    | 00, 01, ... 23                   |
 * |                         | h     | 1, 2, ..., 12                    |
 * |                         | hh    | 01, 02, ..., 12                  |
 * | Minute                  | m     | 0, 1, ..., 59                    |
 * |                         | mm    | 00, 01, ..., 59                  |
 * | Second                  | s     | 0, 1, ..., 59                    |
 * |                         | ss    | 00, 01, ..., 59                  |
 * | 1/10 of second          | S     | 0, 1, ..., 9                     |
 * | 1/100 of second         | SS    | 00, 01, ..., 99                  |
 * | Millisecond             | SSS   | 000, 001, ..., 999               |
 * | Timezone                | Z     | -01:00, +00:00, ... +12:00       |
 * |                         | ZZ    | -0100, +0000, ..., +1200         |
 * | Seconds timestamp       | X     | 512969520                        |
 * | Milliseconds timestamp  | x     | 512969520900                     |
 *
 * The characters wrapped in square brackets are escaped.
 *
 * The result may vary by locale.
 *
 * @param {Date|String|Number} date - the original date
 * @param {String} [format='YYYY-MM-DDTHH:mm:ss.SSSZ'] - the string of tokens
 * @param {Object} [options] - the object with options
 * @param {Object} [options.locale=enLocale] - the locale object
 * @returns {String} the formatted date string
 *
 * @example
 * // Represent 11 February 2014 in middle-endian format:
 * var result = format(
 *   new Date(2014, 1, 11),
 *   'MM/DD/YYYY'
 * )
 * //=> '02/11/2014'
 *
 * @example
 * // Represent 2 July 2014 in Esperanto:
 * var eoLocale = require('date-fns/locale/eo')
 * var result = format(
 *   new Date(2014, 6, 2),
 *   'Do [de] MMMM YYYY',
 *   {locale: eoLocale}
 * )
 * //=> '2-a de julio 2014'
 */
function format (dirtyDate, dirtyFormatStr, dirtyOptions) {
  var formatStr = dirtyFormatStr ? String(dirtyFormatStr) : 'YYYY-MM-DDTHH:mm:ss.SSSZ'
  var options = dirtyOptions || {}

  var locale = options.locale
  var localeFormatters = enLocale.format.formatters
  var formattingTokensRegExp = enLocale.format.formattingTokensRegExp
  if (locale && locale.format && locale.format.formatters) {
    localeFormatters = locale.format.formatters

    if (locale.format.formattingTokensRegExp) {
      formattingTokensRegExp = locale.format.formattingTokensRegExp
    }
  }

  var date = parse(dirtyDate)

  if (!isValid(date)) {
    return 'Invalid Date'
  }

  var formatFn = buildFormatFn(formatStr, localeFormatters, formattingTokensRegExp)

  return formatFn(date)
}

var formatters = {
  // Month: 1, 2, ..., 12
  'M': function (date) {
    return date.getMonth() + 1
  },

  // Month: 01, 02, ..., 12
  'MM': function (date) {
    return addLeadingZeros(date.getMonth() + 1, 2)
  },

  // Quarter: 1, 2, 3, 4
  'Q': function (date) {
    return Math.ceil((date.getMonth() + 1) / 3)
  },

  // Day of month: 1, 2, ..., 31
  'D': function (date) {
    return date.getDate()
  },

  // Day of month: 01, 02, ..., 31
  'DD': function (date) {
    return addLeadingZeros(date.getDate(), 2)
  },

  // Day of year: 1, 2, ..., 366
  'DDD': function (date) {
    return getDayOfYear(date)
  },

  // Day of year: 001, 002, ..., 366
  'DDDD': function (date) {
    return addLeadingZeros(getDayOfYear(date), 3)
  },

  // Day of week: 0, 1, ..., 6
  'd': function (date) {
    return date.getDay()
  },

  // Day of ISO week: 1, 2, ..., 7
  'E': function (date) {
    return date.getDay() || 7
  },

  // ISO week: 1, 2, ..., 53
  'W': function (date) {
    return getISOWeek(date)
  },

  // ISO week: 01, 02, ..., 53
  'WW': function (date) {
    return addLeadingZeros(getISOWeek(date), 2)
  },

  // Year: 00, 01, ..., 99
  'YY': function (date) {
    return addLeadingZeros(date.getFullYear(), 4).substr(2)
  },

  // Year: 1900, 1901, ..., 2099
  'YYYY': function (date) {
    return addLeadingZeros(date.getFullYear(), 4)
  },

  // ISO week-numbering year: 00, 01, ..., 99
  'GG': function (date) {
    return String(getISOYear(date)).substr(2)
  },

  // ISO week-numbering year: 1900, 1901, ..., 2099
  'GGGG': function (date) {
    return getISOYear(date)
  },

  // Hour: 0, 1, ... 23
  'H': function (date) {
    return date.getHours()
  },

  // Hour: 00, 01, ..., 23
  'HH': function (date) {
    return addLeadingZeros(date.getHours(), 2)
  },

  // Hour: 1, 2, ..., 12
  'h': function (date) {
    var hours = date.getHours()
    if (hours === 0) {
      return 12
    } else if (hours > 12) {
      return hours % 12
    } else {
      return hours
    }
  },

  // Hour: 01, 02, ..., 12
  'hh': function (date) {
    return addLeadingZeros(formatters['h'](date), 2)
  },

  // Minute: 0, 1, ..., 59
  'm': function (date) {
    return date.getMinutes()
  },

  // Minute: 00, 01, ..., 59
  'mm': function (date) {
    return addLeadingZeros(date.getMinutes(), 2)
  },

  // Second: 0, 1, ..., 59
  's': function (date) {
    return date.getSeconds()
  },

  // Second: 00, 01, ..., 59
  'ss': function (date) {
    return addLeadingZeros(date.getSeconds(), 2)
  },

  // 1/10 of second: 0, 1, ..., 9
  'S': function (date) {
    return Math.floor(date.getMilliseconds() / 100)
  },

  // 1/100 of second: 00, 01, ..., 99
  'SS': function (date) {
    return addLeadingZeros(Math.floor(date.getMilliseconds() / 10), 2)
  },

  // Millisecond: 000, 001, ..., 999
  'SSS': function (date) {
    return addLeadingZeros(date.getMilliseconds(), 3)
  },

  // Timezone: -01:00, +00:00, ... +12:00
  'Z': function (date) {
    return formatTimezone(date.getTimezoneOffset(), ':')
  },

  // Timezone: -0100, +0000, ... +1200
  'ZZ': function (date) {
    return formatTimezone(date.getTimezoneOffset())
  },

  // Seconds timestamp: 512969520
  'X': function (date) {
    return Math.floor(date.getTime() / 1000)
  },

  // Milliseconds timestamp: 512969520900
  'x': function (date) {
    return date.getTime()
  }
}

function buildFormatFn (formatStr, localeFormatters, formattingTokensRegExp) {
  var array = formatStr.match(formattingTokensRegExp)
  var length = array.length

  var i
  var formatter
  for (i = 0; i < length; i++) {
    formatter = localeFormatters[array[i]] || formatters[array[i]]
    if (formatter) {
      array[i] = formatter
    } else {
      array[i] = removeFormattingTokens(array[i])
    }
  }

  return function (date) {
    var output = ''
    for (var i = 0; i < length; i++) {
      if (array[i] instanceof Function) {
        output += array[i](date, formatters)
      } else {
        output += array[i]
      }
    }
    return output
  }
}

function removeFormattingTokens (input) {
  if (input.match(/\[[\s\S]/)) {
    return input.replace(/^\[|]$/g, '')
  }
  return input.replace(/\\/g, '')
}

function formatTimezone (offset, delimeter) {
  delimeter = delimeter || ''
  var sign = offset > 0 ? '-' : '+'
  var absOffset = Math.abs(offset)
  var hours = Math.floor(absOffset / 60)
  var minutes = absOffset % 60
  return sign + addLeadingZeros(hours, 2) + delimeter + addLeadingZeros(minutes, 2)
}

function addLeadingZeros (number, targetLength) {
  var output = Math.abs(number).toString()
  while (output.length < targetLength) {
    output = '0' + output
  }
  return output
}

module.exports = format


/***/ }),

/***/ "../app/node_modules/date-fns/get_date/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/get_date/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Day Helpers
 * @summary Get the day of the month of the given date.
 *
 * @description
 * Get the day of the month of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the day of month
 *
 * @example
 * // Which day of the month is 29 February 2012?
 * var result = getDate(new Date(2012, 1, 29))
 * //=> 29
 */
function getDate (dirtyDate) {
  var date = parse(dirtyDate)
  var dayOfMonth = date.getDate()
  return dayOfMonth
}

module.exports = getDate


/***/ }),

/***/ "../app/node_modules/date-fns/get_day/index.js":
/*!*****************************************************!*\
  !*** ../app/node_modules/date-fns/get_day/index.js ***!
  \*****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Weekday Helpers
 * @summary Get the day of the week of the given date.
 *
 * @description
 * Get the day of the week of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the day of week
 *
 * @example
 * // Which day of the week is 29 February 2012?
 * var result = getDay(new Date(2012, 1, 29))
 * //=> 3
 */
function getDay (dirtyDate) {
  var date = parse(dirtyDate)
  var day = date.getDay()
  return day
}

module.exports = getDay


/***/ }),

/***/ "../app/node_modules/date-fns/get_day_of_year/index.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/date-fns/get_day_of_year/index.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var startOfYear = __webpack_require__(/*! ../start_of_year/index.js */ "../app/node_modules/date-fns/start_of_year/index.js")
var differenceInCalendarDays = __webpack_require__(/*! ../difference_in_calendar_days/index.js */ "../app/node_modules/date-fns/difference_in_calendar_days/index.js")

/**
 * @category Day Helpers
 * @summary Get the day of the year of the given date.
 *
 * @description
 * Get the day of the year of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the day of year
 *
 * @example
 * // Which day of the year is 2 July 2014?
 * var result = getDayOfYear(new Date(2014, 6, 2))
 * //=> 183
 */
function getDayOfYear (dirtyDate) {
  var date = parse(dirtyDate)
  var diff = differenceInCalendarDays(date, startOfYear(date))
  var dayOfYear = diff + 1
  return dayOfYear
}

module.exports = getDayOfYear


/***/ }),

/***/ "../app/node_modules/date-fns/get_days_in_month/index.js":
/*!***************************************************************!*\
  !*** ../app/node_modules/date-fns/get_days_in_month/index.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Month Helpers
 * @summary Get the number of days in a month of the given date.
 *
 * @description
 * Get the number of days in a month of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the number of days in a month
 *
 * @example
 * // How many days are in February 2000?
 * var result = getDaysInMonth(new Date(2000, 1))
 * //=> 29
 */
function getDaysInMonth (dirtyDate) {
  var date = parse(dirtyDate)
  var year = date.getFullYear()
  var monthIndex = date.getMonth()
  var lastDayOfMonth = new Date(0)
  lastDayOfMonth.setFullYear(year, monthIndex + 1, 0)
  lastDayOfMonth.setHours(0, 0, 0, 0)
  return lastDayOfMonth.getDate()
}

module.exports = getDaysInMonth


/***/ }),

/***/ "../app/node_modules/date-fns/get_days_in_year/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/get_days_in_year/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isLeapYear = __webpack_require__(/*! ../is_leap_year/index.js */ "../app/node_modules/date-fns/is_leap_year/index.js")

/**
 * @category Year Helpers
 * @summary Get the number of days in a year of the given date.
 *
 * @description
 * Get the number of days in a year of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the number of days in a year
 *
 * @example
 * // How many days are in 2012?
 * var result = getDaysInYear(new Date(2012, 0, 1))
 * //=> 366
 */
function getDaysInYear (dirtyDate) {
  return isLeapYear(dirtyDate) ? 366 : 365
}

module.exports = getDaysInYear


/***/ }),

/***/ "../app/node_modules/date-fns/get_hours/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/get_hours/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Hour Helpers
 * @summary Get the hours of the given date.
 *
 * @description
 * Get the hours of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the hours
 *
 * @example
 * // Get the hours of 29 February 2012 11:45:00:
 * var result = getHours(new Date(2012, 1, 29, 11, 45))
 * //=> 11
 */
function getHours (dirtyDate) {
  var date = parse(dirtyDate)
  var hours = date.getHours()
  return hours
}

module.exports = getHours


/***/ }),

/***/ "../app/node_modules/date-fns/get_iso_day/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/get_iso_day/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Weekday Helpers
 * @summary Get the day of the ISO week of the given date.
 *
 * @description
 * Get the day of the ISO week of the given date,
 * which is 7 for Sunday, 1 for Monday etc.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the day of ISO week
 *
 * @example
 * // Which day of the ISO week is 26 February 2012?
 * var result = getISODay(new Date(2012, 1, 26))
 * //=> 7
 */
function getISODay (dirtyDate) {
  var date = parse(dirtyDate)
  var day = date.getDay()

  if (day === 0) {
    day = 7
  }

  return day
}

module.exports = getISODay


/***/ }),

/***/ "../app/node_modules/date-fns/get_iso_week/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/get_iso_week/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var startOfISOWeek = __webpack_require__(/*! ../start_of_iso_week/index.js */ "../app/node_modules/date-fns/start_of_iso_week/index.js")
var startOfISOYear = __webpack_require__(/*! ../start_of_iso_year/index.js */ "../app/node_modules/date-fns/start_of_iso_year/index.js")

var MILLISECONDS_IN_WEEK = 604800000

/**
 * @category ISO Week Helpers
 * @summary Get the ISO week of the given date.
 *
 * @description
 * Get the ISO week of the given date.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the ISO week
 *
 * @example
 * // Which week of the ISO-week numbering year is 2 January 2005?
 * var result = getISOWeek(new Date(2005, 0, 2))
 * //=> 53
 */
function getISOWeek (dirtyDate) {
  var date = parse(dirtyDate)
  var diff = startOfISOWeek(date).getTime() - startOfISOYear(date).getTime()

  // Round the number of days to the nearest integer
  // because the number of milliseconds in a week is not constant
  // (e.g. it's different in the week of the daylight saving time clock shift)
  return Math.round(diff / MILLISECONDS_IN_WEEK) + 1
}

module.exports = getISOWeek


/***/ }),

/***/ "../app/node_modules/date-fns/get_iso_weeks_in_year/index.js":
/*!*******************************************************************!*\
  !*** ../app/node_modules/date-fns/get_iso_weeks_in_year/index.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfISOYear = __webpack_require__(/*! ../start_of_iso_year/index.js */ "../app/node_modules/date-fns/start_of_iso_year/index.js")
var addWeeks = __webpack_require__(/*! ../add_weeks/index.js */ "../app/node_modules/date-fns/add_weeks/index.js")

var MILLISECONDS_IN_WEEK = 604800000

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Get the number of weeks in an ISO week-numbering year of the given date.
 *
 * @description
 * Get the number of weeks in an ISO week-numbering year of the given date.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the number of ISO weeks in a year
 *
 * @example
 * // How many weeks are in ISO week-numbering year 2015?
 * var result = getISOWeeksInYear(new Date(2015, 1, 11))
 * //=> 53
 */
function getISOWeeksInYear (dirtyDate) {
  var thisYear = startOfISOYear(dirtyDate)
  var nextYear = startOfISOYear(addWeeks(thisYear, 60))
  var diff = nextYear.valueOf() - thisYear.valueOf()
  // Round the number of weeks to the nearest integer
  // because the number of milliseconds in a week is not constant
  // (e.g. it's different in the week of the daylight saving time clock shift)
  return Math.round(diff / MILLISECONDS_IN_WEEK)
}

module.exports = getISOWeeksInYear


/***/ }),

/***/ "../app/node_modules/date-fns/get_iso_year/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/get_iso_year/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var startOfISOWeek = __webpack_require__(/*! ../start_of_iso_week/index.js */ "../app/node_modules/date-fns/start_of_iso_week/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Get the ISO week-numbering year of the given date.
 *
 * @description
 * Get the ISO week-numbering year of the given date,
 * which always starts 3 days before the year's first Thursday.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the ISO week-numbering year
 *
 * @example
 * // Which ISO-week numbering year is 2 January 2005?
 * var result = getISOYear(new Date(2005, 0, 2))
 * //=> 2004
 */
function getISOYear (dirtyDate) {
  var date = parse(dirtyDate)
  var year = date.getFullYear()

  var fourthOfJanuaryOfNextYear = new Date(0)
  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4)
  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0)
  var startOfNextYear = startOfISOWeek(fourthOfJanuaryOfNextYear)

  var fourthOfJanuaryOfThisYear = new Date(0)
  fourthOfJanuaryOfThisYear.setFullYear(year, 0, 4)
  fourthOfJanuaryOfThisYear.setHours(0, 0, 0, 0)
  var startOfThisYear = startOfISOWeek(fourthOfJanuaryOfThisYear)

  if (date.getTime() >= startOfNextYear.getTime()) {
    return year + 1
  } else if (date.getTime() >= startOfThisYear.getTime()) {
    return year
  } else {
    return year - 1
  }
}

module.exports = getISOYear


/***/ }),

/***/ "../app/node_modules/date-fns/get_milliseconds/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/get_milliseconds/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Millisecond Helpers
 * @summary Get the milliseconds of the given date.
 *
 * @description
 * Get the milliseconds of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the milliseconds
 *
 * @example
 * // Get the milliseconds of 29 February 2012 11:45:05.123:
 * var result = getMilliseconds(new Date(2012, 1, 29, 11, 45, 5, 123))
 * //=> 123
 */
function getMilliseconds (dirtyDate) {
  var date = parse(dirtyDate)
  var milliseconds = date.getMilliseconds()
  return milliseconds
}

module.exports = getMilliseconds


/***/ }),

/***/ "../app/node_modules/date-fns/get_minutes/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/get_minutes/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Minute Helpers
 * @summary Get the minutes of the given date.
 *
 * @description
 * Get the minutes of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the minutes
 *
 * @example
 * // Get the minutes of 29 February 2012 11:45:05:
 * var result = getMinutes(new Date(2012, 1, 29, 11, 45, 5))
 * //=> 45
 */
function getMinutes (dirtyDate) {
  var date = parse(dirtyDate)
  var minutes = date.getMinutes()
  return minutes
}

module.exports = getMinutes


/***/ }),

/***/ "../app/node_modules/date-fns/get_month/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/get_month/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Month Helpers
 * @summary Get the month of the given date.
 *
 * @description
 * Get the month of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the month
 *
 * @example
 * // Which month is 29 February 2012?
 * var result = getMonth(new Date(2012, 1, 29))
 * //=> 1
 */
function getMonth (dirtyDate) {
  var date = parse(dirtyDate)
  var month = date.getMonth()
  return month
}

module.exports = getMonth


/***/ }),

/***/ "../app/node_modules/date-fns/get_overlapping_days_in_ranges/index.js":
/*!****************************************************************************!*\
  !*** ../app/node_modules/date-fns/get_overlapping_days_in_ranges/index.js ***!
  \****************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

var MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000

/**
 * @category Range Helpers
 * @summary Get the number of days that overlap in two date ranges
 *
 * @description
 * Get the number of days that overlap in two date ranges
 *
 * @param {Date|String|Number} initialRangeStartDate - the start of the initial range
 * @param {Date|String|Number} initialRangeEndDate - the end of the initial range
 * @param {Date|String|Number} comparedRangeStartDate - the start of the range to compare it with
 * @param {Date|String|Number} comparedRangeEndDate - the end of the range to compare it with
 * @returns {Number} the number of days that overlap in two date ranges
 * @throws {Error} startDate of a date range cannot be after its endDate
 *
 * @example
 * // For overlapping date ranges adds 1 for each started overlapping day:
 * getOverlappingDaysInRanges(
 *   new Date(2014, 0, 10), new Date(2014, 0, 20), new Date(2014, 0, 17), new Date(2014, 0, 21)
 * )
 * //=> 3
 *
 * @example
 * // For non-overlapping date ranges returns 0:
 * getOverlappingDaysInRanges(
 *   new Date(2014, 0, 10), new Date(2014, 0, 20), new Date(2014, 0, 21), new Date(2014, 0, 22)
 * )
 * //=> 0
 */
function getOverlappingDaysInRanges (dirtyInitialRangeStartDate, dirtyInitialRangeEndDate, dirtyComparedRangeStartDate, dirtyComparedRangeEndDate) {
  var initialStartTime = parse(dirtyInitialRangeStartDate).getTime()
  var initialEndTime = parse(dirtyInitialRangeEndDate).getTime()
  var comparedStartTime = parse(dirtyComparedRangeStartDate).getTime()
  var comparedEndTime = parse(dirtyComparedRangeEndDate).getTime()

  if (initialStartTime > initialEndTime || comparedStartTime > comparedEndTime) {
    throw new Error('The start of the range cannot be after the end of the range')
  }

  var isOverlapping = initialStartTime < comparedEndTime && comparedStartTime < initialEndTime

  if (!isOverlapping) {
    return 0
  }

  var overlapStartDate = comparedStartTime < initialStartTime
    ? initialStartTime
    : comparedStartTime

  var overlapEndDate = comparedEndTime > initialEndTime
    ? initialEndTime
    : comparedEndTime

  var differenceInMs = overlapEndDate - overlapStartDate

  return Math.ceil(differenceInMs / MILLISECONDS_IN_DAY)
}

module.exports = getOverlappingDaysInRanges


/***/ }),

/***/ "../app/node_modules/date-fns/get_quarter/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/get_quarter/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Quarter Helpers
 * @summary Get the year quarter of the given date.
 *
 * @description
 * Get the year quarter of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the quarter
 *
 * @example
 * // Which quarter is 2 July 2014?
 * var result = getQuarter(new Date(2014, 6, 2))
 * //=> 3
 */
function getQuarter (dirtyDate) {
  var date = parse(dirtyDate)
  var quarter = Math.floor(date.getMonth() / 3) + 1
  return quarter
}

module.exports = getQuarter


/***/ }),

/***/ "../app/node_modules/date-fns/get_seconds/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/get_seconds/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Second Helpers
 * @summary Get the seconds of the given date.
 *
 * @description
 * Get the seconds of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the seconds
 *
 * @example
 * // Get the seconds of 29 February 2012 11:45:05.123:
 * var result = getSeconds(new Date(2012, 1, 29, 11, 45, 5, 123))
 * //=> 5
 */
function getSeconds (dirtyDate) {
  var date = parse(dirtyDate)
  var seconds = date.getSeconds()
  return seconds
}

module.exports = getSeconds


/***/ }),

/***/ "../app/node_modules/date-fns/get_time/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/get_time/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Timestamp Helpers
 * @summary Get the milliseconds timestamp of the given date.
 *
 * @description
 * Get the milliseconds timestamp of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the timestamp
 *
 * @example
 * // Get the timestamp of 29 February 2012 11:45:05.123:
 * var result = getTime(new Date(2012, 1, 29, 11, 45, 5, 123))
 * //=> 1330515905123
 */
function getTime (dirtyDate) {
  var date = parse(dirtyDate)
  var timestamp = date.getTime()
  return timestamp
}

module.exports = getTime


/***/ }),

/***/ "../app/node_modules/date-fns/get_year/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/get_year/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Year Helpers
 * @summary Get the year of the given date.
 *
 * @description
 * Get the year of the given date.
 *
 * @param {Date|String|Number} date - the given date
 * @returns {Number} the year
 *
 * @example
 * // Which year is 2 July 2014?
 * var result = getYear(new Date(2014, 6, 2))
 * //=> 2014
 */
function getYear (dirtyDate) {
  var date = parse(dirtyDate)
  var year = date.getFullYear()
  return year
}

module.exports = getYear


/***/ }),

/***/ "../app/node_modules/date-fns/index.js":
/*!*********************************************!*\
  !*** ../app/node_modules/date-fns/index.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = {
  addDays: __webpack_require__(/*! ./add_days/index.js */ "../app/node_modules/date-fns/add_days/index.js"),
  addHours: __webpack_require__(/*! ./add_hours/index.js */ "../app/node_modules/date-fns/add_hours/index.js"),
  addISOYears: __webpack_require__(/*! ./add_iso_years/index.js */ "../app/node_modules/date-fns/add_iso_years/index.js"),
  addMilliseconds: __webpack_require__(/*! ./add_milliseconds/index.js */ "../app/node_modules/date-fns/add_milliseconds/index.js"),
  addMinutes: __webpack_require__(/*! ./add_minutes/index.js */ "../app/node_modules/date-fns/add_minutes/index.js"),
  addMonths: __webpack_require__(/*! ./add_months/index.js */ "../app/node_modules/date-fns/add_months/index.js"),
  addQuarters: __webpack_require__(/*! ./add_quarters/index.js */ "../app/node_modules/date-fns/add_quarters/index.js"),
  addSeconds: __webpack_require__(/*! ./add_seconds/index.js */ "../app/node_modules/date-fns/add_seconds/index.js"),
  addWeeks: __webpack_require__(/*! ./add_weeks/index.js */ "../app/node_modules/date-fns/add_weeks/index.js"),
  addYears: __webpack_require__(/*! ./add_years/index.js */ "../app/node_modules/date-fns/add_years/index.js"),
  areRangesOverlapping: __webpack_require__(/*! ./are_ranges_overlapping/index.js */ "../app/node_modules/date-fns/are_ranges_overlapping/index.js"),
  closestIndexTo: __webpack_require__(/*! ./closest_index_to/index.js */ "../app/node_modules/date-fns/closest_index_to/index.js"),
  closestTo: __webpack_require__(/*! ./closest_to/index.js */ "../app/node_modules/date-fns/closest_to/index.js"),
  compareAsc: __webpack_require__(/*! ./compare_asc/index.js */ "../app/node_modules/date-fns/compare_asc/index.js"),
  compareDesc: __webpack_require__(/*! ./compare_desc/index.js */ "../app/node_modules/date-fns/compare_desc/index.js"),
  differenceInCalendarDays: __webpack_require__(/*! ./difference_in_calendar_days/index.js */ "../app/node_modules/date-fns/difference_in_calendar_days/index.js"),
  differenceInCalendarISOWeeks: __webpack_require__(/*! ./difference_in_calendar_iso_weeks/index.js */ "../app/node_modules/date-fns/difference_in_calendar_iso_weeks/index.js"),
  differenceInCalendarISOYears: __webpack_require__(/*! ./difference_in_calendar_iso_years/index.js */ "../app/node_modules/date-fns/difference_in_calendar_iso_years/index.js"),
  differenceInCalendarMonths: __webpack_require__(/*! ./difference_in_calendar_months/index.js */ "../app/node_modules/date-fns/difference_in_calendar_months/index.js"),
  differenceInCalendarQuarters: __webpack_require__(/*! ./difference_in_calendar_quarters/index.js */ "../app/node_modules/date-fns/difference_in_calendar_quarters/index.js"),
  differenceInCalendarWeeks: __webpack_require__(/*! ./difference_in_calendar_weeks/index.js */ "../app/node_modules/date-fns/difference_in_calendar_weeks/index.js"),
  differenceInCalendarYears: __webpack_require__(/*! ./difference_in_calendar_years/index.js */ "../app/node_modules/date-fns/difference_in_calendar_years/index.js"),
  differenceInDays: __webpack_require__(/*! ./difference_in_days/index.js */ "../app/node_modules/date-fns/difference_in_days/index.js"),
  differenceInHours: __webpack_require__(/*! ./difference_in_hours/index.js */ "../app/node_modules/date-fns/difference_in_hours/index.js"),
  differenceInISOYears: __webpack_require__(/*! ./difference_in_iso_years/index.js */ "../app/node_modules/date-fns/difference_in_iso_years/index.js"),
  differenceInMilliseconds: __webpack_require__(/*! ./difference_in_milliseconds/index.js */ "../app/node_modules/date-fns/difference_in_milliseconds/index.js"),
  differenceInMinutes: __webpack_require__(/*! ./difference_in_minutes/index.js */ "../app/node_modules/date-fns/difference_in_minutes/index.js"),
  differenceInMonths: __webpack_require__(/*! ./difference_in_months/index.js */ "../app/node_modules/date-fns/difference_in_months/index.js"),
  differenceInQuarters: __webpack_require__(/*! ./difference_in_quarters/index.js */ "../app/node_modules/date-fns/difference_in_quarters/index.js"),
  differenceInSeconds: __webpack_require__(/*! ./difference_in_seconds/index.js */ "../app/node_modules/date-fns/difference_in_seconds/index.js"),
  differenceInWeeks: __webpack_require__(/*! ./difference_in_weeks/index.js */ "../app/node_modules/date-fns/difference_in_weeks/index.js"),
  differenceInYears: __webpack_require__(/*! ./difference_in_years/index.js */ "../app/node_modules/date-fns/difference_in_years/index.js"),
  distanceInWords: __webpack_require__(/*! ./distance_in_words/index.js */ "../app/node_modules/date-fns/distance_in_words/index.js"),
  distanceInWordsStrict: __webpack_require__(/*! ./distance_in_words_strict/index.js */ "../app/node_modules/date-fns/distance_in_words_strict/index.js"),
  distanceInWordsToNow: __webpack_require__(/*! ./distance_in_words_to_now/index.js */ "../app/node_modules/date-fns/distance_in_words_to_now/index.js"),
  eachDay: __webpack_require__(/*! ./each_day/index.js */ "../app/node_modules/date-fns/each_day/index.js"),
  endOfDay: __webpack_require__(/*! ./end_of_day/index.js */ "../app/node_modules/date-fns/end_of_day/index.js"),
  endOfHour: __webpack_require__(/*! ./end_of_hour/index.js */ "../app/node_modules/date-fns/end_of_hour/index.js"),
  endOfISOWeek: __webpack_require__(/*! ./end_of_iso_week/index.js */ "../app/node_modules/date-fns/end_of_iso_week/index.js"),
  endOfISOYear: __webpack_require__(/*! ./end_of_iso_year/index.js */ "../app/node_modules/date-fns/end_of_iso_year/index.js"),
  endOfMinute: __webpack_require__(/*! ./end_of_minute/index.js */ "../app/node_modules/date-fns/end_of_minute/index.js"),
  endOfMonth: __webpack_require__(/*! ./end_of_month/index.js */ "../app/node_modules/date-fns/end_of_month/index.js"),
  endOfQuarter: __webpack_require__(/*! ./end_of_quarter/index.js */ "../app/node_modules/date-fns/end_of_quarter/index.js"),
  endOfSecond: __webpack_require__(/*! ./end_of_second/index.js */ "../app/node_modules/date-fns/end_of_second/index.js"),
  endOfToday: __webpack_require__(/*! ./end_of_today/index.js */ "../app/node_modules/date-fns/end_of_today/index.js"),
  endOfTomorrow: __webpack_require__(/*! ./end_of_tomorrow/index.js */ "../app/node_modules/date-fns/end_of_tomorrow/index.js"),
  endOfWeek: __webpack_require__(/*! ./end_of_week/index.js */ "../app/node_modules/date-fns/end_of_week/index.js"),
  endOfYear: __webpack_require__(/*! ./end_of_year/index.js */ "../app/node_modules/date-fns/end_of_year/index.js"),
  endOfYesterday: __webpack_require__(/*! ./end_of_yesterday/index.js */ "../app/node_modules/date-fns/end_of_yesterday/index.js"),
  format: __webpack_require__(/*! ./format/index.js */ "../app/node_modules/date-fns/format/index.js"),
  getDate: __webpack_require__(/*! ./get_date/index.js */ "../app/node_modules/date-fns/get_date/index.js"),
  getDay: __webpack_require__(/*! ./get_day/index.js */ "../app/node_modules/date-fns/get_day/index.js"),
  getDayOfYear: __webpack_require__(/*! ./get_day_of_year/index.js */ "../app/node_modules/date-fns/get_day_of_year/index.js"),
  getDaysInMonth: __webpack_require__(/*! ./get_days_in_month/index.js */ "../app/node_modules/date-fns/get_days_in_month/index.js"),
  getDaysInYear: __webpack_require__(/*! ./get_days_in_year/index.js */ "../app/node_modules/date-fns/get_days_in_year/index.js"),
  getHours: __webpack_require__(/*! ./get_hours/index.js */ "../app/node_modules/date-fns/get_hours/index.js"),
  getISODay: __webpack_require__(/*! ./get_iso_day/index.js */ "../app/node_modules/date-fns/get_iso_day/index.js"),
  getISOWeek: __webpack_require__(/*! ./get_iso_week/index.js */ "../app/node_modules/date-fns/get_iso_week/index.js"),
  getISOWeeksInYear: __webpack_require__(/*! ./get_iso_weeks_in_year/index.js */ "../app/node_modules/date-fns/get_iso_weeks_in_year/index.js"),
  getISOYear: __webpack_require__(/*! ./get_iso_year/index.js */ "../app/node_modules/date-fns/get_iso_year/index.js"),
  getMilliseconds: __webpack_require__(/*! ./get_milliseconds/index.js */ "../app/node_modules/date-fns/get_milliseconds/index.js"),
  getMinutes: __webpack_require__(/*! ./get_minutes/index.js */ "../app/node_modules/date-fns/get_minutes/index.js"),
  getMonth: __webpack_require__(/*! ./get_month/index.js */ "../app/node_modules/date-fns/get_month/index.js"),
  getOverlappingDaysInRanges: __webpack_require__(/*! ./get_overlapping_days_in_ranges/index.js */ "../app/node_modules/date-fns/get_overlapping_days_in_ranges/index.js"),
  getQuarter: __webpack_require__(/*! ./get_quarter/index.js */ "../app/node_modules/date-fns/get_quarter/index.js"),
  getSeconds: __webpack_require__(/*! ./get_seconds/index.js */ "../app/node_modules/date-fns/get_seconds/index.js"),
  getTime: __webpack_require__(/*! ./get_time/index.js */ "../app/node_modules/date-fns/get_time/index.js"),
  getYear: __webpack_require__(/*! ./get_year/index.js */ "../app/node_modules/date-fns/get_year/index.js"),
  isAfter: __webpack_require__(/*! ./is_after/index.js */ "../app/node_modules/date-fns/is_after/index.js"),
  isBefore: __webpack_require__(/*! ./is_before/index.js */ "../app/node_modules/date-fns/is_before/index.js"),
  isDate: __webpack_require__(/*! ./is_date/index.js */ "../app/node_modules/date-fns/is_date/index.js"),
  isEqual: __webpack_require__(/*! ./is_equal/index.js */ "../app/node_modules/date-fns/is_equal/index.js"),
  isFirstDayOfMonth: __webpack_require__(/*! ./is_first_day_of_month/index.js */ "../app/node_modules/date-fns/is_first_day_of_month/index.js"),
  isFriday: __webpack_require__(/*! ./is_friday/index.js */ "../app/node_modules/date-fns/is_friday/index.js"),
  isFuture: __webpack_require__(/*! ./is_future/index.js */ "../app/node_modules/date-fns/is_future/index.js"),
  isLastDayOfMonth: __webpack_require__(/*! ./is_last_day_of_month/index.js */ "../app/node_modules/date-fns/is_last_day_of_month/index.js"),
  isLeapYear: __webpack_require__(/*! ./is_leap_year/index.js */ "../app/node_modules/date-fns/is_leap_year/index.js"),
  isMonday: __webpack_require__(/*! ./is_monday/index.js */ "../app/node_modules/date-fns/is_monday/index.js"),
  isPast: __webpack_require__(/*! ./is_past/index.js */ "../app/node_modules/date-fns/is_past/index.js"),
  isSameDay: __webpack_require__(/*! ./is_same_day/index.js */ "../app/node_modules/date-fns/is_same_day/index.js"),
  isSameHour: __webpack_require__(/*! ./is_same_hour/index.js */ "../app/node_modules/date-fns/is_same_hour/index.js"),
  isSameISOWeek: __webpack_require__(/*! ./is_same_iso_week/index.js */ "../app/node_modules/date-fns/is_same_iso_week/index.js"),
  isSameISOYear: __webpack_require__(/*! ./is_same_iso_year/index.js */ "../app/node_modules/date-fns/is_same_iso_year/index.js"),
  isSameMinute: __webpack_require__(/*! ./is_same_minute/index.js */ "../app/node_modules/date-fns/is_same_minute/index.js"),
  isSameMonth: __webpack_require__(/*! ./is_same_month/index.js */ "../app/node_modules/date-fns/is_same_month/index.js"),
  isSameQuarter: __webpack_require__(/*! ./is_same_quarter/index.js */ "../app/node_modules/date-fns/is_same_quarter/index.js"),
  isSameSecond: __webpack_require__(/*! ./is_same_second/index.js */ "../app/node_modules/date-fns/is_same_second/index.js"),
  isSameWeek: __webpack_require__(/*! ./is_same_week/index.js */ "../app/node_modules/date-fns/is_same_week/index.js"),
  isSameYear: __webpack_require__(/*! ./is_same_year/index.js */ "../app/node_modules/date-fns/is_same_year/index.js"),
  isSaturday: __webpack_require__(/*! ./is_saturday/index.js */ "../app/node_modules/date-fns/is_saturday/index.js"),
  isSunday: __webpack_require__(/*! ./is_sunday/index.js */ "../app/node_modules/date-fns/is_sunday/index.js"),
  isThisHour: __webpack_require__(/*! ./is_this_hour/index.js */ "../app/node_modules/date-fns/is_this_hour/index.js"),
  isThisISOWeek: __webpack_require__(/*! ./is_this_iso_week/index.js */ "../app/node_modules/date-fns/is_this_iso_week/index.js"),
  isThisISOYear: __webpack_require__(/*! ./is_this_iso_year/index.js */ "../app/node_modules/date-fns/is_this_iso_year/index.js"),
  isThisMinute: __webpack_require__(/*! ./is_this_minute/index.js */ "../app/node_modules/date-fns/is_this_minute/index.js"),
  isThisMonth: __webpack_require__(/*! ./is_this_month/index.js */ "../app/node_modules/date-fns/is_this_month/index.js"),
  isThisQuarter: __webpack_require__(/*! ./is_this_quarter/index.js */ "../app/node_modules/date-fns/is_this_quarter/index.js"),
  isThisSecond: __webpack_require__(/*! ./is_this_second/index.js */ "../app/node_modules/date-fns/is_this_second/index.js"),
  isThisWeek: __webpack_require__(/*! ./is_this_week/index.js */ "../app/node_modules/date-fns/is_this_week/index.js"),
  isThisYear: __webpack_require__(/*! ./is_this_year/index.js */ "../app/node_modules/date-fns/is_this_year/index.js"),
  isThursday: __webpack_require__(/*! ./is_thursday/index.js */ "../app/node_modules/date-fns/is_thursday/index.js"),
  isToday: __webpack_require__(/*! ./is_today/index.js */ "../app/node_modules/date-fns/is_today/index.js"),
  isTomorrow: __webpack_require__(/*! ./is_tomorrow/index.js */ "../app/node_modules/date-fns/is_tomorrow/index.js"),
  isTuesday: __webpack_require__(/*! ./is_tuesday/index.js */ "../app/node_modules/date-fns/is_tuesday/index.js"),
  isValid: __webpack_require__(/*! ./is_valid/index.js */ "../app/node_modules/date-fns/is_valid/index.js"),
  isWednesday: __webpack_require__(/*! ./is_wednesday/index.js */ "../app/node_modules/date-fns/is_wednesday/index.js"),
  isWeekend: __webpack_require__(/*! ./is_weekend/index.js */ "../app/node_modules/date-fns/is_weekend/index.js"),
  isWithinRange: __webpack_require__(/*! ./is_within_range/index.js */ "../app/node_modules/date-fns/is_within_range/index.js"),
  isYesterday: __webpack_require__(/*! ./is_yesterday/index.js */ "../app/node_modules/date-fns/is_yesterday/index.js"),
  lastDayOfISOWeek: __webpack_require__(/*! ./last_day_of_iso_week/index.js */ "../app/node_modules/date-fns/last_day_of_iso_week/index.js"),
  lastDayOfISOYear: __webpack_require__(/*! ./last_day_of_iso_year/index.js */ "../app/node_modules/date-fns/last_day_of_iso_year/index.js"),
  lastDayOfMonth: __webpack_require__(/*! ./last_day_of_month/index.js */ "../app/node_modules/date-fns/last_day_of_month/index.js"),
  lastDayOfQuarter: __webpack_require__(/*! ./last_day_of_quarter/index.js */ "../app/node_modules/date-fns/last_day_of_quarter/index.js"),
  lastDayOfWeek: __webpack_require__(/*! ./last_day_of_week/index.js */ "../app/node_modules/date-fns/last_day_of_week/index.js"),
  lastDayOfYear: __webpack_require__(/*! ./last_day_of_year/index.js */ "../app/node_modules/date-fns/last_day_of_year/index.js"),
  max: __webpack_require__(/*! ./max/index.js */ "../app/node_modules/date-fns/max/index.js"),
  min: __webpack_require__(/*! ./min/index.js */ "../app/node_modules/date-fns/min/index.js"),
  parse: __webpack_require__(/*! ./parse/index.js */ "../app/node_modules/date-fns/parse/index.js"),
  setDate: __webpack_require__(/*! ./set_date/index.js */ "../app/node_modules/date-fns/set_date/index.js"),
  setDay: __webpack_require__(/*! ./set_day/index.js */ "../app/node_modules/date-fns/set_day/index.js"),
  setDayOfYear: __webpack_require__(/*! ./set_day_of_year/index.js */ "../app/node_modules/date-fns/set_day_of_year/index.js"),
  setHours: __webpack_require__(/*! ./set_hours/index.js */ "../app/node_modules/date-fns/set_hours/index.js"),
  setISODay: __webpack_require__(/*! ./set_iso_day/index.js */ "../app/node_modules/date-fns/set_iso_day/index.js"),
  setISOWeek: __webpack_require__(/*! ./set_iso_week/index.js */ "../app/node_modules/date-fns/set_iso_week/index.js"),
  setISOYear: __webpack_require__(/*! ./set_iso_year/index.js */ "../app/node_modules/date-fns/set_iso_year/index.js"),
  setMilliseconds: __webpack_require__(/*! ./set_milliseconds/index.js */ "../app/node_modules/date-fns/set_milliseconds/index.js"),
  setMinutes: __webpack_require__(/*! ./set_minutes/index.js */ "../app/node_modules/date-fns/set_minutes/index.js"),
  setMonth: __webpack_require__(/*! ./set_month/index.js */ "../app/node_modules/date-fns/set_month/index.js"),
  setQuarter: __webpack_require__(/*! ./set_quarter/index.js */ "../app/node_modules/date-fns/set_quarter/index.js"),
  setSeconds: __webpack_require__(/*! ./set_seconds/index.js */ "../app/node_modules/date-fns/set_seconds/index.js"),
  setYear: __webpack_require__(/*! ./set_year/index.js */ "../app/node_modules/date-fns/set_year/index.js"),
  startOfDay: __webpack_require__(/*! ./start_of_day/index.js */ "../app/node_modules/date-fns/start_of_day/index.js"),
  startOfHour: __webpack_require__(/*! ./start_of_hour/index.js */ "../app/node_modules/date-fns/start_of_hour/index.js"),
  startOfISOWeek: __webpack_require__(/*! ./start_of_iso_week/index.js */ "../app/node_modules/date-fns/start_of_iso_week/index.js"),
  startOfISOYear: __webpack_require__(/*! ./start_of_iso_year/index.js */ "../app/node_modules/date-fns/start_of_iso_year/index.js"),
  startOfMinute: __webpack_require__(/*! ./start_of_minute/index.js */ "../app/node_modules/date-fns/start_of_minute/index.js"),
  startOfMonth: __webpack_require__(/*! ./start_of_month/index.js */ "../app/node_modules/date-fns/start_of_month/index.js"),
  startOfQuarter: __webpack_require__(/*! ./start_of_quarter/index.js */ "../app/node_modules/date-fns/start_of_quarter/index.js"),
  startOfSecond: __webpack_require__(/*! ./start_of_second/index.js */ "../app/node_modules/date-fns/start_of_second/index.js"),
  startOfToday: __webpack_require__(/*! ./start_of_today/index.js */ "../app/node_modules/date-fns/start_of_today/index.js"),
  startOfTomorrow: __webpack_require__(/*! ./start_of_tomorrow/index.js */ "../app/node_modules/date-fns/start_of_tomorrow/index.js"),
  startOfWeek: __webpack_require__(/*! ./start_of_week/index.js */ "../app/node_modules/date-fns/start_of_week/index.js"),
  startOfYear: __webpack_require__(/*! ./start_of_year/index.js */ "../app/node_modules/date-fns/start_of_year/index.js"),
  startOfYesterday: __webpack_require__(/*! ./start_of_yesterday/index.js */ "../app/node_modules/date-fns/start_of_yesterday/index.js"),
  subDays: __webpack_require__(/*! ./sub_days/index.js */ "../app/node_modules/date-fns/sub_days/index.js"),
  subHours: __webpack_require__(/*! ./sub_hours/index.js */ "../app/node_modules/date-fns/sub_hours/index.js"),
  subISOYears: __webpack_require__(/*! ./sub_iso_years/index.js */ "../app/node_modules/date-fns/sub_iso_years/index.js"),
  subMilliseconds: __webpack_require__(/*! ./sub_milliseconds/index.js */ "../app/node_modules/date-fns/sub_milliseconds/index.js"),
  subMinutes: __webpack_require__(/*! ./sub_minutes/index.js */ "../app/node_modules/date-fns/sub_minutes/index.js"),
  subMonths: __webpack_require__(/*! ./sub_months/index.js */ "../app/node_modules/date-fns/sub_months/index.js"),
  subQuarters: __webpack_require__(/*! ./sub_quarters/index.js */ "../app/node_modules/date-fns/sub_quarters/index.js"),
  subSeconds: __webpack_require__(/*! ./sub_seconds/index.js */ "../app/node_modules/date-fns/sub_seconds/index.js"),
  subWeeks: __webpack_require__(/*! ./sub_weeks/index.js */ "../app/node_modules/date-fns/sub_weeks/index.js"),
  subYears: __webpack_require__(/*! ./sub_years/index.js */ "../app/node_modules/date-fns/sub_years/index.js")
}


/***/ }),

/***/ "../app/node_modules/date-fns/is_after/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/is_after/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Is the first date after the second one?
 *
 * @description
 * Is the first date after the second one?
 *
 * @param {Date|String|Number} date - the date that should be after the other one to return true
 * @param {Date|String|Number} dateToCompare - the date to compare with
 * @returns {Boolean} the first date is after the second date
 *
 * @example
 * // Is 10 July 1989 after 11 February 1987?
 * var result = isAfter(new Date(1989, 6, 10), new Date(1987, 1, 11))
 * //=> true
 */
function isAfter (dirtyDate, dirtyDateToCompare) {
  var date = parse(dirtyDate)
  var dateToCompare = parse(dirtyDateToCompare)
  return date.getTime() > dateToCompare.getTime()
}

module.exports = isAfter


/***/ }),

/***/ "../app/node_modules/date-fns/is_before/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/is_before/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Is the first date before the second one?
 *
 * @description
 * Is the first date before the second one?
 *
 * @param {Date|String|Number} date - the date that should be before the other one to return true
 * @param {Date|String|Number} dateToCompare - the date to compare with
 * @returns {Boolean} the first date is before the second date
 *
 * @example
 * // Is 10 July 1989 before 11 February 1987?
 * var result = isBefore(new Date(1989, 6, 10), new Date(1987, 1, 11))
 * //=> false
 */
function isBefore (dirtyDate, dirtyDateToCompare) {
  var date = parse(dirtyDate)
  var dateToCompare = parse(dirtyDateToCompare)
  return date.getTime() < dateToCompare.getTime()
}

module.exports = isBefore


/***/ }),

/***/ "../app/node_modules/date-fns/is_date/index.js":
/*!*****************************************************!*\
  !*** ../app/node_modules/date-fns/is_date/index.js ***!
  \*****************************************************/
/***/ ((module) => {

/**
 * @category Common Helpers
 * @summary Is the given argument an instance of Date?
 *
 * @description
 * Is the given argument an instance of Date?
 *
 * @param {*} argument - the argument to check
 * @returns {Boolean} the given argument is an instance of Date
 *
 * @example
 * // Is 'mayonnaise' a Date?
 * var result = isDate('mayonnaise')
 * //=> false
 */
function isDate (argument) {
  return argument instanceof Date
}

module.exports = isDate


/***/ }),

/***/ "../app/node_modules/date-fns/is_equal/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/is_equal/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Are the given dates equal?
 *
 * @description
 * Are the given dates equal?
 *
 * @param {Date|String|Number} dateLeft - the first date to compare
 * @param {Date|String|Number} dateRight - the second date to compare
 * @returns {Boolean} the dates are equal
 *
 * @example
 * // Are 2 July 2014 06:30:45.000 and 2 July 2014 06:30:45.500 equal?
 * var result = isEqual(
 *   new Date(2014, 6, 2, 6, 30, 45, 0)
 *   new Date(2014, 6, 2, 6, 30, 45, 500)
 * )
 * //=> false
 */
function isEqual (dirtyLeftDate, dirtyRightDate) {
  var dateLeft = parse(dirtyLeftDate)
  var dateRight = parse(dirtyRightDate)
  return dateLeft.getTime() === dateRight.getTime()
}

module.exports = isEqual


/***/ }),

/***/ "../app/node_modules/date-fns/is_first_day_of_month/index.js":
/*!*******************************************************************!*\
  !*** ../app/node_modules/date-fns/is_first_day_of_month/index.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Month Helpers
 * @summary Is the given date the first day of a month?
 *
 * @description
 * Is the given date the first day of a month?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is the first day of a month
 *
 * @example
 * // Is 1 September 2014 the first day of a month?
 * var result = isFirstDayOfMonth(new Date(2014, 8, 1))
 * //=> true
 */
function isFirstDayOfMonth (dirtyDate) {
  return parse(dirtyDate).getDate() === 1
}

module.exports = isFirstDayOfMonth


/***/ }),

/***/ "../app/node_modules/date-fns/is_friday/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/is_friday/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Weekday Helpers
 * @summary Is the given date Friday?
 *
 * @description
 * Is the given date Friday?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is Friday
 *
 * @example
 * // Is 26 September 2014 Friday?
 * var result = isFriday(new Date(2014, 8, 26))
 * //=> true
 */
function isFriday (dirtyDate) {
  return parse(dirtyDate).getDay() === 5
}

module.exports = isFriday


/***/ }),

/***/ "../app/node_modules/date-fns/is_future/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/is_future/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Is the given date in the future?
 *
 * @description
 * Is the given date in the future?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in the future
 *
 * @example
 * // If today is 6 October 2014, is 31 December 2014 in the future?
 * var result = isFuture(new Date(2014, 11, 31))
 * //=> true
 */
function isFuture (dirtyDate) {
  return parse(dirtyDate).getTime() > new Date().getTime()
}

module.exports = isFuture


/***/ }),

/***/ "../app/node_modules/date-fns/is_last_day_of_month/index.js":
/*!******************************************************************!*\
  !*** ../app/node_modules/date-fns/is_last_day_of_month/index.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var endOfDay = __webpack_require__(/*! ../end_of_day/index.js */ "../app/node_modules/date-fns/end_of_day/index.js")
var endOfMonth = __webpack_require__(/*! ../end_of_month/index.js */ "../app/node_modules/date-fns/end_of_month/index.js")

/**
 * @category Month Helpers
 * @summary Is the given date the last day of a month?
 *
 * @description
 * Is the given date the last day of a month?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is the last day of a month
 *
 * @example
 * // Is 28 February 2014 the last day of a month?
 * var result = isLastDayOfMonth(new Date(2014, 1, 28))
 * //=> true
 */
function isLastDayOfMonth (dirtyDate) {
  var date = parse(dirtyDate)
  return endOfDay(date).getTime() === endOfMonth(date).getTime()
}

module.exports = isLastDayOfMonth


/***/ }),

/***/ "../app/node_modules/date-fns/is_leap_year/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/is_leap_year/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Year Helpers
 * @summary Is the given date in the leap year?
 *
 * @description
 * Is the given date in the leap year?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in the leap year
 *
 * @example
 * // Is 1 September 2012 in the leap year?
 * var result = isLeapYear(new Date(2012, 8, 1))
 * //=> true
 */
function isLeapYear (dirtyDate) {
  var date = parse(dirtyDate)
  var year = date.getFullYear()
  return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0
}

module.exports = isLeapYear


/***/ }),

/***/ "../app/node_modules/date-fns/is_monday/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/is_monday/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Weekday Helpers
 * @summary Is the given date Monday?
 *
 * @description
 * Is the given date Monday?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is Monday
 *
 * @example
 * // Is 22 September 2014 Monday?
 * var result = isMonday(new Date(2014, 8, 22))
 * //=> true
 */
function isMonday (dirtyDate) {
  return parse(dirtyDate).getDay() === 1
}

module.exports = isMonday


/***/ }),

/***/ "../app/node_modules/date-fns/is_past/index.js":
/*!*****************************************************!*\
  !*** ../app/node_modules/date-fns/is_past/index.js ***!
  \*****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Is the given date in the past?
 *
 * @description
 * Is the given date in the past?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in the past
 *
 * @example
 * // If today is 6 October 2014, is 2 July 2014 in the past?
 * var result = isPast(new Date(2014, 6, 2))
 * //=> true
 */
function isPast (dirtyDate) {
  return parse(dirtyDate).getTime() < new Date().getTime()
}

module.exports = isPast


/***/ }),

/***/ "../app/node_modules/date-fns/is_same_day/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/is_same_day/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfDay = __webpack_require__(/*! ../start_of_day/index.js */ "../app/node_modules/date-fns/start_of_day/index.js")

/**
 * @category Day Helpers
 * @summary Are the given dates in the same day?
 *
 * @description
 * Are the given dates in the same day?
 *
 * @param {Date|String|Number} dateLeft - the first date to check
 * @param {Date|String|Number} dateRight - the second date to check
 * @returns {Boolean} the dates are in the same day
 *
 * @example
 * // Are 4 September 06:00:00 and 4 September 18:00:00 in the same day?
 * var result = isSameDay(
 *   new Date(2014, 8, 4, 6, 0),
 *   new Date(2014, 8, 4, 18, 0)
 * )
 * //=> true
 */
function isSameDay (dirtyDateLeft, dirtyDateRight) {
  var dateLeftStartOfDay = startOfDay(dirtyDateLeft)
  var dateRightStartOfDay = startOfDay(dirtyDateRight)

  return dateLeftStartOfDay.getTime() === dateRightStartOfDay.getTime()
}

module.exports = isSameDay


/***/ }),

/***/ "../app/node_modules/date-fns/is_same_hour/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/is_same_hour/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfHour = __webpack_require__(/*! ../start_of_hour/index.js */ "../app/node_modules/date-fns/start_of_hour/index.js")

/**
 * @category Hour Helpers
 * @summary Are the given dates in the same hour?
 *
 * @description
 * Are the given dates in the same hour?
 *
 * @param {Date|String|Number} dateLeft - the first date to check
 * @param {Date|String|Number} dateRight - the second date to check
 * @returns {Boolean} the dates are in the same hour
 *
 * @example
 * // Are 4 September 2014 06:00:00 and 4 September 06:30:00 in the same hour?
 * var result = isSameHour(
 *   new Date(2014, 8, 4, 6, 0),
 *   new Date(2014, 8, 4, 6, 30)
 * )
 * //=> true
 */
function isSameHour (dirtyDateLeft, dirtyDateRight) {
  var dateLeftStartOfHour = startOfHour(dirtyDateLeft)
  var dateRightStartOfHour = startOfHour(dirtyDateRight)

  return dateLeftStartOfHour.getTime() === dateRightStartOfHour.getTime()
}

module.exports = isSameHour


/***/ }),

/***/ "../app/node_modules/date-fns/is_same_iso_week/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/is_same_iso_week/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isSameWeek = __webpack_require__(/*! ../is_same_week/index.js */ "../app/node_modules/date-fns/is_same_week/index.js")

/**
 * @category ISO Week Helpers
 * @summary Are the given dates in the same ISO week?
 *
 * @description
 * Are the given dates in the same ISO week?
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} dateLeft - the first date to check
 * @param {Date|String|Number} dateRight - the second date to check
 * @returns {Boolean} the dates are in the same ISO week
 *
 * @example
 * // Are 1 September 2014 and 7 September 2014 in the same ISO week?
 * var result = isSameISOWeek(
 *   new Date(2014, 8, 1),
 *   new Date(2014, 8, 7)
 * )
 * //=> true
 */
function isSameISOWeek (dirtyDateLeft, dirtyDateRight) {
  return isSameWeek(dirtyDateLeft, dirtyDateRight, {weekStartsOn: 1})
}

module.exports = isSameISOWeek


/***/ }),

/***/ "../app/node_modules/date-fns/is_same_iso_year/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/is_same_iso_year/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfISOYear = __webpack_require__(/*! ../start_of_iso_year/index.js */ "../app/node_modules/date-fns/start_of_iso_year/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Are the given dates in the same ISO week-numbering year?
 *
 * @description
 * Are the given dates in the same ISO week-numbering year?
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} dateLeft - the first date to check
 * @param {Date|String|Number} dateRight - the second date to check
 * @returns {Boolean} the dates are in the same ISO week-numbering year
 *
 * @example
 * // Are 29 December 2003 and 2 January 2005 in the same ISO week-numbering year?
 * var result = isSameISOYear(
 *   new Date(2003, 11, 29),
 *   new Date(2005, 0, 2)
 * )
 * //=> true
 */
function isSameISOYear (dirtyDateLeft, dirtyDateRight) {
  var dateLeftStartOfYear = startOfISOYear(dirtyDateLeft)
  var dateRightStartOfYear = startOfISOYear(dirtyDateRight)

  return dateLeftStartOfYear.getTime() === dateRightStartOfYear.getTime()
}

module.exports = isSameISOYear


/***/ }),

/***/ "../app/node_modules/date-fns/is_same_minute/index.js":
/*!************************************************************!*\
  !*** ../app/node_modules/date-fns/is_same_minute/index.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfMinute = __webpack_require__(/*! ../start_of_minute/index.js */ "../app/node_modules/date-fns/start_of_minute/index.js")

/**
 * @category Minute Helpers
 * @summary Are the given dates in the same minute?
 *
 * @description
 * Are the given dates in the same minute?
 *
 * @param {Date|String|Number} dateLeft - the first date to check
 * @param {Date|String|Number} dateRight - the second date to check
 * @returns {Boolean} the dates are in the same minute
 *
 * @example
 * // Are 4 September 2014 06:30:00 and 4 September 2014 06:30:15
 * // in the same minute?
 * var result = isSameMinute(
 *   new Date(2014, 8, 4, 6, 30),
 *   new Date(2014, 8, 4, 6, 30, 15)
 * )
 * //=> true
 */
function isSameMinute (dirtyDateLeft, dirtyDateRight) {
  var dateLeftStartOfMinute = startOfMinute(dirtyDateLeft)
  var dateRightStartOfMinute = startOfMinute(dirtyDateRight)

  return dateLeftStartOfMinute.getTime() === dateRightStartOfMinute.getTime()
}

module.exports = isSameMinute


/***/ }),

/***/ "../app/node_modules/date-fns/is_same_month/index.js":
/*!***********************************************************!*\
  !*** ../app/node_modules/date-fns/is_same_month/index.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Month Helpers
 * @summary Are the given dates in the same month?
 *
 * @description
 * Are the given dates in the same month?
 *
 * @param {Date|String|Number} dateLeft - the first date to check
 * @param {Date|String|Number} dateRight - the second date to check
 * @returns {Boolean} the dates are in the same month
 *
 * @example
 * // Are 2 September 2014 and 25 September 2014 in the same month?
 * var result = isSameMonth(
 *   new Date(2014, 8, 2),
 *   new Date(2014, 8, 25)
 * )
 * //=> true
 */
function isSameMonth (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var dateRight = parse(dirtyDateRight)
  return dateLeft.getFullYear() === dateRight.getFullYear() &&
    dateLeft.getMonth() === dateRight.getMonth()
}

module.exports = isSameMonth


/***/ }),

/***/ "../app/node_modules/date-fns/is_same_quarter/index.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/date-fns/is_same_quarter/index.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfQuarter = __webpack_require__(/*! ../start_of_quarter/index.js */ "../app/node_modules/date-fns/start_of_quarter/index.js")

/**
 * @category Quarter Helpers
 * @summary Are the given dates in the same year quarter?
 *
 * @description
 * Are the given dates in the same year quarter?
 *
 * @param {Date|String|Number} dateLeft - the first date to check
 * @param {Date|String|Number} dateRight - the second date to check
 * @returns {Boolean} the dates are in the same quarter
 *
 * @example
 * // Are 1 January 2014 and 8 March 2014 in the same quarter?
 * var result = isSameQuarter(
 *   new Date(2014, 0, 1),
 *   new Date(2014, 2, 8)
 * )
 * //=> true
 */
function isSameQuarter (dirtyDateLeft, dirtyDateRight) {
  var dateLeftStartOfQuarter = startOfQuarter(dirtyDateLeft)
  var dateRightStartOfQuarter = startOfQuarter(dirtyDateRight)

  return dateLeftStartOfQuarter.getTime() === dateRightStartOfQuarter.getTime()
}

module.exports = isSameQuarter


/***/ }),

/***/ "../app/node_modules/date-fns/is_same_second/index.js":
/*!************************************************************!*\
  !*** ../app/node_modules/date-fns/is_same_second/index.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfSecond = __webpack_require__(/*! ../start_of_second/index.js */ "../app/node_modules/date-fns/start_of_second/index.js")

/**
 * @category Second Helpers
 * @summary Are the given dates in the same second?
 *
 * @description
 * Are the given dates in the same second?
 *
 * @param {Date|String|Number} dateLeft - the first date to check
 * @param {Date|String|Number} dateRight - the second date to check
 * @returns {Boolean} the dates are in the same second
 *
 * @example
 * // Are 4 September 2014 06:30:15.000 and 4 September 2014 06:30.15.500
 * // in the same second?
 * var result = isSameSecond(
 *   new Date(2014, 8, 4, 6, 30, 15),
 *   new Date(2014, 8, 4, 6, 30, 15, 500)
 * )
 * //=> true
 */
function isSameSecond (dirtyDateLeft, dirtyDateRight) {
  var dateLeftStartOfSecond = startOfSecond(dirtyDateLeft)
  var dateRightStartOfSecond = startOfSecond(dirtyDateRight)

  return dateLeftStartOfSecond.getTime() === dateRightStartOfSecond.getTime()
}

module.exports = isSameSecond


/***/ }),

/***/ "../app/node_modules/date-fns/is_same_week/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/is_same_week/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfWeek = __webpack_require__(/*! ../start_of_week/index.js */ "../app/node_modules/date-fns/start_of_week/index.js")

/**
 * @category Week Helpers
 * @summary Are the given dates in the same week?
 *
 * @description
 * Are the given dates in the same week?
 *
 * @param {Date|String|Number} dateLeft - the first date to check
 * @param {Date|String|Number} dateRight - the second date to check
 * @param {Object} [options] - the object with options
 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
 * @returns {Boolean} the dates are in the same week
 *
 * @example
 * // Are 31 August 2014 and 4 September 2014 in the same week?
 * var result = isSameWeek(
 *   new Date(2014, 7, 31),
 *   new Date(2014, 8, 4)
 * )
 * //=> true
 *
 * @example
 * // If week starts with Monday,
 * // are 31 August 2014 and 4 September 2014 in the same week?
 * var result = isSameWeek(
 *   new Date(2014, 7, 31),
 *   new Date(2014, 8, 4),
 *   {weekStartsOn: 1}
 * )
 * //=> false
 */
function isSameWeek (dirtyDateLeft, dirtyDateRight, dirtyOptions) {
  var dateLeftStartOfWeek = startOfWeek(dirtyDateLeft, dirtyOptions)
  var dateRightStartOfWeek = startOfWeek(dirtyDateRight, dirtyOptions)

  return dateLeftStartOfWeek.getTime() === dateRightStartOfWeek.getTime()
}

module.exports = isSameWeek


/***/ }),

/***/ "../app/node_modules/date-fns/is_same_year/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/is_same_year/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Year Helpers
 * @summary Are the given dates in the same year?
 *
 * @description
 * Are the given dates in the same year?
 *
 * @param {Date|String|Number} dateLeft - the first date to check
 * @param {Date|String|Number} dateRight - the second date to check
 * @returns {Boolean} the dates are in the same year
 *
 * @example
 * // Are 2 September 2014 and 25 September 2014 in the same year?
 * var result = isSameYear(
 *   new Date(2014, 8, 2),
 *   new Date(2014, 8, 25)
 * )
 * //=> true
 */
function isSameYear (dirtyDateLeft, dirtyDateRight) {
  var dateLeft = parse(dirtyDateLeft)
  var dateRight = parse(dirtyDateRight)
  return dateLeft.getFullYear() === dateRight.getFullYear()
}

module.exports = isSameYear


/***/ }),

/***/ "../app/node_modules/date-fns/is_saturday/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/is_saturday/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Weekday Helpers
 * @summary Is the given date Saturday?
 *
 * @description
 * Is the given date Saturday?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is Saturday
 *
 * @example
 * // Is 27 September 2014 Saturday?
 * var result = isSaturday(new Date(2014, 8, 27))
 * //=> true
 */
function isSaturday (dirtyDate) {
  return parse(dirtyDate).getDay() === 6
}

module.exports = isSaturday


/***/ }),

/***/ "../app/node_modules/date-fns/is_sunday/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/is_sunday/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Weekday Helpers
 * @summary Is the given date Sunday?
 *
 * @description
 * Is the given date Sunday?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is Sunday
 *
 * @example
 * // Is 21 September 2014 Sunday?
 * var result = isSunday(new Date(2014, 8, 21))
 * //=> true
 */
function isSunday (dirtyDate) {
  return parse(dirtyDate).getDay() === 0
}

module.exports = isSunday


/***/ }),

/***/ "../app/node_modules/date-fns/is_this_hour/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/is_this_hour/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isSameHour = __webpack_require__(/*! ../is_same_hour/index.js */ "../app/node_modules/date-fns/is_same_hour/index.js")

/**
 * @category Hour Helpers
 * @summary Is the given date in the same hour as the current date?
 *
 * @description
 * Is the given date in the same hour as the current date?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in this hour
 *
 * @example
 * // If now is 25 September 2014 18:30:15.500,
 * // is 25 September 2014 18:00:00 in this hour?
 * var result = isThisHour(new Date(2014, 8, 25, 18))
 * //=> true
 */
function isThisHour (dirtyDate) {
  return isSameHour(new Date(), dirtyDate)
}

module.exports = isThisHour


/***/ }),

/***/ "../app/node_modules/date-fns/is_this_iso_week/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/is_this_iso_week/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isSameISOWeek = __webpack_require__(/*! ../is_same_iso_week/index.js */ "../app/node_modules/date-fns/is_same_iso_week/index.js")

/**
 * @category ISO Week Helpers
 * @summary Is the given date in the same ISO week as the current date?
 *
 * @description
 * Is the given date in the same ISO week as the current date?
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in this ISO week
 *
 * @example
 * // If today is 25 September 2014, is 22 September 2014 in this ISO week?
 * var result = isThisISOWeek(new Date(2014, 8, 22))
 * //=> true
 */
function isThisISOWeek (dirtyDate) {
  return isSameISOWeek(new Date(), dirtyDate)
}

module.exports = isThisISOWeek


/***/ }),

/***/ "../app/node_modules/date-fns/is_this_iso_year/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/is_this_iso_year/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isSameISOYear = __webpack_require__(/*! ../is_same_iso_year/index.js */ "../app/node_modules/date-fns/is_same_iso_year/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Is the given date in the same ISO week-numbering year as the current date?
 *
 * @description
 * Is the given date in the same ISO week-numbering year as the current date?
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in this ISO week-numbering year
 *
 * @example
 * // If today is 25 September 2014,
 * // is 30 December 2013 in this ISO week-numbering year?
 * var result = isThisISOYear(new Date(2013, 11, 30))
 * //=> true
 */
function isThisISOYear (dirtyDate) {
  return isSameISOYear(new Date(), dirtyDate)
}

module.exports = isThisISOYear


/***/ }),

/***/ "../app/node_modules/date-fns/is_this_minute/index.js":
/*!************************************************************!*\
  !*** ../app/node_modules/date-fns/is_this_minute/index.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isSameMinute = __webpack_require__(/*! ../is_same_minute/index.js */ "../app/node_modules/date-fns/is_same_minute/index.js")

/**
 * @category Minute Helpers
 * @summary Is the given date in the same minute as the current date?
 *
 * @description
 * Is the given date in the same minute as the current date?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in this minute
 *
 * @example
 * // If now is 25 September 2014 18:30:15.500,
 * // is 25 September 2014 18:30:00 in this minute?
 * var result = isThisMinute(new Date(2014, 8, 25, 18, 30))
 * //=> true
 */
function isThisMinute (dirtyDate) {
  return isSameMinute(new Date(), dirtyDate)
}

module.exports = isThisMinute


/***/ }),

/***/ "../app/node_modules/date-fns/is_this_month/index.js":
/*!***********************************************************!*\
  !*** ../app/node_modules/date-fns/is_this_month/index.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isSameMonth = __webpack_require__(/*! ../is_same_month/index.js */ "../app/node_modules/date-fns/is_same_month/index.js")

/**
 * @category Month Helpers
 * @summary Is the given date in the same month as the current date?
 *
 * @description
 * Is the given date in the same month as the current date?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in this month
 *
 * @example
 * // If today is 25 September 2014, is 15 September 2014 in this month?
 * var result = isThisMonth(new Date(2014, 8, 15))
 * //=> true
 */
function isThisMonth (dirtyDate) {
  return isSameMonth(new Date(), dirtyDate)
}

module.exports = isThisMonth


/***/ }),

/***/ "../app/node_modules/date-fns/is_this_quarter/index.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/date-fns/is_this_quarter/index.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isSameQuarter = __webpack_require__(/*! ../is_same_quarter/index.js */ "../app/node_modules/date-fns/is_same_quarter/index.js")

/**
 * @category Quarter Helpers
 * @summary Is the given date in the same quarter as the current date?
 *
 * @description
 * Is the given date in the same quarter as the current date?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in this quarter
 *
 * @example
 * // If today is 25 September 2014, is 2 July 2014 in this quarter?
 * var result = isThisQuarter(new Date(2014, 6, 2))
 * //=> true
 */
function isThisQuarter (dirtyDate) {
  return isSameQuarter(new Date(), dirtyDate)
}

module.exports = isThisQuarter


/***/ }),

/***/ "../app/node_modules/date-fns/is_this_second/index.js":
/*!************************************************************!*\
  !*** ../app/node_modules/date-fns/is_this_second/index.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isSameSecond = __webpack_require__(/*! ../is_same_second/index.js */ "../app/node_modules/date-fns/is_same_second/index.js")

/**
 * @category Second Helpers
 * @summary Is the given date in the same second as the current date?
 *
 * @description
 * Is the given date in the same second as the current date?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in this second
 *
 * @example
 * // If now is 25 September 2014 18:30:15.500,
 * // is 25 September 2014 18:30:15.000 in this second?
 * var result = isThisSecond(new Date(2014, 8, 25, 18, 30, 15))
 * //=> true
 */
function isThisSecond (dirtyDate) {
  return isSameSecond(new Date(), dirtyDate)
}

module.exports = isThisSecond


/***/ }),

/***/ "../app/node_modules/date-fns/is_this_week/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/is_this_week/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isSameWeek = __webpack_require__(/*! ../is_same_week/index.js */ "../app/node_modules/date-fns/is_same_week/index.js")

/**
 * @category Week Helpers
 * @summary Is the given date in the same week as the current date?
 *
 * @description
 * Is the given date in the same week as the current date?
 *
 * @param {Date|String|Number} date - the date to check
 * @param {Object} [options] - the object with options
 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
 * @returns {Boolean} the date is in this week
 *
 * @example
 * // If today is 25 September 2014, is 21 September 2014 in this week?
 * var result = isThisWeek(new Date(2014, 8, 21))
 * //=> true
 *
 * @example
 * // If today is 25 September 2014 and week starts with Monday
 * // is 21 September 2014 in this week?
 * var result = isThisWeek(new Date(2014, 8, 21), {weekStartsOn: 1})
 * //=> false
 */
function isThisWeek (dirtyDate, dirtyOptions) {
  return isSameWeek(new Date(), dirtyDate, dirtyOptions)
}

module.exports = isThisWeek


/***/ }),

/***/ "../app/node_modules/date-fns/is_this_year/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/is_this_year/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isSameYear = __webpack_require__(/*! ../is_same_year/index.js */ "../app/node_modules/date-fns/is_same_year/index.js")

/**
 * @category Year Helpers
 * @summary Is the given date in the same year as the current date?
 *
 * @description
 * Is the given date in the same year as the current date?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is in this year
 *
 * @example
 * // If today is 25 September 2014, is 2 July 2014 in this year?
 * var result = isThisYear(new Date(2014, 6, 2))
 * //=> true
 */
function isThisYear (dirtyDate) {
  return isSameYear(new Date(), dirtyDate)
}

module.exports = isThisYear


/***/ }),

/***/ "../app/node_modules/date-fns/is_thursday/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/is_thursday/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Weekday Helpers
 * @summary Is the given date Thursday?
 *
 * @description
 * Is the given date Thursday?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is Thursday
 *
 * @example
 * // Is 25 September 2014 Thursday?
 * var result = isThursday(new Date(2014, 8, 25))
 * //=> true
 */
function isThursday (dirtyDate) {
  return parse(dirtyDate).getDay() === 4
}

module.exports = isThursday


/***/ }),

/***/ "../app/node_modules/date-fns/is_today/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/is_today/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfDay = __webpack_require__(/*! ../start_of_day/index.js */ "../app/node_modules/date-fns/start_of_day/index.js")

/**
 * @category Day Helpers
 * @summary Is the given date today?
 *
 * @description
 * Is the given date today?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is today
 *
 * @example
 * // If today is 6 October 2014, is 6 October 14:00:00 today?
 * var result = isToday(new Date(2014, 9, 6, 14, 0))
 * //=> true
 */
function isToday (dirtyDate) {
  return startOfDay(dirtyDate).getTime() === startOfDay(new Date()).getTime()
}

module.exports = isToday


/***/ }),

/***/ "../app/node_modules/date-fns/is_tomorrow/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/is_tomorrow/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfDay = __webpack_require__(/*! ../start_of_day/index.js */ "../app/node_modules/date-fns/start_of_day/index.js")

/**
 * @category Day Helpers
 * @summary Is the given date tomorrow?
 *
 * @description
 * Is the given date tomorrow?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is tomorrow
 *
 * @example
 * // If today is 6 October 2014, is 7 October 14:00:00 tomorrow?
 * var result = isTomorrow(new Date(2014, 9, 7, 14, 0))
 * //=> true
 */
function isTomorrow (dirtyDate) {
  var tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return startOfDay(dirtyDate).getTime() === startOfDay(tomorrow).getTime()
}

module.exports = isTomorrow


/***/ }),

/***/ "../app/node_modules/date-fns/is_tuesday/index.js":
/*!********************************************************!*\
  !*** ../app/node_modules/date-fns/is_tuesday/index.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Weekday Helpers
 * @summary Is the given date Tuesday?
 *
 * @description
 * Is the given date Tuesday?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is Tuesday
 *
 * @example
 * // Is 23 September 2014 Tuesday?
 * var result = isTuesday(new Date(2014, 8, 23))
 * //=> true
 */
function isTuesday (dirtyDate) {
  return parse(dirtyDate).getDay() === 2
}

module.exports = isTuesday


/***/ }),

/***/ "../app/node_modules/date-fns/is_valid/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/is_valid/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var isDate = __webpack_require__(/*! ../is_date/index.js */ "../app/node_modules/date-fns/is_date/index.js")

/**
 * @category Common Helpers
 * @summary Is the given date valid?
 *
 * @description
 * Returns false if argument is Invalid Date and true otherwise.
 * Invalid Date is a Date, whose time value is NaN.
 *
 * Time value of Date: http://es5.github.io/#x15.9.1.1
 *
 * @param {Date} date - the date to check
 * @returns {Boolean} the date is valid
 * @throws {TypeError} argument must be an instance of Date
 *
 * @example
 * // For the valid date:
 * var result = isValid(new Date(2014, 1, 31))
 * //=> true
 *
 * @example
 * // For the invalid date:
 * var result = isValid(new Date(''))
 * //=> false
 */
function isValid (dirtyDate) {
  if (isDate(dirtyDate)) {
    return !isNaN(dirtyDate)
  } else {
    throw new TypeError(toString.call(dirtyDate) + ' is not an instance of Date')
  }
}

module.exports = isValid


/***/ }),

/***/ "../app/node_modules/date-fns/is_wednesday/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/is_wednesday/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Weekday Helpers
 * @summary Is the given date Wednesday?
 *
 * @description
 * Is the given date Wednesday?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is Wednesday
 *
 * @example
 * // Is 24 September 2014 Wednesday?
 * var result = isWednesday(new Date(2014, 8, 24))
 * //=> true
 */
function isWednesday (dirtyDate) {
  return parse(dirtyDate).getDay() === 3
}

module.exports = isWednesday


/***/ }),

/***/ "../app/node_modules/date-fns/is_weekend/index.js":
/*!********************************************************!*\
  !*** ../app/node_modules/date-fns/is_weekend/index.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Weekday Helpers
 * @summary Does the given date fall on a weekend?
 *
 * @description
 * Does the given date fall on a weekend?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date falls on a weekend
 *
 * @example
 * // Does 5 October 2014 fall on a weekend?
 * var result = isWeekend(new Date(2014, 9, 5))
 * //=> true
 */
function isWeekend (dirtyDate) {
  var date = parse(dirtyDate)
  var day = date.getDay()
  return day === 0 || day === 6
}

module.exports = isWeekend


/***/ }),

/***/ "../app/node_modules/date-fns/is_within_range/index.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/date-fns/is_within_range/index.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Range Helpers
 * @summary Is the given date within the range?
 *
 * @description
 * Is the given date within the range?
 *
 * @param {Date|String|Number} date - the date to check
 * @param {Date|String|Number} startDate - the start of range
 * @param {Date|String|Number} endDate - the end of range
 * @returns {Boolean} the date is within the range
 * @throws {Error} startDate cannot be after endDate
 *
 * @example
 * // For the date within the range:
 * isWithinRange(
 *   new Date(2014, 0, 3), new Date(2014, 0, 1), new Date(2014, 0, 7)
 * )
 * //=> true
 *
 * @example
 * // For the date outside of the range:
 * isWithinRange(
 *   new Date(2014, 0, 10), new Date(2014, 0, 1), new Date(2014, 0, 7)
 * )
 * //=> false
 */
function isWithinRange (dirtyDate, dirtyStartDate, dirtyEndDate) {
  var time = parse(dirtyDate).getTime()
  var startTime = parse(dirtyStartDate).getTime()
  var endTime = parse(dirtyEndDate).getTime()

  if (startTime > endTime) {
    throw new Error('The start of the range cannot be after the end of the range')
  }

  return time >= startTime && time <= endTime
}

module.exports = isWithinRange


/***/ }),

/***/ "../app/node_modules/date-fns/is_yesterday/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/is_yesterday/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfDay = __webpack_require__(/*! ../start_of_day/index.js */ "../app/node_modules/date-fns/start_of_day/index.js")

/**
 * @category Day Helpers
 * @summary Is the given date yesterday?
 *
 * @description
 * Is the given date yesterday?
 *
 * @param {Date|String|Number} date - the date to check
 * @returns {Boolean} the date is yesterday
 *
 * @example
 * // If today is 6 October 2014, is 5 October 14:00:00 yesterday?
 * var result = isYesterday(new Date(2014, 9, 5, 14, 0))
 * //=> true
 */
function isYesterday (dirtyDate) {
  var yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return startOfDay(dirtyDate).getTime() === startOfDay(yesterday).getTime()
}

module.exports = isYesterday


/***/ }),

/***/ "../app/node_modules/date-fns/last_day_of_iso_week/index.js":
/*!******************************************************************!*\
  !*** ../app/node_modules/date-fns/last_day_of_iso_week/index.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var lastDayOfWeek = __webpack_require__(/*! ../last_day_of_week/index.js */ "../app/node_modules/date-fns/last_day_of_week/index.js")

/**
 * @category ISO Week Helpers
 * @summary Return the last day of an ISO week for the given date.
 *
 * @description
 * Return the last day of an ISO week for the given date.
 * The result will be in the local timezone.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the last day of an ISO week
 *
 * @example
 * // The last day of an ISO week for 2 September 2014 11:55:00:
 * var result = lastDayOfISOWeek(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Sun Sep 07 2014 00:00:00
 */
function lastDayOfISOWeek (dirtyDate) {
  return lastDayOfWeek(dirtyDate, {weekStartsOn: 1})
}

module.exports = lastDayOfISOWeek


/***/ }),

/***/ "../app/node_modules/date-fns/last_day_of_iso_year/index.js":
/*!******************************************************************!*\
  !*** ../app/node_modules/date-fns/last_day_of_iso_year/index.js ***!
  \******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getISOYear = __webpack_require__(/*! ../get_iso_year/index.js */ "../app/node_modules/date-fns/get_iso_year/index.js")
var startOfISOWeek = __webpack_require__(/*! ../start_of_iso_week/index.js */ "../app/node_modules/date-fns/start_of_iso_week/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Return the last day of an ISO week-numbering year for the given date.
 *
 * @description
 * Return the last day of an ISO week-numbering year,
 * which always starts 3 days before the year's first Thursday.
 * The result will be in the local timezone.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the end of an ISO week-numbering year
 *
 * @example
 * // The last day of an ISO week-numbering year for 2 July 2005:
 * var result = lastDayOfISOYear(new Date(2005, 6, 2))
 * //=> Sun Jan 01 2006 00:00:00
 */
function lastDayOfISOYear (dirtyDate) {
  var year = getISOYear(dirtyDate)
  var fourthOfJanuary = new Date(0)
  fourthOfJanuary.setFullYear(year + 1, 0, 4)
  fourthOfJanuary.setHours(0, 0, 0, 0)
  var date = startOfISOWeek(fourthOfJanuary)
  date.setDate(date.getDate() - 1)
  return date
}

module.exports = lastDayOfISOYear


/***/ }),

/***/ "../app/node_modules/date-fns/last_day_of_month/index.js":
/*!***************************************************************!*\
  !*** ../app/node_modules/date-fns/last_day_of_month/index.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Month Helpers
 * @summary Return the last day of a month for the given date.
 *
 * @description
 * Return the last day of a month for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the last day of a month
 *
 * @example
 * // The last day of a month for 2 September 2014 11:55:00:
 * var result = lastDayOfMonth(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Tue Sep 30 2014 00:00:00
 */
function lastDayOfMonth (dirtyDate) {
  var date = parse(dirtyDate)
  var month = date.getMonth()
  date.setFullYear(date.getFullYear(), month + 1, 0)
  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = lastDayOfMonth


/***/ }),

/***/ "../app/node_modules/date-fns/last_day_of_quarter/index.js":
/*!*****************************************************************!*\
  !*** ../app/node_modules/date-fns/last_day_of_quarter/index.js ***!
  \*****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Quarter Helpers
 * @summary Return the last day of a year quarter for the given date.
 *
 * @description
 * Return the last day of a year quarter for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the last day of a quarter
 *
 * @example
 * // The last day of a quarter for 2 September 2014 11:55:00:
 * var result = lastDayOfQuarter(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Tue Sep 30 2014 00:00:00
 */
function lastDayOfQuarter (dirtyDate) {
  var date = parse(dirtyDate)
  var currentMonth = date.getMonth()
  var month = currentMonth - currentMonth % 3 + 3
  date.setMonth(month, 0)
  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = lastDayOfQuarter


/***/ }),

/***/ "../app/node_modules/date-fns/last_day_of_week/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/last_day_of_week/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Week Helpers
 * @summary Return the last day of a week for the given date.
 *
 * @description
 * Return the last day of a week for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @param {Object} [options] - the object with options
 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
 * @returns {Date} the last day of a week
 *
 * @example
 * // The last day of a week for 2 September 2014 11:55:00:
 * var result = lastDayOfWeek(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Sat Sep 06 2014 00:00:00
 *
 * @example
 * // If the week starts on Monday, the last day of the week for 2 September 2014 11:55:00:
 * var result = lastDayOfWeek(new Date(2014, 8, 2, 11, 55, 0), {weekStartsOn: 1})
 * //=> Sun Sep 07 2014 00:00:00
 */
function lastDayOfWeek (dirtyDate, dirtyOptions) {
  var weekStartsOn = dirtyOptions ? (Number(dirtyOptions.weekStartsOn) || 0) : 0

  var date = parse(dirtyDate)
  var day = date.getDay()
  var diff = (day < weekStartsOn ? -7 : 0) + 6 - (day - weekStartsOn)

  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + diff)
  return date
}

module.exports = lastDayOfWeek


/***/ }),

/***/ "../app/node_modules/date-fns/last_day_of_year/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/last_day_of_year/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Year Helpers
 * @summary Return the last day of a year for the given date.
 *
 * @description
 * Return the last day of a year for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the last day of a year
 *
 * @example
 * // The last day of a year for 2 September 2014 11:55:00:
 * var result = lastDayOfYear(new Date(2014, 8, 2, 11, 55, 00))
 * //=> Wed Dec 31 2014 00:00:00
 */
function lastDayOfYear (dirtyDate) {
  var date = parse(dirtyDate)
  var year = date.getFullYear()
  date.setFullYear(year + 1, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = lastDayOfYear


/***/ }),

/***/ "../app/node_modules/date-fns/locale/_lib/build_formatting_tokens_reg_exp/index.js":
/*!*****************************************************************************************!*\
  !*** ../app/node_modules/date-fns/locale/_lib/build_formatting_tokens_reg_exp/index.js ***!
  \*****************************************************************************************/
/***/ ((module) => {

var commonFormatterKeys = [
  'M', 'MM', 'Q', 'D', 'DD', 'DDD', 'DDDD', 'd',
  'E', 'W', 'WW', 'YY', 'YYYY', 'GG', 'GGGG',
  'H', 'HH', 'h', 'hh', 'm', 'mm',
  's', 'ss', 'S', 'SS', 'SSS',
  'Z', 'ZZ', 'X', 'x'
]

function buildFormattingTokensRegExp (formatters) {
  var formatterKeys = []
  for (var key in formatters) {
    if (formatters.hasOwnProperty(key)) {
      formatterKeys.push(key)
    }
  }

  var formattingTokens = commonFormatterKeys
    .concat(formatterKeys)
    .sort()
    .reverse()
  var formattingTokensRegExp = new RegExp(
    '(\\[[^\\[]*\\])|(\\\\)?' + '(' + formattingTokens.join('|') + '|.)', 'g'
  )

  return formattingTokensRegExp
}

module.exports = buildFormattingTokensRegExp


/***/ }),

/***/ "../app/node_modules/date-fns/locale/en/build_distance_in_words_locale/index.js":
/*!**************************************************************************************!*\
  !*** ../app/node_modules/date-fns/locale/en/build_distance_in_words_locale/index.js ***!
  \**************************************************************************************/
/***/ ((module) => {

function buildDistanceInWordsLocale () {
  var distanceInWordsLocale = {
    lessThanXSeconds: {
      one: 'less than a second',
      other: 'less than {{count}} seconds'
    },

    xSeconds: {
      one: '1 second',
      other: '{{count}} seconds'
    },

    halfAMinute: 'half a minute',

    lessThanXMinutes: {
      one: 'less than a minute',
      other: 'less than {{count}} minutes'
    },

    xMinutes: {
      one: '1 minute',
      other: '{{count}} minutes'
    },

    aboutXHours: {
      one: 'about 1 hour',
      other: 'about {{count}} hours'
    },

    xHours: {
      one: '1 hour',
      other: '{{count}} hours'
    },

    xDays: {
      one: '1 day',
      other: '{{count}} days'
    },

    aboutXMonths: {
      one: 'about 1 month',
      other: 'about {{count}} months'
    },

    xMonths: {
      one: '1 month',
      other: '{{count}} months'
    },

    aboutXYears: {
      one: 'about 1 year',
      other: 'about {{count}} years'
    },

    xYears: {
      one: '1 year',
      other: '{{count}} years'
    },

    overXYears: {
      one: 'over 1 year',
      other: 'over {{count}} years'
    },

    almostXYears: {
      one: 'almost 1 year',
      other: 'almost {{count}} years'
    }
  }

  function localize (token, count, options) {
    options = options || {}

    var result
    if (typeof distanceInWordsLocale[token] === 'string') {
      result = distanceInWordsLocale[token]
    } else if (count === 1) {
      result = distanceInWordsLocale[token].one
    } else {
      result = distanceInWordsLocale[token].other.replace('{{count}}', count)
    }

    if (options.addSuffix) {
      if (options.comparison > 0) {
        return 'in ' + result
      } else {
        return result + ' ago'
      }
    }

    return result
  }

  return {
    localize: localize
  }
}

module.exports = buildDistanceInWordsLocale


/***/ }),

/***/ "../app/node_modules/date-fns/locale/en/build_format_locale/index.js":
/*!***************************************************************************!*\
  !*** ../app/node_modules/date-fns/locale/en/build_format_locale/index.js ***!
  \***************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var buildFormattingTokensRegExp = __webpack_require__(/*! ../../_lib/build_formatting_tokens_reg_exp/index.js */ "../app/node_modules/date-fns/locale/_lib/build_formatting_tokens_reg_exp/index.js")

function buildFormatLocale () {
  // Note: in English, the names of days of the week and months are capitalized.
  // If you are making a new locale based on this one, check if the same is true for the language you're working on.
  // Generally, formatted dates should look like they are in the middle of a sentence,
  // e.g. in Spanish language the weekdays and months should be in the lowercase.
  var months3char = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  var monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  var weekdays2char = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  var weekdays3char = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  var weekdaysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  var meridiemUppercase = ['AM', 'PM']
  var meridiemLowercase = ['am', 'pm']
  var meridiemFull = ['a.m.', 'p.m.']

  var formatters = {
    // Month: Jan, Feb, ..., Dec
    'MMM': function (date) {
      return months3char[date.getMonth()]
    },

    // Month: January, February, ..., December
    'MMMM': function (date) {
      return monthsFull[date.getMonth()]
    },

    // Day of week: Su, Mo, ..., Sa
    'dd': function (date) {
      return weekdays2char[date.getDay()]
    },

    // Day of week: Sun, Mon, ..., Sat
    'ddd': function (date) {
      return weekdays3char[date.getDay()]
    },

    // Day of week: Sunday, Monday, ..., Saturday
    'dddd': function (date) {
      return weekdaysFull[date.getDay()]
    },

    // AM, PM
    'A': function (date) {
      return (date.getHours() / 12) >= 1 ? meridiemUppercase[1] : meridiemUppercase[0]
    },

    // am, pm
    'a': function (date) {
      return (date.getHours() / 12) >= 1 ? meridiemLowercase[1] : meridiemLowercase[0]
    },

    // a.m., p.m.
    'aa': function (date) {
      return (date.getHours() / 12) >= 1 ? meridiemFull[1] : meridiemFull[0]
    }
  }

  // Generate ordinal version of formatters: M -> Mo, D -> Do, etc.
  var ordinalFormatters = ['M', 'D', 'DDD', 'd', 'Q', 'W']
  ordinalFormatters.forEach(function (formatterToken) {
    formatters[formatterToken + 'o'] = function (date, formatters) {
      return ordinal(formatters[formatterToken](date))
    }
  })

  return {
    formatters: formatters,
    formattingTokensRegExp: buildFormattingTokensRegExp(formatters)
  }
}

function ordinal (number) {
  var rem100 = number % 100
  if (rem100 > 20 || rem100 < 10) {
    switch (rem100 % 10) {
      case 1:
        return number + 'st'
      case 2:
        return number + 'nd'
      case 3:
        return number + 'rd'
    }
  }
  return number + 'th'
}

module.exports = buildFormatLocale


/***/ }),

/***/ "../app/node_modules/date-fns/locale/en/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/locale/en/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var buildDistanceInWordsLocale = __webpack_require__(/*! ./build_distance_in_words_locale/index.js */ "../app/node_modules/date-fns/locale/en/build_distance_in_words_locale/index.js")
var buildFormatLocale = __webpack_require__(/*! ./build_format_locale/index.js */ "../app/node_modules/date-fns/locale/en/build_format_locale/index.js")

/**
 * @category Locales
 * @summary English locale.
 */
module.exports = {
  distanceInWords: buildDistanceInWordsLocale(),
  format: buildFormatLocale()
}


/***/ }),

/***/ "../app/node_modules/date-fns/max/index.js":
/*!*************************************************!*\
  !*** ../app/node_modules/date-fns/max/index.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Return the latest of the given dates.
 *
 * @description
 * Return the latest of the given dates.
 *
 * @param {...(Date|String|Number)} dates - the dates to compare
 * @returns {Date} the latest of the dates
 *
 * @example
 * // Which of these dates is the latest?
 * var result = max(
 *   new Date(1989, 6, 10),
 *   new Date(1987, 1, 11),
 *   new Date(1995, 6, 2),
 *   new Date(1990, 0, 1)
 * )
 * //=> Sun Jul 02 1995 00:00:00
 */
function max () {
  var dirtyDates = Array.prototype.slice.call(arguments)
  var dates = dirtyDates.map(function (dirtyDate) {
    return parse(dirtyDate)
  })
  var latestTimestamp = Math.max.apply(null, dates)
  return new Date(latestTimestamp)
}

module.exports = max


/***/ }),

/***/ "../app/node_modules/date-fns/min/index.js":
/*!*************************************************!*\
  !*** ../app/node_modules/date-fns/min/index.js ***!
  \*************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Common Helpers
 * @summary Return the earliest of the given dates.
 *
 * @description
 * Return the earliest of the given dates.
 *
 * @param {...(Date|String|Number)} dates - the dates to compare
 * @returns {Date} the earliest of the dates
 *
 * @example
 * // Which of these dates is the earliest?
 * var result = min(
 *   new Date(1989, 6, 10),
 *   new Date(1987, 1, 11),
 *   new Date(1995, 6, 2),
 *   new Date(1990, 0, 1)
 * )
 * //=> Wed Feb 11 1987 00:00:00
 */
function min () {
  var dirtyDates = Array.prototype.slice.call(arguments)
  var dates = dirtyDates.map(function (dirtyDate) {
    return parse(dirtyDate)
  })
  var earliestTimestamp = Math.min.apply(null, dates)
  return new Date(earliestTimestamp)
}

module.exports = min


/***/ }),

/***/ "../app/node_modules/date-fns/parse/index.js":
/*!***************************************************!*\
  !*** ../app/node_modules/date-fns/parse/index.js ***!
  \***************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getTimezoneOffsetInMilliseconds = __webpack_require__(/*! ../_lib/getTimezoneOffsetInMilliseconds/index.js */ "../app/node_modules/date-fns/_lib/getTimezoneOffsetInMilliseconds/index.js")
var isDate = __webpack_require__(/*! ../is_date/index.js */ "../app/node_modules/date-fns/is_date/index.js")

var MILLISECONDS_IN_HOUR = 3600000
var MILLISECONDS_IN_MINUTE = 60000
var DEFAULT_ADDITIONAL_DIGITS = 2

var parseTokenDateTimeDelimeter = /[T ]/
var parseTokenPlainTime = /:/

// year tokens
var parseTokenYY = /^(\d{2})$/
var parseTokensYYY = [
  /^([+-]\d{2})$/, // 0 additional digits
  /^([+-]\d{3})$/, // 1 additional digit
  /^([+-]\d{4})$/ // 2 additional digits
]

var parseTokenYYYY = /^(\d{4})/
var parseTokensYYYYY = [
  /^([+-]\d{4})/, // 0 additional digits
  /^([+-]\d{5})/, // 1 additional digit
  /^([+-]\d{6})/ // 2 additional digits
]

// date tokens
var parseTokenMM = /^-(\d{2})$/
var parseTokenDDD = /^-?(\d{3})$/
var parseTokenMMDD = /^-?(\d{2})-?(\d{2})$/
var parseTokenWww = /^-?W(\d{2})$/
var parseTokenWwwD = /^-?W(\d{2})-?(\d{1})$/

// time tokens
var parseTokenHH = /^(\d{2}([.,]\d*)?)$/
var parseTokenHHMM = /^(\d{2}):?(\d{2}([.,]\d*)?)$/
var parseTokenHHMMSS = /^(\d{2}):?(\d{2}):?(\d{2}([.,]\d*)?)$/

// timezone tokens
var parseTokenTimezone = /([Z+-].*)$/
var parseTokenTimezoneZ = /^(Z)$/
var parseTokenTimezoneHH = /^([+-])(\d{2})$/
var parseTokenTimezoneHHMM = /^([+-])(\d{2}):?(\d{2})$/

/**
 * @category Common Helpers
 * @summary Convert the given argument to an instance of Date.
 *
 * @description
 * Convert the given argument to an instance of Date.
 *
 * If the argument is an instance of Date, the function returns its clone.
 *
 * If the argument is a number, it is treated as a timestamp.
 *
 * If an argument is a string, the function tries to parse it.
 * Function accepts complete ISO 8601 formats as well as partial implementations.
 * ISO 8601: http://en.wikipedia.org/wiki/ISO_8601
 *
 * If all above fails, the function passes the given argument to Date constructor.
 *
 * @param {Date|String|Number} argument - the value to convert
 * @param {Object} [options] - the object with options
 * @param {0 | 1 | 2} [options.additionalDigits=2] - the additional number of digits in the extended year format
 * @returns {Date} the parsed date in the local time zone
 *
 * @example
 * // Convert string '2014-02-11T11:30:30' to date:
 * var result = parse('2014-02-11T11:30:30')
 * //=> Tue Feb 11 2014 11:30:30
 *
 * @example
 * // Parse string '+02014101',
 * // if the additional number of digits in the extended year format is 1:
 * var result = parse('+02014101', {additionalDigits: 1})
 * //=> Fri Apr 11 2014 00:00:00
 */
function parse (argument, dirtyOptions) {
  if (isDate(argument)) {
    // Prevent the date to lose the milliseconds when passed to new Date() in IE10
    return new Date(argument.getTime())
  } else if (typeof argument !== 'string') {
    return new Date(argument)
  }

  var options = dirtyOptions || {}
  var additionalDigits = options.additionalDigits
  if (additionalDigits == null) {
    additionalDigits = DEFAULT_ADDITIONAL_DIGITS
  } else {
    additionalDigits = Number(additionalDigits)
  }

  var dateStrings = splitDateString(argument)

  var parseYearResult = parseYear(dateStrings.date, additionalDigits)
  var year = parseYearResult.year
  var restDateString = parseYearResult.restDateString

  var date = parseDate(restDateString, year)

  if (date) {
    var timestamp = date.getTime()
    var time = 0
    var offset

    if (dateStrings.time) {
      time = parseTime(dateStrings.time)
    }

    if (dateStrings.timezone) {
      offset = parseTimezone(dateStrings.timezone) * MILLISECONDS_IN_MINUTE
    } else {
      var fullTime = timestamp + time
      var fullTimeDate = new Date(fullTime)

      offset = getTimezoneOffsetInMilliseconds(fullTimeDate)

      // Adjust time when it's coming from DST
      var fullTimeDateNextDay = new Date(fullTime)
      fullTimeDateNextDay.setDate(fullTimeDate.getDate() + 1)
      var offsetDiff =
        getTimezoneOffsetInMilliseconds(fullTimeDateNextDay) -
        getTimezoneOffsetInMilliseconds(fullTimeDate)
      if (offsetDiff > 0) {
        offset += offsetDiff
      }
    }

    return new Date(timestamp + time + offset)
  } else {
    return new Date(argument)
  }
}

function splitDateString (dateString) {
  var dateStrings = {}
  var array = dateString.split(parseTokenDateTimeDelimeter)
  var timeString

  if (parseTokenPlainTime.test(array[0])) {
    dateStrings.date = null
    timeString = array[0]
  } else {
    dateStrings.date = array[0]
    timeString = array[1]
  }

  if (timeString) {
    var token = parseTokenTimezone.exec(timeString)
    if (token) {
      dateStrings.time = timeString.replace(token[1], '')
      dateStrings.timezone = token[1]
    } else {
      dateStrings.time = timeString
    }
  }

  return dateStrings
}

function parseYear (dateString, additionalDigits) {
  var parseTokenYYY = parseTokensYYY[additionalDigits]
  var parseTokenYYYYY = parseTokensYYYYY[additionalDigits]

  var token

  // YYYY or ±YYYYY
  token = parseTokenYYYY.exec(dateString) || parseTokenYYYYY.exec(dateString)
  if (token) {
    var yearString = token[1]
    return {
      year: parseInt(yearString, 10),
      restDateString: dateString.slice(yearString.length)
    }
  }

  // YY or ±YYY
  token = parseTokenYY.exec(dateString) || parseTokenYYY.exec(dateString)
  if (token) {
    var centuryString = token[1]
    return {
      year: parseInt(centuryString, 10) * 100,
      restDateString: dateString.slice(centuryString.length)
    }
  }

  // Invalid ISO-formatted year
  return {
    year: null
  }
}

function parseDate (dateString, year) {
  // Invalid ISO-formatted year
  if (year === null) {
    return null
  }

  var token
  var date
  var month
  var week

  // YYYY
  if (dateString.length === 0) {
    date = new Date(0)
    date.setUTCFullYear(year)
    return date
  }

  // YYYY-MM
  token = parseTokenMM.exec(dateString)
  if (token) {
    date = new Date(0)
    month = parseInt(token[1], 10) - 1
    date.setUTCFullYear(year, month)
    return date
  }

  // YYYY-DDD or YYYYDDD
  token = parseTokenDDD.exec(dateString)
  if (token) {
    date = new Date(0)
    var dayOfYear = parseInt(token[1], 10)
    date.setUTCFullYear(year, 0, dayOfYear)
    return date
  }

  // YYYY-MM-DD or YYYYMMDD
  token = parseTokenMMDD.exec(dateString)
  if (token) {
    date = new Date(0)
    month = parseInt(token[1], 10) - 1
    var day = parseInt(token[2], 10)
    date.setUTCFullYear(year, month, day)
    return date
  }

  // YYYY-Www or YYYYWww
  token = parseTokenWww.exec(dateString)
  if (token) {
    week = parseInt(token[1], 10) - 1
    return dayOfISOYear(year, week)
  }

  // YYYY-Www-D or YYYYWwwD
  token = parseTokenWwwD.exec(dateString)
  if (token) {
    week = parseInt(token[1], 10) - 1
    var dayOfWeek = parseInt(token[2], 10) - 1
    return dayOfISOYear(year, week, dayOfWeek)
  }

  // Invalid ISO-formatted date
  return null
}

function parseTime (timeString) {
  var token
  var hours
  var minutes

  // hh
  token = parseTokenHH.exec(timeString)
  if (token) {
    hours = parseFloat(token[1].replace(',', '.'))
    return (hours % 24) * MILLISECONDS_IN_HOUR
  }

  // hh:mm or hhmm
  token = parseTokenHHMM.exec(timeString)
  if (token) {
    hours = parseInt(token[1], 10)
    minutes = parseFloat(token[2].replace(',', '.'))
    return (hours % 24) * MILLISECONDS_IN_HOUR +
      minutes * MILLISECONDS_IN_MINUTE
  }

  // hh:mm:ss or hhmmss
  token = parseTokenHHMMSS.exec(timeString)
  if (token) {
    hours = parseInt(token[1], 10)
    minutes = parseInt(token[2], 10)
    var seconds = parseFloat(token[3].replace(',', '.'))
    return (hours % 24) * MILLISECONDS_IN_HOUR +
      minutes * MILLISECONDS_IN_MINUTE +
      seconds * 1000
  }

  // Invalid ISO-formatted time
  return null
}

function parseTimezone (timezoneString) {
  var token
  var absoluteOffset

  // Z
  token = parseTokenTimezoneZ.exec(timezoneString)
  if (token) {
    return 0
  }

  // ±hh
  token = parseTokenTimezoneHH.exec(timezoneString)
  if (token) {
    absoluteOffset = parseInt(token[2], 10) * 60
    return (token[1] === '+') ? -absoluteOffset : absoluteOffset
  }

  // ±hh:mm or ±hhmm
  token = parseTokenTimezoneHHMM.exec(timezoneString)
  if (token) {
    absoluteOffset = parseInt(token[2], 10) * 60 + parseInt(token[3], 10)
    return (token[1] === '+') ? -absoluteOffset : absoluteOffset
  }

  return 0
}

function dayOfISOYear (isoYear, week, day) {
  week = week || 0
  day = day || 0
  var date = new Date(0)
  date.setUTCFullYear(isoYear, 0, 4)
  var fourthOfJanuaryDay = date.getUTCDay() || 7
  var diff = week * 7 + day + 1 - fourthOfJanuaryDay
  date.setUTCDate(date.getUTCDate() + diff)
  return date
}

module.exports = parse


/***/ }),

/***/ "../app/node_modules/date-fns/set_date/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/set_date/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Day Helpers
 * @summary Set the day of the month to the given date.
 *
 * @description
 * Set the day of the month to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} dayOfMonth - the day of the month of the new date
 * @returns {Date} the new date with the day of the month setted
 *
 * @example
 * // Set the 30th day of the month to 1 September 2014:
 * var result = setDate(new Date(2014, 8, 1), 30)
 * //=> Tue Sep 30 2014 00:00:00
 */
function setDate (dirtyDate, dirtyDayOfMonth) {
  var date = parse(dirtyDate)
  var dayOfMonth = Number(dirtyDayOfMonth)
  date.setDate(dayOfMonth)
  return date
}

module.exports = setDate


/***/ }),

/***/ "../app/node_modules/date-fns/set_day/index.js":
/*!*****************************************************!*\
  !*** ../app/node_modules/date-fns/set_day/index.js ***!
  \*****************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var addDays = __webpack_require__(/*! ../add_days/index.js */ "../app/node_modules/date-fns/add_days/index.js")

/**
 * @category Weekday Helpers
 * @summary Set the day of the week to the given date.
 *
 * @description
 * Set the day of the week to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} day - the day of the week of the new date
 * @param {Object} [options] - the object with options
 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
 * @returns {Date} the new date with the day of the week setted
 *
 * @example
 * // Set Sunday to 1 September 2014:
 * var result = setDay(new Date(2014, 8, 1), 0)
 * //=> Sun Aug 31 2014 00:00:00
 *
 * @example
 * // If week starts with Monday, set Sunday to 1 September 2014:
 * var result = setDay(new Date(2014, 8, 1), 0, {weekStartsOn: 1})
 * //=> Sun Sep 07 2014 00:00:00
 */
function setDay (dirtyDate, dirtyDay, dirtyOptions) {
  var weekStartsOn = dirtyOptions ? (Number(dirtyOptions.weekStartsOn) || 0) : 0
  var date = parse(dirtyDate)
  var day = Number(dirtyDay)
  var currentDay = date.getDay()

  var remainder = day % 7
  var dayIndex = (remainder + 7) % 7

  var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay
  return addDays(date, diff)
}

module.exports = setDay


/***/ }),

/***/ "../app/node_modules/date-fns/set_day_of_year/index.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/date-fns/set_day_of_year/index.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Day Helpers
 * @summary Set the day of the year to the given date.
 *
 * @description
 * Set the day of the year to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} dayOfYear - the day of the year of the new date
 * @returns {Date} the new date with the day of the year setted
 *
 * @example
 * // Set the 2nd day of the year to 2 July 2014:
 * var result = setDayOfYear(new Date(2014, 6, 2), 2)
 * //=> Thu Jan 02 2014 00:00:00
 */
function setDayOfYear (dirtyDate, dirtyDayOfYear) {
  var date = parse(dirtyDate)
  var dayOfYear = Number(dirtyDayOfYear)
  date.setMonth(0)
  date.setDate(dayOfYear)
  return date
}

module.exports = setDayOfYear


/***/ }),

/***/ "../app/node_modules/date-fns/set_hours/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/set_hours/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Hour Helpers
 * @summary Set the hours to the given date.
 *
 * @description
 * Set the hours to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} hours - the hours of the new date
 * @returns {Date} the new date with the hours setted
 *
 * @example
 * // Set 4 hours to 1 September 2014 11:30:00:
 * var result = setHours(new Date(2014, 8, 1, 11, 30), 4)
 * //=> Mon Sep 01 2014 04:30:00
 */
function setHours (dirtyDate, dirtyHours) {
  var date = parse(dirtyDate)
  var hours = Number(dirtyHours)
  date.setHours(hours)
  return date
}

module.exports = setHours


/***/ }),

/***/ "../app/node_modules/date-fns/set_iso_day/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/set_iso_day/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var addDays = __webpack_require__(/*! ../add_days/index.js */ "../app/node_modules/date-fns/add_days/index.js")
var getISODay = __webpack_require__(/*! ../get_iso_day/index.js */ "../app/node_modules/date-fns/get_iso_day/index.js")

/**
 * @category Weekday Helpers
 * @summary Set the day of the ISO week to the given date.
 *
 * @description
 * Set the day of the ISO week to the given date.
 * ISO week starts with Monday.
 * 7 is the index of Sunday, 1 is the index of Monday etc.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} day - the day of the ISO week of the new date
 * @returns {Date} the new date with the day of the ISO week setted
 *
 * @example
 * // Set Sunday to 1 September 2014:
 * var result = setISODay(new Date(2014, 8, 1), 7)
 * //=> Sun Sep 07 2014 00:00:00
 */
function setISODay (dirtyDate, dirtyDay) {
  var date = parse(dirtyDate)
  var day = Number(dirtyDay)
  var currentDay = getISODay(date)
  var diff = day - currentDay
  return addDays(date, diff)
}

module.exports = setISODay


/***/ }),

/***/ "../app/node_modules/date-fns/set_iso_week/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/set_iso_week/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var getISOWeek = __webpack_require__(/*! ../get_iso_week/index.js */ "../app/node_modules/date-fns/get_iso_week/index.js")

/**
 * @category ISO Week Helpers
 * @summary Set the ISO week to the given date.
 *
 * @description
 * Set the ISO week to the given date, saving the weekday number.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} isoWeek - the ISO week of the new date
 * @returns {Date} the new date with the ISO week setted
 *
 * @example
 * // Set the 53rd ISO week to 7 August 2004:
 * var result = setISOWeek(new Date(2004, 7, 7), 53)
 * //=> Sat Jan 01 2005 00:00:00
 */
function setISOWeek (dirtyDate, dirtyISOWeek) {
  var date = parse(dirtyDate)
  var isoWeek = Number(dirtyISOWeek)
  var diff = getISOWeek(date) - isoWeek
  date.setDate(date.getDate() - diff * 7)
  return date
}

module.exports = setISOWeek


/***/ }),

/***/ "../app/node_modules/date-fns/set_iso_year/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/set_iso_year/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var startOfISOYear = __webpack_require__(/*! ../start_of_iso_year/index.js */ "../app/node_modules/date-fns/start_of_iso_year/index.js")
var differenceInCalendarDays = __webpack_require__(/*! ../difference_in_calendar_days/index.js */ "../app/node_modules/date-fns/difference_in_calendar_days/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Set the ISO week-numbering year to the given date.
 *
 * @description
 * Set the ISO week-numbering year to the given date,
 * saving the week number and the weekday number.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} isoYear - the ISO week-numbering year of the new date
 * @returns {Date} the new date with the ISO week-numbering year setted
 *
 * @example
 * // Set ISO week-numbering year 2007 to 29 December 2008:
 * var result = setISOYear(new Date(2008, 11, 29), 2007)
 * //=> Mon Jan 01 2007 00:00:00
 */
function setISOYear (dirtyDate, dirtyISOYear) {
  var date = parse(dirtyDate)
  var isoYear = Number(dirtyISOYear)
  var diff = differenceInCalendarDays(date, startOfISOYear(date))
  var fourthOfJanuary = new Date(0)
  fourthOfJanuary.setFullYear(isoYear, 0, 4)
  fourthOfJanuary.setHours(0, 0, 0, 0)
  date = startOfISOYear(fourthOfJanuary)
  date.setDate(date.getDate() + diff)
  return date
}

module.exports = setISOYear


/***/ }),

/***/ "../app/node_modules/date-fns/set_milliseconds/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/set_milliseconds/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Millisecond Helpers
 * @summary Set the milliseconds to the given date.
 *
 * @description
 * Set the milliseconds to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} milliseconds - the milliseconds of the new date
 * @returns {Date} the new date with the milliseconds setted
 *
 * @example
 * // Set 300 milliseconds to 1 September 2014 11:30:40.500:
 * var result = setMilliseconds(new Date(2014, 8, 1, 11, 30, 40, 500), 300)
 * //=> Mon Sep 01 2014 11:30:40.300
 */
function setMilliseconds (dirtyDate, dirtyMilliseconds) {
  var date = parse(dirtyDate)
  var milliseconds = Number(dirtyMilliseconds)
  date.setMilliseconds(milliseconds)
  return date
}

module.exports = setMilliseconds


/***/ }),

/***/ "../app/node_modules/date-fns/set_minutes/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/set_minutes/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Minute Helpers
 * @summary Set the minutes to the given date.
 *
 * @description
 * Set the minutes to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} minutes - the minutes of the new date
 * @returns {Date} the new date with the minutes setted
 *
 * @example
 * // Set 45 minutes to 1 September 2014 11:30:40:
 * var result = setMinutes(new Date(2014, 8, 1, 11, 30, 40), 45)
 * //=> Mon Sep 01 2014 11:45:40
 */
function setMinutes (dirtyDate, dirtyMinutes) {
  var date = parse(dirtyDate)
  var minutes = Number(dirtyMinutes)
  date.setMinutes(minutes)
  return date
}

module.exports = setMinutes


/***/ }),

/***/ "../app/node_modules/date-fns/set_month/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/set_month/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var getDaysInMonth = __webpack_require__(/*! ../get_days_in_month/index.js */ "../app/node_modules/date-fns/get_days_in_month/index.js")

/**
 * @category Month Helpers
 * @summary Set the month to the given date.
 *
 * @description
 * Set the month to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} month - the month of the new date
 * @returns {Date} the new date with the month setted
 *
 * @example
 * // Set February to 1 September 2014:
 * var result = setMonth(new Date(2014, 8, 1), 1)
 * //=> Sat Feb 01 2014 00:00:00
 */
function setMonth (dirtyDate, dirtyMonth) {
  var date = parse(dirtyDate)
  var month = Number(dirtyMonth)
  var year = date.getFullYear()
  var day = date.getDate()

  var dateWithDesiredMonth = new Date(0)
  dateWithDesiredMonth.setFullYear(year, month, 15)
  dateWithDesiredMonth.setHours(0, 0, 0, 0)
  var daysInMonth = getDaysInMonth(dateWithDesiredMonth)
  // Set the last day of the new month
  // if the original date was the last day of the longer month
  date.setMonth(month, Math.min(day, daysInMonth))
  return date
}

module.exports = setMonth


/***/ }),

/***/ "../app/node_modules/date-fns/set_quarter/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/set_quarter/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")
var setMonth = __webpack_require__(/*! ../set_month/index.js */ "../app/node_modules/date-fns/set_month/index.js")

/**
 * @category Quarter Helpers
 * @summary Set the year quarter to the given date.
 *
 * @description
 * Set the year quarter to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} quarter - the quarter of the new date
 * @returns {Date} the new date with the quarter setted
 *
 * @example
 * // Set the 2nd quarter to 2 July 2014:
 * var result = setQuarter(new Date(2014, 6, 2), 2)
 * //=> Wed Apr 02 2014 00:00:00
 */
function setQuarter (dirtyDate, dirtyQuarter) {
  var date = parse(dirtyDate)
  var quarter = Number(dirtyQuarter)
  var oldQuarter = Math.floor(date.getMonth() / 3) + 1
  var diff = quarter - oldQuarter
  return setMonth(date, date.getMonth() + diff * 3)
}

module.exports = setQuarter


/***/ }),

/***/ "../app/node_modules/date-fns/set_seconds/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/set_seconds/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Second Helpers
 * @summary Set the seconds to the given date.
 *
 * @description
 * Set the seconds to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} seconds - the seconds of the new date
 * @returns {Date} the new date with the seconds setted
 *
 * @example
 * // Set 45 seconds to 1 September 2014 11:30:40:
 * var result = setSeconds(new Date(2014, 8, 1, 11, 30, 40), 45)
 * //=> Mon Sep 01 2014 11:30:45
 */
function setSeconds (dirtyDate, dirtySeconds) {
  var date = parse(dirtyDate)
  var seconds = Number(dirtySeconds)
  date.setSeconds(seconds)
  return date
}

module.exports = setSeconds


/***/ }),

/***/ "../app/node_modules/date-fns/set_year/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/set_year/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Year Helpers
 * @summary Set the year to the given date.
 *
 * @description
 * Set the year to the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} year - the year of the new date
 * @returns {Date} the new date with the year setted
 *
 * @example
 * // Set year 2013 to 1 September 2014:
 * var result = setYear(new Date(2014, 8, 1), 2013)
 * //=> Sun Sep 01 2013 00:00:00
 */
function setYear (dirtyDate, dirtyYear) {
  var date = parse(dirtyDate)
  var year = Number(dirtyYear)
  date.setFullYear(year)
  return date
}

module.exports = setYear


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_day/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_day/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Day Helpers
 * @summary Return the start of a day for the given date.
 *
 * @description
 * Return the start of a day for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the start of a day
 *
 * @example
 * // The start of a day for 2 September 2014 11:55:00:
 * var result = startOfDay(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Tue Sep 02 2014 00:00:00
 */
function startOfDay (dirtyDate) {
  var date = parse(dirtyDate)
  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = startOfDay


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_hour/index.js":
/*!***********************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_hour/index.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Hour Helpers
 * @summary Return the start of an hour for the given date.
 *
 * @description
 * Return the start of an hour for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the start of an hour
 *
 * @example
 * // The start of an hour for 2 September 2014 11:55:00:
 * var result = startOfHour(new Date(2014, 8, 2, 11, 55))
 * //=> Tue Sep 02 2014 11:00:00
 */
function startOfHour (dirtyDate) {
  var date = parse(dirtyDate)
  date.setMinutes(0, 0, 0)
  return date
}

module.exports = startOfHour


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_iso_week/index.js":
/*!***************************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_iso_week/index.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfWeek = __webpack_require__(/*! ../start_of_week/index.js */ "../app/node_modules/date-fns/start_of_week/index.js")

/**
 * @category ISO Week Helpers
 * @summary Return the start of an ISO week for the given date.
 *
 * @description
 * Return the start of an ISO week for the given date.
 * The result will be in the local timezone.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the start of an ISO week
 *
 * @example
 * // The start of an ISO week for 2 September 2014 11:55:00:
 * var result = startOfISOWeek(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Mon Sep 01 2014 00:00:00
 */
function startOfISOWeek (dirtyDate) {
  return startOfWeek(dirtyDate, {weekStartsOn: 1})
}

module.exports = startOfISOWeek


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_iso_year/index.js":
/*!***************************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_iso_year/index.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var getISOYear = __webpack_require__(/*! ../get_iso_year/index.js */ "../app/node_modules/date-fns/get_iso_year/index.js")
var startOfISOWeek = __webpack_require__(/*! ../start_of_iso_week/index.js */ "../app/node_modules/date-fns/start_of_iso_week/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Return the start of an ISO week-numbering year for the given date.
 *
 * @description
 * Return the start of an ISO week-numbering year,
 * which always starts 3 days before the year's first Thursday.
 * The result will be in the local timezone.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the start of an ISO year
 *
 * @example
 * // The start of an ISO week-numbering year for 2 July 2005:
 * var result = startOfISOYear(new Date(2005, 6, 2))
 * //=> Mon Jan 03 2005 00:00:00
 */
function startOfISOYear (dirtyDate) {
  var year = getISOYear(dirtyDate)
  var fourthOfJanuary = new Date(0)
  fourthOfJanuary.setFullYear(year, 0, 4)
  fourthOfJanuary.setHours(0, 0, 0, 0)
  var date = startOfISOWeek(fourthOfJanuary)
  return date
}

module.exports = startOfISOYear


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_minute/index.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_minute/index.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Minute Helpers
 * @summary Return the start of a minute for the given date.
 *
 * @description
 * Return the start of a minute for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the start of a minute
 *
 * @example
 * // The start of a minute for 1 December 2014 22:15:45.400:
 * var result = startOfMinute(new Date(2014, 11, 1, 22, 15, 45, 400))
 * //=> Mon Dec 01 2014 22:15:00
 */
function startOfMinute (dirtyDate) {
  var date = parse(dirtyDate)
  date.setSeconds(0, 0)
  return date
}

module.exports = startOfMinute


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_month/index.js":
/*!************************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_month/index.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Month Helpers
 * @summary Return the start of a month for the given date.
 *
 * @description
 * Return the start of a month for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the start of a month
 *
 * @example
 * // The start of a month for 2 September 2014 11:55:00:
 * var result = startOfMonth(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Mon Sep 01 2014 00:00:00
 */
function startOfMonth (dirtyDate) {
  var date = parse(dirtyDate)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = startOfMonth


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_quarter/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_quarter/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Quarter Helpers
 * @summary Return the start of a year quarter for the given date.
 *
 * @description
 * Return the start of a year quarter for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the start of a quarter
 *
 * @example
 * // The start of a quarter for 2 September 2014 11:55:00:
 * var result = startOfQuarter(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Tue Jul 01 2014 00:00:00
 */
function startOfQuarter (dirtyDate) {
  var date = parse(dirtyDate)
  var currentMonth = date.getMonth()
  var month = currentMonth - currentMonth % 3
  date.setMonth(month, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = startOfQuarter


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_second/index.js":
/*!*************************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_second/index.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Second Helpers
 * @summary Return the start of a second for the given date.
 *
 * @description
 * Return the start of a second for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the start of a second
 *
 * @example
 * // The start of a second for 1 December 2014 22:15:45.400:
 * var result = startOfSecond(new Date(2014, 11, 1, 22, 15, 45, 400))
 * //=> Mon Dec 01 2014 22:15:45.000
 */
function startOfSecond (dirtyDate) {
  var date = parse(dirtyDate)
  date.setMilliseconds(0)
  return date
}

module.exports = startOfSecond


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_today/index.js":
/*!************************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_today/index.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var startOfDay = __webpack_require__(/*! ../start_of_day/index.js */ "../app/node_modules/date-fns/start_of_day/index.js")

/**
 * @category Day Helpers
 * @summary Return the start of today.
 *
 * @description
 * Return the start of today.
 *
 * @returns {Date} the start of today
 *
 * @example
 * // If today is 6 October 2014:
 * var result = startOfToday()
 * //=> Mon Oct 6 2014 00:00:00
 */
function startOfToday () {
  return startOfDay(new Date())
}

module.exports = startOfToday


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_tomorrow/index.js":
/*!***************************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_tomorrow/index.js ***!
  \***************************************************************/
/***/ ((module) => {

/**
 * @category Day Helpers
 * @summary Return the start of tomorrow.
 *
 * @description
 * Return the start of tomorrow.
 *
 * @returns {Date} the start of tomorrow
 *
 * @example
 * // If today is 6 October 2014:
 * var result = startOfTomorrow()
 * //=> Tue Oct 7 2014 00:00:00
 */
function startOfTomorrow () {
  var now = new Date()
  var year = now.getFullYear()
  var month = now.getMonth()
  var day = now.getDate()

  var date = new Date(0)
  date.setFullYear(year, month, day + 1)
  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = startOfTomorrow


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_week/index.js":
/*!***********************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_week/index.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Week Helpers
 * @summary Return the start of a week for the given date.
 *
 * @description
 * Return the start of a week for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @param {Object} [options] - the object with options
 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
 * @returns {Date} the start of a week
 *
 * @example
 * // The start of a week for 2 September 2014 11:55:00:
 * var result = startOfWeek(new Date(2014, 8, 2, 11, 55, 0))
 * //=> Sun Aug 31 2014 00:00:00
 *
 * @example
 * // If the week starts on Monday, the start of the week for 2 September 2014 11:55:00:
 * var result = startOfWeek(new Date(2014, 8, 2, 11, 55, 0), {weekStartsOn: 1})
 * //=> Mon Sep 01 2014 00:00:00
 */
function startOfWeek (dirtyDate, dirtyOptions) {
  var weekStartsOn = dirtyOptions ? (Number(dirtyOptions.weekStartsOn) || 0) : 0

  var date = parse(dirtyDate)
  var day = date.getDay()
  var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn

  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = startOfWeek


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_year/index.js":
/*!***********************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_year/index.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var parse = __webpack_require__(/*! ../parse/index.js */ "../app/node_modules/date-fns/parse/index.js")

/**
 * @category Year Helpers
 * @summary Return the start of a year for the given date.
 *
 * @description
 * Return the start of a year for the given date.
 * The result will be in the local timezone.
 *
 * @param {Date|String|Number} date - the original date
 * @returns {Date} the start of a year
 *
 * @example
 * // The start of a year for 2 September 2014 11:55:00:
 * var result = startOfYear(new Date(2014, 8, 2, 11, 55, 00))
 * //=> Wed Jan 01 2014 00:00:00
 */
function startOfYear (dirtyDate) {
  var cleanDate = parse(dirtyDate)
  var date = new Date(0)
  date.setFullYear(cleanDate.getFullYear(), 0, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = startOfYear


/***/ }),

/***/ "../app/node_modules/date-fns/start_of_yesterday/index.js":
/*!****************************************************************!*\
  !*** ../app/node_modules/date-fns/start_of_yesterday/index.js ***!
  \****************************************************************/
/***/ ((module) => {

/**
 * @category Day Helpers
 * @summary Return the start of yesterday.
 *
 * @description
 * Return the start of yesterday.
 *
 * @returns {Date} the start of yesterday
 *
 * @example
 * // If today is 6 October 2014:
 * var result = startOfYesterday()
 * //=> Sun Oct 5 2014 00:00:00
 */
function startOfYesterday () {
  var now = new Date()
  var year = now.getFullYear()
  var month = now.getMonth()
  var day = now.getDate()

  var date = new Date(0)
  date.setFullYear(year, month, day - 1)
  date.setHours(0, 0, 0, 0)
  return date
}

module.exports = startOfYesterday


/***/ }),

/***/ "../app/node_modules/date-fns/sub_days/index.js":
/*!******************************************************!*\
  !*** ../app/node_modules/date-fns/sub_days/index.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addDays = __webpack_require__(/*! ../add_days/index.js */ "../app/node_modules/date-fns/add_days/index.js")

/**
 * @category Day Helpers
 * @summary Subtract the specified number of days from the given date.
 *
 * @description
 * Subtract the specified number of days from the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of days to be subtracted
 * @returns {Date} the new date with the days subtracted
 *
 * @example
 * // Subtract 10 days from 1 September 2014:
 * var result = subDays(new Date(2014, 8, 1), 10)
 * //=> Fri Aug 22 2014 00:00:00
 */
function subDays (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addDays(dirtyDate, -amount)
}

module.exports = subDays


/***/ }),

/***/ "../app/node_modules/date-fns/sub_hours/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/sub_hours/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addHours = __webpack_require__(/*! ../add_hours/index.js */ "../app/node_modules/date-fns/add_hours/index.js")

/**
 * @category Hour Helpers
 * @summary Subtract the specified number of hours from the given date.
 *
 * @description
 * Subtract the specified number of hours from the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of hours to be subtracted
 * @returns {Date} the new date with the hours subtracted
 *
 * @example
 * // Subtract 2 hours from 11 July 2014 01:00:00:
 * var result = subHours(new Date(2014, 6, 11, 1, 0), 2)
 * //=> Thu Jul 10 2014 23:00:00
 */
function subHours (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addHours(dirtyDate, -amount)
}

module.exports = subHours


/***/ }),

/***/ "../app/node_modules/date-fns/sub_iso_years/index.js":
/*!***********************************************************!*\
  !*** ../app/node_modules/date-fns/sub_iso_years/index.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addISOYears = __webpack_require__(/*! ../add_iso_years/index.js */ "../app/node_modules/date-fns/add_iso_years/index.js")

/**
 * @category ISO Week-Numbering Year Helpers
 * @summary Subtract the specified number of ISO week-numbering years from the given date.
 *
 * @description
 * Subtract the specified number of ISO week-numbering years from the given date.
 *
 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of ISO week-numbering years to be subtracted
 * @returns {Date} the new date with the ISO week-numbering years subtracted
 *
 * @example
 * // Subtract 5 ISO week-numbering years from 1 September 2014:
 * var result = subISOYears(new Date(2014, 8, 1), 5)
 * //=> Mon Aug 31 2009 00:00:00
 */
function subISOYears (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addISOYears(dirtyDate, -amount)
}

module.exports = subISOYears


/***/ }),

/***/ "../app/node_modules/date-fns/sub_milliseconds/index.js":
/*!**************************************************************!*\
  !*** ../app/node_modules/date-fns/sub_milliseconds/index.js ***!
  \**************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addMilliseconds = __webpack_require__(/*! ../add_milliseconds/index.js */ "../app/node_modules/date-fns/add_milliseconds/index.js")

/**
 * @category Millisecond Helpers
 * @summary Subtract the specified number of milliseconds from the given date.
 *
 * @description
 * Subtract the specified number of milliseconds from the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of milliseconds to be subtracted
 * @returns {Date} the new date with the milliseconds subtracted
 *
 * @example
 * // Subtract 750 milliseconds from 10 July 2014 12:45:30.000:
 * var result = subMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
 * //=> Thu Jul 10 2014 12:45:29.250
 */
function subMilliseconds (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addMilliseconds(dirtyDate, -amount)
}

module.exports = subMilliseconds


/***/ }),

/***/ "../app/node_modules/date-fns/sub_minutes/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/sub_minutes/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addMinutes = __webpack_require__(/*! ../add_minutes/index.js */ "../app/node_modules/date-fns/add_minutes/index.js")

/**
 * @category Minute Helpers
 * @summary Subtract the specified number of minutes from the given date.
 *
 * @description
 * Subtract the specified number of minutes from the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of minutes to be subtracted
 * @returns {Date} the new date with the mintues subtracted
 *
 * @example
 * // Subtract 30 minutes from 10 July 2014 12:00:00:
 * var result = subMinutes(new Date(2014, 6, 10, 12, 0), 30)
 * //=> Thu Jul 10 2014 11:30:00
 */
function subMinutes (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addMinutes(dirtyDate, -amount)
}

module.exports = subMinutes


/***/ }),

/***/ "../app/node_modules/date-fns/sub_months/index.js":
/*!********************************************************!*\
  !*** ../app/node_modules/date-fns/sub_months/index.js ***!
  \********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addMonths = __webpack_require__(/*! ../add_months/index.js */ "../app/node_modules/date-fns/add_months/index.js")

/**
 * @category Month Helpers
 * @summary Subtract the specified number of months from the given date.
 *
 * @description
 * Subtract the specified number of months from the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of months to be subtracted
 * @returns {Date} the new date with the months subtracted
 *
 * @example
 * // Subtract 5 months from 1 February 2015:
 * var result = subMonths(new Date(2015, 1, 1), 5)
 * //=> Mon Sep 01 2014 00:00:00
 */
function subMonths (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addMonths(dirtyDate, -amount)
}

module.exports = subMonths


/***/ }),

/***/ "../app/node_modules/date-fns/sub_quarters/index.js":
/*!**********************************************************!*\
  !*** ../app/node_modules/date-fns/sub_quarters/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addQuarters = __webpack_require__(/*! ../add_quarters/index.js */ "../app/node_modules/date-fns/add_quarters/index.js")

/**
 * @category Quarter Helpers
 * @summary Subtract the specified number of year quarters from the given date.
 *
 * @description
 * Subtract the specified number of year quarters from the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of quarters to be subtracted
 * @returns {Date} the new date with the quarters subtracted
 *
 * @example
 * // Subtract 3 quarters from 1 September 2014:
 * var result = subQuarters(new Date(2014, 8, 1), 3)
 * //=> Sun Dec 01 2013 00:00:00
 */
function subQuarters (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addQuarters(dirtyDate, -amount)
}

module.exports = subQuarters


/***/ }),

/***/ "../app/node_modules/date-fns/sub_seconds/index.js":
/*!*********************************************************!*\
  !*** ../app/node_modules/date-fns/sub_seconds/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addSeconds = __webpack_require__(/*! ../add_seconds/index.js */ "../app/node_modules/date-fns/add_seconds/index.js")

/**
 * @category Second Helpers
 * @summary Subtract the specified number of seconds from the given date.
 *
 * @description
 * Subtract the specified number of seconds from the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of seconds to be subtracted
 * @returns {Date} the new date with the seconds subtracted
 *
 * @example
 * // Subtract 30 seconds from 10 July 2014 12:45:00:
 * var result = subSeconds(new Date(2014, 6, 10, 12, 45, 0), 30)
 * //=> Thu Jul 10 2014 12:44:30
 */
function subSeconds (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addSeconds(dirtyDate, -amount)
}

module.exports = subSeconds


/***/ }),

/***/ "../app/node_modules/date-fns/sub_weeks/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/sub_weeks/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addWeeks = __webpack_require__(/*! ../add_weeks/index.js */ "../app/node_modules/date-fns/add_weeks/index.js")

/**
 * @category Week Helpers
 * @summary Subtract the specified number of weeks from the given date.
 *
 * @description
 * Subtract the specified number of weeks from the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of weeks to be subtracted
 * @returns {Date} the new date with the weeks subtracted
 *
 * @example
 * // Subtract 4 weeks from 1 September 2014:
 * var result = subWeeks(new Date(2014, 8, 1), 4)
 * //=> Mon Aug 04 2014 00:00:00
 */
function subWeeks (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addWeeks(dirtyDate, -amount)
}

module.exports = subWeeks


/***/ }),

/***/ "../app/node_modules/date-fns/sub_years/index.js":
/*!*******************************************************!*\
  !*** ../app/node_modules/date-fns/sub_years/index.js ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var addYears = __webpack_require__(/*! ../add_years/index.js */ "../app/node_modules/date-fns/add_years/index.js")

/**
 * @category Year Helpers
 * @summary Subtract the specified number of years from the given date.
 *
 * @description
 * Subtract the specified number of years from the given date.
 *
 * @param {Date|String|Number} date - the date to be changed
 * @param {Number} amount - the amount of years to be subtracted
 * @returns {Date} the new date with the years subtracted
 *
 * @example
 * // Subtract 5 years from 1 September 2014:
 * var result = subYears(new Date(2014, 8, 1), 5)
 * //=> Tue Sep 01 2009 00:00:00
 */
function subYears (dirtyDate, dirtyAmount) {
  var amount = Number(dirtyAmount)
  return addYears(dirtyDate, -amount)
}

module.exports = subYears


/***/ })

}]);
//# sourceMappingURL=date-fns.chunk.js.map