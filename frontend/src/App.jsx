import { useState, useEffect, useCallback } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom'

// Lee la URL del backend desde la variable de entorno VITE_API_URL
const ENV_API_URL = import.meta.env.VITE_API_URL || ''
const TOKEN_STORAGE_KEY = 'token'

// Componente de Ruta Protegida: redirige a /login si no hay token
function ProtectedRoute({ token, children }) {
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

// Barra de Navegación Principal
function NavigationBar({ token, onLogout }) {
  const location = useLocation()

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm mb-4">
      <div className="container" style={{ maxWidth: '820px' }}>
        <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/">
          <span className="badge bg-primary">AWS</span>
          <span>To-Do CRUD</span>
        </Link>

        <div className="d-flex align-items-center gap-2 ms-auto">
          {token && (
            <Link
              to="/"
              className={`btn btn-sm ${
                location.pathname === '/' ? 'btn-primary' : 'btn-outline-light'
              }`}
            >
              Tareas
            </Link>
          )}
          <Link
            to="/about"
            className={`btn btn-sm ${
              location.pathname === '/about' ? 'btn-primary' : 'btn-outline-light'
            }`}
          >
            Acerca de
          </Link>
          {token ? (
            <button
              type="button"
              className="btn btn-sm btn-danger ms-2"
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          ) : (
            location.pathname !== '/login' && (
              <Link to="/login" className="btn btn-sm btn-success ms-2">
                Iniciar sesión
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  )
}

// Vista /login: Formulario de autenticación contra POST /login
function LoginPage({ getBaseUrl, token, onLoginSuccess }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token) {
      navigate('/', { replace: true })
    }
  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const baseUrl = getBaseUrl()
      if (!baseUrl) {
        throw new Error('La URL del backend (API Gateway) no está configurada.')
      }

      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || `Error HTTP ${response.status}`)
      }

      if (!data.token) {
        throw new Error('El servidor no devolvió un token válido.')
      }

      onLoginSuccess(data.token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-md-7 col-lg-6">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <span className="badge bg-primary bg-opacity-10 text-primary mb-2 px-3 py-2 rounded-pill fw-semibold">
                Autenticación requerida
              </span>
              <h2 className="h4 fw-bold text-dark">Iniciar Sesión</h2>
              <p className="text-muted small mb-0">
                Ingresa tus credenciales para gestionar tus tareas
              </p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="username" className="form-label fw-medium">
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  className="form-control"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="form-label fw-medium">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-semibold"
                disabled={loading}
              >
                {loading ? 'Verificando credenciales...' : 'Ingresar'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-top text-center">
              <small className="text-muted d-block">
                Credenciales de prueba para la clase:
              </small>
              <code className="small">usuario: admin | contraseña: password123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Vista /about: Página estática con información del proyecto
function AboutPage({ apiUrl }) {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4 p-md-5">
        <span className="badge bg-info bg-opacity-10 text-info mb-2 px-3 py-2 rounded-pill fw-semibold">
          Pruebas de Software
        </span>
        <h2 className="fw-bold text-dark mb-3">Acerca del Proyecto</h2>
        <p className="text-secondary">
          Esta aplicación es un sistema <strong>To-Do List Serverless con CRUD completo y Autenticación</strong>,
          desarrollado para la materia de <strong>Pruebas de Software</strong> y desplegado 100% en AWS
          mediante Infraestructura como Código con <strong>OpenTofu</strong>.
        </p>

        <div className="row g-3 my-3">
          <div className="col-md-6">
            <div className="p-3 bg-light rounded-3 h-100">
              <h6 className="fw-bold text-primary mb-2">Frontend (S3 Static Hosting)</h6>
              <ul className="small text-secondary mb-0 ps-3">
                <li>React 18 compilado con Vite.</li>
                <li>Diseño responsivo con Bootstrap 5.</li>
                <li>Enrutamiento SPA con <code>react-router-dom</code> (<code>/login</code>, <code>/</code>, <code>/about</code>).</li>
                <li>Protección de rutas con token en <code>localStorage</code>.</li>
              </ul>
            </div>
          </div>

          <div className="col-md-6">
            <div className="p-3 bg-light rounded-3 h-100">
              <h6 className="fw-bold text-success mb-2">Backend & Seguridad (AWS)</h6>
              <ul className="small text-secondary mb-0 ps-3">
                <li>AWS Lambda en Node.js 20.x con validación de token en <code>Authorization</code>.</li>
                <li>Persistencia NoSQL en Amazon DynamoDB (<code>PAY_PER_REQUEST</code>).</li>
                <li>API Gateway REST con integración <code>AWS_PROXY</code> y CORS.</li>
                <li>Resource Policy que restringe el acceso exclusivamente a la IP autorizada (<code>allowed_ip</code>).</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-top d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <small className="text-muted">
            Endpoint API activo: <code>{apiUrl || 'Cargando...'}</code>
          </small>
          <Link to="/" className="btn btn-sm btn-outline-primary">
            Volver a mis tareas
          </Link>
        </div>
      </div>
    </div>
  )
}

// Vista / (Protegida): Lista de tareas y operaciones CRUD con encabezado Authorization
function TodosPage({ getBaseUrl, token, onUnauthorized }) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Estado del formulario de creación
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // Estado para edición en línea
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const getTodosEndpoint = useCallback(
    (path = '') => {
      const base = getBaseUrl()
      return base ? `${base}/todos${path}` : ''
    },
    [getBaseUrl]
  )

  const getAuthHeaders = useCallback(
    (includeJson = false) => {
      const headers = {
        Authorization: `Bearer ${token}`,
      }
      if (includeJson) {
        headers['Content-Type'] = 'application/json'
      }
      return headers
    },
    [token]
  )

  // READ: Obtener todas las tareas
  const fetchTodos = useCallback(async () => {
    const endpoint = getTodosEndpoint()
    if (!endpoint) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(endpoint, {
        headers: getAuthHeaders(),
      })
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      setTodos(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      setError(`No se pudieron cargar las tareas: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [getTodosEndpoint, getAuthHeaders, onUnauthorized])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  // CREATE: Crear una nueva tarea
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setError(null)

    try {
      const response = await fetch(getTodosEndpoint(), {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          completed: false,
        }),
      })
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`)
      }
      const newTodo = await response.json()
      setTodos((prev) => [newTodo, ...prev])
      setTitle('')
      setDescription('')
    } catch (err) {
      setError(`Error al crear la tarea: ${err.message}`)
    }
  }

  // UPDATE: Alternar estado completado
  const handleToggleComplete = async (todo) => {
    setError(null)
    try {
      const updated = {
        ...todo,
        completed: !todo.completed,
      }
      const response = await fetch(getTodosEndpoint(`/${todo.id}`), {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(updated),
      })
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`)
      }
      const data = await response.json()
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? data : item)))
    } catch (err) {
      setError(`Error al actualizar la tarea: ${err.message}`)
    }
  }

  // Iniciar edición de tarea
  const startEditing = (todo) => {
    setEditingId(todo.id)
    setEditTitle(todo.title)
    setEditDescription(todo.description || '')
  }

  // UPDATE: Guardar cambios de edición
  const handleSaveEdit = async (todo) => {
    if (!editTitle.trim()) return
    setError(null)
    try {
      const updated = {
        ...todo,
        title: editTitle.trim(),
        description: editDescription.trim(),
      }
      const response = await fetch(getTodosEndpoint(`/${todo.id}`), {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(updated),
      })
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`)
      }
      const data = await response.json()
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? data : item)))
      setEditingId(null)
    } catch (err) {
      setError(`Error al editar la tarea: ${err.message}`)
    }
  }

  // DELETE: Eliminar tarea
  const handleDelete = async (id) => {
    setError(null)
    try {
      const response = await fetch(getTodosEndpoint(`/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`)
      }
      setTodos((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(`Error al eliminar la tarea: ${err.message}`)
    }
  }

  const completedCount = todos.filter((t) => t.completed).length
  const baseUrl = getBaseUrl()

  return (
    <>
      {/* Alerta de Error */}
      {error && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center shadow-sm"
          role="alert"
        >
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Tarjeta de Formulario para Nueva Tarea */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="card-title fw-bold mb-3">Nueva Tarea</h5>
          <form onSubmit={handleCreate}>
            <div className="mb-3">
              <label htmlFor="todoTitle" className="form-label fw-medium">
                Título de la tarea <span className="text-danger">*</span>
              </label>
              <input
                id="todoTitle"
                type="text"
                className="form-control"
                placeholder="Ej. Escribir casos de prueba de integración..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="todoDescription" className="form-label fw-medium">
                Descripción (opcional)
              </label>
              <textarea
                id="todoDescription"
                className="form-control"
                rows="2"
                placeholder="Detalles adicionales de la tarea..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
              <small className="text-muted">
                Backend API: <code>{baseUrl || 'No configurada (VITE_API_URL)'}</code>
              </small>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={fetchTodos}
                  disabled={loading || !baseUrl}
                >
                  {loading ? 'Cargando...' : 'Refrescar'}
                </button>
                <button type="submit" className="btn btn-primary px-4" disabled={!baseUrl}>
                  + Agregar Tarea
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Resumen de Tareas */}
      <div className="d-flex justify-content-between align-items-center mb-3 px-1">
        <h5 className="fw-bold mb-0">
          Mis Tareas <span className="badge bg-secondary ms-1">{todos.length}</span>
        </h5>
        <span className="text-muted small">
          Completadas: <strong>{completedCount}</strong> de <strong>{todos.length}</strong>
        </span>
      </div>

      {/* Lista de Tareas en Tarjetas Bootstrap */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="text-muted mt-2 mb-0">Consultando DynamoDB...</p>
        </div>
      ) : todos.length === 0 ? (
        <div className="card border-0 shadow-sm text-center py-5">
          <div className="card-body">
            <h6 className="text-muted fw-semibold mb-1">No hay tareas registradas</h6>
            <p className="text-muted small mb-0">
              Agrega tu primera tarea usando el formulario superior.
            </p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {todos.map((todo) => (
            <div className="col-12" key={todo.id}>
              <div
                className={`card border-0 shadow-sm todo-card ${
                  todo.completed ? 'bg-light border-start border-success border-4' : ''
                }`}
              >
                <div className="card-body p-3 p-md-4">
                  {editingId === todo.id ? (
                    <div>
                      <div className="mb-2">
                        <input
                          type="text"
                          className="form-control form-control-sm fw-semibold"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Título de la tarea"
                        />
                      </div>
                      <div className="mb-3">
                        <textarea
                          className="form-control form-control-sm"
                          rows="2"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Descripción"
                        />
                      </div>
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={() => handleSaveEdit(todo)}
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span
                            className={`badge ${
                              todo.completed ? 'bg-success' : 'bg-warning text-dark'
                            }`}
                          >
                            {todo.completed ? 'Completada' : 'Pendiente'}
                          </span>
                          <h5
                            className={`card-title mb-0 fw-semibold ${
                              todo.completed ? 'todo-completed text-muted' : 'text-dark'
                            }`}
                          >
                            {todo.title}
                          </h5>
                        </div>
                        {todo.description && (
                          <p
                            className={`card-text mb-1 ${
                              todo.completed ? 'todo-completed text-muted' : 'text-secondary'
                            }`}
                          >
                            {todo.description}
                          </p>
                        )}
                        {todo.createdAt && (
                          <small className="text-muted">
                            Creada: {new Date(todo.createdAt).toLocaleString()}
                          </small>
                        )}
                      </div>

                      <div className="d-flex flex-wrap gap-2 align-self-end align-self-md-center">
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            todo.completed ? 'btn-outline-warning' : 'btn-outline-success'
                          }`}
                          onClick={() => handleToggleComplete(todo)}
                        >
                          {todo.completed ? 'Reabrir' : 'Completar'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => startEditing(todo)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(todo.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function App() {
  const [apiUrl, setApiUrl] = useState(ENV_API_URL.replace(/\/$/, ''))
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '')

  // Si VITE_API_URL no fue definida en tiempo de compilación, lee /config.json generado por OpenTofu en S3
  useEffect(() => {
    if (!apiUrl) {
      fetch('/config.json')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.apiUrl) {
            setApiUrl(data.apiUrl.replace(/\/$/, ''))
          }
        })
        .catch(() => {
          // Ignorar si no existe config.json en entorno local
        })
    }
  }, [apiUrl])

  // Normaliza la URL base quitando el sufijo /todos si estuviera presente
  const getBaseUrl = useCallback(() => {
    if (!apiUrl) return ''
    return apiUrl.replace(/\/todos\/?$/, '')
  }, [apiUrl])

  const handleLoginSuccess = useCallback((newToken) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken)
    setToken(newToken)
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken('')
  }, [])

  return (
    <BrowserRouter>
      <NavigationBar token={token} onLogout={handleLogout} />
      <div className="container pb-5" style={{ maxWidth: '820px' }}>
        <Routes>
          <Route
            path="/login"
            element={
              <LoginPage
                getBaseUrl={getBaseUrl}
                token={token}
                onLoginSuccess={handleLoginSuccess}
              />
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute token={token}>
                <TodosPage
                  getBaseUrl={getBaseUrl}
                  token={token}
                  onUnauthorized={handleLogout}
                />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<AboutPage apiUrl={getBaseUrl()} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
