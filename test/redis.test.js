require('dotenv').config()
const RedisPlugin = require('../lib/redis')

describe('Start Handler', () => {
  let ctx = null
  let plugin = null 
  beforeEach(() => {
    ctx = {
      env: { },
      state: { }
    }
    plugin = new RedisPlugin()
  })
  afterEach(async () => {
    await plugin.teardown()
  })
  it ('should throw if FUNC_REDIS_URL is not defined', async () => {
    let error = null
    try {
      await plugin.start(ctx, noop)
    } catch (err) {
      error = err
    }
    expect(error).toBeTruthy()
    expect(error.message).toEqual(expect.stringContaining("FUNC_REDIS_URL"))
  })
  it ('should create a connection with a valid FUNC_REDIS_URL and FUNC_REDIS_PASSWORD', async () => {
    ctx.env.FUNC_REDIS_URL = process.env.FUNC_REDIS_URL
    ctx.env.FUNC_REDIS_PASSWORD = process.env.FUNC_REDIS_PASSWORD
    await plugin.start(ctx, noop)
    expect(ctx.state.redis).toBeTruthy()
    expect(ctx.state.redis.connected).toBeTruthy()
  })
}) 

describe('Request Handler', () => {
  let ctx = null
  let plugin = null 
  beforeEach(() => {
    ctx = {
      env: { 
        FUNC_REDIS_URL: process.env.FUNC_REDIS_URL,
        FUNC_REDIS_PASSWORD: process.env.FUNC_REDIS_PASSWORD
      },
      state: { }
    }
    plugin = new RedisPlugin()
  })
  afterEach(async () => {
    await plugin.teardown()
  })
  it ('should set ctx.state.redis in a coldstart request', async () => {
    await plugin.start(ctx, noop)
    await plugin.request(ctx, noop)
    expect(ctx.state.redis).toBeTruthy()
    expect(ctx.state.redis.connected).toBeTruthy()
  })
  it ('should set ctx.state.redis for a warm request', async () => {
    await plugin.start(ctx, noop)
    ctx = {
      env: { },
      state: { }
    }
    await plugin.request(ctx, noop)
    expect(ctx.state.redis).toBeTruthy()
    expect(ctx.state.redis.connected).toBeTruthy()
  })
  it ('should reconnect if client is disconnected after coldstart', async () => {
    await plugin.start(ctx, noop)
    await plugin.client.end(true) // manually close it
    expect(plugin.client.connected).toBeFalsy()
    await plugin.request(ctx, noop)
    expect(ctx.state.redis).toBeTruthy()
    expect(ctx.state.redis.connected).toBeTruthy()
  })
})

describe('Error Handler', () => {
  let ctx = null
  let plugin = null 
  beforeEach(() => {
    ctx = {
      env: { 
        FUNC_REDIS_URL: process.env.FUNC_REDIS_URL,
        FUNC_REDIS_PASSWORD: process.env.FUNC_REDIS_PASSWORD
      },
      state: { }
    }
    plugin = new RedisPlugin()
  })
  afterEach(async () => {
    await plugin.teardown()
  })
  it ('should close connection on unhandled error', async () => {
    await plugin.start(ctx, noop)
    expect(ctx.state.redis).toBeTruthy()
    expect(ctx.state.redis.connected).toBeTruthy()
    await plugin.error(ctx, noop)
    expect(ctx.state.redis.connected).toBeFalsy()
    expect(plugin.client).toBeFalsy()
  })
})

function noop() { }
