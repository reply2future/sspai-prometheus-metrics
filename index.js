const request = require('axios')
const { isValid, checkIfShouldNotify } = require('./token')

// numbers per page
const LIMIT = 100
const ARTICLE_TYPE = '5'

// check token schedule time gap
const SCHEDULE_TIME_GAP = 1000 * 3600 * 24 * 7

// Config for health check endpoint
function getSspaiArticleInfoURL ({ limit, offset }) {
  return `https://sspai.com/api/v1/matrix/editor/article/self/page/get?limit=${
    limit ?? LIMIT
  }&offset=${offset ?? 0}&created_at=${Math.floor(
    Date.now() / 1000
  )}&type=${ARTICLE_TYPE}`
}

const token = process.env.SSPAI_TOKEN
if (!isValid(token)) {
  console.error(`Invalid token: ${token}`)
  process.exit(1)
}

const tokenExpNotifyWebHookURL = process.env.TOKEN_EXP_NOTIFY_WEBHOOK_URL
setInterval(() => {
  const { shouldNotify, message } = checkIfShouldNotify(token)

  if (!shouldNotify) {
    console.info(message)
    return
  }

  if (tokenExpNotifyWebHookURL) {
    request
      .post(tokenExpNotifyWebHookURL, {
        data: { message }
      })
      .then(() => console.log('Token Expiry Notification Sent'))
  }
}, SCHEDULE_TIME_GAP)

// Initialize Prometheus
const Prometheus = require('prom-client')
const collectDefaultMetrics = Prometheus.collectDefaultMetrics
collectDefaultMetrics({
  timeout: 5000
})

// Get articles info
async function getArticlesInfo () {
  const articlesInfo = []
  let offset = 0

  while (true) {
    const response = await request.get(
      getSspaiArticleInfoURL({ limit: LIMIT, offset }),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    if (!response.data.data) throw new Error('Invalid response')

    response.data.data.forEach((article) => {
      articlesInfo.push({
        title: article.title,
        views: article.view_count,
        likes: article.like_count,
        comments: article.comment_count
      })
    })

    if (response.data.data.length === 0 || response.data.data.length < LIMIT) { break }

    offset += LIMIT
  }

  return articlesInfo
}

new Prometheus.Gauge({
  name: 'article_info',
  help: 'The views and likes of article',
  labelNames: ['title', 'type'],
  async collect () {
    const articlesInfo = await getArticlesInfo()
    articlesInfo.forEach((info) => {
      this.set({ title: info.title, type: 'likes' }, info.likes)
      this.set({ title: info.title, type: 'views' }, info.views)
      this.set({ title: info.title, type: 'comments' }, info.comments)
    })
  }
})

const express = require('express')
const app = express()
const port = 3000

app.get('/metrics', async (req, res) => {
  try {
    res.end(await Prometheus.register.metrics())
  } catch (error) {
    console.error(error)
    res.status(500).send(`You should check the log: ${error.toString()}`)
  }
})

app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})
