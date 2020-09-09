const DateDiff = {
  toDate: function (d) {
    return typeof d == 'object' && d.getTime ? d : new Date(d)
  },

  inHours: function (d1, d2, round = false) {
    d1 = this.toDate(d1)
    d2 = this.toDate(d2)
    const t2 = d2.getTime()
    const t1 = d1.getTime()
    const diff = (t2 - t1) / (3600 * 1000)
    return round ? parseInt(diff) : Math.round(diff)
  },

  inDays: function (d1, d2, round = false) {
    d1 = this.toDate(d1)
    d2 = this.toDate(d2)
    const t2 = d2.getTime()
    const t1 = d1.getTime()
    const diff = (t2 - t1) / (24 * 3600 * 1000)
    return round ? parseInt(diff) : Math.round(diff)
  },

  inWeeks: function (d1, d2, round = false) {
    d1 = this.toDate(d1)
    d2 = this.toDate(d2)
    const t2 = d2.getTime()
    const t1 = d1.getTime()
    const diff = (t2 - t1) / (24 * 3600 * 1000 * 7)
    return round ? parseInt(diff) : Math.round(diff)
  },

  inMonths: function (d1, d2) {
    d1 = this.toDate(d1)
    d2 = this.toDate(d2)
    const d1Y = d1.getFullYear()
    const d2Y = d2.getFullYear()
    const d1M = d1.getMonth()
    const d2M = d2.getMonth()
    const diff = d2M + 12 * d2Y - (d1M + 12 * d1Y)
    return diff
  },

  inYears: function (d1, d2) {
    d1 = this.toDate(d1)
    d2 = this.toDate(d2)
    return d2.getFullYear() - d1.getFullYear()
  },

  dateNow: () => {
    return Date.now()
  },

  asAge: function (d1) {
    if (!d1) return 'now' // no date!

    d1 = this.toDate(d1)
    // figure out the age of the given date in either days, weeks, months, or years
    const d2 = this.dateNow() // date now
    const hours = this.inHours(d1, d2, true)
    const days = this.inDays(d1, d2, true)
    const weeks = this.inWeeks(d1, d2, true)
    const weeksPlural = weeks > 1 ? 's' : ''
    const months = this.inMonths(d1, d2)
    const monthsPlural = months > 1 ? 's' : ''
    const years = this.inYears(d1, d2)
    const yearsPlural = years > 1 ? 's' : ''

    // return the appropriate unit of measurement
    if (years >= 1) return `${years} year${yearsPlural} ago`
    else if (months >= 1) return `${months} month${monthsPlural} ago`
    else if (weeks >= 1) return `${weeks} week${weeksPlural} ago`
    else if (days > 1) return `${days} days ago`
    else if (days == 1) return `yesterday`
    else if (days == 0) return `${hours} hours ago`
  },
}
