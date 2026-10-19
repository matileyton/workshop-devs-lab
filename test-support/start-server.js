// Levanta createApp() en un puerto libre (puerto 0) y devuelve la URL base y un close().
// El import es dinámico para que cada test falle por separado si src/server.js no existe.
export async function startServer() {
  const { createApp } = await import('../src/server.js')
  const server = createApp()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve)
        server.closeAllConnections()
      }),
  }
}

export async function withServer(fn) {
  const app = await startServer()
  try {
    return await fn(app.baseUrl)
  } finally {
    await app.close()
  }
}
