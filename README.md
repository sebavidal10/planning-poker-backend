# PokerPlanning - Backend ⚙️

Servidor robusto de tiempo real para Planning Poker, desarrollado con **Node.js**, **Express.js** y **Socket.IO**. Utiliza **MongoDB** para la persistencia de salas, rondas e histórico de votos.

## 🛠 Tecnologías

- **Node.js & Express**: Core del servidor.
- **Socket.IO**: Gestión de conexiones persistentes y eventos de juego.
- **Mongoose**: Modelado de datos (Room, Participant, UserVote).
- **Zod**: Validación de esquemas y payloads.
- **Jest & Supertest**: Suite de pruebas completa.

## 🚀 Características del Backend

- **Gestión de Rondas**: Estructura de datos compleja que permite múltiples rondas por sala, guardando el resultado histórico de cada una.
- **Asignación de Avatars**: Lógica para asignar nombres de iconos de la librería **Lucide** de forma aleatoria a nuevos participantes.
- **Control de Acceso (Owner)**: Validación de permisos para acciones administrativas (Kicking, Reset, Closing).
- **Cálculo de Promedios**: Lógica inteligente para promediar votos numéricos e ignorar votos especiales (Coffee, ?).
- **Resiliencia**: Limpieza automática de participantes en desconexión.

## 🌐 Despliegue

El backend está desplegado en **Vercel**:

- **URL**: `https://planning-poker-backend-at8c.onrender.com`

> [!CAUTION]
> **Hosting de Backend:** Este backend requiere un servidor con soporte para **WebSockets persistentes** (como Render.com, Railway o VPS). Hosting serverless como Vercel (Hobby) no funcionará correctamente para la sincronización en tiempo real ya que cierra las conexiones de Socket.IO.

## 📦 Instalación y Ejecución

1.  **Instalar**:

    ```bash
    npm install
    ```

2.  **Configurar (.env)**:

    ```env
    PORT=3001
    MONGO_URI=mongodb://localhost:27017/planning-poker
    FRONT_URL=http://localhost:3000
    ```

3.  **Ejecutar**:
    ```bash
    npm start
    ```

## 🔌 Socket.IO Eventos (Actualizados)

### Admin / Rounds

- `addRound`: Crea una nueva tarea/ronda.
- `switchRound`: Cambia la ronda activa.
- `updateRound`: Edita título/descripción de una ronda.
- `resetRound`: Limpia votos y desbloquea la ronda actual.
- `kickParticipant`: Elimina a un usuario específico por nombre.

### Juego

- `join`: Registro de usuario y asignación de avatar.
- `selectVote`: Emisión de voto vinculado a `roundId`.
- `revealVotes`: Bloquea ronda y calcula promedio.

## 📡 API REST

- `GET /rooms/:slug`: Obtiene estado completo (sala + rondas + participantes).
- `POST /rooms`: Crea nueva sesión con tipo de mazo específico.

## 🧪 Testing & Calidad

La lógica de negocio está auditada al **100% de cobertura** en servicios y controladores.

```bash
npm test -- --coverage
```
