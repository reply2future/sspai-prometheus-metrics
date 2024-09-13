/**
 * simply check to see if the token is valid
 * @param {string} token
 * @returns {boolean}
 */
function isValid (token) {
  return !!token && token.split('.').length === 3
}

function getDateTimeMs (token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64')).exp * 1000
}

function isExpired (token) {
  return getDateTimeMs(token) <= Date.now()
}

/**
 * 7 days will expire or expired would trigger to notify
 * @param {string} token
 * @returns {shouldNotify: boolean, message: string}
 */
function checkIfShouldNotify (token) {
  const timeMsDiff = getDateTimeMs(token) - Date.now()
  const shouldNotify = (timeMsDiff <= 7 * 24 * 3600 * 1000)

  return {
    shouldNotify,
    message: shouldNotify ? `Token expired in ${timeMsDiff / (1000 * 3600 * 24)} days` : 'Token is valid'
  }
}

module.exports = {
  isValid,
  checkIfShouldNotify
}
