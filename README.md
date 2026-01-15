# WhatsApp-like Chat Application

A real-time chat application built with React, Node.js, Express, Socket.IO, and MongoDB. Features include user authentication, real-time messaging, online status, typing indicators, and message persistence.

## Features

- ✅ Real-time messaging with Socket.IO
- ✅ User authentication (JWT)
- ✅ Message persistence with MongoDB
- ✅ Online/offline status
- ✅ Typing indicators
- ✅ Message read receipts (✓✓)
- ✅ Responsive WhatsApp-like UI
- ✅ Message history
- ✅ Auto-scroll to latest messages

## Tech Stack

- **Frontend:** React, React Router, Axios, Socket.IO Client
- **Backend:** Node.js, Express.js, Socket.IO
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **Styling:** CSS (WhatsApp-inspired design)

## Local Development

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up environment variables:**

   Create `.env` file in backend directory:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/whatsapp_clone
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=5000
   ```

5. **Start MongoDB** (if using local MongoDB)

6. **Start the backend:**
   ```bash
   cd backend
   npm start
   # or for development: npm run dev (if you add nodemon)
   ```

7. **Start the frontend** (in a new terminal):
   ```bash
   cd frontend
   npm start
   ```

8. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Deployment Options

### Option 1: Heroku (Recommended for beginners)

#### Backend Deployment

1. **Create a Heroku account** at https://heroku.com

2. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   heroku login
   ```

3. **Create Heroku apps:**
   ```bash
   heroku create your-backend-app-name --buildpack heroku/nodejs
   heroku create your-frontend-app-name --buildpack https://github.com/mars/create-react-app-buildpack.git
   ```

4. **Set up MongoDB Atlas:**
   - Go to https://cloud.mongodb.com
   - Create a free cluster
   - Get connection string

5. **Configure environment variables:**
   ```bash
   heroku config:set MONGODB_URI="your_mongodb_atlas_connection_string" -a your-backend-app-name
   heroku config:set JWT_SECRET="your_super_secret_jwt_key" -a your-backend-app-name
   ```

6. **Deploy backend:**
   ```bash
   cd backend
   git init
   heroku git:remote -a your-backend-app-name
   git add .
   git commit -m "Deploy backend"
   git push heroku main
   ```

7. **Deploy frontend:**
   ```bash
   cd ../frontend
   git init
   heroku git:remote -a your-frontend-app-name
   git add .
   git commit -m "Deploy frontend"
   git push heroku main
   ```

8. **Update frontend API calls:**
   - Change `http://localhost:5000` to your backend Heroku URL in frontend code

#### Option 2: Vercel + Railway (Modern Stack)

1. **Deploy backend to Railway:**
   - Go to https://railway.app
   - Connect your GitHub repo
   - Add MongoDB plugin or use MongoDB Atlas
   - Set environment variables

2. **Deploy frontend to Vercel:**
   - Go to https://vercel.com
   - Connect your GitHub repo
   - Set `REACT_APP_API_URL` environment variable to your Railway backend URL

#### Option 3: DigitalOcean App Platform

1. **Create DigitalOcean account**
2. **Use App Platform:**
   - Connect GitHub repo
   - Auto-detect Node.js and React apps
   - Add MongoDB database
   - Configure environment variables

#### Option 4: AWS/GCP/Azure

For production deployments, consider:
- **AWS:** EC2 + Elastic Beanstalk + RDS
- **GCP:** App Engine + Cloud SQL
- **Azure:** App Service + CosmosDB

## Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://127.0.0.1:27017/whatsapp_clone
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5000
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
# For production: REACT_APP_API_URL=https://your-backend-url.com
```

## Project Structure

```
my-chat/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.js
│   └── package.json
├── .gitignore
└── README.md
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Users
- `GET /users` - Get all users (authenticated)

### Messages
- `GET /messages/:userId` - Get messages with specific user
- `PUT /messages/read/:userId` - Mark messages as read

## Socket Events

### Client → Server
- `registerUser` - Register user for real-time updates
- `sendMessage` - Send message to another user
- `typing` - Indicate typing status
- `markAsRead` - Mark messages as read

### Server → Client
- `receiveMessage` - Receive new message
- `messageSent` - Confirm message sent with status
- `userTyping` - Receive typing status
- `messagesRead` - Confirm messages marked as read

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Create a Pull Request

## License

MIT License - feel free to use this project for learning and development.

## Support

If you find this project helpful, please give it a ⭐ on GitHub!
