# Chord

Chord is a modern web application designed to facilitate seamless communication and collaboration. It features a client-side application built with Next.js and Tailwind CSS, and a server-side application powered by Node.js and Express. The project is structured to provide a scalable and maintainable codebase for real-time chat and social networking functionalities.

## Features

### Client-Side Features
- **Responsive Design**: Built with Tailwind CSS for a mobile-first, responsive user interface.
- **Real-Time Chat**: Chat rooms and messaging powered by WebSocket.
- **User Authentication**: Secure login and registration system.
- **Friend Management**: Add, remove, and manage friends.
- **Theming**: Light and dark mode support.
- **Dynamic Routing**: Powered by Next.js for seamless navigation.

### Server-Side Features
- **RESTful API**: Provides endpoints for user, friend, and room management.
- **WebSocket Integration**: Real-time communication using socket.io.
- **Database Integration**: MongoDB for data persistence.
- **Middleware**: Authentication and request validation.
- **Modular Architecture**: Organized controllers, routes, and models for scalability.

## Project Structure

### Client
The client-side application is located in the `client/` directory and is built with Next.js.

- **`app/`**: Contains the main application files, including global styles and layout.
- **`components/`**: Reusable UI components.
- **`lib/`**: Utility functions for the client.
- **`public/`**: Static assets like images and icons.
- **`src/`**: Contains the main source code, including pages, components, context, and utilities.

### Server
The server-side application is located in the `server/` directory and is built with Node.js and Express.

- **`config/`**: Configuration files for the server.
- **`controllers/`**: Handles the business logic for various features.
- **`middleware/`**: Middleware for authentication and request validation.
- **`models/`**: Mongoose models for MongoDB collections.
- **`routes/`**: API routes for different functionalities.
- **`sockets/`**: WebSocket handlers for real-time communication.

## Installation

### Prerequisites
- Node.js (v16 or later)
- MongoDB

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/chord.git
   ```
2. Navigate to the project directory:
   ```bash
   cd chord
   ```
3. Install dependencies for both client and server:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```
4. Set up environment variables:
   - Create `.env` files in both `client/` and `server/` directories.
   - Add necessary environment variables (e.g., database URI, API keys).

5. Start the development servers:
   - Client:
     ```bash
     cd client && npm run dev
     ```
   - Server:
     ```bash
     cd server && npm start
     ```

## Usage

1. Open the client application in your browser at `http://localhost:3000`.
2. Use the server API at `http://localhost:5000`.

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push the branch.
4. Open a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Socket.io](https://socket.io/)