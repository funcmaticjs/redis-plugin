const redis = require('redis')
const noop = () => { }

class RedisPlugin {

  constructor(options) {
    options = options || { }
    this.client = null
  }

  async start(ctx, next) {
    if (!ctx.env.FUNC_REDIS_URL) throw new Error("Must provide 'FUNC_REDIS_URL' in ctx.env")
    if (!ctx.env.FUNC_REDIS_PASSWORD) throw new Error("Must provide 'FUNC_REDIS_PASSWORD' in ctx.env")
    let options = { }
    if (ctx.env.FUNC_REDIS_PASSWORD) {
      options.password = ctx.env.FUNC_REDIS_PASSWORD
    }
    this.client = await this.connect(ctx.env.FUNC_REDIS_URL, options)
    ctx.state.redis = this.client
    await next()
  }

  async request(ctx, next) {
    if (!this.isConnected(this.client)) { 
      // not sure if this is possible but I THINK it is possible
      // that a cached connection may no longer be connected IF
      // redis server closes it. 
      await this.start(ctx, noop)
    }
    if (!ctx.state.redis) {
      ctx.state.redis = this.client
    }
    await next()
    // we cache the connection meaning we 
    // don't explicity close the connection
  }

  async error(ctx, next) {
    await this.teardown(ctx, noop)
    await next()
  }

  async teardown() {
    try {
      if (this.isConnected(this.client)) {
        await this.quit(this.client)
      }
    } catch (err) {
    } finally {
      this.client = null
    }
  }

  async connect(uri, options) {
    options = options || { }
    let client = redis.createClient(uri, options)
    return new Promise((resolve, reject) => {
      client.on("connect", () => {
        resolve(client)
        return
      })
      client.on("error", (err) => {
        reject(err)
        return
      }) 
    })
  }

  async quit(client) {
    return new Promise((resolve, reject) => {
      client.on("end", () => {
        resolve(true)
        return
      })
      client.on("error", (err) => {
        console.error(err)
        reject(err)
        return
      })
      client.quit()
    })
  }

  isConnected(client) {
    return client && client.connected
  }
} 

module.exports = RedisPlugin