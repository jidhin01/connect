## Connect AI - Real-Time Messaging Platform

**Live Demo:** [Insert Link to Your Deployed App Here] | ****

---

### 🚀 Overview & Key Features

Connect AI is a scalable, full-stack messaging application built for real-time communication. This project demonstrates proficiency in developing **secure, low-latency applications** and integrating **Generative AI** into production-ready architecture.

| Category | Feature | Description |
| :--- | :--- | :--- |
| **Real-Time Core** | **WebSockets (Socket.IO)** | Powers **instant, duplex communication** for real-time direct messaging. |
| **Generative AI** | **Google Gemini Integration** | Seamlessly integrated a **context-aware chatbot** via a dedicated RESTful API, demonstrating **AI system design**. |
| **Security** | **JWT & RBAC** | **Rigorous authentication** using JSON Web Tokens (JWT) and **Role-Based Access Control** for secure profile management. |
| **Performance** | **Optimized MERN Stack** | Highly optimized Express.js APIs and MongoDB queries ensuring **low-latency** and reliable message delivery. |
| **Architecture** | **Scalable & Production-Ready** | Clean code architecture (MERN) deployed continuously via **Render**. |

---

### 💻 Technology Stack

This project showcases expertise across the entire stack:

| Component | Technology | Keywords |
| :--- | :--- | :--- |
| **Backend/Runtime** | **Node.js** / **Express.js** | **MERN**, RESTful APIs |
| **Database** | **MongoDB Atlas** / Mongoose | Data Modeling, Persistence |
| **AI/ML** | **Google Gemini API** | **Generative AI**, Context-Aware Logic |
| **Networking** | **WebSockets (Socket.IO)** | Real-Time Communication, Duplex Channel |
| **Security** | **JWT** / **Auth Middleware** | **RBAC**, Authentication |
| **Utilities** | Multer, DotEnv | File Uploads, Environment Management |
| **Frontend** | **React.js** / **Tailwind CSS** | Modern UI/UX, Component Architecture |

---

### 📸 Application Pages

The UI is designed for minimalism and clarity, focusing on core functionality.

#### Landing Page
<img width="1663" height="870" alt="Screenshot 2025-10-14 at 21 14 46" src="https://github.com/user-attachments/assets/304d6beb-11f1-4658-b4fb-72d698a27523" />

#### Chat Interface (AI/P2P)
![Chat Interface Screenshot](https://github.com/user-attachments/assets/435bad93-d49f-4767-adad-be9150ffa62b)

#### User Profile
![User Profile Screenshot](https://github.com/user-attachments/assets/4d99fe58-7c46-4ad3-ba00-f19d16bafcc2)

#### Contacts
![Contacts Screenshot](https://github.com/user-attachments/assets/f19b8456-41e6-4ae0-a934-43015d0b1c7d)

#### Settings
![Settings Screenshot](https://github.com/user-attachments/assets/353e10fb-1b35-4be9-981f-769f3b535d07)

---

### ▶️ Getting Started (Local Development)

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/jidhin01/connect.git](https://github.com/jidhin01/connect.git)
    cd connect
    ```
2.  **Install Dependencies** (Ensure both frontend and backend dependencies are installed):
    ```bash
    # Run in the root directory and the backend subdirectory if separated
    npm install
    # or
    yarn install
    ```
3.  **Setup Environment Variables:** Create a `.env` file in your **backend directory** with your:
    * `MONGO_URI`
    * `JWT_SECRET`
    * `GEMINI_API_KEY`
4.  **Run the Server:**
    ```bash
    npm run dev  # Starts both frontend (Vite) and backend (Nodemon)
    ```

---

### ☁️ Deployment

The project is structured for easy CI/CD using Render.

1.  **Deploy Backend Service:** Create a new **Web Service** on [Render](https://render.com), linking your repository.
2.  **Configure Environment Variables:** Add your `MONGO_URI`, `JWT_SECRET`, and **`GEMINI_API_KEY`** in the Render dashboard.
3.  **Deploy Frontend Service:** Deploy the client, pointing the `VITE_API_URL` environment variable to your deployed backend service URL.

---

### 📜 License

This project is open source and free to use.

---

*Project by [Your Name/GitHub Profile Link]*
*Give credits at the footer if you wish.*
