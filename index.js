const request = require('axios')

// Config for health check endpoint
function getSspaiArticleInfoURL() {
    return `https://sspai.com/api/v1/matrix/editor/article/self/page/get?limit=100&offset=0&created_at=${Math.floor(Date.now()/1000)}&type=5`
}

const token = process.env.SSPAI_TOKEN

// Initialize Prometheus
const Prometheus = require('prom-client')
const collectDefaultMetrics = Prometheus.collectDefaultMetrics
collectDefaultMetrics({
  timeout: 5000
})

// Get articles info
async function getArticlesInfo () {
  const response = await request.get(getSspaiArticleInfoURL(), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  return response.data.data.map(article => {
    return {
        title: article.title,
        views: article.view_count,
        likes: article.like_count,
        comments: article.comment_count
    }
  })
}

new Prometheus.Gauge({
  name: 'article_info',
  help: 'The views and likes of article',
  labelNames: ['title', 'type'],
  async collect () {
    const articlesInfo = await getArticlesInfo()
    articlesInfo.forEach(info => {
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
  res.end(await Prometheus.register.metrics())
})

app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})
